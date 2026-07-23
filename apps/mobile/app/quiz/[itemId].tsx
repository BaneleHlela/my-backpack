// Full-screen quiz-taking route — root-level, sibling of (app)/(auth)/select-profile/
// profile-setup (see docs/technical/mobile-architecture.md's "Roadmap, Lesson & Quiz UI"
// section for why). Ports apps/web's QuizItemPlayerPage.tsx's state machine: reuses the
// quizSlice session lifecycle (startQuizItemSession/submitAnswer/completeSession/
// abandonSession) and, once the quiz session itself completes, makes one direct call to the
// roadmap item-complete endpoint (not through the slice, matching web) to run the
// pass/fail + unlock-cascade logic, then auto-advances to the next item.
//
// Session cleanup fires from an unmount-only effect using a ref to read the latest
// sessionId/status without becoming a dependency — this covers hardware back and swipe-back
// for free, since both unmount this screen exactly like a normal `router.back()` would.
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { SkipForward, X } from 'lucide-react-native';
import { resolveHelpers, colors, radii, spacing, typography } from '@my-backpack/shared';
import type { AgeGroup, ApiResponse, ItemCompletionResult } from '@my-backpack/shared';
import api from '../../src/lib/api';
import {
  startQuizItemSession,
  submitAnswer,
  advanceQuestion,
  completeSession,
  abandonSession,
  resetQuiz,
} from '../../src/features/quiz/quizSlice';
import { QuestionRenderer } from '../../src/components/quiz/QuestionRenderer';
import { QuizProgress } from '../../src/components/quiz/QuizProgress';
import { AnswerFeedback } from '../../src/components/quiz/AnswerFeedback';
import { QuizResults } from '../../src/components/quiz/QuizResults';
import type { AppDispatch, RootState } from '../../src/store/store';

const AUTO_ADVANCE_DELAY_MS = 1800;

