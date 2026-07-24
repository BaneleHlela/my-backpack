// Shared quiz-taking screen — question loop (answer -> feedback -> advance) through to
// results. Extracted from what was inline in app/quiz/[itemId].tsx once a second entry point
// (Dictionary's "Take Quiz", app/quiz/dictionary/[miniAppId].tsx) needed the identical
// session-lifecycle/question-rendering UI but starts from a miniAppId instead of a roadmap
// node+item. Both routes render this component as a thin wrapper, passing a discriminated
// `session` prop describing how to start the session and what "done" means:
//   - roadmapItem: drives the existing roadmap item-complete + auto-advance-to-next-item flow
//   - miniApp: just finishes the session and shows results — no roadmap progress to update
//
// Session cleanup fires from an unmount-only effect using a ref to read the latest
// sessionId/status without becoming a dependency — this covers hardware back and swipe-back
// for free, since both unmount this screen exactly like a normal `router.back()` would.
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { BookOpen, SkipForward, X } from 'lucide-react-native';
import { resolveHelpers, colors, radii, spacing, typography } from '@my-backpack/shared';
import type { AgeGroup, ApiResponse, ItemCompletionResult } from '@my-backpack/shared';
import api from '../../lib/api';
import { subjectSlugToLangCode } from '../../lib/lang';
import {
  startQuizItemSession,
  startMiniAppQuizSession,
  submitAnswer,
  advanceQuestion,
  completeSession,
  abandonSession,
  resetQuiz,
} from '../../features/quiz/quizSlice';
import { QuestionRenderer } from './QuestionRenderer';
import { QuizProgress } from './QuizProgress';
import { AnswerFeedback } from './AnswerFeedback';
import { QuizResults } from './QuizResults';
import type { AppDispatch, RootState } from '../../store/store';

const AUTO_ADVANCE_DELAY_MS = 1800;

export type QuizSessionSource =
  | { source: 'roadmapItem'; nodeId: string; itemId: string; subjectSlug: string; courseSlug: string }
  | { source: 'miniApp'; miniAppId: string; title?: string };

interface QuizSessionScreenProps {
  session: QuizSessionSource;
}

