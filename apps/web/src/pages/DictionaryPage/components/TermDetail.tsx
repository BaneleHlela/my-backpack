// Inline term detail view — shared by search, trending, recent, and A-Z browse results.
// Fetches full per-definition bucket/learning status by termId.
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2, Volume2 } from 'lucide-react';
import type { AppDispatch, RootState } from '../../../app/store';
import { clearActiveTerm, fetchTermDetail } from '../../../features/vocab/vocabSlice';
import DefinitionCard from './DefinitionCard';

interface TermDetailProps {
  termId: string;
  miniAppId: string;
  onBack: () => void;
}

export default function TermDetail({ termId, miniAppId, onBack }: TermDetailProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { activeTerm, activeTermLoading, activeTermError } = useSelector(
    (state: RootState) => state.vocab
  );

  useEffect(() => {
    void dispatch(fetchTermDetail(termId));
    return () => {
      dispatch(clearActiveTerm());
    };
  }, [dispatch, termId]);

  const playAudio = (url: string) => {
    const audio = new Audio(url);
    void audio.play();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to search
      </button>

      {activeTermLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-7 h-7 animate-spin text-violet-400" />
        </div>
      )}

      {activeTermError && !activeTermLoading && (
        <div className="bg-white/30 backdrop-blur rounded-2xl border border-white/40 p-6 text-center text-gray-500">
          {activeTermError}
        </div>
      )}

      {!activeTermLoading && !activeTermError && activeTerm && (
        <>
          <div className="bg-white/40 backdrop-blur rounded-3xl border border-white/50 p-5">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-800">{activeTerm.term.word}</h2>
              {activeTerm.term.phonetic && (
                <span className="text-gray-400">{activeTerm.term.phonetic}</span>
              )}
              {activeTerm.term.audioUrl && (
                <button
                  type="button"
                  onClick={() => playAudio(activeTerm.term.audioUrl!)}
                  className="p-1.5 rounded-full hover:bg-white/60 text-violet-500 transition-colors"
                  aria-label="Play pronunciation"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {activeTerm.definitions.length === 0 ? (
            <p className="text-center text-gray-500 py-6 text-sm">
              No definitions available for this word yet.
            </p>
          ) : (
            <div className="space-y-3">
              {activeTerm.definitions.map((entry, i) => (
                <DefinitionCard
                  key={entry.definition._id}
                  termId={termId}
                  miniAppId={miniAppId}
                  index={i}
                  entry={entry}
                />
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
