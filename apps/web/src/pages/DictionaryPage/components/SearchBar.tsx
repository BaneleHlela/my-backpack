// Debounced word search. Shows a single matching result (the API resolves one
// term per word) as a clickable card that opens the shared TermDetail view.
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Volume2 } from 'lucide-react';
import type { AppDispatch, RootState } from '../../../app/store';
import { searchVocab, clearSearch } from '../../../features/vocab/vocabSlice';

const DEBOUNCE_MS = 400;

interface SearchBarProps {
  miniAppId: string;
  onSelectTerm: (termId: string) => void;
}

export default function SearchBar({ miniAppId, onSelectTerm }: SearchBarProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { searchResult, searchStatus, searchError } = useSelector((state: RootState) => state.vocab);
  const [query, setQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      dispatch(clearSearch());
      return;
    }

    debounceRef.current = setTimeout(() => {
      void dispatch(searchVocab({ word: trimmed, miniAppId }));
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, miniAppId]);

  return (
    <div className="relative">
      <div className="relative flex items-center bg-white/40 backdrop-blur border border-white/50 rounded-2xl shadow-sm">
        <Search className="absolute left-4 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a word..."
          className="w-full py-3.5 pl-12 pr-4 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-base"
        />
        {searchStatus === 'loading' && (
          <Loader2 className="absolute right-4 w-5 h-5 text-violet-400 animate-spin" />
        )}
      </div>

      <AnimatePresence>
        {query.trim() && searchStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-2"
          >
            {searchStatus === 'loading' && (
              <div className="bg-white/30 backdrop-blur rounded-2xl border border-white/40 p-4 text-sm text-gray-500">
                Looking that word up — this can take a moment the first time...
              </div>
            )}

            {searchStatus === 'not_found' && (
              <div className="bg-white/30 backdrop-blur rounded-2xl border border-white/40 p-4 text-sm text-gray-500">
                No word found for &ldquo;{query.trim()}&rdquo;.
              </div>
            )}

            {searchStatus === 'error' && (
              <div className="bg-white/30 backdrop-blur rounded-2xl border border-white/40 p-4 text-sm text-red-500">
                {searchError ?? 'Something went wrong searching for that word.'}
              </div>
            )}

            {searchStatus === 'success' && searchResult && (
              <button
                type="button"
                onClick={() => onSelectTerm(searchResult.term._id)}
                className="w-full text-left bg-white/40 backdrop-blur rounded-2xl border border-white/50 p-4 hover:bg-white/60 transition-colors flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{searchResult.term.word}</span>
                    {searchResult.term.phonetic && (
                      <span className="text-sm text-gray-400">{searchResult.term.phonetic}</span>
                    )}
                    {searchResult.term.audioUrl && <Volume2 className="w-3.5 h-3.5 text-gray-400" />}
                  </div>
                  {searchResult.definitions[0] && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {searchResult.definitions[0].definition}
                    </p>
                  )}
                </div>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
