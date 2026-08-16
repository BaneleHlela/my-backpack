// Read-only review of one past quiz attempt — every question in session order with the given
// answer, correct answer, points, and explanation, reconstructed server-side from persisted
// AnswerRecord + Question documents. Ports apps/web's pages/quizHistory/QuizHistoryReviewPage.tsx.
import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, HelpCircle, RotateCcw, SkipForward, XCircle } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import type { QuestionType, SessionReviewItem } from '@my-backpack/shared';
import { GlassCard } from '../../../src/components/GlassCard';
import { Menubar } from '../../../src/components/Menubar';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fonts } from '../../../src/theme/fonts';
import { fetchSessionReview, resetReview } from '../../../src/features/quizHistory/quizHistorySlice';
import { canRetake, navigateToRetake } from '../../../src/components/quiz/quizHistoryLinks';
import type { AppDispatch, RootState } from '../../../src/store/store';

// Mirrors quizSession.service.ts's DND_TYPES — DnD rawResponse is a JSON placements blob, not
// human-readable, so the "Your answer: X" line is skipped for these types.
const DND_TYPES = new Set<QuestionType>([
  'dnd_single',
  'dnd_select',
  'dnd_count',
  'dnd_sort',
  'dnd_sequence',
  'dnd_match',
  'dnd_fill',
  'dnd_build',
]);

function displayPrompt(prompt?: string): string {
  if (!prompt) return 'Question';
  return prompt.startsWith('audio:') ? '🔊 Audio question' : prompt;
}

function formatTime(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
}

type ThemeColors = ReturnType<typeof useTheme>['colors'];

export default function QuizHistoryReviewScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { review, reviewStatus, reviewError } = useSelector((state: RootState) => state.quizHistory);

  useEffect(() => {
    if (sessionId) dispatch(fetchSessionReview(sessionId));
    return () => {
      dispatch(resetReview());
    };
  }, [dispatch, sessionId]);

  const session = review?.session;
  const retakeable = session ? canRetake(session) : false;

  function questionIcon(item: SessionReviewItem) {
    if (!item.attempted) return <HelpCircle size={18} color={colors.text.faint} />;
    if (item.wasSkipped) return <SkipForward size={18} color={colors.text.faint} />;
    if (item.isCorrect) return <CheckCircle2 size={18} color={colors.success.dark} />;
    return <XCircle size={18} color={colors.error.dark} />;
  }

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} stickyHeaderIndices={[0]}>
        <Menubar label="Back to history" onBackPress={() => router.back()} />

        {reviewStatus === 'loading' ? (
        <ActivityIndicator color={colors.primary.light} style={styles.loading} />
      ) : null}

      {reviewStatus === 'failed' ? (
        <GlassCard intensity="soft" style={styles.margin}>
          <Text style={styles.errorText}>{reviewError ?? 'Could not load this attempt.'}</Text>
        </GlassCard>
      ) : null}

      {reviewStatus === 'succeeded' && review && session ? (
        <>
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.eyebrow}>{session.quizTitle}</Text>
            <Text style={styles.eyebrowMuted}>
              {session.contextName}
              {session.nodeTitle ? ` · ${session.nodeTitle}` : ''}
            </Text>
            <Text style={styles.scoreHeading}>{session.results?.percentageScore ?? 0}% score</Text>
            <Text style={styles.scoreSubtext}>
              {session.results?.correct ?? 0} of {session.results?.totalQuestions ?? review.items.length} correct
              {session.status === 'abandoned' ? ' · Abandoned' : ''}
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Answered</Text>
                <Text style={styles.statValue}>
                  {session.results?.answered ?? 0}/{session.results?.totalQuestions ?? review.items.length}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Points</Text>
                <Text style={styles.statValue}>
                  {session.results?.totalPointsAwarded ?? 0}/{session.results?.totalPointsAvailable ?? 0}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Time</Text>
                <Text style={styles.statValue}>{formatTime(session.results?.timeTakenMs ?? 0)}</Text>
              </View>
            </View>
          </GlassCard>

          <View style={styles.questionList}>
            {review.items.map((item, i) => (
              <GlassCard key={item.questionId} intensity="soft" style={styles.questionCard}>
                <View style={styles.questionRow}>
                  {questionIcon(item)}
                  <View style={styles.questionTextWrap}>
                    <Text style={styles.questionPrompt}>
                      {i + 1}. {displayPrompt(item.content.prompt)}
                    </Text>

                    {!item.attempted ? <Text style={styles.metaText}>Not attempted</Text> : null}
                    {item.attempted && item.wasSkipped ? <Text style={styles.metaText}>Skipped</Text> : null}
                    {item.attempted &&
                    !item.wasSkipped &&
                    !DND_TYPES.has(item.type) &&
                    !item.isCorrect &&
                    item.content.correctAnswer ? (
                      <Text style={styles.metaText}>
                        Your answer: {item.rawResponse || '—'} · Correct: {item.content.correctAnswer}
                      </Text>
                    ) : null}

                    {item.content.explanation ? (
                      <Text style={styles.explanationText}>{item.content.explanation}</Text>
                    ) : null}

                    <Text style={styles.pointsText}>
                      {item.pointsAwarded}/{item.maxPoints} points
                    </Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>

          <PrimaryButton
            title="Retake"
            icon={<RotateCcw size={16} color="#fff" />}
            onPress={() => retakeable && navigateToRetake(router, session)}
            disabled={!retakeable}
            style={styles.retakeButton}
          />
        </>
      ) : null}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    loading: { paddingVertical: spacing.xl },
    margin: { marginHorizontal: spacing.lg },
    errorText: { fontSize: typography.small, color: colors.error.dark, textAlign: 'center' },
    content: { padding: spacing.md, paddingTop: 0, gap: spacing.md },
    summaryCard: { alignItems: 'center' },
    eyebrow: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary.DEFAULT,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    eyebrowMuted: { fontSize: 11, color: colors.text.faint, marginTop: 2 },
    scoreHeading: { fontFamily: fonts.display.bold, fontSize: typography.headingLg, color: colors.text.primary, marginTop: spacing.xs },
    scoreSubtext: { fontSize: typography.small, color: colors.text.muted, marginTop: 2 },
    statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignSelf: 'stretch' },
    statBox: {
      flex: 1,
      backgroundColor: colors.surface.glassSoft,
      borderRadius: radii.md,
      padding: spacing.sm,
    },
    statLabel: { fontSize: 11, color: colors.text.muted },
    statValue: { fontSize: typography.small, fontWeight: '700', color: colors.text.primary, marginTop: 2 },
    questionList: { gap: spacing.sm },
    questionCard: {},
    questionRow: { flexDirection: 'row', gap: spacing.sm },
    questionTextWrap: { flex: 1 },
    questionPrompt: { fontSize: typography.small, color: colors.text.primary },
    metaText: { fontSize: 11, color: colors.text.muted, marginTop: 2 },
    explanationText: { fontSize: 11, color: colors.text.muted, marginTop: 4 },
    pointsText: { fontSize: 11, color: colors.text.faint, marginTop: 4 },
    retakeButton: { marginTop: spacing.xs },
  });
}
