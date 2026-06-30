// One bucket entry: term + definition with bucket status, learning progress, and a remove action.
import { formatDistanceToNow } from 'date-fns';
import { Volume2, Trash2, Brain, Clock3 } from 'lucide-react';
import type { BucketTermEntryLite } from '../../../features/vocab/vocabSlice';

interface BucketEntryCardProps {
  entry: BucketTermEntryLite;
  onSelect: (termId: string) => void;
  onRemove: (termId: string) => void;
  isRemoving: boolean;
}

const ENTRY_STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  learning: { label: 'Learning', classes: 'bg-violet-100/80 text-violet-700' },
  mastered: { label: 'Mastered', classes: 'bg-emerald-100/80 text-emerald-700' },
  paused: { label: 'Paused', classes: 'bg-gray-100/80 text-gray-500' },
};

const PROGRESS_STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  unseen: { label: 'Not started', classes: 'bg-gray-100/80 text-gray-500' },
  learning: { label: 'In progress', classes: 'bg-blue-100/80 text-blue-700' },
  mastered: { label: 'Mastered', classes: 'bg-amber-100/80 text-amber-700' },
  reviewing: { label: 'Reviewing', classes: 'bg-cyan-100/80 text-cyan-700' },
};

export default function BucketEntryCard({ entry, onSelect, onRemove, isRemoving }: BucketEntryCardProps) {
  const { entry: bucketEntry, term, definition, learningRecord } = entry;

  const entryBadge = ENTRY_STATUS_BADGE[bucketEntry.status] ?? ENTRY_STATUS_BADGE['learning'];
  const progressBadge = learningRecord
    ? PROGRESS_STATUS_BADGE[learningRecord.learningStatus] ?? PROGRESS_STATUS_BADGE['unseen']
    : PROGRESS_STATUS_BADGE['unseen'];

  const confidencePct = learningRecord ? Math.round(learningRecord.confidenceScore * 100) : 0;
  const hasAnswers = !!learningRecord && learningRecord.totalAnswers > 0;
  const accuracyPct = hasAnswers
    ? Math.round((learningRecord!.correctAnswers / learningRecord!.totalAnswers) * 100)
    : 0;

  const isDueForReview =
    !!learningRecord?.nextReviewAt && new Date(learningRecord.nextReviewAt) <= new Date();

  const playAudio = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    const audio = new Audio(url);
    void audio.play();
  };

  return (
    <div
      onClick={() => onSelect(term._id)}
      className="bg-white/30 backdrop-blur rounded-2xl border border-white/40 p-4 cursor-pointer hover:bg-white/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-gray-800">{term.word}</h3>
            {term.phonetic && <span className="text-sm text-gray-400">{term.phonetic}</span>}
            {term.audioUrl && (
              <button
                type="button"
                onClick={(e) => playAudio(e, term.audioUrl!)}
                className="p-1 rounded-full hover:bg-white/60 text-violet-500 transition-colors"
                aria-label="Play pronunciation"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${entryBadge.classes}`}>
              {entryBadge.label}
            </span>
            <span
              className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${progressBadge.classes}`}
            >
              <Brain className="w-3 h-3" />
              {progressBadge.label}
            </span>
            {isDueForReview && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100/80 text-orange-700">
                <Clock3 className="w-3 h-3" />
                Due for review
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600 mt-2">
            <span className="text-xs font-semibold text-violet-500 uppercase tracking-wide mr-1.5">
              {definition.partOfSpeech}
            </span>
            {definition.definition}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 max-w-[140px] h-1.5 bg-white/50 rounded-full overflow-hidden">
              <div className="h-full bg-violet-400 rounded-full" style={{ width: `${confidencePct}%` }} />
            </div>
            <span className="text-xs text-gray-500">{confidencePct}% confidence</span>
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
            {hasAnswers && (
              <span>
                {learningRecord!.correctAnswers}/{learningRecord!.totalAnswers} correct ({accuracyPct}%)
              </span>
            )}
            <span>
              {learningRecord?.lastAnsweredAt
                ? `Last practiced ${formatDistanceToNow(new Date(learningRecord.lastAnsweredAt), { addSuffix: true })}`
                : 'Not yet practiced'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(term._id);
          }}
          disabled={isRemoving}
          className="flex-shrink-0 p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-white/60 transition-colors disabled:opacity-50"
          aria-label="Remove from bucket"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
