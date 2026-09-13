import { dndAppearance } from './dndAppearance';
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
// tryAgainFeedback) rather than ever landing. Each rejection is counted locally
// (wrongAttemptsRef) and sent with the eventual submission — evaluateDnDAnswer() server-side
// deducts one point per wrong attempt from maxPoints (floored at 0).
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Ref } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../../AppText';
import { Lightbulb, Volume2 } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import type { AgeGroup, IDraggable, IQuestionContent, IQuestionHelpers } from '@my-backpack/shared';
import { useSpeak } from '../../../lib/useSpeak';
import { DndTile, DndTileHandle, Rect, clampTileSize, playAsset, pointInRect, shuffle } from './DndTile';
import { useTheme } from '../../../theme/ThemeContext';
import { fonts } from '../../../theme/fonts';
import type { QuestionPatternHandle, QuestionPatternReadyProps } from './questionPatternTypes';

interface DndBuildPatternProps extends QuestionPatternReadyProps {
  content: IQuestionContent;
  helpers: IQuestionHelpers;
  ageGroup?: AgeGroup;
  lang: string;
  disabled?: boolean;
  onAnswer: (rawResponse: string) => void;
}

export const DndBuildPattern = forwardRef(function DndBuildPattern(
  { content, helpers, ageGroup, lang, disabled, onAnswer, onReadyChange }: DndBuildPatternProps,
  ref: Ref<QuestionPatternHandle>
) {
  const { colors, theme } = useTheme();
  const styles = createStyles(colors, theme === 'dark');
  const appearance = dndAppearance(theme === 'dark');
  const isChild = ageGroup === 'child';
  const { width: windowWidth } = useWindowDimensions();
  const tileSize = clampTileSize(windowWidth);
  const { speak } = useSpeak(lang);

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
  // Counts rejected (retryUntilCorrect) drops for the current question — sent with the final
  // submission so the server can deduct a point per wrong attempt.
  const wrongAttemptsRef = useRef(0);
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
    setOrderedDraggables(
      helpers.shuffleDraggables ? shuffle(content.draggables ?? []) : (content.draggables ?? [])
    );
    setGenKey((k) => k + 1);
    submittedRef.current = false;
    wrongAttemptsRef.current = 0;
    tileRefs.current.clear();
    zoneRectsRef.current.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  useEffect(() => {
    if (!disabled) submittedRef.current = false;
  }, [disabled]);

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
  // Live TTS fills the gap when there's dialogue text but no recording (see replayPrompt below).
  const audioAvailable = Boolean(content.avatar?.dialogueAudioUrl) || Boolean(content.avatar?.dialogue);

  const submit = () => {
    if (disabled || submittedRef.current || !allFilled) return;
    submittedRef.current = true;
    const placementsArr = dropZones.map((z) => ({ draggableId: placements[z.id]!, dropZoneId: z.id }));
    onAnswer(JSON.stringify({ placements: placementsArr, wrongAttempts: wrongAttemptsRef.current }));
  };

  useEffect(() => {
    if (allFilled && helpers.autoSubmit) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFilled]);

  // Auto-submit once when filled, but allow a manual retry if that request fails.
  useImperativeHandle(ref, () => ({
    submit: () => {
      submit();
    },
  }));

  useEffect(() => {
    onReadyChange?.(allFilled && !disabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFilled, helpers.autoSubmit, disabled]);

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

    const targetZone = dropZones.find((z) =>
      pointInRect(absoluteX, absoluteY, zoneRectsRef.current.get(z.id))
    );
    if (!targetZone) {
      tileRefs.current.get(item.id)?.snapBack();
      return;
    }

    const isCorrectDrop = targetZone.requiredDraggableIds.includes(item.id);
    if (helpers.retryUntilCorrect && !isCorrectDrop) {
      // Counted toward the point deduction applied once the question is finally submitted.
      wrongAttemptsRef.current += 1;
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
    else if (content.avatar?.dialogue) speak(content.avatar.dialogue);
  };

  // Ordinary fallback rule: prerecorded item.audioUrl wins when set — live TTS of item.label
  // fills the gap when it isn't.
  const playItemAudio = (item: IDraggable) => {
    if (item.audioUrl) playAsset(item.audioUrl);
    else if (item.label) speak(item.label);
  };

  const promptText = content.avatar?.dialogue ?? content.prompt;

  const body = (
    <View style={styles.container}>
      <View style={styles.questionPanel}>
        {promptText ? (
          <View style={styles.promptRow}>

            <View style={[styles.promptBubble, isChild && styles.promptBubbleChild]}>
              <Text style={[styles.promptText, isChild && styles.promptTextChild]}>{promptText}</Text>
            </View>

            <View style={styles.promptButtons}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Replay question"
                onPress={replayPrompt}
                disabled={!audioAvailable}
                style={({ pressed }) => [styles.iconButton, !audioAvailable && styles.iconButtonDisabled, pressed && { transform: [{ scale: 0.94 }], opacity: 0.8 }]}
              >
                <Volume2 size={20} color={appearance.accent} />
              </Pressable>
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
                collapsable={false}
                onLayout={() => measureZone(zone.id)}
                style={[
                  styles.blank,
                  isChild && styles.blankChild,
                  wrongZoneId === zone.id && styles.blankWrong,
                  { width: tileSize + 4, height: tileSize + 4 },
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
            onTap={playItemAudio}
            onDragStart={(item) => {
              dropZones.forEach((zone) => measureZone(zone.id));
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
      padding: spacing.md,
    },
    promptRow: {
      flexDirection: 'column',
      alignItems: 'flex-start',
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
    },
    iconButtonDisabled: {
      opacity: 0.45,
    },
    blanksRow: {
      paddingVertical: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: appearance.panel,
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
      borderStyle: 'dotted',
      borderColor: appearance.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    blankChild: {},
    blankWrong: {
      borderColor: colors.error.DEFAULT,
      borderStyle: 'solid',
    },
    blankLabel: {
      fontSize: typography.headingLg,
      fontWeight: '700',
      color: appearance.accent,
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
      gap: spacing.sm,
    },
  });
}
