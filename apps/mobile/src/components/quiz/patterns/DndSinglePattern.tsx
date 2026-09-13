import { dndAppearance } from './dndAppearance';
import { dndTileColor } from './dndAppearance';
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
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../../AppText';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Lightbulb } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
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
  return Math.min(86, Math.max(72, windowWidth * 0.22));
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
  const { colors, theme } = useTheme();
  const styles = createStyles(colors, theme === 'dark');
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const active = useSharedValue(false);
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
    .onBegin(() => { active.value = true; })
    .onFinalize(() => { active.value = false; })
    .maxDistance(8)
    .onEnd((_e, success) => {
      if (success) runOnJS(onTapAudio)(item);
    });

  const panGesture = Gesture.Pan()
    .minDistance(8)
    .enabled(!disabled)
    .onStart(() => {
      active.value = true;
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
      active.value = false;
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  if (scrollRef) panGesture.blocksExternalGesture(scrollRef);

  const composedGesture = Gesture.Race(tapGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    zIndex: active.value ? 20 : 0,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: active.value ? 1.08 : 1 }],
  }));

  const imageUrl = item.label?.trim() ? undefined : resolveAssetUrl(item.imageUrl);
  const tileColor = dndTileColor(item.label || item.id);

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          styles.tile,
          isChild && styles.tileChild,
          { borderColor: tileColor },
          size ? { width: size, height: size } : null,
          highlight && styles.tileHighlight,
          animatedStyle,
        ]}
      >
        <View style={[styles.tileFace, { backgroundColor: tileColor }]}>
        {audioStatus !== 'idle' ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: 3, right: 3, zIndex: 1 }}>
            <AudioIndicator status={audioStatus} color={tileColor === '#E8B92F' ? '#493510' : '#fff'} size={14} />
          </View>
        ) : null}
          {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.tileImage} resizeMode="contain" /> : null}
          {(showLabel || !imageUrl) && item.label ? <Text adjustsFontSizeToFit numberOfLines={2} style={[styles.tileLabel, tileColor === '#E8B92F' && { color: '#493510' }]}>{item.label}</Text> : null}
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

export const DndSinglePattern = forwardRef(function DndSinglePattern(
  { content, helpers, ageGroup, lang, disabled, onAnswer, onReadyChange }: DndSinglePatternProps,
  ref: Ref<QuestionPatternHandle>
) {
  const { colors, theme } = useTheme();
  const styles = createStyles(colors, theme === 'dark');
  const appearance = dndAppearance(theme === 'dark');
  const isChild = ageGroup === 'child';
  const { width: windowWidth } = useWindowDimensions();
  const tileSize = clampTileSize(windowWidth);
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


  const promptAudio = replayAudioSource(content, lang);
  const promptText = content.avatar?.dialogue || (content.prompt?.startsWith('audio:')
    ? 'Listen to the question.' : content.prompt) || (promptAudio.url ? 'Listen to the question.' : undefined);

  const body = (
    <View style={styles.container}>
      <View style={styles.questionPanel}>
        {promptText ? (
          <View style={styles.promptRow}>
            <View style={[styles.promptBubble, isChild && styles.promptBubbleChild]}>
              <Text style={[styles.promptText, isChild && styles.promptTextChild]}>{promptText}</Text>
            </View>

            <View style={styles.promptButtons}>
              <AudioButton compact {...promptAudio} label="Replay question" style={styles.iconButton} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Show hint"
                onPress={useHint}
                disabled={!hintAvailable}
                style={({ pressed }) => [styles.iconButton, !hintAvailable && styles.iconButtonDisabled, pressed && { transform: [{ scale: 0.94 }], opacity: 0.8 }]}
              >
                <Lightbulb size={20} color={appearance.accent} />
              </Pressable>
            </View>
          </View>
        ) : null}

        <View
          ref={dropZoneRef}
          collapsable={false}
          onLayout={measureDropZone}
          style={[styles.dropZone, isChild && styles.dropZoneChild, wrongAttempt && styles.dropZoneWrong]}
        >
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

      </View>

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

    </View>
  );

  return body;
});

function createStyles(colors: ReturnType<typeof useTheme>['colors'], dark: boolean) {
  const appearance = dndAppearance(dark);
  return StyleSheet.create({
    questionPanel: {
      backgroundColor: appearance.panel,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: appearance.border,
      padding: 24,
      gap: 24,
    },
    container: {
      flexGrow: 1,
      gap: spacing.lg,
      padding: spacing.sm,
    },
    promptRow: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    promptBubble: { alignSelf: 'stretch', paddingVertical: 4 },
    promptBubbleChild: {},
    promptText: {
      fontFamily: fonts.display.medium,
      fontSize: 23,
      lineHeight: 31,
      textAlign: 'center',
      color: appearance.text,
    },
    promptTextChild: {},
    promptButtons: {
      flexDirection: 'row',
      alignSelf: 'center',
      gap: 12,
    },
    iconButton: {
      width: 48,
      height: 48,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: appearance.control,
      borderWidth: 1,
      borderColor: appearance.border,
    },
    iconButtonDisabled: {
      opacity: 0.45,
    },
    poolRow: {
      paddingTop: 12,
      paddingBottom: 24,
      alignSelf: 'center',
      maxWidth: 310,
      width: '100%',
      zIndex: 2,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 16,
    },
    tile: {
      width: 78,
      height: 82,
      padding: 5,
      borderRadius: 22,
      borderWidth: 1.5,
      borderStyle: 'dotted',
      backgroundColor: 'transparent',
    },
    tileChild: {},
    tileFace: {
      flex: 1,
      width: '100%',
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 4,
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
      paddingHorizontal: 6,
      textAlign: 'center',
      fontSize: 30,
      fontFamily: fonts.display.semibold,
      color: '#fff',
      includeFontPadding: false,
    },
    dropZone: {
      minHeight: 90,
      width: 96,
      backgroundColor: appearance.slot,
      alignSelf: 'center',
      borderRadius: radii.lg,
      borderWidth: 2,
      borderStyle: 'dotted',
      borderColor: appearance.accent,
      alignItems: 'center',
      justifyContent: 'center',
      maxWidth: '100%',
    },
    dropZoneChild: {},
    dropZoneWrong: {
      borderColor: colors.error.DEFAULT,
    },
    dropZoneLabel: {
      fontSize: typography.small,
      color: appearance.muted,
    },
  });
}
