// A bare progress bar — ports apps/web's QuizProgress.tsx, minus its "Question N of M" label
// and Skip rightSlot. Both moved out of this component as part of the full-height/full-width
// question restyle: the question count now surfaces in QuizSessionScreen's mode/stat bar (for
// Classic mode and roadmap-item quizzes with no active play mode, where there's otherwise
// nothing else to show there), and Skip is now a permanent control in the global bottom bar
// alongside Submit — see QuizSessionScreen's module comment. Fill switched to
// GradientProgressBar (design pass, August 2026: "gradient on sliders instead of plain colour");
// the surrounding marginVertical is kept here (rather than folded into GradientProgressBar
// itself, which other callers don't want) so QuizSessionScreen's spacing is unchanged.
import { StyleSheet, View } from 'react-native';
import { spacing } from '@my-backpack/shared';
import { GradientProgressBar } from '../GradientProgressBar';

interface QuizProgressProps {
  answered: number;
  total: number;
}

export function QuizProgress({ answered, total }: QuizProgressProps) {
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <View style={styles.wrapper}>
      <GradientProgressBar progress={pct} height={6} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: spacing.sm,
  },
});