export default function QuizScreen() {
  const { itemId, nodeId, subjectSlug, courseSlug } = useLocalSearchParams<{
    itemId: string;
    nodeId: string;
    subjectSlug: string;
    courseSlug: string;
  }>();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const quiz = useSelector((state: RootState) => state.quiz);
  const activeProfile = useSelector((state: RootState) => state.auth.activeProfile);
  const ageGroup: AgeGroup = activeProfile?.ageGroup ?? 'adult';

  const questionStartedAt = useRef<number>(Date.now());
  const itemCompletionRequested = useRef(false);
  const [itemCompletion, setItemCompletion] = useState<ItemCompletionResult | null>(null);

  const startQuiz = () => {
    if (!nodeId || !itemId) return;
    dispatch(startQuizItemSession({ nodeId, itemId }));
  };

  // Auto-start — a roadmap quiz item has no start-time settings to customise.
  useEffect(() => {
    startQuiz();
    return () => {
      dispatch(resetQuiz());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sessionRef = useRef<{ sessionId: string | null; status: typeof quiz.status }>({
    sessionId: quiz.sessionId,
    status: quiz.status,
  });
  useEffect(() => {
    sessionRef.current = { sessionId: quiz.sessionId, status: quiz.status };
  }, [quiz.sessionId, quiz.status]);

  useEffect(() => {
    return () => {
      const { sessionId, status } = sessionRef.current;
      if (sessionId && (status === 'active' || status === 'awaiting_advance' || status === 'submitting')) {
        dispatch(abandonSession(sessionId));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    questionStartedAt.current = Date.now();
  }, [quiz.currentQuestion?._id]);

  useEffect(() => {
    if (quiz.status === 'completed' && !quiz.results && quiz.sessionId) {
      dispatch(completeSession(quiz.sessionId));
    }
  }, [quiz.status, quiz.results, quiz.sessionId, dispatch]);

  useEffect(() => {
    if (quiz.status !== 'awaiting_advance' || quiz.feedbackMode !== 'end') return;
    if (quiz.lastAnswer?.sessionComplete && quiz.sessionId) {
      dispatch(completeSession(quiz.sessionId));
    } else {
      dispatch(advanceQuestion());
    }
  }, [quiz.status, quiz.feedbackMode, quiz.lastAnswer, quiz.sessionId, dispatch]);

  // Once the quiz session itself has fully completed, run the roadmap-specific pass/fail +
  // unlock cascade exactly once.
  useEffect(() => {
    if (quiz.status !== 'completed' || !quiz.results || itemCompletionRequested.current) return;
    if (!nodeId || !itemId || !quiz.sessionId) return;
    itemCompletionRequested.current = true;
    api
      .post<ApiResponse<ItemCompletionResult>>(`/roadmap/node/${nodeId}/item/${itemId}/complete`, {
        sessionId: quiz.sessionId,
      })
      .then((res) => setItemCompletion(res.data.data))
      .catch(() => {
        // ignore — results screen still shows the quiz score even if the roadmap gating call fails
      });
  }, [quiz.status, quiz.results, quiz.sessionId, nodeId, itemId]);

  // On completion, auto-advance after a brief pause so the learner sees their score first.
  useEffect(() => {
    if (!itemCompletion?.itemCompleted) return;
    const timer = setTimeout(() => {
      if (itemCompletion.nextItemId && itemCompletion.nextItemType === 'lesson') {
        router.replace({
          pathname: '/(app)/subject/[subjectSlug]/course/[courseSlug]/lesson/[lessonId]',
          params: { subjectSlug, courseSlug, lessonId: itemCompletion.nextItemId },
        });
      } else if (itemCompletion.nextItemId && itemCompletion.nextItemType === 'quiz') {
        router.replace({
          pathname: '/quiz/[itemId]',
          params: { itemId: itemCompletion.nextItemId, nodeId, subjectSlug, courseSlug },
        });
      } else {
        router.replace({
          pathname: '/(app)/subject/[subjectSlug]/course/[courseSlug]',
          params: { subjectSlug, courseSlug },
        });
      }
    }, AUTO_ADVANCE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemCompletion]);

  const handleAnswer = (rawResponse: string, selectedOptionIndex?: number) => {
    if (!quiz.sessionId || !quiz.currentQuestion) return;
    dispatch(
      submitAnswer({
        sessionId: quiz.sessionId,
        questionId: quiz.currentQuestion._id,
        rawResponse,
        selectedOptionIndex,
        timeToAnswerMs: Date.now() - questionStartedAt.current,
      })
    );
  };

  const handleSkip = () => {
    if (!quiz.sessionId || !quiz.currentQuestion) return;
    dispatch(
      submitAnswer({
        sessionId: quiz.sessionId,
        questionId: quiz.currentQuestion._id,
        rawResponse: '',
        timeToAnswerMs: Date.now() - questionStartedAt.current,
        wasSkipped: true,
      })
    );
  };

  const handleAdvance = () => {
    if (quiz.lastAnswer?.sessionComplete && quiz.sessionId) {
      dispatch(completeSession(quiz.sessionId));
    } else {
      dispatch(advanceQuestion());
    }
  };

  const handleQuizAgain = () => {
    dispatch(resetQuiz());
    itemCompletionRequested.current = false;
    setItemCompletion(null);
    startQuiz();
  };

  const goToRoadmap = () => {
    router.replace({
      pathname: '/(app)/subject/[subjectSlug]/course/[courseSlug]',
      params: { subjectSlug, courseSlug },
    });
  };

  const currentHelpers = quiz.currentQuestion
    ? resolveHelpers(quiz.currentQuestion.content.defaultHelpers, undefined)
    : null;
  const isDndQuestion = quiz.currentQuestion?.type === 'dnd_single';

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <X size={22} color={colors.text.secondary} />
        </Pressable>
      </View>

      <View style={styles.body}>
        {(quiz.status === 'idle' || quiz.status === 'starting') && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary.DEFAULT} />
          </View>
        )}

        {quiz.status === 'error' && (
          <View style={styles.center}>
            <Text style={styles.errorText}>{quiz.error ?? 'Something went wrong.'}</Text>
            <Pressable onPress={startQuiz} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {(quiz.status === 'active' || quiz.status === 'submitting' || quiz.status === 'awaiting_advance') &&
          quiz.currentQuestion &&
          currentHelpers && (
            <View style={styles.activeWrapper}>
              <QuizProgress
                answered={quiz.progress.answered}
                total={quiz.progress.total}
                ageGroup={ageGroup}
                rightSlot={
                  isDndQuestion && quiz.status === 'active' && !currentHelpers.retryUntilCorrect ? (
                    <Pressable onPress={handleSkip} style={styles.skipRow}>
                      <SkipForward size={14} color={colors.text.muted} />
                      <Text style={styles.skipText}>Skip question</Text>
                    </Pressable>
                  ) : undefined
                }
              />

              <View style={styles.questionCard}>
                <QuestionRenderer
                  question={quiz.currentQuestion}
                  helpers={currentHelpers}
                  ageGroup={ageGroup}
                  disabled={quiz.status !== 'active'}
                  isSubmitting={quiz.status === 'submitting'}
                  onAnswer={handleAnswer}
                />
              </View>

              {!isDndQuestion && quiz.status === 'active' && !currentHelpers.retryUntilCorrect && (
                <Pressable onPress={handleSkip} style={styles.skipRowCentered}>
                  <SkipForward size={14} color={colors.text.muted} />
                  <Text style={styles.skipText}>Skip question</Text>
                </Pressable>
              )}

              {quiz.status === 'awaiting_advance' && quiz.feedbackMode === 'immediate' && quiz.lastAnswer && (
                <AnswerFeedback
                  isCorrect={quiz.lastAnswer.isCorrect}
                  pointsAwarded={quiz.lastAnswer.pointsAwarded}
                  maxPoints={quiz.lastAnswer.maxPoints}
                  content={quiz.currentQuestion.content}
                  ageGroup={ageGroup}
                  isLastQuestion={quiz.lastAnswer.sessionComplete}
                  wasSkipped={quiz.lastAnswer.wasSkipped}
                  onAdvance={handleAdvance}
                />
              )}
            </View>
          )}

        {quiz.status === 'completing' && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary.DEFAULT} />
          </View>
        )}

        {quiz.status === 'completed' && quiz.results && (
          <ScrollView contentContainerStyle={styles.resultsWrapper}>
            <QuizResults
              results={quiz.results}
              answeredQuestions={quiz.feedbackMode === 'end' ? quiz.answeredQuestions : undefined}
              onQuizAgain={handleQuizAgain}
              onReturnToRoadmap={goToRoadmap}
            />
            {itemCompletion?.nodeCompleted ? (
              <View style={styles.nodeCompleteBanner}>
                <Text style={styles.nodeCompleteText}>
                  Node complete! +{itemCompletion.rewards?.xp ?? 0} XP, +{itemCompletion.rewards?.peanuts ?? 0} peanuts
                </Text>
              </View>
            ) : null}
            {itemCompletion?.itemCompleted ? (
              <Text style={styles.advanceHint}>
                {itemCompletion.nextItemId ? 'Moving to the next item…' : 'Returning to the roadmap…'}
              </Text>
            ) : null}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  errorText: {
    fontSize: typography.body,
    color: colors.error.dark,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface.glassSoft,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  retryButtonText: {
    fontSize: typography.small,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  activeWrapper: {
    flex: 1,
  },
  questionCard: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.glassSoft,
  },
  skipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  skipRowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  skipText: {
    fontSize: typography.small,
    color: colors.text.muted,
  },
  resultsWrapper: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  nodeCompleteBanner: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.success.light,
  },
  nodeCompleteText: {
    textAlign: 'center',
    fontSize: typography.small,
    color: colors.success.dark,
  },
  advanceHint: {
    marginTop: spacing.sm,
    textAlign: 'center',
    fontSize: typography.small,
    color: colors.text.muted,
  },
});
