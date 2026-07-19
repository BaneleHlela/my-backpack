// Vocabulary Quiz mini-app screen. Owns the session lifecycle: start screen →
// active question loop (answer → feedback → advance) → results.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, BookOpen, SkipForward } from 'lucide-react';
import { resolveHelpers } from '@my-backpack/shared';
import type { IMiniApp } from '@my-backpack/shared';
import type { AppDispatch, RootState } from '../../app/store';
import axiosInstance from '../../lib/axios';
import { subjectSlugToLangCode } from '../../lib/lang';
import {
  startSession,
  submitAnswer,
  advanceQuestion,
  completeSession,
  abandonSession,
  resetQuiz,
} from '../../features/quiz/quizSlice';
import QuizStartScreen from './components/QuizStartScreen';
import type { QuizStartSettings } from './components/QuizStartScreen';
import QuizPageShell from '../../components/quiz/QuizPageShell';
import QuestionRenderer from '../../components/quiz/QuestionRenderer';
import QuizProgress from '../../components/quiz/QuizProgress';
import AnswerFeedback from '../../components/quiz/AnswerFeedback';
import QuizResults from '../../components/quiz/QuizResults';

interface QuizPageProps {
  miniApp: IMiniApp;
  subjectSlug: string;
}

export default function QuizPage({ miniApp, subjectSlug }: QuizPageProps) {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const quiz = useSelector((state: RootState) => state.quiz);
  const { activeProfile } = useSelector((state: RootState) => state.auth);
  const ageGroup = activeProfile?.ageGroup ?? 'adult';
  const lang = subjectSlugToLangCode(subjectSlug);

  const [bucketHasTerms, setBucketHasTerms] = useState<boolean | null>(null);
  const questionStartedAt = useRef<number>(Date.now());

  // Pre-check: don't let the learner start an empty session. Resolved server-side via the
  // mini-app's default Quiz (which may pull its content pool from a sibling mini-app, e.g.
  // the Dictionary, so this can't be answered by checking this mini-app's own bucket directly).
  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get('/quiz/has-content', { params: { miniAppId: miniApp._id } })
      .then((res) => {
        if (!cancelled) setBucketHasTerms(res.data.data.hasContent as boolean);
      })
      .catch(() => {
        if (!cancelled) setBucketHasTerms(true); // fail open — let the start screen attempt it
      });
    return () => {
      cancelled = true;
    };
  }, [miniApp._id]);

  // Reset the slice when leaving the mini-app, and abandon any still-active session.
  useEffect(() => {
    return () => {
      dispatch(resetQuiz());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track the latest session/status in a ref so the unmount-only effect below can read
  // current values without re-running (and re-cleaning-up) on every status transition —
  // an effect with [sessionId, status] deps would otherwise fire its cleanup on every
  // answer (active -> submitting -> awaiting_advance -> ...), abandoning the session mid-quiz.
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
        void dispatch(abandonSession(sessionId));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset the answer timer whenever a new question becomes current.
  useEffect(() => {
    questionStartedAt.current = Date.now();
  }, [quiz.currentQuestion?._id]);

  // Safety net: a session can complete immediately with zero questions
  // (e.g. a customized bucketFilter with no matching terms). Fetch real
  // (zeroed) results rather than leaving the results screen empty.
  useEffect(() => {
    if (quiz.status === 'completed' && !quiz.results && quiz.sessionId) {
      void dispatch(completeSession(quiz.sessionId));
    }
  }, [quiz.status, quiz.results, quiz.sessionId, dispatch]);

  // feedbackMode 'end' skips the per-question AnswerFeedback modal — advance straight
  // through to the next question (or complete the session) as soon as an answer lands.
  useEffect(() => {
    if (quiz.status !== 'awaiting_advance' || quiz.feedbackMode !== 'end') return;
    if (quiz.lastAnswer?.sessionComplete && quiz.sessionId) {
      void dispatch(completeSession(quiz.sessionId));
    } else {
      dispatch(advanceQuestion());
    }
  }, [quiz.status, quiz.feedbackMode, quiz.lastAnswer, quiz.sessionId, dispatch]);

  const handleStart = (settings: QuizStartSettings) => {
    void dispatch(startSession({ miniAppId: miniApp._id, settings }));
  };

  const handleAnswer = (rawResponse: string, selectedOptionIndex?: number) => {
    if (!quiz.sessionId || !quiz.currentQuestion) return;
    void dispatch(
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
    void dispatch(
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
      void dispatch(completeSession(quiz.sessionId));
    } else {
      dispatch(advanceQuestion());
    }
  };

  const handleQuizAgain = () => {
    dispatch(resetQuiz());
  };

  const currentHelpers = quiz.currentQuestion
    ? resolveHelpers(quiz.currentQuestion.content.defaultHelpers, undefined)
    : null;

  return (
    <QuizPageShell
      onBack={() => navigate(`/subject/${subjectSlug}`)}
      title={<h1 className="text-2xl font-bold text-gray-800 mb-4">{miniApp.name}</h1>}
    >
      <AnimatePresence mode="wait">
        {quiz.status === 'idle' && bucketHasTerms === null && (
          <motion.div key="loading" className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
          </motion.div>
        )}

        {quiz.status === 'idle' && bucketHasTerms === false && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/40 backdrop-blur rounded-3xl border border-white/50 p-8 text-center"
          >
            <BookOpen className="w-10 h-10 text-violet-400 mx-auto" />
            <p className="font-semibold text-gray-700 mt-3">No words to quiz yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Add a few words to your bucket from the Dictionary, then come back to test yourself.
            </p>
          </motion.div>
        )}

        {(quiz.status === 'idle' || quiz.status === 'starting') && bucketHasTerms === true && (
          <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <QuizStartScreen isStarting={quiz.status === 'starting'} onStart={handleStart} />
          </motion.div>
        )}

        {quiz.status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/40 backdrop-blur rounded-3xl border border-white/50 p-8 text-center"
          >
            <p className="text-rose-500">{quiz.error ?? 'Something went wrong.'}</p>
            <button
              type="button"
              onClick={() => dispatch(resetQuiz())}
              className="mt-4 px-5 py-2 rounded-xl bg-white/50 border border-white/50 text-sm font-medium text-gray-700 hover:bg-white/70 transition-colors"
            >
              Try again
            </button>
          </motion.div>
        )}

        {(quiz.status === 'active' || quiz.status === 'submitting' || quiz.status === 'awaiting_advance') &&
          quiz.currentQuestion &&
          currentHelpers && (
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 min-h-0 flex flex-col overflow-hidden"
            >
              <QuizProgress answered={quiz.progress.answered} total={quiz.progress.total} ageGroup={ageGroup} />

              <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white/40 backdrop-blur rounded-3xl border border-white/50">
                <QuestionRenderer
                  question={quiz.currentQuestion}
                  helpers={currentHelpers}
                  ageGroup={ageGroup}
                  lang={lang}
                  disabled={quiz.status !== 'active'}
                  isSubmitting={quiz.status === 'submitting'}
                  onAnswer={handleAnswer}
                />
              </div>

              {quiz.status === 'active' && !currentHelpers.retryUntilCorrect && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="flex-shrink-0 flex items-center gap-1.5 mx-auto mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  Skip question
                </button>
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
            </motion.div>
          )}

        {quiz.status === 'completing' && (
          <motion.div key="completing" className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
          </motion.div>
        )}

        {quiz.status === 'completed' && quiz.results && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <QuizResults
              results={quiz.results}
              answeredQuestions={quiz.feedbackMode === 'end' ? quiz.answeredQuestions : undefined}
              onQuizAgain={handleQuizAgain}
              onReturnToDictionary={() => navigate(`/subject/${subjectSlug}`)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </QuizPageShell>
  );
}
