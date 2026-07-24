// Final results screen shown after a session completes. Ports apps/web's QuizResults.tsx.
// Now reused by both a roadmap quiz item and a mini-app quiz (Dictionary's "Take Quiz") via
// QuizSessionScreen, so the return action is generic (onReturn/returnLabel) rather than
// roadmap-specific — mirrors web's onReturnToDictionary/returnLabel props. When feedbackMode
// was 'end', answeredQuestions carries a per-question breakdown withheld during the quiz.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BookOpen, CheckCircle2, RotateCcw, SkipForward, Trophy, XCircle } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '@my-backpack/shared';
import type { SessionResults } from '@my-backpack/shared';
import type { AnsweredQuestionSummary } from '../../features/quiz/quizSlice';

interface QuizResultsProps {
  results: SessionResults;
  answeredQuestions?: AnsweredQuestionSummary[];
  onQuizAgain: () => void;
  onReturn: () => void;
  returnLabel?: string;
}

export function QuizResults({
  results,
  answeredQuestions,
  onQuizAgain,
  onReturn,
  returnLabel = 'Back to roadmap',
}: QuizResultsProps) {
  const seconds = Math.round(results.timeTakenMs / 1000);
  const timeLabel = seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;

  return (
    <ScrollView contentContainerStyle={styles.card}>
      <Trophy size={48} color={colors.warning.DEFAULT} style={styles.trophy} />
      <Text style={styles.scoreText}>{results.percentageScore}% score</Text>
      <Text style={styles.subText}>
        {results.correct} of {results.totalQuestions} correct
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Answered</Text>
          <Text style={styles.statValue}>
            {results.answered}/{results.totalQuestions}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Points</Text>
          <Text style={styles.statValue}>
            {results.totalPointsAwarded}/{results.totalPointsAvailable}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Time</Text>
          <Text style={styles.statValue}>{timeLabel}</Text>
        </View>
      </View>

      {answeredQuestions && answeredQuestions.length > 0 ? (
        <View style={styles.breakdown}>
          {answeredQuestions.map((q, i) => (
            <View key={q.questionId} style={styles.breakdownRow}>
              {q.wasSkipped ? (
                <SkipForward size={18} color={colors.text.muted} />
              ) : q.isCorrect ? (
                <CheckCircle2 size={18} color={colors.success.DEFAULT} />
              ) : (
                <XCircle size={18} color={colors.error.DEFAULT} />
              )}
              <View style={styles.breakdownInfo}>
                <Text style={styles.breakdownPrompt} numberOfLines={1}>
                  {i + 1}. {q.prompt ?? 'Question'}
                </Text>
                {!q.wasSkipped && !q.isCorrect && q.correctAnswer ? (
                  <Text style={styles.breakdownDetail}>
                    Your answer: {q.rawResponse || '—'} · Correct: {q.correctAnswer}
                  </Text>
                ) : null}
                <Text style={styles.breakdownDetail}>
                  {q.pointsAwarded}/{q.maxPoints} points
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actionsRow}>
        <Pressable onPress={onReturn} style={styles.secondaryButton}>
          <BookOpen size={16} color={colors.text.secondary} />
          <Text style={styles.secondaryButtonText}>{returnLabel}</Text>
        </Pressable>
        <Pressable onPress={onQuizAgain} style={styles.primaryButton}>
          <RotateCcw size={16} color="#fff" />
          <Text style={styles.primaryButtonText}>Quiz again</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  trophy: {
    marginBottom: spacing.sm,
  },
  scoreText: {
    fontSize: typography.headingLg,
    fontWeight: '700',
    color: colors.text.primary,
  },
  subText: {
    fontSize: typography.body,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    width: '100%',
  },
  statBox: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface.glassSoft,
  },
  statLabel: {
    fontSize: typography.small,
    color: colors.text.muted,
  },
  statValue: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text.primary,
  },
  breakdown: {
    width: '100%',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface.glassSoft,
  },
  breakdownInfo: {
    flex: 1,
  },
  breakdownPrompt: {
    fontSize: typography.small,
    color: colors.text.primary,
  },
  breakdownDetail: {
    fontSize: typography.small,
    color: colors.text.muted,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    width: '100%',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface.glassSoft,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  secondaryButtonText: {
    fontSize: typography.small,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primary.DEFAULT,
  },
  primaryButtonText: {
    fontSize: typography.small,
    fontWeight: '700',
    color: '#fff',
  },
});
