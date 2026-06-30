// Horizontal scroll of the most-bucketed terms across all profiles.
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TrendingUp, Loader2 } from 'lucide-react';
import type { AppDispatch, RootState } from '../../../app/store';
import { fetchTrending } from '../../../features/vocab/vocabSlice';

interface TrendingTermsProps {
  miniAppId: string;
  onSelectTerm: (termId: string) => void;
}

export default function TrendingTerms({ miniAppId, onSelectTerm }: TrendingTermsProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { trending, trendingLoading } = useSelector((state: RootState) => state.vocab);

  useEffect(() => {
    void dispatch(fetchTrending({ miniAppId, limit: 10 }));
  }, [dispatch, miniAppId]);

  if (!trendingLoading && trending.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <TrendingUp className="w-4 h-4 text-violet-500" />
        <h3 className="text-sm font-semibold text-gray-700">Trending</h3>
      </div>

      {trendingLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {trending.map(({ term, primaryDefinition }) => (
            <button
              key={term._id}
              type="button"
              onClick={() => onSelectTerm(term._id)}
              className="flex-shrink-0 max-w-[200px] text-left bg-white/40 backdrop-blur rounded-2xl border border-white/50 px-4 py-2.5 hover:bg-white/60 transition-colors"
            >
              <p className="font-semibold text-gray-800 text-sm truncate">{term.word}</p>
              {primaryDefinition && (
                <p className="text-xs text-gray-500 truncate mt-0.5">{primaryDefinition}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
