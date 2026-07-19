// Shared UI for mcq_term_to_def, mcq_def_to_term, mcq_correct_usage,
// mcq_incorrect_usage, mcq_fill_blank — a selectable option list.
// content.prompt already carries the fully-composed question text from the
// generator (e.g. "What is the correct definition of \"ephemeral\"?").
//
// Selecting an option never submits immediately — the learner always confirms
// with the dedicated Submit button, regardless of helpers.autoSubmit (that flag
// is reserved for DnD interaction patterns, not click-to-select ones).
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { IQuestionContent, IQuestionHelpers } from '@my-backpack/shared';
import SpokenText from '../SpokenText';

interface McqPatternProps {
  content: IQuestionContent;
  helpers: IQuestionHelpers;
  lang: string;
  disabled?: boolean;
  isSubmitting?: boolean;
  onAnswer: (rawResponse: string, selectedOptionIndex?: number) => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function McqPattern({ content, lang, disabled, isSubmitting, onAnswer }: McqPatternProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const options = content.options ?? [];

  const choose = (index: number) => {
    if (disabled) return;
    setSelected(index);
  };

  const submit = () => {
    if (selected === null || disabled) return;
    onAnswer(options[selected], selected);
  };

  return (
    <div className="space-y-4">
      {content.prompt?.startsWith('audio:') ? (
        <p className="text-lg text-gray-800 whitespace-pre-line">{content.prompt}</p>
      ) : (
        <SpokenText text={content.prompt ?? ''} lang={lang} />
      )}

      <div className="grid gap-2">
        {options.map((option, i) => (
          <button
            key={`${i}-${option}`}
            type="button"
            disabled={disabled}
            onClick={() => choose(i)}
            className={`flex items-center gap-3 text-left px-4 py-3 rounded-2xl border transition-colors disabled:cursor-not-allowed ${
              selected === i
                ? 'bg-violet-500 border-violet-500 text-white'
                : 'bg-white/40 border-white/50 text-gray-800 hover:bg-white/60'
            }`}
          >
            <span
              className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                selected === i ? 'bg-white/25 text-white' : 'bg-white/60 text-gray-600'
              }`}
            >
              {OPTION_LABELS[i] ?? i + 1}
            </span>
            <span>{option}</span>
          </button>
        ))}
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
