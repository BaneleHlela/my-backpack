// Generic retake player for a Quiz History entry that has no dedicated web route of its own —
// a course pool-mode session with no roadmap node (e.g. taken via mobile's Quiz Modes), where
// neither the roadmap quiz-item route nor the Dictionary quiz route applies. Structurally a
// trimmed copy of QuizPage.tsx's active-question loop (same components/thunks) minus the start
// screen/bucket pre-check — starts immediately from the quizId in the URL via
// startSessionByQuizId instead of resolving a mini-app's default quiz.
import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, SkipForward } from 'lucide-react';
import { resolveHelpers } from '@my-backpack/shared';
import type { AppDispatch, RootState } from '../../app/store';
import {
  startSessionByQuizId,
  submitAnswer,
  advanceQuestion,
  completeSession,
  abandonSession,
  resetQuiz,
} from '../../features/quiz/quizSlice';
import QuizPageShell from '../../components/quiz/QuizPageShell';
import QuestionRenderer from '../../components/quiz/QuestionRenderer';
import QuizProgress from '../../components/quiz/QuizProgress';
import AnswerFeedback from '../../components/quiz/AnswerFeedback';
import QuizResults from '../../components/quiz/QuizResults';

export default function QuizHistoryPlayPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const quiz = useSelector((state: RootState) => state.quiz);
  const { activeProfile } = useSelector((state: RootState) => state.auth);
  const ageGroup = activeProfile?.ageGroup ?? 'adult';

  const questionStartedAt = useRef<number>(Date.now());

  const startQuiz = () => {
    if (!quizId) return;
    void dispatch(startSessionByQuizId({ quizId }));
  };

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
    startQuiz();
  };

  const currentHelpers = quiz.currentQuestion
    ? resolveHelpers(quiz.currentQuestion.content.defaultHelpers, undefined)
    : null;
  const isDndQuestion = quiz.currentQuestion?.type === 'dnd_single';

  return (
    <QuizPageShell onBack={() => navigate('/quiz-history')} backLabel="Back to history">
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
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 min-h-0 flex flex-col overflow-hidden"
            >
              <QuizProgress
                answered={quiz.progress.answered}
                total={quiz.progress.total}
                ageGroup={ageGroup}
                rightSlot={
                  isDndQuestion && quiz.status === 'active' && !currentHelpers.retryUntilCorrect ? (
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      Skip question
                    </button>
                  ) : undefined
                }
              />

              <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white/40 backdrop-blur rounded-3xl border border-white/50">
                <QuestionRenderer
                  question={quiz.currentQuestion}
                  helpers={currentHelpers}
                  ageGroup={ageGroup}
                  lang="en-US"
                  disabled={quiz.status !== 'active'}
                  isSubmitting={quiz.status === 'submitting'}
                  onAnswer={handleAnswer}
                />
              </div>

              {!isDndQuestion && quiz.status === 'active' && !currentHelpers.retryUntilCorrect && (
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
                  lang="en-US"
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
              onReturnToDictionary={() => navigate('/quiz-history')}
              returnLabel="Back to history"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </QuizPageShell>
  );
}
