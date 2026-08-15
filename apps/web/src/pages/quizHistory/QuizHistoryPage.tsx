// Quiz History — every quiz attempt (roadmap Topic quizzes + Dictionary quizzes) a profile has
// taken, filterable by course/topic and status, with score, review, and retake actions. A
// global page (not nested under a course/subject route) — reached from CoursePage's and
// DictionaryPage's "Quiz History" buttons, optionally pre-filtered via ?contextId=&nodeId=.
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2, History as HistoryIcon, RotateCcw, Eye } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';
import type { QuizHistoryEntry } from '@my-backpack/shared';
import {
  fetchQuizHistory,
  fetchHistoryFilterOptions,
  setHistoryFilters,
  setHistoryPage,
  type HistoryStatusFilter,
} from '../../features/quizHistory/quizHistorySlice';
import { getRetakePath } from '../../features/quizHistory/quizHistoryLinks';

const STATUS_TABS: { value: HistoryStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'abandoned', label: 'Abandoned' },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function scoreBadgeClasses(entry: QuizHistoryEntry): string {
  if (entry.status === 'abandoned') return 'bg-gray-100 text-gray-500';
  if (entry.percentageScore >= 70) return 'bg-emerald-100 text-emerald-700';
  if (entry.percentageScore >= 40) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
}

export default function QuizHistoryPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();

  const { items, total, page, limit, filters, status, error, filterOptions } = useSelector(
    (state: RootState) => state.quizHistory
  );

  // Seed filters from the entry-point query params exactly once on mount.
  useEffect(() => {
    const contextId = searchParams.get('contextId') ?? undefined;
    const nodeId = searchParams.get('nodeId') ?? undefined;
    if (contextId || nodeId) {
      dispatch(setHistoryFilters({ contextId, nodeId }));
    }
    void dispatch(fetchHistoryFilterOptions());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void dispatch(
      fetchQuizHistory({
        contextId: filters.contextId,
        nodeId: filters.nodeId,
        status: filters.status,
        page,
        limit,
      })
    );
  }, [dispatch, filters.contextId, filters.nodeId, filters.status, page, limit]);

  const topicsForSelectedCourse = filters.contextId
    ? (filterOptions?.topics ?? []).filter((t) => t.contextId === filters.contextId)
    : filterOptions?.topics ?? [];

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <HistoryIcon className="w-6 h-6 text-violet-500" />
        Quiz History
      </h1>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white/30 backdrop-blur rounded-xl border border-white/40 p-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => dispatch(setHistoryFilters({ status: tab.value }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filters.status === tab.value
                    ? 'bg-violet-500 text-white'
                    : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            value={filters.contextId ?? ''}
            onChange={(e) =>
              dispatch(setHistoryFilters({ contextId: e.target.value || undefined, nodeId: undefined }))
            }
            className="px-3 py-1.5 rounded-xl bg-white/40 backdrop-blur border border-white/50 text-xs font-medium text-gray-700"
          >
            <option value="">All courses</option>
            {(filterOptions?.courses ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filters.nodeId ?? ''}
            onChange={(e) => dispatch(setHistoryFilters({ nodeId: e.target.value || undefined }))}
            disabled={topicsForSelectedCourse.length === 0}
            className="px-3 py-1.5 rounded-xl bg-white/40 backdrop-blur border border-white/50 text-xs font-medium text-gray-700 disabled:opacity-50"
          >
            <option value="">All topics</option>
            {topicsForSelectedCourse.map((t) => (
              <option key={t.nodeId} value={t.nodeId}>
                {t.nodeTitle}
              </option>
            ))}
          </select>
        </div>

        {status === 'loading' && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-violet-400" />
          </div>
        )}

        {status === 'failed' && (
          <div className="bg-white/30 backdrop-blur rounded-2xl border border-white/40 p-6 text-center text-gray-500">
            {error}
          </div>
        )}

        {status === 'succeeded' && items.length === 0 && (
          <div className="bg-white/30 backdrop-blur rounded-3xl border border-white/40 p-10 flex flex-col items-center gap-3 text-center">
            <HistoryIcon className="w-10 h-10 text-violet-300" />
            <p className="text-gray-700 font-semibold">No quizzes taken yet</p>
            <p className="text-sm text-gray-500 max-w-xs">
              Take a quiz from a course or the Dictionary and it'll show up here.
            </p>
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-3">
            {items.map((entry) => {
              const retakePath = getRetakePath(entry);
              return (
                <div
                  key={entry.sessionId}
                  className="bg-white/40 backdrop-blur rounded-2xl border border-white/50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{entry.quizTitle}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {entry.contextName}
                        {entry.nodeTitle ? ` · ${entry.nodeTitle}` : ''}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(entry.completedAt ?? entry.startedAt)}
                        {entry.status === 'abandoned' ? ' · Abandoned' : ''}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold ${scoreBadgeClasses(
                        entry
                      )}`}
                    >
                      {entry.percentageScore}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 mt-3">
                    <p className="text-xs text-gray-500">
                      {entry.correct}/{entry.totalQuestions} correct
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/quiz-history/${entry.sessionId}`)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/50 border border-white/50 text-xs font-medium text-gray-700 hover:bg-white/70 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Review
                      </button>
                      <button
                        type="button"
                        disabled={!retakePath}
                        onClick={() => retakePath && navigate(retakePath)}
                        title={retakePath ? undefined : 'Not available for this attempt'}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-500 text-white text-xs font-semibold hover:bg-violet-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-violet-500"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Retake
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => dispatch(setHistoryPage(page - 1))}
              className="px-3 py-1.5 rounded-lg bg-white/40 border border-white/50 text-xs font-medium text-gray-700 disabled:opacity-40 hover:bg-white/60 transition-colors"
            >
              Prev
            </button>
            <span className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => dispatch(setHistoryPage(page + 1))}
              className="px-3 py-1.5 rounded-lg bg-white/40 border border-white/50 text-xs font-medium text-gray-700 disabled:opacity-40 hover:bg-white/60 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
