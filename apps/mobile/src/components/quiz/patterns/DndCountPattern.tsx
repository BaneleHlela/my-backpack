// dnd_count — drag a specific quantity of items into one zone until the learner believes the
// count is right, then submits. content.draggables carries one entry per item TYPE (e.g.
// "apple") with a `quantity` (how many individual copies exist in the pool) — this pattern
// expands each type into `quantity` individual tile instances (a DndTile needs a stable,
// unique `id` per rendered tile; the underlying type id is kept alongside as `typeId` and is
// what actually goes into the submitted rawResponse, since that's what
// evaluateDnDAnswer/zone.requiredDraggableIds checks against, not the instance id).
//
// Two real differences from dnd_single (beyond "more items into one zone"):
//   - No autoSubmit: dnd_single fires the instant its one slot fills, because there's a single
//     unambiguous "landing" moment. Counting has no such moment — the learner may want to add
//     or remove items repeatedly before they're confident in the count — so this pattern always
//     shows an explicit Submit button (enabled once at least one item is placed) and never
//     reads helpers.autoSubmit, even though some seeded counting questions set that field
//     (apps/api/src/seed/questions/math/counting.questions.ts sets `autoSubmit: false` from
//     count 6 onward specifically to force deliberate confirmation — for count <=5 it's `true`,
//     but this pattern intentionally doesn't wire that flag up: there's no single-drop moment
//     to fire it from without re-litigating a "did this drop just complete the count" check that
//     doesn't correspond to anything the current UI model does per-drop). Correctness is
//     resolved server-side on submit, not client-side per drop.
//   - Placed tiles stay tappable-to-remove (via the shared DndTile from DndBuildPattern), same
//     reasoning as dnd_build: a miscounted zone needs to be correctable rather than a dead end.
//
// helpers.countingAudio ("counts aloud as items drop into zone") has no effect yet — no live
// TTS/number-speech exists on mobile (prompt 3); a running placed-count label substitutes as
// the visual equivalent.
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

interface DndCountPatternProps {
  content: IQuestionContent;
  helpers: IQuestionHelpers;
  ageGroup?: AgeGroup;
  disabled?: boolean;
  isSubmitting?: boolean;
  onAnswer: (rawResponse: string) => void;
}

interface DraggableInstance extends IDraggable {
  typeId: string; // the original content.draggables[] entry's id — grading needs this, not
                   // the per-tile instance id below
}

function buildInstances(draggables: IDraggable[], shuffleOrder: boolean): DraggableInstance[] {
  const instances: DraggableInstance[] = [];
  for (const type of draggables) {
    const count = type.quantity ?? 1;
    for (let i = 0; i < count; i++) {
      instances.push({ ...type, id: `${type.id}__${i}`, typeId: type.id });
    }
  }
  // Not set on any seeded counting question today (defaults to false, tray stays grouped by
  // type in authored order), but honored generically like the other DnD patterns' draggable
  // pools in case a future question mixes types together instead.
  return shuffleOrder ? shuffle(instances) : instances;
}

