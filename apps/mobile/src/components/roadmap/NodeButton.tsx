// One button per roadmap ITEM (lesson or quiz) on the flattened Course path — replaces
// RoadmapNodeCircle.tsx (one-per-node) as part of the Course & Topic redesign, Phase C. Ported
// from the Figma "Node Button" component (file OaE5PxSOT5p8Fby7SUpoP7, node 22:27039's "Node
// Button Test" instances) — geometry (85px badge, ring, sparkle cluster) and colours (content-type
// tint, not progress-status tint) pulled directly from that component rather than approximated
// from the screenshot alone.
//
// Two independent variant axes, matching the Figma component exactly:
// - Progress ('locked' | 'current' | 'completed') drives the ring/dim treatment. Figma's mockup
//   has every item already completed, so 'locked'/'current' treatments are extrapolated from this
//   app's existing convention (RoadmapNodeCircle.tsx's dim-locked / light-ring-current), not
//   sampled from a Figma instance — flagged here since no such instance exists to pull exact
//   values from.
// - Content ('lesson' | 'quiz' — no 'project' branch yet, reserved per Phase B) drives the badge's
//   two-tone colour (rose/error for lesson, violet/primary for quiz) and icon glyph. Confirmed
//   against Figma: these colours are literally `colors.error.dark`/`colors.error.DEFAULT` and
//   `colors.primary.dark`/`colors.primary.DEFAULT` already in theme.ts — no new hex values needed.
//
// The completed-state "sparkle cluster" (3 small stars, decreasing size, upper-right of the badge)
// is a fixed decorative flourish in Figma, NOT a 0-3 stars-earned indicator — that's node-level
// (INodeProgressEntry.stars), rendered once per node by RoadmapPath.tsx, not per item. Items don't
// carry a star count in the data model, so this is deliberate, not a simplification of missing data.
//
// No real vector icon assets were pulled from Figma (its icons are custom SVG illustrations, e.g.
// "board-svgrepo-com"/"quiz-svgrepo-com") — every other icon in this app's roadmap UI already comes
// from lucide-react-native (Lock, Star, ChevronRight, Play, CheckCircle), so the closest lucide
// glyphs (MonitorPlay for lesson, ClipboardCheck for quiz) are used here for consistency instead of
// introducing a new bundled-illustration pipeline for two icons.
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { ClipboardCheck, Lock, MonitorPlay, Star } from 'lucide-react-native';
import { radii } from '@my-backpack/shared';
import type { NodeItemType } from '@my-backpack/shared';
import { useTheme } from '../../theme/ThemeContext';

export type NodeButtonProgress = 'locked' | 'current' | 'completed';

interface NodeButtonProps {
  itemType: Extract<NodeItemType, 'lesson' | 'quiz'>;
  progress: NodeButtonProgress;
  loading?: boolean;
  onPress: () => void;
}

export const NODE_BUTTON_SIZE = 84;

type ThemeColors = ReturnType<typeof useTheme>['colors'];

export default function NodeButton({ itemType, progress, loading = false, onPress }: NodeButtonProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const isLocked = progress === 'locked';
  const isCurrent = progress === 'current';
  const isCompleted = progress === 'completed';
  const isInteractive = !isLocked && !loading;

  const outerColor = isLocked ? colors.surface.glassSoft : itemType === 'lesson' ? colors.error.dark : colors.primary.dark;
  const innerColor = itemType === 'lesson' ? colors.error.DEFAULT : colors.primary.DEFAULT;

  const Icon = itemType === 'lesson' ? MonitorPlay : ClipboardCheck;

  return (
    <Pressable
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      style={({ pressed }) => [styles.wrapper, pressed && isInteractive && styles.pressed]}
    >
      <View style={[styles.outer, { backgroundColor: outerColor }, isCurrent && styles.currentRing]}>
        {!isLocked && <View style={[styles.inner, { backgroundColor: innerColor }]} />}

        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : isLocked ? (
          <Lock size={28} color={colors.text.muted} />
        ) : (
          <Icon size={36} color="#fff" strokeWidth={2} />
        )}

        {isCompleted && (
          <>
            <Star size={14} color={colors.warning.DEFAULT} fill={colors.warning.DEFAULT} style={styles.sparkle1} />
            <Star size={11} color={colors.warning.DEFAULT} fill={colors.warning.DEFAULT} style={styles.sparkle2} />
            <Star size={9} color={colors.warning.DEFAULT} fill={colors.warning.DEFAULT} style={styles.sparkle3} />
          </>
        )}
      </View>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      width: NODE_BUTTON_SIZE,
      height: NODE_BUTTON_SIZE,
    },
    pressed: {
      opacity: 0.8,
    },
    outer: {
      width: NODE_BUTTON_SIZE,
      height: NODE_BUTTON_SIZE * 0.9,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inner: {
      position: 'absolute',
      left: 3,
      top: 3,
      right: 3,
      bottom: 3,
      borderRadius: radii.full,
    },
    currentRing: {
      borderWidth: 3,
      borderColor: colors.primary.light,
    },
    sparkle1: {
      position: 'absolute',
      right: 2,
      bottom: 10,
    },
    sparkle2: {
      position: 'absolute',
      right: -3,
      top: 20,
    },
    sparkle3: {
      position: 'absolute',
      right: 3,
      top: 6,
    },
  });
}
