// Recently bucketed terms for the current profile in this mini-app.
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { History, Loader2 } from 'lucide-react';
import type { AppDispatch, RootState } from '../../../app/store';
import { fetchRecent } from '../../../features/vocab/vocabSlice';

interface RecentSearchesProps {
  miniAppId: string;
  onSelectTerm: (termId: string) => void;
}

export default function RecentSearches({ miniAppId, onSelectTerm }: RecentSearchesProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { recent, recentLoading } = useSelector((state: RootState) => state.vocab);

  useEffect(() => {
    void dispatch(fetchRecent({ miniAppId, limit: 10 }));
  }, [dispatch, miniAppId]);

  if (!recentLoading && recent.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <History className="w-4 h-4 text-violet-500" />
        <h3 className="text-sm font-semibold text-gray-700">Recently added</h3>
      </div>

      {recentLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {recent.map(({ entry, term }) => (
            <button
              key={entry._id}
              type="button"
              onClick={() => onSelectTerm(term._id)}
              className="px-3 py-1.5 rounded-xl bg-white/30 backdrop-blur border border-white/40 text-sm text-gray-700 hover:bg-white/50 transition-colors"
            >
              {term.word}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
