// Paginated A-Z browse results for the currently selected letter.
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2, Volume2 } from 'lucide-react';
import type { AppDispatch, RootState } from '../../../app/store';
import { browseDictionary } from '../../../features/vocab/vocabSlice';

interface DictionaryBrowseListProps {
  miniAppId: string;
  letter: string;
  onSelectTerm: (termId: string) => void;
}

export default function DictionaryBrowseList({ miniAppId, letter, onSelectTerm }: DictionaryBrowseListProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { browseResults, browsePagination, browseLoading } = useSelector(
    (state: RootState) => state.vocab
  );

  useEffect(() => {
    void dispatch(browseDictionary({ miniAppId, letter, page: 1, limit: 20 }));
  }, [dispatch, miniAppId, letter]);

  const loadMore = () => {
    if (!browsePagination) return;
    void dispatch(
      browseDictionary({ miniAppId, letter, page: browsePagination.page + 1, limit: browsePagination.limit })
    );
  };

  return (
    <div>
      {browseLoading && browseResults.length === 0 ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
        </div>
      ) : browseResults.length === 0 ? (
        <p className="text-center text-gray-500 py-8 text-sm">No words starting with &ldquo;{letter}&rdquo; yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {browseResults.map((term) => (
              <button
                key={term._id}
                type="button"
                onClick={() => onSelectTerm(term._id)}
                className="text-left bg-white/30 backdrop-blur rounded-xl border border-white/40 px-4 py-2.5 hover:bg-white/50 transition-colors flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="font-medium text-gray-800 text-sm">{term.word}</span>
                  {term.phonetic && <span className="text-xs text-gray-400 ml-1.5">{term.phonetic}</span>}
                </div>
                {term.audioUrl && <Volume2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
              </button>
            ))}
          </div>

          {browsePagination?.hasMore && (
            <div className="flex justify-center mt-3">
              <button
                type="button"
                onClick={loadMore}
                disabled={browseLoading}
                className="px-4 py-2 rounded-xl bg-white/40 border border-white/50 text-sm font-medium text-gray-700 hover:bg-white/60 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {browseLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
