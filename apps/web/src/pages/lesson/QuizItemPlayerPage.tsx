// Direct quiz-taking page for a roadmap quiz item — reached straight from NodeLessonsPanel,
// no lesson wrapper in between. Reuses the same question-loop components as the vocab Quiz
// mini-app (QuestionRenderer/AnswerFeedback/QuizProgress/QuizResults) and the existing
// submitAnswer/completeSession/advanceQuestion/resetQuiz thunks — only session-start differs
// (startQuizItemSession posts to the node/item-scoped roadmap endpoint). After the quiz
// session itself completes, one extra call to the roadmap item-complete endpoint runs the
// pass/fail + unlock-cascade logic (this result is page-local navigation state, not shared
// quiz-session state, so it isn't threaded through quizSlice). On a pass, auto-advances to
// the next item (lesson or quiz) after a brief pause to show the score; falls back to the
// roadmap overview when the node has no next item.
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Loader2, SkipForward } from 'lucide-react';
import { resolveHelpers } from '@my-backpack/shared';
import type { AppDispatch, RootState } from '../../app/store';
import type { ItemCompletionResult } from '@my-backpack/shared';
import axiosInstance from '../../lib/axios';
import {
  startQuizItemSession,
  submitAnswer,
  advanceQuestion,
  completeSession,
  abandonSession,
  resetQuiz,
} from '../../features/quiz/quizSlice';
import QuestionRenderer from '../../components/quiz/QuestionRenderer';
import QuizProgress from '../../components/quiz/QuizProgress';
import AnswerFeedback from '../../components/quiz/AnswerFeedback';
import QuizResults from '../../components/quiz/QuizResults';

const AUTO_ADVANCE_DELAY_MS = 1800;

export default function QuizItemPlayerPage() {
  const { subjectSlug, nodeId, itemId } = useParams<{
    subjectSlug: string;
    nodeId: string;
    itemId: string;
  }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const quiz = useSelector((state: RootState) => state.quiz);
  const { activeProfile } = useSelector((state: RootState) => state.auth);
  const ageGroup = activeProfile?.ageGroup ?? 'adult';

  const questionStartedAt = useRef<number>(Date.now());
  const itemCompletionRequested = useRef(false);
  const [itemCompletion, setItemCompletion] = useState<ItemCompletionResult | null>(null);

  const startQuiz = () => {
    if (!nodeId || !itemId) return;
    void dispatch(startQuizItemSession({ nodeId, itemId }));
  };

  // Auto-start — a quiz item has no start-time settings to customise, unlike the vocab quiz.
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
        void dispatch(abandonSession(sessionId));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    questionStartedAt.current = Date.now();
  }, [quiz.currentQuestion?._id]);

  useEffect(() => {
    if (quiz.status === 'completed' && !quiz.results && quiz.sessionId) {
      void dispatch(completeSession(quiz.sessionId));
    }
  }, [quiz.status, quiz.results, quiz.sessionId, dispatch]);

  useEffect(() => {
    if (quiz.status !== 'awaiting_advance' || quiz.feedbackMode !== 'end') return;
    if (quiz.lastAnswer?.sessionComplete && quiz.sessionId) {
      void dispatch(completeSession(quiz.sessionId));
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
    axiosInstance
      .post(`/roadmap/node/${nodeId}/item/${itemId}/complete`, { sessionId: quiz.sessionId })
      .then((res) => setItemCompletion(res.data.data as ItemCompletionResult))
      .catch(() => {
        // ignore — results screen still shows the quiz score even if the roadmap gating call fails
      });
  }, [quiz.status, quiz.results, quiz.sessionId, nodeId, itemId]);

  // On a pass, auto-advance after a brief pause so the learner sees their score first —
  // straight to the next item if there is one, otherwise back to the roadmap overview.
  useEffect(() => {
    if (!itemCompletion?.itemCompleted) return;
    const timer = setTimeout(() => {
      if (itemCompletion.nextItemId && itemCompletion.nextItemType === 'lesson') {
        navigate(`/subject/${subjectSlug}/lesson/${itemCompletion.nextItemId}`);
      } else if (itemCompletion.nextItemId && itemCompletion.nextItemType === 'quiz') {
        navigate(`/subject/${subjectSlug}/node/${nodeId}/quiz/${itemCompletion.nextItemId}`);
      } else {
        navigate(`/subject/${subjectSlug}`);
      }
    }, AUTO_ADVANCE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemCompletion]);

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
    itemCompletionRequested.current = false;
    setItemCompletion(null);
    startQuiz();
  };

  const currentHelpers = quiz.currentQuestion
    ? resolveHelpers(quiz.currentQuestion.content.defaultHelpers, undefined)
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button
        type="button"
        onClick={() => navigate(`/subject/${subjectSlug}`)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to roadmap
      </button>

      <AnimatePresence mode="wait">
        {(quiz.status === 'idle' || quiz.status === 'starting') && (
          <motion.div key="loading" className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
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
              onClick={startQuiz}
              className="mt-4 px-5 py-2 rounded-xl bg-white/50 border border-white/50 text-sm font-medium text-gray-700 hover:bg-white/70 transition-colors"
            >
              Try again
            </button>
          </motion.div>
        )}

        {(quiz.status === 'active' || quiz.status === 'submitting' || quiz.status === 'awaiting_advance') &&
          quiz.currentQuestion &&
          currentHelpers && (
            <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <QuizProgress answered={quiz.progress.answered} total={quiz.progress.total} />

              <div className="bg-white/40 backdrop-blur rounded-3xl border border-white/50">
                <QuestionRenderer
                  question={quiz.currentQuestion}
                  helpers={currentHelpers}
                  disabled={quiz.status !== 'active'}
                  isSubmitting={quiz.status === 'submitting'}
                  onAnswer={handleAnswer}
                />
              </div>

              {quiz.status === 'active' && !currentHelpers.retryUntilCorrect && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="flex items-center gap-1.5 mx-auto mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors"
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
              returnLabel="Back to roadmap"
            />
            {itemCompletion?.nodeCompleted && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 text-center text-sm text-emerald-700"
              >
                Node complete! +{itemCompletion.rewards?.xp ?? 0} XP, +{itemCompletion.rewards?.peanuts ?? 0} peanuts
              </motion.div>
            )}
            {itemCompletion?.itemCompleted && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 text-center text-xs text-gray-400"
              >
                {itemCompletion.nextItemId ? 'Moving to the next item…' : 'Returning to the roadmap…'}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
