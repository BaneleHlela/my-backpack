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
//
// Quiz Modes gameplay mechanics (hearts/timer/streak/mistake-limit/perfect-run) are layered on
// top via the optional `playMode` prop — orthogonal to `session` (which quiz/questions) and
// universal (applies whether `session` is a curated roadmap-lesson quiz or a course's pool
// quiz). See the "mode rule" effect below and docs/technical/mobile-architecture.md's "Quiz
// Modes" section for the full writeup, including the race this design deliberately avoids
// between the mode-rule effect and the existing feedbackMode:'end' auto-advance effect.
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { BookOpen, Flame, Heart, SkipForward, Timer, X } from 'lucide-react-native';
import { resolveHelpers, radii, spacing, typography } from '@my-backpack/shared';
import type { AgeGroup, ApiResponse, ItemCompletionResult } from '@my-backpack/shared';
import api from '../../lib/api';
import { subjectSlugToLangCode } from '../../lib/lang';
import { useTheme } from '../../theme/ThemeContext';
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
import { getQuizPlayMode, toSessionSettingsOverride, type QuizPlayModeId, type QuizPlayModeSettings } from './quizPlayModes';
import type { AppDispatch, RootState } from '../../store/store';

const AUTO_ADVANCE_DELAY_MS = 1800;

export type QuizSessionSource =
  | { source: 'roadmapItem'; nodeId: string; itemId: string; subjectSlug: string; courseSlug: string }
  | { source: 'miniApp'; miniAppId: string; title?: string };

export interface QuizPlayModeChoice {
  id: QuizPlayModeId;
  settings: QuizPlayModeSettings;
}

type EndedEarlyReason = 'hearts' | 'time' | 'mistakes' | 'perfect' | null;

interface QuizSessionScreenProps {
  session: QuizSessionSource;
  playMode?: QuizPlayModeChoice;
}

