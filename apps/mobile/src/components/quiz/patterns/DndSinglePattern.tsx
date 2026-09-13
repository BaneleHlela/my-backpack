// Ports apps/web's DndSinglePattern.tsx's behavior — not its library. Web uses @dnd-kit/core
// (React-DOM-only). A compatibility spike installed react-native-reanimated-dnd (built on
// Reanimated 4 + Gesture Handler, so it looked like a close match) and found a hard blocker:
// its useDraggable always accepts any collision as a valid drop and animates the item
// permanently into the drop zone — there is no hook to reject a drop and bounce the item back
// (its onDrop callback is fire-and-forget, `void` return, no rejection signal). That's
// incompatible with helpers.retryUntilCorrect, which is `true` on all 6 vowels dnd_single
// quiz variants — the primary graded content this pattern serves. So this is a hand-rolled
// implementation: react-native-gesture-handler's Gesture.Pan()/Gesture.Tap() composed via
// Gesture.Race (mirrors dnd-kit's PointerSensor 8px activation distance via .minDistance(8)/
// .maxDistance(8) — short movement lets Tap win the race, longer movement activates Pan) +
// Reanimated shared values for position, with drop-zone hit-testing done in JS (via runOnJS)
// against a drop-zone rect measured with measureInWindow(), compared against the gesture's
// absoluteX/absoluteY on release. This gives full control over accept/reject, which is exactly
// what retryUntilCorrect needs.
//
// One simplification from web: once an item is accepted into the drop zone, it renders as a
// non-draggable (but still tap-for-audio) tile there — web supports dragging a placed item
// back out when helpers.allowUndo is set; that's a secondary polish behavior not exercised by
// the graded content paths (autoSubmit fires immediately on every vowels variant, disabling
// the question right after), so it's not reproduced here.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Ref } from 'react';
import { Image, ImageBackground, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../../AppText';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Lightbulb } from 'lucide-react-native';
import { ASSETS, lightColors, radii, spacing, typography } from '@my-backpack/shared';
import type { AgeGroup, IDraggable, IQuestionContent, IQuestionHelpers } from '@my-backpack/shared';
import { resolveAssetUrl } from '../../../lib/assetUrl';
import { usePlayback } from '../../../lib/useAudioPlayback';
import { audioSourceKey, prepareAudio, type PlaybackStatus } from '../../../lib/audio';
import { replayAudioSource } from '../../../lib/questionAudio';
import { AudioButton, AudioIndicator } from '../../AudioButton';
import { useTheme } from '../../../theme/ThemeContext';
import { useQuestionScrollRef } from '../QuestionScrollArea';
import { fonts } from '../../../theme/fonts';
import type { QuestionPatternHandle, QuestionPatternReadyProps } from './questionPatternTypes';

interface DndSinglePatternProps extends QuestionPatternReadyProps {
  content: IQuestionContent;
  helpers: IQuestionHelpers;
  ageGroup?: AgeGroup;
  lang: string;
  disabled?: boolean;
  onAnswer: (rawResponse: string) => void;
}

// Fisher-Yates — unbiased in-place shuffle, returns a new array.
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Tiles shrink to fit a small phone width instead of overflowing as draggable count escalates
// (1 -> 2 -> 5 across the vowels quiz variants) — mirrors web's clamp(56px, 18vw, 76px), a
// fixed formula (not count-parameterized on web either — the escalation effect comes from
// flex-wrap laying more same-sized tiles across more rows, not from shrinking further per item).
function clampTileSize(windowWidth: number): number {
  return Math.min(76, Math.max(56, windowWidth * 0.18));
}

interface DraggableTileHandle {
  snapBack: () => void;
}

interface DraggableTileProps {
  audioStatus?: PlaybackStatus;
  item: IDraggable;
  size?: number;
  showLabel: boolean;
  highlight?: boolean;
  disabled?: boolean;
  isChild?: boolean;
  onTapAudio: (item: IDraggable) => void;
  onDragAudio: (item: IDraggable) => void;
  onDropAttempt: (item: IDraggable, absoluteX: number, absoluteY: number) => void;
}

const DraggableTile = forwardRef(function DraggableTile(
  {
    item,
    size,
    showLabel,
    highlight,
    disabled,
    isChild,
    audioStatus = 'idle',
    onTapAudio,
    onDragAudio,
    onDropAttempt,
  }: DraggableTileProps,
  ref: Ref<DraggableTileHandle>
) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scrollRef = useQuestionScrollRef();

  useImperativeHandle(ref, () => ({
    snapBack: () => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    },
  }));

  // onStart/onUpdate/onEnd run as worklets on the UI thread — every call into plain JS (state
  // setters, audio playback) must cross back via runOnJS, or it throws at runtime despite
  // compiling and bundling fine (this doesn't surface until the gesture actually fires).
  const tapGesture = Gesture.Tap()
    .maxDistance(8)
    .onEnd((_e, success) => {
      if (success) runOnJS(onTapAudio)(item);
    });

  const panGesture = Gesture.Pan()
    .minDistance(8)
    .enabled(!disabled)
    .onStart(() => {
      runOnJS(onDragAudio)(item);
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(onDropAttempt)(item, e.absoluteX, e.absoluteY);
    })
    .onFinalize(() => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  if (scrollRef) panGesture.blocksExternalGesture(scrollRef);

  const composedGesture = Gesture.Race(tapGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  const imageUrl = resolveAssetUrl(item.imageUrl);

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          styles.tile,
          isChild && styles.tileChild,
          size ? { width: size, height: size } : null,
          highlight && styles.tileHighlight,
          animatedStyle,
        ]}
      >
        {audioStatus !== 'idle' ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: 3, right: 3, zIndex: 1 }}>
            <AudioIndicator status={audioStatus} color={colors.primary.DEFAULT} size={14} />
          </View>
        ) : null}
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.tileImage} resizeMode="contain" /> : null}
        {showLabel ? <Text style={styles.tileLabel}>{item.label}</Text> : null}
      </Animated.View>
    </GestureDetector>
  );
});

