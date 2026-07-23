// "Question N of M" label plus a progress bar. Ports apps/web's QuizProgress.tsx.
// `rightSlot` (e.g. a Skip button) renders inline with the label — used by DnD questions
// (Phase 4), which fold their Skip control up here instead of showing it below the question.
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@my-backpack/shared';
import type { AgeGroup } from '@my-backpack/shared';

interface QuizProgressProps {
  answered: number;
  total: number;
  ageGroup?: AgeGroup;
  rightSlot?: ReactNode;
}

export function QuizProgress({ answered, total, ageGroup, rightSlot }: QuizProgressProps) {
  const isChild = ageGroup === 'child';
  const current = Math.min(answered + 1, total || 1);
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, isChild && styles.labelChild]}>
          Question {current} of {total}
        </Text>
        {rightSlot}
      </View>
      <View style={[styles.track, isChild && styles.trackChild]}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.small,
    color: colors.text.muted,
  },
  labelChild: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  track: {
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surface.glassSoft,
    overflow: 'hidden',
  },
  trackChild: {
    height: 12,
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.primary.DEFAULT,
  },
});
