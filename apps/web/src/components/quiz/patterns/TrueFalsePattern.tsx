// Shared UI for true_false_term_def, true_false_def_term, true_false_usage —
// a two-button True/False choice. content.prompt already carries the full
// composed question text (and quoted sentence, where relevant).
//
// Selecting an option never submits immediately — the learner always confirms
// with the dedicated Submit button, regardless of helpers.autoSubmit (that flag
// is reserved for DnD interaction patterns, not click-to-select ones).
import { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import type { IQuestionContent, IQuestionHelpers } from '@my-backpack/shared';

interface TrueFalsePatternProps {
  content: IQuestionContent;
  helpers: IQuestionHelpers;
  disabled?: boolean;
  isSubmitting?: boolean;
  onAnswer: (rawResponse: string, selectedOptionIndex?: number) => void;
}

export default function TrueFalsePattern({ content, disabled, isSubmitting, onAnswer }: TrueFalsePatternProps) {
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
      <p className="text-lg text-gray-800 whitespace-pre-line">{content.prompt}</p>

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