export function QuizSessionScreen({ session }: QuizSessionScreenProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const quiz = useSelector((state: RootState) => state.quiz);
  const activeProfile = useSelector((state: RootState) => state.auth.activeProfile);
  const ageGroup: AgeGroup = activeProfile?.ageGroup ?? 'adult';

  const questionStartedAt = useRef<number>(Date.now());
  const itemCompletionRequested = useRef(false);
  const [itemCompletion, setItemCompletion] = useState<ItemCompletionResult | null>(null);
  // Only the miniApp source needs a pre-check — a roadmap quiz item's questions are curated
  // for that node, so there's nothing to fail-open around; seeded straight to `true`.
  const [hasContent, setHasContent] = useState<boolean | null>(session.source === 'miniApp' ? null : true);

  const startQuiz = () => {
    if (session.source === 'roadmapItem') {
      dispatch(startQuizItemSession({ nodeId: session.nodeId, itemId: session.itemId }));
    } else {
      dispatch(startMiniAppQuizSession({ miniAppId: session.miniAppId }));
    }
  };

  // Mini-app pre-check: don't let the learner start an empty session. Fails open on error —
  // mirrors apps/web's QuizPage.tsx (let the start attempt fail on its own rather than
  // blocking the button on a flaky has-content call).
  useEffect(() => {
    if (session.source !== 'miniApp') return;
    let cancelled = false;
    api
      .get<ApiResponse<{ hasContent: boolean }>>('/quiz/has-content', { params: { miniAppId: session.miniAppId } })
      .then((res) => {
        if (!cancelled) setHasContent(res.data.data.hasContent);
      })
      .catch(() => {
        if (!cancelled) setHasContent(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.source === 'miniApp' ? session.miniAppId : null]);

  // Auto-start once we know there's content to quiz on — neither source exposes a start-time
  // settings screen (mobile doesn't port web's QuizStartScreen customize flow), so both go
  // straight from "known startable" to an active session.
  useEffect(() => {
    if (hasContent !== true) return;
    startQuiz();
    return () => {
      dispatch(resetQuiz());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasContent]);

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

  // Roadmap-specific: once the quiz session itself has fully completed, run the pass/fail +
  // unlock cascade exactly once. No equivalent for a mini-app session — it has no roadmap
  // progress to update.
  useEffect(() => {
    if (session.source !== 'roadmapItem') return;
    if (quiz.status !== 'completed' || !quiz.results || itemCompletionRequested.current) return;
    if (!quiz.sessionId) return;
    itemCompletionRequested.current = true;
    const { nodeId, itemId } = session;
    api
      .post<ApiResponse<ItemCompletionResult>>(`/roadmap/node/${nodeId}/item/${itemId}/complete`, {
        sessionId: quiz.sessionId,
      })
      .then((res) => setItemCompletion(res.data.data))
      .catch(() => {
        // ignore — results screen still shows the quiz score even if the roadmap gating call fails
      });
  }, [session, quiz.status, quiz.results, quiz.sessionId]);

  // Roadmap-specific: auto-advance to the next item after a brief pause so the learner sees
  // their score first.
  useEffect(() => {
    if (session.source !== 'roadmapItem' || !itemCompletion?.itemCompleted) return;
    const { subjectSlug, courseSlug, nodeId } = session;
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

  const goToReturn = () => {
    if (session.source === 'roadmapItem') {
      router.replace({
        pathname: '/(app)/subject/[subjectSlug]/course/[courseSlug]',
        params: { subjectSlug: session.subjectSlug, courseSlug: session.courseSlug },
      });
    } else {
      router.back();
    }
  };

  const currentHelpers = quiz.currentQuestion
    ? resolveHelpers(quiz.currentQuestion.content.defaultHelpers, undefined)
    : null;
  const isDndQuestion = quiz.currentQuestion?.type === 'dnd_single';
  const title = session.source === 'miniApp' ? session.title : undefined;
  // Dictionary has exactly one mini-app, seeded under English — no isiZulu dictionary exists
  // yet, so that path is hardcoded rather than plumbing subjectSlug through the mini-app quiz
  // route. Revisit if a non-English dictionary is ever seeded.
  const lang = session.source === 'roadmapItem' ? subjectSlugToLangCode(session.subjectSlug) : 'en-US';

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        {title ? (
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {title}
          </Text>
        ) : (
          <View />
        )}
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <X size={22} color={colors.text.secondary} />
        </Pressable>
      </View>

      <View style={styles.body}>
        {session.source === 'miniApp' && hasContent === null && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary.DEFAULT} />
          </View>
        )}

        {session.source === 'miniApp' && hasContent === false && (
          <View style={styles.emptyState}>
            <BookOpen size={40} color={colors.primary.light} />
            <Text style={styles.emptyTitle}>No words to quiz yet</Text>
            <Text style={styles.emptyBody}>
              Add a few words to your bucket from the Dictionary, then come back to test yourself.
            </Text>
          </View>
        )}

        {hasContent === true && (quiz.status === 'idle' || quiz.status === 'starting') && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary.DEFAULT} />
          </View>
        )}

        {hasContent === true && quiz.status === 'error' && (
          <View style={styles.center}>
            <Text style={styles.errorText}>{quiz.error ?? 'Something went wrong.'}</Text>
            <Pressable onPress={startQuiz} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {hasContent === true &&
          (quiz.status === 'active' || quiz.status === 'submitting' || quiz.status === 'awaiting_advance') &&
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
                  lang={lang}
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
                  lang={lang}
                  isLastQuestion={quiz.lastAnswer.sessionComplete}
                  wasSkipped={quiz.lastAnswer.wasSkipped}
                  onAdvance={handleAdvance}
                />
              )}
            </View>
          )}

        {hasContent === true && quiz.status === 'completing' && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary.DEFAULT} />
          </View>
        )}

        {hasContent === true && quiz.status === 'completed' && quiz.results && (
          <ScrollView contentContainerStyle={styles.resultsWrapper}>
            <QuizResults
              results={quiz.results}
              answeredQuestions={quiz.feedbackMode === 'end' ? quiz.answeredQuestions : undefined}
              onQuizAgain={handleQuizAgain}
              onReturn={goToReturn}
              returnLabel={session.source === 'roadmapItem' ? 'Back to roadmap' : 'Back to Dictionary'}
            />
            {session.source === 'roadmapItem' && itemCompletion?.nodeCompleted ? (
              <View style={styles.nodeCompleteBanner}>
                <Text style={styles.nodeCompleteText}>
                  Node complete! +{itemCompletion.rewards?.xp ?? 0} XP, +{itemCompletion.rewards?.peanuts ?? 0} peanuts
                </Text>
              </View>
            ) : null}
            {session.source === 'roadmapItem' && itemCompletion?.itemCompleted ? (
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  topBarTitle: {
    flex: 1,
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text.primary,
    marginRight: spacing.sm,
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  emptyBody: {
    fontSize: typography.small,
    color: colors.text.muted,
    textAlign: 'center',
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
