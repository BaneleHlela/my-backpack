// Shared UI for true_false_term_def, true_false_def_term, true_false_usage —
// a two-button True/False choice. content.prompt already carries the full
// composed question text (and quoted sentence, where relevant).
//
// Selecting an option never submits immediately — the learner always confirms
// with the dedicated Submit button, regardless of helpers.autoSubmit (that flag
// is reserved for DnD interaction patterns, not click-to-select ones).
import { useState } from 'react';
import { Check, X, Loader2, Volume2 } from 'lucide-react';
import { ASSETS } from '@my-backpack/shared';
import type { IQuestionContent, IQuestionHelpers } from '@my-backpack/shared';
import SpokenText from '../SpokenText';

interface TrueFalsePatternProps {
  content: IQuestionContent;
  helpers: IQuestionHelpers;
  lang: string;
  disabled?: boolean;
  isSubmitting?: boolean;
  onAnswer: (rawResponse: string, selectedOptionIndex?: number) => void;
}

function resolveAssetUrl(path?: string): string | undefined {
  if (!path) return undefined;
  return path.startsWith('http') ? path : `${ASSETS.GCS_BASE}/${path}`;
}

function playAudio(path?: string) {
  const url = resolveAssetUrl(path);
  if (url) void new Audio(url).play();
}

export default function TrueFalsePattern({ content, lang, disabled, isSubmitting, onAnswer }: TrueFalsePatternProps) {
  const [selected, setSelected] = useState<'True' | 'False' | null>(null);

  const choose = (value: 'True' | 'False') => {
    if (disabled) return;
    setSelected(value);
  };

  const submit = () => {
    if (!selected || disabled) return;
    onAnswer(selected, selected === 'True' ? 0 : 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          {content.prompt?.startsWith('audio:') ? (
            <p className="text-lg text-gray-800 whitespace-pre-line">{content.prompt}</p>
          ) : (
            <SpokenText text={content.prompt ?? ''} lang={lang} />
          )}
        </div>
        {content.promptAudioUrl && (
          <button
            type="button"
            onClick={() => playAudio(content.promptAudioUrl)}
            aria-label="Play audio"
            className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-xl bg-white/40 border border-white/50 hover:bg-white/60 transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5 text-gray-600" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => choose('True')}
          className={`flex items-center justify-center gap-2 py-4 rounded-2xl border font-semibold transition-colors disabled:cursor-not-allowed ${
            selected === 'True'
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'bg-white/40 border-white/50 text-gray-800 hover:bg-white/60'
          }`}
        >
          <Check className="w-5 h-5" />
          True
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => choose('False')}
          className={`flex items-center justify-center gap-2 py-4 rounded-2xl border font-semibold transition-colors disabled:cursor-not-allowed ${
            selected === 'False'
              ? 'bg-rose-500 border-rose-500 text-white'
              : 'bg-white/40 border-white/50 text-gray-800 hover:bg-white/60'
          }`}
        >
          <X className="w-5 h-5" />
          False
        </button>
      </div>

      <button
        type="button"
        disabled={selected === null || disabled}
        onClick={submit}
        className="w-full py-3 rounded-2xl bg-violet-500 text-white font-semibold hover:bg-violet-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </div>
  );
}