export const DndSinglePattern = forwardRef(function DndSinglePattern(
  { content, helpers, ageGroup, lang, disabled, onAnswer, onReadyChange }: DndSinglePatternProps,
  ref: Ref<QuestionPatternHandle>
) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const isChild = ageGroup === 'child';
  const { width: windowWidth } = useWindowDimensions();
  const tileSize = isChild ? clampTileSize(windowWidth) : undefined;
  const playback = usePlayback();
  const playAsset = (url?: string) => { if (url) playback.play({ url }); };
  const itemAudioStatus = (item: IDraggable): PlaybackStatus => playback.sourceKey ===
    audioSourceKey({ url: item.audioUrl, text: item.label, language: lang }) ? playback.status : 'idle';
  useEffect(() => {
    content.draggables?.slice(0, 4).forEach((item) => prepareAudio({ url: item.audioUrl }));
    return playback.stop;
  }, [content, playback.stop]);

  const dropZone = content.dropZones?.[0];

  const [placedId, setPlacedId] = useState<string | null>(null);
  const [hintsRemaining, setHintsRemaining] = useState(helpers.hintsAllowed);
  const [hintActive, setHintActive] = useState(false);
  const [hintButtonReady, setHintButtonReady] = useState(helpers.hintDelaySeconds === 0);
  const [wrongAttempt, setWrongAttempt] = useState(false);
  const [orderedDraggables, setOrderedDraggables] = useState<IDraggable[]>(() =>
    helpers.shuffleDraggables ? shuffle(content.draggables ?? []) : (content.draggables ?? [])
  );
  const [genKey, setGenKey] = useState(0);
  const submittedRef = useRef(false);
  // Counts rejected (retryUntilCorrect) drops for the current question — sent with the final
  // correct submission so the server can deduct a point per wrong attempt.
  const wrongAttemptsRef = useRef(0);
  const tileRefs = useRef<Map<string, DraggableTileHandle>>(new Map());
  const dropZoneRef = useRef<View>(null);
  const dropZoneRectRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  // Reset per-question state whenever a new question loads. genKey remounts every tile fresh
  // (new shared values at (0,0)) rather than reusing stale gesture/position state.
  useEffect(() => {
    setPlacedId(null);
    setHintsRemaining(helpers.hintsAllowed);
    setHintActive(false);
    setHintButtonReady(helpers.hintDelaySeconds === 0);
    setWrongAttempt(false);
    setOrderedDraggables(
      helpers.shuffleDraggables ? shuffle(content.draggables ?? []) : (content.draggables ?? [])
    );
    setGenKey((k) => k + 1);
    submittedRef.current = false;
    wrongAttemptsRef.current = 0;
    tileRefs.current.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // A rejected request re-enables this same mounted question, including auto-submit ones.
  useEffect(() => {
    if (!disabled) submittedRef.current = false;
  }, [disabled]);

  useEffect(() => {
    if (helpers.hintDelaySeconds === 0 || hintButtonReady) return;
    const timer = setTimeout(() => setHintButtonReady(true), helpers.hintDelaySeconds * 1000);
    return () => clearTimeout(timer);
  }, [helpers.hintDelaySeconds, hintButtonReady]);

  // Defined above the `!dropZone` early return (and self-guards on `dropZone`) so the
  // useImperativeHandle/onReadyChange hooks just below — which must run unconditionally on
  // every render per the Rules of Hooks — can safely close over it regardless of which branch
  // this render takes.
  const submit = (finalPlacedId: string) => {
    if (!dropZone || disabled || submittedRef.current) return;
    submittedRef.current = true;
    onAnswer(
      JSON.stringify({
        placements: [{ draggableId: finalPlacedId, dropZoneId: dropZone.id }],
        wrongAttempts: wrongAttemptsRef.current,
      })
    );
  };

  // Auto-submit still fires on drop; the footer also allows a manual retry after a failed request.
  useImperativeHandle(ref, () => ({
    submit: () => {
      if (placedId) submit(placedId);
    },
  }));

  useEffect(() => {
    onReadyChange?.(Boolean(dropZone) && placedId !== null && !disabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placedId, helpers.autoSubmit, disabled]);

  if (!dropZone) return null;

  const placedItem = orderedDraggables.find((d) => d.id === placedId) ?? null;
  const poolItems = orderedDraggables.filter((d) => d.id !== placedId);
  const correctId = dropZone.requiredDraggableIds[0];

  const hintAvailable = helpers.hintsAllowed > 0 && hintsRemaining > 0 && hintButtonReady;
  const measureDropZone = () => {
    dropZoneRef.current?.measureInWindow((x, y, width, height) => {
      dropZoneRectRef.current = { x, y, width, height };
    });
  };

  // Ordinary fallback rule: prerecorded item.audioUrl wins when set (phonetically load-bearing,
  // e.g. isiZulu vowel/consonant recordings) — live TTS of item.label fills the gap when it isn't.
  const playItemAudio = (item: IDraggable) => {
    playback.play({ url: item.audioUrl, text: item.label, language: lang });
  };

  const handleDropAttempt = (item: IDraggable, absoluteX: number, absoluteY: number) => {
    if (disabled || submittedRef.current) {
      tileRefs.current.get(item.id)?.snapBack();
      return;
    }

    const rect = dropZoneRectRef.current;
    const withinZone =
      rect != null &&
      absoluteX >= rect.x &&
      absoluteX <= rect.x + rect.width &&
      absoluteY >= rect.y &&
      absoluteY <= rect.y + rect.height;

    if (!withinZone) {
      tileRefs.current.get(item.id)?.snapBack();
      return;
    }

    const isCorrectDrop = dropZone.requiredDraggableIds.includes(item.id);
    if (helpers.retryUntilCorrect && !isCorrectDrop) {
      // Rejected — never reaches onAnswer, item bounces back to the pool. Counted toward the
      // point deduction applied once the question is finally submitted.
      wrongAttemptsRef.current += 1;
      tileRefs.current.get(item.id)?.snapBack();
      playAsset(content.tryAgainFeedback?.audioUrl);
      setWrongAttempt(true);
      setTimeout(() => setWrongAttempt(false), 700);
      return;
    }

    setPlacedId(item.id);
    if (helpers.autoSubmit) submit(item.id);
  };

  const useHint = () => {
    if (hintsRemaining <= 0) return;
    setHintsRemaining((n) => n - 1);
    setHintActive(true);
    setTimeout(() => setHintActive(false), 2500);
  };


  const dragAreaBackground = resolveAssetUrl(content.dragAreaImageUrl);
  const dropZoneBackground = resolveAssetUrl(dropZone.imageUrl) ?? ASSETS.DROP_ZONES.CLASSROOM_BOARD;
  const wrongAvatarUrl = content.avatar
    ? ASSETS.AVATARS.image(
        content.avatar.avatarId,
        content.tryAgainFeedback?.avatarEmotion ?? content.avatar.emotion
      )
    : undefined;
  const promptAudio = replayAudioSource(content, lang);
  const promptText = content.avatar?.dialogue || (content.prompt?.startsWith('audio:')
    ? 'Listen to the question.' : content.prompt) || (promptAudio.url ? 'Listen to the question.' : undefined);

  const body = (
    <View style={styles.container}>
      {promptText ? (
        <View style={styles.promptRow}>
          <View style={[styles.promptBubble, isChild && styles.promptBubbleChild]}>
            <Text style={[styles.promptText, isChild && styles.promptTextChild]}>{promptText}</Text>
          </View>

          <View style={styles.promptButtons}>
            <AudioButton compact {...promptAudio} label="Replay question" />
            <Pressable
              onPress={useHint}
              disabled={!hintAvailable}
              style={[styles.iconButton, !hintAvailable && styles.iconButtonDisabled]}
            >
              <Lightbulb size={isChild ? 22 : 16} color={colors.warning.dark} />
            </Pressable>
          </View>
        </View>
      ) : null}

      {playback.error ? <Text accessibilityRole="alert" style={{ color: colors.error.DEFAULT }}>{playback.error}</Text> : null}
      <View style={styles.poolRow}>
        {poolItems.map((item) => (
          <DraggableTile
            key={`${genKey}-${item.id}`}
            ref={(handle) => {
              if (handle) tileRefs.current.set(item.id, handle);
              else tileRefs.current.delete(item.id);
            }}
            item={item}
            audioStatus={itemAudioStatus(item)}
            size={tileSize}
            showLabel={!isChild && helpers.showItemLabels}
            highlight={hintActive && item.id === correctId}
            disabled={disabled || Boolean(placedId)}
            isChild={isChild}
            onTapAudio={playItemAudio}
            onDragAudio={(item) => {
              measureDropZone();
              playItemAudio(item);
            }}
            onDropAttempt={handleDropAttempt}
          />
        ))}
      </View>

      <View
        ref={dropZoneRef}
        collapsable={false}
        onLayout={measureDropZone}
        style={[styles.dropZone, isChild && styles.dropZoneChild, wrongAttempt && styles.dropZoneWrong]}
      >
        <ImageBackground
          source={{ uri: dropZoneBackground }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        {placedItem ? (
          <DraggableTile
            key={`${genKey}-placed-${placedItem.id}`}
            item={placedItem}
            audioStatus={itemAudioStatus(placedItem)}
            size={tileSize}
            showLabel={helpers.showItemLabels}
            disabled
            isChild={isChild}
            onTapAudio={playItemAudio}
            onDragAudio={playItemAudio}
            onDropAttempt={() => {}}
          />
        ) : (
          <Text style={styles.dropZoneLabel}>{dropZone.label ?? 'Drop here'}</Text>
        )}
      </View>

      {wrongAttempt && wrongAvatarUrl ? (
        <Image source={{ uri: wrongAvatarUrl }} style={styles.wrongAvatar} resizeMode="contain" />
      ) : null}
    </View>
  );

  if (!dragAreaBackground) return body;

  return (
    <ImageBackground
      source={{ uri: dragAreaBackground }}
      style={styles.dragAreaBackground}
      resizeMode="cover"
    >
      {body}
    </ImageBackground>
  );
});

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    dragAreaBackground: {
      flexGrow: 1,
      borderRadius: radii.md,
      overflow: 'hidden',
    },
    container: {
      flexGrow: 1,
      gap: spacing.md,
      padding: spacing.sm,
    },
    promptRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    promptBubble: {
      flex: 1,
      backgroundColor: '#fff',
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: colors.primary.light,
      padding: spacing.md,
    },
    promptBubbleChild: {
      padding: spacing.md,
      borderWidth: 3,
    },
    promptText: {
      fontSize: typography.bodyChild,
      lineHeight: 28,
      color: lightColors.text.primary,
    },
    promptTextChild: {
      fontFamily: fonts.display.bold,
      fontSize: typography.headingLg,
      lineHeight: 36,
      textAlign: 'center',
      color: lightColors.text.primary,
    },
    promptButtons: {
      gap: spacing.xs,
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.warning.light,
      borderWidth: 1,
      borderColor: colors.primary.light,
    },
    iconButtonDisabled: {
      opacity: 0.4,
    },
    poolRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    tile: {
      width: 64,
      height: 64,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface.glassStrong,
      borderWidth: 1,
      borderColor: colors.surface.border,
    },
    tileChild: {
      borderRadius: radii.lg,
      borderWidth: 3,
      borderColor: colors.primary.light,
      backgroundColor: '#fff',
    },
    tileHighlight: {
      borderColor: colors.warning.DEFAULT,
      borderWidth: 3,
    },
    tileImage: {
      width: '70%',
      height: '70%',
    },
    tileLabel: {
      fontSize: typography.body,
      fontWeight: '700',
      color: colors.glassText.primary,
    },
    dropZone: {
      minHeight: 160,
      width: '100%',
      borderRadius: radii.lg,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.surface.border,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      aspectRatio: 2 / 1,
      maxWidth: '100%',
    },
    dropZoneChild: {
      borderWidth: 3,
      borderColor: colors.primary.light,
    },
    dropZoneWrong: {
      borderColor: colors.error.DEFAULT,
    },
    dropZoneLabel: {
      fontSize: typography.small,
      color: colors.text.muted,
    },
    wrongAvatar: {
      width: 72,
      height: 72,
      alignSelf: 'center',
    },
  });
}
