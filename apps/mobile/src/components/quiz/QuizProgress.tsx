// A bare progress bar — ports apps/web's QuizProgress.tsx, minus its "Question N of M" label
// and Skip rightSlot. Both moved out of this component as part of the full-height/full-width
// question restyle: the question count now surfaces in QuizSessionScreen's mode/stat bar (for
// Classic mode and roadmap-item quizzes with no active play mode, where there's otherwise
// nothing else to show there), and Skip is now a permanent control in the global bottom bar
// alongside Submit — see QuizSessionScreen's module comment.
import { StyleSheet, View } from 'react-native';
import { radii, spacing } from '@my-backpack/shared';
import { useTheme } from '../../theme/ThemeContext';

interface QuizProgressProps {
  answered: number;
  total: number;
}

export function QuizProgress({ answered, total }: QuizProgressProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    track: {
      height: 6,
      borderRadius: radii.full,
      backgroundColor: colors.surface.glassSoft,
      overflow: 'hidden',
      marginVertical: spacing.sm,
    },
    fill: {
      height: '100%',
      borderRadius: radii.full,
      backgroundColor: colors.primary.DEFAULT,
    },
  });
}