export function DndCountPattern({ content, helpers, ageGroup, disabled, isSubmitting, onAnswer }: DndCountPatternProps) {
  const isChild = ageGroup === 'child';
  const { width: windowWidth } = useWindowDimensions();
  const tileSize = isChild ? clampTileSize(windowWidth) : undefined;

  const dropZone = content.dropZones?.[0];

  const [instances, setInstances] = useState<DraggableInstance[]>(() =>
    buildInstances(content.draggables ?? [], helpers.shuffleDraggables)
  );
  const [placedInstanceIds, setPlacedInstanceIds] = useState<Set<string>>(new Set());
  const [hintsRemaining, setHintsRemaining] = useState(helpers.hintsAllowed);
  const [hintActive, setHintActive] = useState(false);
  const [hintButtonReady, setHintButtonReady] = useState(helpers.hintDelaySeconds === 0);
  const [genKey, setGenKey] = useState(0);
  const submittedRef = useRef(false);
  const tileRefs = useRef<Map<string, DndTileHandle>>(new Map());
  const zoneRef = useRef<View>(null);
  const zoneRectRef = useRef<Rect | null>(null);

  // Reset per-question state whenever a new question loads.
  useEffect(() => {
    setInstances(buildInstances(content.draggables ?? [], helpers.shuffleDraggables));
    setPlacedInstanceIds(new Set());
    setHintsRemaining(helpers.hintsAllowed);
    setHintActive(false);
    setHintButtonReady(helpers.hintDelaySeconds === 0);
    setGenKey((k) => k + 1);
    submittedRef.current = false;
    tileRefs.current.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  useEffect(() => {
    if (helpers.hintDelaySeconds === 0 || hintButtonReady) return;
    const timer = setTimeout(() => setHintButtonReady(true), helpers.hintDelaySeconds * 1000);
    return () => clearTimeout(timer);
  }, [helpers.hintDelaySeconds, hintButtonReady]);

  if (!dropZone) return null;

  const poolInstances = instances.filter((i) => !placedInstanceIds.has(i.id));
  const zoneInstances = instances.filter((i) => placedInstanceIds.has(i.id));

  const hintAvailable = helpers.hintsAllowed > 0 && hintsRemaining > 0 && hintButtonReady;
  const hintTypeId = dropZone.requiredDraggableIds[0];
  // No live TTS on mobile yet (prompt 3) — only a prerecorded dialogueAudioUrl counts here.
  const audioAvailable = Boolean(content.avatar?.dialogueAudioUrl);

  const measureZone = () => {
    zoneRef.current?.measureInWindow((x, y, width, height) => {
      zoneRectRef.current = { x, y, width, height };
    });
  };

  const submit = () => {
    if (disabled || submittedRef.current || placedInstanceIds.size === 0) return;
    submittedRef.current = true;
    const placementsArr = zoneInstances.map((inst) => ({ draggableId: inst.typeId, dropZoneId: dropZone.id }));
    onAnswer(JSON.stringify({ placements: placementsArr }));
  };

  const handleDropAttempt = (item: IDraggable, absoluteX: number, absoluteY: number) => {
    if (disabled || submittedRef.current) {
      tileRefs.current.get(item.id)?.snapBack();
      return;
    }
    if (!pointInRect(absoluteX, absoluteY, zoneRectRef.current)) {
      tileRefs.current.get(item.id)?.snapBack();
      return;
    }
    setPlacedInstanceIds((prev) => new Set(prev).add(item.id));
  };

  // Miscounted the basket? Tap a placed item to send it back to the pool rather than starting
  // the whole question over.
  const handleRemove = (instanceId: string) => {
    if (disabled || submittedRef.current) return;
    setPlacedInstanceIds((prev) => {
      const next = new Set(prev);
      next.delete(instanceId);
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
  const dropZoneBackground = resolveAssetUrl(dropZone.imageUrl) ?? ASSETS.DROP_ZONES.CLASSROOM_BOARD;
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

      <View style={styles.poolRow}>
        {poolInstances.map((item) => (
          <DndTile
            key={`${genKey}-${item.id}`}
            ref={(handle) => {
              if (handle) tileRefs.current.set(item.id, handle);
              else tileRefs.current.delete(item.id);
            }}
            item={item}
            size={tileSize}
            showLabel={!isChild && helpers.showItemLabels}
            highlight={hintActive && item.typeId === hintTypeId}
            disabled={disabled}
            draggable
            isChild={isChild}
            onTap={(i) => playAsset(i.audioUrl)}
            onDragStart={(i) => playAsset(i.audioUrl)}
            onDropAttempt={handleDropAttempt}
          />
        ))}
      </View>

      <View
        ref={zoneRef}
        onLayout={measureZone}
        style={[styles.dropZone, isChild && styles.dropZoneChild]}
      >
        <ImageBackground source={{ uri: dropZoneBackground }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        {zoneInstances.length > 0 ? (
          <View style={styles.zoneItems}>
            {zoneInstances.map((item) => (
              <DndTile
                key={`${genKey}-placed-${item.id}`}
                item={item}
                size={tileSize}
                showLabel={false}
                draggable={false}
                isChild={isChild}
                onTap={() => handleRemove(item.id)}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.dropZoneLabel}>{dropZone.label ?? 'Drop here'}</Text>
        )}
      </View>

      <Text style={styles.countLabel}>{zoneInstances.length} placed</Text>

      <Pressable
        disabled={placedInstanceIds.size === 0 || disabled}
        onPress={submit}
        style={[styles.submitButton, (placedInstanceIds.size === 0 || disabled) && styles.submitButtonDisabled]}
      >
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit</Text>}
      </Pressable>
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
  poolRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dropZone: {
    flex: 1,
    minHeight: 140,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: spacing.sm,
  },
  dropZoneChild: {
    borderWidth: 3,
    borderColor: colors.primary.light,
  },
  dropZoneLabel: {
    fontSize: typography.small,
    color: colors.text.muted,
  },
  zoneItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  countLabel: {
    alignSelf: 'center',
    fontSize: typography.small,
    fontWeight: '600',
    color: colors.text.secondary,
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
