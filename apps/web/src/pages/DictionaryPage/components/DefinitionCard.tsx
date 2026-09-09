// One definition of a term, with its own "Add to bucket" button.
import { useState } from 'react';
import { BucketPickerDialog } from '../../../components/buckets/BucketPickerDialog';
import { useDispatch, useSelector } from 'react-redux';
import { Check, Plus } from 'lucide-react';
import type { AppDispatch, RootState } from '../../../app/store';
import { fetchTermDetail } from '../../../features/vocab/vocabSlice';
import type { DefinitionWithStatus } from '../../../features/vocab/vocabSlice';

interface DefinitionCardProps {
  termId: string;
  miniAppId: string;
  index: number;
  entry: DefinitionWithStatus;
}

export default function DefinitionCard({ termId, miniAppId, index, entry }: DefinitionCardProps) {
  const dispatch = useDispatch<AppDispatch>();
  const profileId = useSelector((s: RootState) => s.auth.activeProfile?._id);
  const [picking, setPicking] = useState(false);
  const { definition, inBucket } = entry;

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
          onClick={() => setPicking(true)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            inBucket
              ? 'bg-emerald-100/80 text-emerald-700 cursor-default'
              : 'bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-60'
          }`}
        >
          {inBucket ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {inBucket ? 'Saved · manage' : 'Add to buckets'}
        </button>
      </div>
      {picking && <BucketPickerDialog key={profileId} miniAppId={miniAppId} definitionId={definition._id} onClose={() => setPicking(false)} onSaved={() => { void dispatch(fetchTermDetail(termId)); }} />}
    </div>
  );
}
