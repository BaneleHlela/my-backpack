// A-Z letter picker — letters with no content are greyed out and disabled.
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../app/store';
import { fetchAlphabet } from '../../../features/vocab/vocabSlice';

const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

interface AlphabetPickerProps {
  miniAppId: string;
  activeLetter: string;
  onSelectLetter: (letter: string) => void;
}

export default function AlphabetPicker({ miniAppId, activeLetter, onSelectLetter }: AlphabetPickerProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { alphabet } = useSelector((state: RootState) => state.vocab);

  useEffect(() => {
    void dispatch(fetchAlphabet(miniAppId));
  }, [dispatch, miniAppId]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {LETTERS.map((letter) => {
        const available = alphabet.includes(letter);
        const isActive = letter === activeLetter;
        return (
          <button
            key={letter}
            type="button"
            disabled={!available}
            onClick={() => onSelectLetter(letter)}
            className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
              isActive
                ? 'bg-violet-500 text-white'
                : available
                ? 'bg-white/40 text-gray-700 hover:bg-white/60'
                : 'bg-white/10 text-gray-300 cursor-not-allowed'
            }`}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}
