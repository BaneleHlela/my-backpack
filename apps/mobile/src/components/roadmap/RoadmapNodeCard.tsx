// Adult/teen-style roadmap node: horizontal card in a vertical list. Ports
// apps/web's RoadmapNodeCard.tsx onto GlassCard + theme tokens.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Lock, Star } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '@my-backpack/shared';
import type { NodeStatus } from '@my-backpack/shared';
import { GlassCard } from '../GlassCard';

interface RoadmapNodeCardProps {
  title: string;
  description?: string;
  status: NodeStatus;
  stars: number;
  itemCount: number;
  completedItems: number;
  position: number;
  onPress: () => void;
}

const STATUS_BADGE: Record<NodeStatus, { label: string; color: string }> = {
  locked: { label: 'Locked', color: colors.text.muted },
  unlocked: { label: 'Start', color: colors.primary.DEFAULT },
  in_progress: { label: 'In Progress', color: colors.primary.dark },
  completed: { label: 'Done', color: colors.success.DEFAULT },
};

export default function RoadmapNodeCard({
  title,
  description,
  status,
  stars,
  itemCount,
  completedItems,
  position,
  onPress,
}: RoadmapNodeCardProps) {
  const isLocked = status === 'locked';
  const badge = STATUS_BADGE[status];

  return (
    <Pressable onPress={isLocked ? undefined : onPress} disabled={isLocked}>
      <GlassCard style={[styles.card, isLocked && styles.locked]}>
        <View
          style={[
            styles.positionBadge,
            {
              backgroundColor:
                status === 'completed'
                  ? colors.success.DEFAULT
                  : status === 'in_progress'
                    ? colors.primary.DEFAULT
                    : isLocked
                      ? colors.surface.glassSoft
                      : colors.primary.light,
            },
          ]}
        >
          {isLocked ? <Lock size={16} color={colors.text.muted} /> : (
            <Text style={styles.positionText}>{position}</Text>
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={[styles.badge, { color: badge.color }]}>{badge.label}</Text>
          </View>
          {description ? (
            <Text style={styles.description} numberOfLines={1}>
              {description}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {completedItems}/{itemCount} items
            </Text>
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
          </View>
        </View>

        {!isLocked && <ChevronRight size={18} color={colors.text.muted} />}
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  locked: {
    opacity: 0.6,
  },
  positionBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    fontSize: typography.small,
    fontWeight: '700',
    color: '#fff',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    flexShrink: 1,
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text.primary,
  },
  badge: {
    fontSize: typography.small,
    fontWeight: '600',
  },
  description: {
    fontSize: typography.small,
    color: colors.text.secondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  metaText: {
    fontSize: typography.small,
    color: colors.text.muted,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
});
