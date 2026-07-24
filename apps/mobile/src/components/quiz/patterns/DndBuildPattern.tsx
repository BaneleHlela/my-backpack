// dnd_build — build a word letter-by-letter (or syllable-by-syllable) by dragging tiles from
// content.draggables into one blank per content.dropZones entry (dropZones[i] is blank i;
// content.blanks[] carries the same position/correctDraggableId pairing but isn't needed for
// rendering or grading here since dropZones already gives id + requiredDraggableIds + order —
// see apps/api's evaluateDnDAnswer, which grades dnd_build with the same "set equality per
// zone" branch as dnd_single, just across N zones instead of one).
//
// Extends DndSinglePattern's Gesture.Pan()/Gesture.Tap() + measureInWindow() hit-testing
// foundation (see DndTile.tsx) rather than rewriting it — same worklet/runOnJS rules apply.
// Two real behavioral differences from dnd_single, not just "more zones":
//   - Submit timing: dnd_single submits the instant its one slot fills. Here we wait until
//     every blank is occupied (`allFilled`) before ever calling onAnswer — a half-built word
//     can't be graded.
//   - Per-blank correction: a placed tile isn't a dead end. dnd_single's accepted tile can stay
//     permanently non-interactive because autoSubmit fires the moment it lands; dnd_build's
//     seeded content (CVC words, isiZulu syllables) actually sets retryUntilCorrect: false, so
//     a wrong letter CAN sit in a blank — tapping a filled blank removes it back to the pool so
//     the learner can fix one letter without restarting the whole word.
// helpers.retryUntilCorrect, where a future question does set it, still applies per-blank the
// same way it does for dnd_single: a wrong tile is rejected at drop time (bounces back +
// tryAgainFeedback) rather than ever landing.
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Lightbulb, Volume2 } from 'lucide-react-native';
import { ASSETS, colors, radii, spacing, typography } from '@my-backpack/shared';
import type { AgeGroup, IDraggable, IQuestionContent, IQuestionHelpers } from '@my-backpack/shared';
import { resolveAssetUrl } from '../../../lib/assetUrl';
import { DndTile, DndTileHandle, Rect, clampTileSize, playAsset, pointInRect, shuffle } from './DndTile';

interface DndBuildPatternProps {
  content: IQuestionContent;
  helpers: IQuestionHelpers;
  ageGroup?: AgeGroup;
  disabled?: boolean;
  isSubmitting?: boolean;
  onAnswer: (rawResponse: string) => void;
}

