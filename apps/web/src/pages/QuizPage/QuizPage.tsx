// Vocabulary Quiz mini-app screen. Owns the session lifecycle: start screen →
// active question loop (answer → feedback → advance) → results.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Loader2, BookOpen } from 'lucide-react';
import { resolveHelpers } from '@my-backpack/shared';
import type { IMiniApp } from '@my-backpack/shared';
import type { AppDispatch, RootState } from '../../app/store';
import axiosInstance from '../../lib/axios';
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

  const [bucketHasTerms, setBucketHasTerms] = useState<boolean | null>(null);
  const questionStartedAt = useRef<number>(Date.now());

  // Pre-check: don't let the learner start an empty session.
  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get('/vocab/bucket', { params: { miniAppId: miniApp._id, status: 'learning', page: 1, limit: 1 } })
      .then((res) => {
        if (!cancelled) setBucketHasTerms((res.data.data.pagination.total as number) > 0);
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

  useEffect(() => {
    return () => {
      if (
        quiz.sessionId &&
        (quiz.status === 'active' || quiz.status === 'awaiting_advance' || quiz.status === 'submitting')
      ) {
        void dispatch(abandonSession(quiz.sessionId));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.sessionId, quiz.status]);

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

      <h1 className="text-2xl font-bold text-gray-800 mb-4">{miniApp.name}</h1>

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
          quiz.currentQuestion && (
            <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <QuizProgress answered={quiz.progress.answered} total={quiz.progress.total} />

              <div className="bg-white/40 backdrop-blur rounded-3xl border border-white/50 p-6">
                <QuestionRenderer
                  question={quiz.currentQuestion}
                  helpers={resolveHelpers(quiz.currentQuestion.content.defaultHelpers, undefined)}
                  disabled={quiz.status !== 'active'}
                  onAnswer={handleAnswer}
                />
              </div>

              {quiz.status === 'awaiting_advance' && quiz.lastAnswer && (
                <div className="mt-4">
                  <AnswerFeedback
                    isCorrect={quiz.lastAnswer.isCorrect}
                    pointsAwarded={quiz.lastAnswer.pointsAwarded}
                    maxPoints={quiz.lastAnswer.maxPoints}
                    content={quiz.currentQuestion.content}
                    ageGroup={ageGroup}
                    isLastQuestion={quiz.lastAnswer.sessionComplete}
                    onAdvance={handleAdvance}
                  />
                </div>
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
              onQuizAgain={handleQuizAgain}
              onReturnToDictionary={() => navigate(`/subject/${subjectSlug}`)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
