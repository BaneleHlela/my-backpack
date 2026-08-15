// One button per roadmap ITEM (lesson or quiz) on the flattened Course path — replaces
// RoadmapNodeCircle.tsx (one-per-node) as part of the Course & Topic redesign, Phase C. Ported
// from the Figma "Node Button" component (file OaE5PxSOT5p8Fby7SUpoP7, node 22:27039's "Node
// Button Test" instances) — geometry (85px badge) and colours (content-type tint, not
// progress-status tint) pulled directly from that component rather than approximated from the
// screenshot alone.
//
// The badge itself is DepthButton (../DepthButton.tsx) — a plain-View "3D gloss button"
// primitive, not an image/SVG asset (a bundled Kenney SVG was tried first here but rendered
// inconsistently; DepthButton replaces it and owns its own press/content handling, which is why
// NodeButton no longer wraps its own Pressable).
//
// Two independent variant axes, matching the Figma component:
// - Progress ('locked' | 'current' | 'completed') drives the dim treatment (locked) and the
//   surrounding decoration (current: pulsing ring: completed: stars row below). Figma's mockup
//   has every item already completed, so 'locked'/'current' treatments are extrapolated from
//   this app's prior convention (dim-locked / accent-ring-current), not sampled from a Figma
//   instance — flagged here since no such instance exists to pull exact values from.
// - Content ('lesson' | 'quiz' — no 'project' branch yet, reserved per Phase B) drives the main
//   face's colour (rose/error for lesson, violet/primary for quiz, via DepthButton's `color`)
//   and icon glyph. Confirmed against Figma: these colours are literally
//   `colors.error.DEFAULT`/`colors.primary.DEFAULT` already in theme.ts — no new hex values.
//
// The completed-state indicator is three static Star icons in a row directly under the badge —
// a fixed decorative flourish, NOT a 0-3 stars-earned indicator (that's node-level,
// INodeProgressEntry.stars, rendered once per node by RoadmapPath.tsx, not per item). Items
// don't carry a star count in the data model, so this is deliberate, not a simplification of
// missing data. Previously this lived as a small sparkle cluster over the badge's upper-right —
// moved to a plain row underneath it (still not overlapping the badge).
//
// No real vector icon assets were pulled from Figma for the content icons (its icons are custom
// SVG illustrations, e.g. "board-svgrepo-com"/"quiz-svgrepo-com") — every other icon in this
// app's roadmap UI already comes from lucide-react-native (Lock, Star, ChevronRight, Play,
// CheckCircle), so the closest lucide glyphs (MonitorPlay for lesson, ClipboardCheck for quiz)
// are used here for consistency instead of introducing a new bundled-illustration pipeline.
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ClipboardCheck, Lock, MonitorPlay, Star } from 'lucide-react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { radii, spacing } from '@my-backpack/shared';
import type { NodeItemType } from '@my-backpack/shared';
import { DepthButton } from '../DepthButton';
import { useTheme } from '../../theme/ThemeContext';

export type NodeButtonProgress = 'locked' | 'current' | 'completed';

interface NodeButtonProps {
  itemType: Extract<NodeItemType, 'lesson' | 'quiz'>;
  progress: NodeButtonProgress;
  loading?: boolean;
  onPress: () => void;
}

export const NODE_BUTTON_SIZE = 82;

// Extra vertical room the completed-state stars row needs below the badge. RoadmapPath.tsx
// (the only place that lays multiple NodeButtons out in a column) adds this to its per-item
// spacing for completed items only, mirroring how it already pads for its own node-level stars
// summary — imported rather than duplicated as a second magic number so the two files can't
// drift apart.
export const NODE_BUTTON_COMPLETED_EXTRA_HEIGHT = 30;

const STAR_SIZE = 16;
const PULSE_MAX_SCALE = 1.6;
const PULSE_DURATION = 1400;

export default function NodeButton({ itemType, progress, loading = false, onPress }: NodeButtonProps) {
  const { colors } = useTheme();
  const isLocked = progress === 'locked';
  const isCurrent = progress === 'current';
  const isCompleted = progress === 'completed';

  const mainFill = isLocked ? colors.surface.glassSoft : itemType === 'lesson' ? colors.error.DEFAULT : colors.primary.DEFAULT;
  // DepthButton's shadow defaults to a fixed purple otherwise — every badge, lesson or quiz,
  // would get that same hardcoded rim regardless of its own face colour. Derive it from the same
  // family as `mainFill` instead (its `.dark` tone) so a red-faced lesson badge gets a red
  // shadow and a purple-faced quiz badge gets a purple one. Locked has no `.dark` tone to pull
  // from (`surface.glassSoft` is a translucent white, not an accent colour) — leaving it
  // `undefined` used to fall through to that same hardcoded purple, a jarring accent colour
  // behind an otherwise dim, muted badge, so it gets its own neutral translucent-black rim
  // instead, reading as a soft grey shadow in both themes.
  const shadowFill = isLocked
    ? 'rgba(0,0,0,0.25)'
    : itemType === 'lesson'
      ? colors.error.dark
      : colors.primary.dark;
  const Icon = itemType === 'lesson' ? MonitorPlay : ClipboardCheck;

  return (
    <View style={styles.column}>
      <View style={styles.badgeArea}>
        {isCurrent && <CurrentPulse color={colors.primary.light} />}

        <DepthButton
          width={NODE_BUTTON_SIZE}
          height={NODE_BUTTON_SIZE - 3}
          color={mainFill}
          shadowColor={shadowFill}
          onPress={onPress}
          disabled={isLocked || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : isLocked ? (
            <Lock size={28} color={colors.text.muted} />
          ) : (
            <Icon size={36} color="#fff" strokeWidth={2} />
          )}
        </DepthButton>
      </View>

      {isCompleted && (
        <View style={styles.starsRow}>
          {[0, 1, 2].map((i) => (
            <Star key={i} size={i !== 1 ? STAR_SIZE : STAR_SIZE + 3} color={colors.warning.DEFAULT} fill={colors.warning.DEFAULT} />
          ))}
        </View>
      )}
    </View>
  );
}

// Duolingo-style "current node" indicator — a translucent circle, the same size as the badge and
// hidden directly behind it at rest, that continuously scales outward past the badge's edge while
// fading to transparent, then resets (not a ping-pong reverse) and repeats. Purely decorative:
// absolutely fills its (already badge-sized) parent, pointerEvents="none" so it can never
// intercept the press, and only mounted while progress === 'current' — unmounting is what stops
// the loop and tears down its animated layer, rather than pausing a hidden one. The transform-only
// animation never resizes the badge itself, and runs on Reanimated (already this project's
// animation system, e.g. DndTile.tsx), which is native-driver by default.
function CurrentPulse({ color }: { color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(withTiming(PULSE_MAX_SCALE, { duration: PULSE_DURATION, easing: Easing.out(Easing.ease) }), -1, false);
    opacity.value = withRepeat(withTiming(0, { duration: PULSE_DURATION, easing: Easing.out(Easing.ease) }), -1, false);

    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.pulse, { backgroundColor: color }, animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({
  column: {
    width: NODE_BUTTON_SIZE,
    alignItems: 'center',
  },
  badgeArea: {
    width: NODE_BUTTON_SIZE,
    height: NODE_BUTTON_SIZE,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  pulse: {
    borderRadius: radii.full,
  },
});