export function DndBuildPattern({ content, helpers, ageGroup, disabled, isSubmitting, onAnswer }: DndBuildPatternProps) {
  const isChild = ageGroup === 'child';
  const { width: windowWidth } = useWindowDimensions();
  const tileSize = isChild ? clampTileSize(windowWidth) : undefined;

  const dropZones = content.dropZones ?? [];

  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [wrongZoneId, setWrongZoneId] = useState<string | null>(null);
  const [hintsRemaining, setHintsRemaining] = useState(helpers.hintsAllowed);
  const [hintActive, setHintActive] = useState(false);
  const [hintButtonReady, setHintButtonReady] = useState(helpers.hintDelaySeconds === 0);
  const [orderedDraggables, setOrderedDraggables] = useState<IDraggable[]>(() =>
    helpers.shuffleDraggables ? shuffle(content.draggables ?? []) : (content.draggables ?? [])
  );
  const [genKey, setGenKey] = useState(0);
  const submittedRef = useRef(false);
  const tileRefs = useRef<Map<string, DndTileHandle>>(new Map());
  const zoneRefs = useRef<Map<string, View>>(new Map());
  const zoneRectsRef = useRef<Map<string, Rect>>(new Map());

  // Reset per-question state whenever a new question loads.
  useEffect(() => {
    setPlacements({});
    setWrongZoneId(null);
    setHintsRemaining(helpers.hintsAllowed);
    setHintActive(false);
    setHintButtonReady(helpers.hintDelaySeconds === 0);
    setOrderedDraggables(helpers.shuffleDraggables ? shuffle(content.draggables ?? []) : (content.draggables ?? []));
    setGenKey((k) => k + 1);
    submittedRef.current = false;
    tileRefs.current.clear();
    zoneRectsRef.current.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  useEffect(() => {
    if (helpers.hintDelaySeconds === 0 || hintButtonReady) return;
    const timer = setTimeout(() => setHintButtonReady(true), helpers.hintDelaySeconds * 1000);
    return () => clearTimeout(timer);
  }, [helpers.hintDelaySeconds, hintButtonReady]);

  const placedDraggableIds = new Set(Object.values(placements));
  const poolItems = orderedDraggables.filter((d) => !placedDraggableIds.has(d.id));
  const allFilled = dropZones.length > 0 && dropZones.every((z) => placements[z.id]);
  const firstUnfilledZone = dropZones.find((z) => !placements[z.id]);
  const hintCorrectId = firstUnfilledZone?.requiredDraggableIds[0];

  const hintAvailable = helpers.hintsAllowed > 0 && hintsRemaining > 0 && hintButtonReady && !allFilled;
  // No live TTS on mobile yet (prompt 3) — only a prerecorded dialogueAudioUrl counts here.
  const audioAvailable = Boolean(content.avatar?.dialogueAudioUrl);

  const submit = () => {
    if (disabled || submittedRef.current || !allFilled) return;
    submittedRef.current = true;
    const placementsArr = dropZones.map((z) => ({ draggableId: placements[z.id]!, dropZoneId: z.id }));
    onAnswer(JSON.stringify({ placements: placementsArr }));
  };

  useEffect(() => {
    if (allFilled && helpers.autoSubmit) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFilled]);

  const measureZone = (zoneId: string) => {
    zoneRefs.current.get(zoneId)?.measureInWindow((x, y, width, height) => {
      zoneRectsRef.current.set(zoneId, { x, y, width, height });
    });
  };

  const handleDropAttempt = (item: IDraggable, absoluteX: number, absoluteY: number) => {
    if (disabled || submittedRef.current) {
      tileRefs.current.get(item.id)?.snapBack();
      return;
    }

    const targetZone = dropZones.find((z) => pointInRect(absoluteX, absoluteY, zoneRectsRef.current.get(z.id)));
    if (!targetZone) {
      tileRefs.current.get(item.id)?.snapBack();
      return;
    }

    const isCorrectDrop = targetZone.requiredDraggableIds.includes(item.id);
    if (helpers.retryUntilCorrect && !isCorrectDrop) {
      tileRefs.current.get(item.id)?.snapBack();
      playAsset(content.tryAgainFeedback?.audioUrl);
      setWrongZoneId(targetZone.id);
      setTimeout(() => setWrongZoneId(null), 700);
      return;
    }

    setPlacements((prev) => ({ ...prev, [targetZone.id]: item.id }));
  };

  const handleRemove = (zoneId: string) => {
    if (disabled || submittedRef.current) return;
    setPlacements((prev) => {
      const next = { ...prev };
      delete next[zoneId];
      return next;
    });
  };

  const useHint = () => {
    if (hintsRemaining <= 0) return;
    setHintsRemaining((n) => n - 1);
    setHintActive(true);
    setTimeout(() => setHintActive(false), 2500);
  };

  const replayPrompt = () => {
    if (content.avatar?.dialogueAudioUrl) playAsset(content.avatar.dialogueAudioUrl);
  };

  const dragAreaBackground = resolveAssetUrl(content.dragAreaImageUrl);
  const wrongAvatarUrl = content.avatar
    ? ASSETS.AVATARS.image(content.avatar.avatarId, content.tryAgainFeedback?.avatarEmotion ?? content.avatar.emotion)
    : undefined;
  const promptAvatarUrl = content.avatar
    ? ASSETS.AVATARS.image(content.avatar.avatarId, content.avatar.emotion)
    : undefined;
  const promptText = content.avatar?.dialogue ?? content.prompt;

  const body = (
    <View style={styles.container}>
      {promptText ? (
        <View style={styles.promptRow}>
          {content.avatar?.dialogue && promptAvatarUrl ? (
            <Image source={{ uri: promptAvatarUrl }} style={styles.promptAvatar} resizeMode="contain" />
          ) : null}

          <View style={[styles.promptBubble, isChild && styles.promptBubbleChild]}>
            <Text style={[styles.promptText, isChild && styles.promptTextChild]}>{promptText}</Text>
          </View>

          <View style={styles.promptButtons}>
            <Pressable
              onPress={replayPrompt}
              disabled={!audioAvailable}
              style={[styles.iconButton, !audioAvailable && styles.iconButtonDisabled]}
            >
              <Volume2 size={isChild ? 22 : 16} color={colors.warning.dark} />
            </Pressable>
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

      <View style={styles.blanksRow}>
        {dropZones.map((zone) => {
          const placedId = placements[zone.id];
          const placedItem = placedId ? orderedDraggables.find((d) => d.id === placedId) : undefined;
          return (
            <View
              key={zone.id}
              ref={(v) => {
                if (v) zoneRefs.current.set(zone.id, v);
                else zoneRefs.current.delete(zone.id);
              }}
              onLayout={() => measureZone(zone.id)}
              style={[
                styles.blank,
                isChild && styles.blankChild,
                wrongZoneId === zone.id && styles.blankWrong,
                tileSize ? { width: tileSize, height: tileSize } : null,
              ]}
            >
              {placedItem ? (
                <DndTile
                  key={`${genKey}-placed-${placedItem.id}`}
                  item={placedItem}
                  size={tileSize}
                  showLabel={!isChild && helpers.showItemLabels}
                  draggable={false}
                  isChild={isChild}
                  onTap={() => handleRemove(zone.id)}
                />
              ) : (
                <Text style={styles.blankLabel}>_</Text>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.poolRow}>
        {poolItems.map((item) => (
          <DndTile
            key={`${genKey}-${item.id}`}
            ref={(handle) => {
              if (handle) tileRefs.current.set(item.id, handle);
              else tileRefs.current.delete(item.id);
            }}
            item={item}
            size={tileSize}
            showLabel={!isChild && helpers.showItemLabels}
            highlight={hintActive && item.id === hintCorrectId}
            disabled={disabled}
            draggable
            isChild={isChild}
            onTap={(i) => playAsset(i.audioUrl)}
            onDragStart={(i) => playAsset(i.audioUrl)}
            onDropAttempt={handleDropAttempt}
          />
        ))}
      </View>

      {wrongZoneId && wrongAvatarUrl ? (
        <Image source={{ uri: wrongAvatarUrl }} style={styles.wrongAvatar} resizeMode="contain" />
      ) : null}

      {!helpers.autoSubmit ? (
        <Pressable
          disabled={!allFilled || disabled}
          onPress={submit}
          style={[styles.submitButton, (!allFilled || disabled) && styles.submitButtonDisabled]}
        >
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit</Text>}
        </Pressable>
      ) : null}
    </View>
  );

  if (!dragAreaBackground) return body;

  return (
    <ImageBackground source={{ uri: dragAreaBackground }} style={styles.dragAreaBackground} resizeMode="cover">
      {body}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  dragAreaBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  promptAvatar: {
    width: 32,
    height: 32,
  },
  promptBubble: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.primary.light,
    padding: spacing.sm,
  },
  promptBubbleChild: {
    padding: spacing.md,
    borderWidth: 3,
  },
  promptText: {
    fontSize: typography.body,
    color: colors.text.primary,
  },
  promptTextChild: {
    fontSize: typography.headingLg,
    fontWeight: '700',
    textAlign: 'center',
  },
  promptButtons: {
    gap: spacing.xs,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning.light,
  },
  iconButtonDisabled: {
    opacity: 0.4,
  },
  blanksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  blank: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blankChild: {
    borderRadius: radii.lg,
    borderWidth: 3,
    borderColor: colors.primary.light,
  },
  blankWrong: {
    borderColor: colors.error.DEFAULT,
    borderStyle: 'solid',
  },
  blankLabel: {
    fontSize: typography.headingLg,
    fontWeight: '700',
    color: colors.text.faint,
  },
  poolRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  wrongAvatar: {
    width: 72,
    height: 72,
    alignSelf: 'center',
  },
  submitButton: {
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: typography.body,
    fontWeight: '700',
    color: '#fff',
  },
});
