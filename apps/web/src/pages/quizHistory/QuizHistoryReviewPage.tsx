// Read-only review of one past quiz attempt — every question in session order with the given
// answer, correct answer, points, and explanation, reconstructed server-side from persisted
// AnswerRecord + Question documents (unlike the live QuizResults breakdown, which only exists
// in ephemeral Redux state during an active session).
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, SkipForward, HelpCircle, RotateCcw, ChevronLeft } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';
import type { QuestionType, SessionReviewItem } from '@my-backpack/shared';
import { fetchSessionReview, resetReview } from '../../features/quizHistory/quizHistorySlice';
import { getRetakePath } from '../../features/quizHistory/quizHistoryLinks';
import QuizPageShell from '../../components/quiz/QuizPageShell';

// Mirrors quizSession.service.ts's DND_TYPES — DnD rawResponse is a JSON placements blob, not
// human-readable, so the "Your answer: X" line is skipped for these types (matches the existing
// QuizResults breakdown's treatment of DnD answers).
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

function questionStatusIcon(item: SessionReviewItem) {
  if (!item.attempted) return <HelpCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />;
  if (item.wasSkipped) return <SkipForward className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />;
  if (item.isCorrect) return <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />;
  return <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />;
}

function displayPrompt(prompt?: string): string {
  if (!prompt) return 'Question';
  return prompt.startsWith('audio:') ? '🔊 Audio question' : prompt;
}

function formatTime(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
}

export default function QuizHistoryReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { review, reviewStatus, reviewError } = useSelector((state: RootState) => state.quizHistory);

  useEffect(() => {
    if (sessionId) void dispatch(fetchSessionReview(sessionId));
    return () => {
      dispatch(resetReview());
    };
  }, [dispatch, sessionId]);

  const session = review?.session;
  const retakePath = session ? getRetakePath(session) : null;

  return (
    <QuizPageShell onBack={() => navigate('/quiz-history')} backLabel="Back to history">
      {reviewStatus === 'loading' && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        </div>
      )}

      {reviewStatus === 'failed' && (
        <div className="bg-white/40 backdrop-blur rounded-3xl border border-white/50 p-8 text-center">
          <p className="text-rose-500">{reviewError ?? 'Could not load this attempt.'}</p>
        </div>
      )}

      {reviewStatus === 'succeeded' && review && session && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pb-4">
          <div className="bg-white/40 backdrop-blur rounded-3xl border border-white/50 p-6 text-center">
            <p className="text-xs font-semibold text-violet-500 uppercase tracking-wide">
              {session.quizTitle}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {session.contextName}
              {session.nodeTitle ? ` · ${session.nodeTitle}` : ''}
            </p>
            <h1 className="text-2xl font-bold text-gray-800 mt-2">
              {session.results?.percentageScore ?? 0}% score
            </h1>
            <p className="text-gray-500 mt-1">
              {session.results?.correct ?? 0} of {session.results?.totalQuestions ?? review.items.length}{' '}
              correct
              {session.status === 'abandoned' ? ' · Abandoned' : ''}
            </p>
            <div className="grid grid-cols-3 gap-3 mt-5 text-left">
              <div className="bg-white/40 rounded-2xl p-3">
                <p className="text-xs text-gray-500">Answered</p>
                <p className="font-semibold text-gray-800">
                  {session.results?.answered ?? 0}/{session.results?.totalQuestions ?? review.items.length}
                </p>
              </div>
              <div className="bg-white/40 rounded-2xl p-3">
                <p className="text-xs text-gray-500">Points</p>
                <p className="font-semibold text-gray-800">
                  {session.results?.totalPointsAwarded ?? 0}/{session.results?.totalPointsAvailable ?? 0}
                </p>
              </div>
              <div className="bg-white/40 rounded-2xl p-3">
                <p className="text-xs text-gray-500">Time</p>
                <p className="font-semibold text-gray-800">{formatTime(session.results?.timeTakenMs ?? 0)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {review.items.map((item, i) => (
              <div
                key={item.questionId}
                className="flex items-start gap-3 bg-white/40 backdrop-blur rounded-2xl border border-white/50 p-3"
              >
                {questionStatusIcon(item)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">
                    {i + 1}. {displayPrompt(item.content.prompt)}
                  </p>

                  {!item.attempted && <p className="text-xs text-gray-400 mt-0.5">Not attempted</p>}

                  {item.attempted && item.wasSkipped && (
                    <p className="text-xs text-gray-400 mt-0.5">Skipped</p>
                  )}

                  {item.attempted &&
                    !item.wasSkipped &&
                    !DND_TYPES.has(item.type) &&
                    !item.isCorrect &&
                    item.content.correctAnswer && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Your answer: {item.rawResponse || '—'} · Correct: {item.content.correctAnswer}
                      </p>
                    )}

                  {item.content.explanation && (
                    <p className="text-xs text-gray-500 mt-1">{item.content.explanation}</p>
                  )}

                  <p className="text-xs text-gray-400 mt-1">
                    {item.pointsAwarded}/{item.maxPoints} points
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/quiz-history')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/50 border border-white/50 text-sm font-medium text-gray-700 hover:bg-white/70 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to history
            </button>
            <button
              type="button"
              disabled={!retakePath}
              onClick={() => retakePath && navigate(retakePath)}
              title={retakePath ? undefined : 'Not available for this attempt'}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-violet-500"
            >
              <RotateCcw className="w-4 h-4" />
              Retake
            </button>
          </div>
        </motion.div>
      )}
    </QuizPageShell>
  );
}
