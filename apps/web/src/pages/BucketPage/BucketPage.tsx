// My Bucket page for the Dictionary mini-app: filterable, sortable list of bucketed
// terms with bucket status, learning progress, and spaced-repetition info.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2, BookOpen } from 'lucide-react';
import type { IMiniApp } from '@my-backpack/shared';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';
import {
  fetchBucket,
  removeBucketEntry,
  setBucketStatusFilter,
  type BucketTermEntryLite,
} from '../../features/vocab/vocabSlice';
import BucketEntryCard from './components/BucketEntryCard';

interface BucketPageProps {
  miniApp: IMiniApp;
  subjectSlug: string;
}

type StatusFilter = 'all' | 'learning' | 'mastered' | 'paused';
type SortOption = 'recent' | 'alphabetical' | 'confidence' | 'accuracy' | 'lastPracticed' | 'dueForReview';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'learning', label: 'Learning' },
  { value: 'mastered', label: 'Mastered' },
  { value: 'paused', label: 'Paused' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Recently added' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'confidence', label: 'Confidence (high → low)' },
  { value: 'accuracy', label: 'Accuracy (high → low)' },
  { value: 'lastPracticed', label: 'Last practiced' },
  { value: 'dueForReview', label: 'Due for review' },
];

function sortEntries(entries: BucketTermEntryLite[], sortBy: SortOption): BucketTermEntryLite[] {
  const sorted = [...entries];
  switch (sortBy) {
    case 'alphabetical':
      return sorted.sort((a, b) => a.term.word.localeCompare(b.term.word));
    case 'confidence':
      return sorted.sort(
        (a, b) => (b.learningRecord?.confidenceScore ?? 0) - (a.learningRecord?.confidenceScore ?? 0)
      );
    case 'accuracy':
      return sorted.sort((a, b) => {
        const aAcc =
          a.learningRecord && a.learningRecord.totalAnswers > 0
            ? a.learningRecord.correctAnswers / a.learningRecord.totalAnswers
            : -1;
        const bAcc =
          b.learningRecord && b.learningRecord.totalAnswers > 0
            ? b.learningRecord.correctAnswers / b.learningRecord.totalAnswers
            : -1;
        return bAcc - aAcc;
      });
    case 'lastPracticed':
      return sorted.sort((a, b) => {
        const aTime = a.learningRecord?.lastAnsweredAt
          ? new Date(a.learningRecord.lastAnsweredAt).getTime()
          : -Infinity;
        const bTime = b.learningRecord?.lastAnsweredAt
          ? new Date(b.learningRecord.lastAnsweredAt).getTime()
          : -Infinity;
        return bTime - aTime;
      });
    case 'dueForReview':
      return sorted.sort((a, b) => {
        const aTime = a.learningRecord?.nextReviewAt
          ? new Date(a.learningRecord.nextReviewAt).getTime()
          : Infinity;
        const bTime = b.learningRecord?.nextReviewAt
          ? new Date(b.learningRecord.nextReviewAt).getTime()
          : Infinity;
        return aTime - bTime;
      });
    case 'recent':
    default:
      return sorted.sort(
        (a, b) => new Date(b.entry.addedAt).getTime() - new Date(a.entry.addedAt).getTime()
      );
  }
}

export default function BucketPage({ miniApp, subjectSlug }: BucketPageProps) {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { bucket, bucketLoading, bucketError, bucketStatusFilter, removingTermIds } = useSelector(
    (state: RootState) => state.vocab
  );
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  const { fieldSlug, miniAppSlug } = useParams<{
    fieldSlug: string;
    miniAppSlug: string;
  }>();

  const miniAppBasePath = `/field/${fieldSlug}/subject/${subjectSlug}/miniapp/${miniAppSlug}`;
  const goToTerm = (termId: string) => navigate(`${miniAppBasePath}/term/${termId}`);

  useEffect(() => {
    void dispatch(fetchBucket({ miniAppId: miniApp._id, status: bucketStatusFilter }));
  }, [dispatch, miniApp._id, bucketStatusFilter]);

  const sortedBucket = useMemo(() => sortEntries(bucket, sortBy), [bucket, sortBy]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button
        type="button"
        onClick={() => navigate(miniAppBasePath)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to {miniApp.name}
      </button>

      <h1 className="text-2xl font-bold text-gray-800 mb-4">My Bucket</h1>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white/30 backdrop-blur rounded-xl border border-white/40 p-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => dispatch(setBucketStatusFilter(tab.value))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  bucketStatusFilter === tab.value
                    ? 'bg-violet-500 text-white'
                    : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-1.5 rounded-xl bg-white/40 backdrop-blur border border-white/50 text-xs font-medium text-gray-700"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {bucketLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-violet-400" />
          </div>
        )}

        {bucketError && !bucketLoading && (
          <div className="bg-white/30 backdrop-blur rounded-2xl border border-white/40 p-6 text-center text-gray-500">
            {bucketError}
          </div>
        )}

        {!bucketLoading && !bucketError && sortedBucket.length === 0 && (
          <div className="bg-white/30 backdrop-blur rounded-3xl border border-white/40 p-10 flex flex-col items-center gap-3 text-center">
            <BookOpen className="w-10 h-10 text-violet-300" />
            <p className="text-gray-700 font-semibold">Your bucket is empty</p>
            <p className="text-sm text-gray-500 max-w-xs">
              Search the dictionary and add words you want to learn — they'll show up here.
            </p>
            <button
              type="button"
              onClick={() => navigate(miniAppBasePath)}
              className="mt-2 px-5 py-2 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 transition-colors"
            >
              Browse the dictionary
            </button>
          </div>
        )}

        {!bucketLoading && !bucketError && sortedBucket.length > 0 && (
          <div className="space-y-3">
            {sortedBucket.map((item) => (
              <BucketEntryCard
                key={item.entry._id}
                entry={item}
                onSelect={goToTerm}
                onRemove={(termId) => dispatch(removeBucketEntry({ termId, miniAppId: miniApp._id }))}
                isRemoving={removingTermIds.includes(item.entry.termId)}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