export function QuizSessionScreen({ session, playMode }: QuizSessionScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  // The one screen that renders outside ScreenBackground (see its module comment) — this is a
  // root-level fullScreenModal route, so it insets itself directly instead of inheriting padding
  // from that shared wrapper.
  const insets = useSafeAreaInsets();
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

  // Quiz Modes gameplay state — see module comment. playModeDef supplies fallback defaults
  // (buildInitialSettings in QuizModeGrid always seeds full settings, so these fallbacks are a
  // defensive belt-and-braces, not the normal path).
  const playModeDef = playMode ? getQuizPlayMode(playMode.id) : undefined;
  const [hearts, setHearts] = useState(playMode?.settings.hearts ?? playModeDef?.defaultSettings.hearts ?? 3);
  const [mistakes, setMistakes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(
    playMode?.id === 'time_run' ? (playMode.settings.duration ?? playModeDef?.defaultSettings.duration ?? 60) * 1000 : null
  );
  const [endedEarlyReason, setEndedEarlyReason] = useState<EndedEarlyReason>(null);
  // Synchronously readable (unlike React state) so the feedbackMode:'end' auto-advance effect
  // below — which fires in the SAME commit as the mode-rule effect whenever a new answer
  // arrives — can tell an early-end decision was just made and skip its own advance/complete
  // dispatch instead of racing it. See the module comment.
  const endedEarlyRef = useRef<EndedEarlyReason>(null);

  const startQuiz = () => {
    if (session.source === 'roadmapItem') {
      dispatch(startQuizItemSession({ nodeId: session.nodeId, itemId: session.itemId }));
    } else {
      const settings = playMode ? toSessionSettingsOverride(playMode.settings) : undefined;
      dispatch(startMiniAppQuizSession({ miniAppId: session.miniAppId, settings }));
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

  // Quiz Modes: applies the active mode's per-answer rule (decrement hearts, count a mistake,
  // update streak, or end a Perfect run) exactly once per new answer, regardless of
  // feedbackMode — hearts/mistakes/streak must update for immediate-feedback sessions too, not
  // just 'end' ones. Runs BEFORE the feedbackMode:'end' effect below in source order (React
  // fires a component's effects in declaration order within one commit), so when it decides the
  // run is over it sets endedEarlyRef synchronously first — the second effect checks that ref
  // and bails instead of also dispatching advanceQuestion()/completeSession() from its own
  // (now-stale) closure. A plain boolean/state guard wouldn't work here: both effects capture
  // their `quiz`/state values from the same render, so only a ref (read fresh at call time,
  // not closure-creation time) can communicate across them within one commit.
  useEffect(() => {
    if (!playMode || !quiz.lastAnswer || !quiz.sessionId) return;
    const wrong = !quiz.lastAnswer.isCorrect;

    if (playMode.id === 'hearts' || playMode.id === 'survival') {
      if (!wrong) return;
      const next = hearts - 1;
      setHearts(next);
      if (next <= 0) {
        endedEarlyRef.current = 'hearts';
        setEndedEarlyReason('hearts');
        dispatch(completeSession(quiz.sessionId));
      }
    } else if (playMode.id === 'perfect') {
      if (!wrong) return;
      endedEarlyRef.current = 'perfect';
      setEndedEarlyReason('perfect');
      dispatch(completeSession(quiz.sessionId));
    } else if (playMode.id === 'endless') {
      if (!wrong) return;
      const next = mistakes + 1;
      setMistakes(next);
      const limit = playMode.settings.mistakeLimit ?? playModeDef?.defaultSettings.mistakeLimit ?? 5;
      if (next >= limit) {
        endedEarlyRef.current = 'mistakes';
        setEndedEarlyReason('mistakes');
        dispatch(completeSession(quiz.sessionId));
      }
    } else if (playMode.id === 'streak') {
      if (wrong) {
        setStreak(0);
      } else {
        const next = streak + 1;
        setStreak(next);
        setBestStreak((prev) => Math.max(prev, next));
      }
    }
    // classic / time_run: no per-answer rule — time_run ends via the timer effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.lastAnswer]);

  useEffect(() => {
    if (quiz.status !== 'awaiting_advance' || quiz.feedbackMode !== 'end') return;
    if (endedEarlyRef.current) return;
    if (quiz.lastAnswer?.sessionComplete && quiz.sessionId) {
      dispatch(completeSession(quiz.sessionId));
    } else {
      dispatch(advanceQuestion());
    }
  }, [quiz.status, quiz.feedbackMode, quiz.lastAnswer, quiz.sessionId, dispatch]);

  // Time Run: an independent countdown, separate from the answer flow above — it can end the
  // session mid-question. The ticking effect only restarts on status/mode changes (the interval
  // callback uses the updater form, so it never reads a stale `timeLeftMs` from closure); the
  // second effect fires once when the countdown actually reaches 0.
  useEffect(() => {
    if (playMode?.id !== 'time_run' || timeLeftMs === null) return;
    if (!['active', 'submitting', 'awaiting_advance'].includes(quiz.status)) return;

    const interval = setInterval(() => {
      setTimeLeftMs((prev) => (prev === null ? null : Math.max(prev - 1000, 0)));
    }, 1000);
    return () => clearInterval(interval);
    // Deliberately narrowed to timeLeftMs===null (not timeLeftMs itself) — the interval ticks
    // via the updater form above, so restarting it every second would just be wasted teardown/
    // setup for no behavioral difference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playMode?.id, quiz.status, timeLeftMs === null]);

  useEffect(() => {
    if (playMode?.id !== 'time_run' || timeLeftMs !== 0) return;
    if (!quiz.sessionId || endedEarlyRef.current) return;
    endedEarlyRef.current = 'time';
    setEndedEarlyReason('time');
    dispatch(completeSession(quiz.sessionId));
  }, [timeLeftMs]);

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
    // Defensive — the mode-rule effect normally preempts this by moving quiz.status away from
    // 'awaiting_advance' before the user can tap Advance at all (see its module comment); this
    // guard only matters if that race is somehow lost.
    if (endedEarlyRef.current) return;
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
    // Reset Quiz Modes gameplay state for the new run.
    endedEarlyRef.current = null;
    setEndedEarlyReason(null);
    setHearts(playMode?.settings.hearts ?? playModeDef?.defaultSettings.hearts ?? 3);
    setMistakes(0);
    setStreak(0);
    setBestStreak(0);
    setTimeLeftMs(
      playMode?.id === 'time_run' ? (playMode.settings.duration ?? playModeDef?.defaultSettings.duration ?? 60) * 1000 : null
    );
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

  // Quiz Modes in-session HUD — a minimal "why might this run end" indicator. Classic/Perfect
  // have nothing worth showing mid-session (Perfect ends on the first wrong answer regardless
  // of a visible counter); intentionally no HUD for those.
  let modeHud: { Icon?: typeof Heart; text: string } | null = null;
  if (playMode?.id === 'hearts' || playMode?.id === 'survival') {
    modeHud = { Icon: Heart, text: `${Math.max(hearts, 0)}` };
  } else if (playMode?.id === 'streak') {
    modeHud = { Icon: Flame, text: `${streak}` };
  } else if (playMode?.id === 'endless') {
    const limit = playMode.settings.mistakeLimit ?? playModeDef?.defaultSettings.mistakeLimit ?? 5;
    modeHud = { text: `${mistakes}/${limit} mistakes` };
  } else if (playMode?.id === 'time_run' && timeLeftMs !== null) {
    const totalSeconds = Math.ceil(timeLeftMs / 1000);
    modeHud = { Icon: Timer, text: `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}` };
  }

  // Results-screen banner explaining an early end, or (Streak, which never ends early) the
  // best streak reached. undefined renders nothing — QuizResults treats banner as optional.
  let resultsBanner: string | undefined;
  if (endedEarlyReason === 'hearts') resultsBanner = 'Out of hearts!';
  else if (endedEarlyReason === 'time') resultsBanner = "Time's up!";
  else if (endedEarlyReason === 'mistakes') resultsBanner = 'Too many mistakes!';
  else if (endedEarlyReason === 'perfect') resultsBanner = 'Perfect run ended.';
  else if (playMode?.id === 'streak') resultsBanner = `Best streak: ${bestStreak}`;

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
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
            <Text style={styles.emptyTitle}>No questions to quiz yet</Text>
            <Text style={styles.emptyBody}>
              {
                // Generic copy — this screen now also backs a course's Game Quizzes pool, not
                // just Dictionary's bucket-based quiz, and the two have very different "how do
                // I get content here" stories (add words to a bucket vs. a teacher adding
                // questions in Content Studio).
                'Check back once more questions have been added.'
              }
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
              {modeHud && (
                <View style={styles.modeHud}>
                  {modeHud.Icon && <modeHud.Icon size={16} color={colors.primary.dark} />}
                  <Text style={styles.modeHudText}>{modeHud.text}</Text>
                </View>
              )}

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
              returnLabel={session.source === 'roadmapItem' ? 'Back to roadmap' : title ? `Back to ${title}` : 'Back'}
              banner={resultsBanner}
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

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
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
  modeHud: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: colors.surface.glassSoft,
    marginBottom: spacing.xs,
  },
  modeHudText: {
    fontSize: typography.small,
    fontWeight: '700',
    color: colors.primary.dark,
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
}
