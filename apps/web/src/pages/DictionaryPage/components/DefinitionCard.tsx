// One definition of a term, with its own "Add to bucket" button.
import { useDispatch, useSelector } from 'react-redux';
import { Check, Loader2, Plus } from 'lucide-react';
import type { AppDispatch, RootState } from '../../../app/store';
import { addDefinitionToBucket } from '../../../features/vocab/vocabSlice';
import type { DefinitionWithStatus } from '../../../features/vocab/vocabSlice';

interface DefinitionCardProps {
  termId: string;
  miniAppId: string;
  index: number;
  entry: DefinitionWithStatus;
}

export default function DefinitionCard({ termId, miniAppId, index, entry }: DefinitionCardProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { addingDefinitionIds } = useSelector((state: RootState) => state.vocab);
  const { definition, inBucket } = entry;
  const isAdding = addingDefinitionIds.includes(definition._id);

  return (
    <div className="bg-white/30 backdrop-blur rounded-2xl border border-white/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-violet-500 uppercase tracking-wide">
            {index + 1}. {definition.partOfSpeech}
          </span>
          <p className="text-gray-800 mt-1">{definition.definition}</p>

          {definition.examples.length > 0 && (
            <p className="text-sm text-gray-500 italic mt-2">&ldquo;{definition.examples[0]}&rdquo;</p>
          )}

          {(definition.synonyms.length > 0 || definition.antonyms.length > 0) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
              {definition.synonyms.length > 0 && (
                <span>Synonyms: {definition.synonyms.join(', ')}</span>
              )}
              {definition.antonyms.length > 0 && (
                <span>Antonyms: {definition.antonyms.join(', ')}</span>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={inBucket || isAdding}
          onClick={() =>
            void dispatch(addDefinitionToBucket({ termId, definitionId: definition._id, miniAppId }))
          }
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            inBucket
              ? 'bg-emerald-100/80 text-emerald-700 cursor-default'
              : 'bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-60'
          }`}
        >
          {isAdding ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : inBucket ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          {inBucket ? 'Added' : isAdding ? 'Adding...' : 'Add to bucket'}
        </button>
      </div>
    </div>
  );
}
