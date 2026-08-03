// Child-style roadmap node: large circle marker on the winding path. Ports
// apps/web's RoadmapNodeCircle.tsx — status colors use flat theme tokens instead of
// Tailwind's gradient utility classes (theme.ts has no gradient tokens; web's gradients
// were hardcoded Tailwind classes bypassing the shared theme file, not something to
// reproduce 1:1 on a plain-StyleSheet build). No pulse animation on the 'unlocked' state
// (web animates a boxShadow pulse) — kept static for this pass to avoid pulling Reanimated
// into node rendering ahead of Phase 4's DnD work; a highlighted border stands in for it.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Lock, Star } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import type { NodeStatus } from '@my-backpack/shared';
import { useTheme } from '../../theme/ThemeContext';

interface RoadmapNodeCircleProps {
  title: string;
  status: NodeStatus;
  stars: number;
  onPress: () => void;
}

type ThemeColors = ReturnType<typeof useTheme>['colors'];

function getStatusColors(colors: ThemeColors): Record<NodeStatus, string> {
  return {
    locked: colors.text.faint,
    unlocked: colors.primary.DEFAULT,
    in_progress: colors.primary.dark,
    completed: colors.success.DEFAULT,
  };
}

const CIRCLE_SIZE = 80;

export default function RoadmapNodeCircle({ title, status, stars, onPress }: RoadmapNodeCircleProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const statusColor = getStatusColors(colors);
  const isLocked = status === 'locked';

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={isLocked ? undefined : onPress}
        disabled={isLocked}
        style={[
          styles.circle,
          { backgroundColor: statusColor[status] },
          isLocked && styles.locked,
          status === 'unlocked' && styles.unlockedRing,
        ]}
      >
        {isLocked ? (
          <Lock size={26} color="#fff" />
        ) : status === 'completed' ? (
          <Star size={26} color="#fff" fill="#fff" />
        ) : (
          <View style={styles.innerDot} />
        )}
      </Pressable>

      {status === 'completed' && (
        <View style={styles.starsRow}>
          {[1, 2, 3].map((s) => (
            <Star
              key={s}
              size={12}
              color={s <= stars ? colors.warning.DEFAULT : colors.text.faint}
              fill={s <= stars ? colors.warning.DEFAULT : 'transparent'}
            />
          ))}
        </View>
      )}

      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      width: CIRCLE_SIZE,
      alignItems: 'center',
      gap: spacing.xs,
    },
    circle: {
      width: CIRCLE_SIZE,
      height: CIRCLE_SIZE,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    locked: {
      opacity: 0.5,
    },
    unlockedRing: {
      borderWidth: 3,
      borderColor: colors.primary.light,
    },
    innerDot: {
      width: 18,
      height: 18,
      borderRadius: radii.full,
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
    starsRow: {
      flexDirection: 'row',
      gap: 2,
    },
    title: {
      fontSize: typography.small,
      fontWeight: '600',
      color: colors.text.secondary,
      textAlign: 'center',
      width: CIRCLE_SIZE,
    },
  });
}
