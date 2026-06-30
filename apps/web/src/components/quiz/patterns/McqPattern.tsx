// Shared UI for mcq_term_to_def, mcq_def_to_term, mcq_correct_usage,
// mcq_incorrect_usage, mcq_fill_blank — a selectable option list.
// content.prompt already carries the fully-composed question text from the
// generator (e.g. "What is the correct definition of \"ephemeral\"?").
import { useState } from 'react';
import type { IQuestionContent, IQuestionHelpers } from '@my-backpack/shared';

interface McqPatternProps {
  content: IQuestionContent;
  helpers: IQuestionHelpers;
  disabled?: boolean;
  onAnswer: (rawResponse: string, selectedOptionIndex?: number) => void;
}

export default function McqPattern({ content, helpers, disabled, onAnswer }: McqPatternProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const options = content.options ?? [];

  const choose = (index: number) => {
    if (disabled) return;
    setSelected(index);
    if (helpers.autoSubmit) {
      onAnswer(options[index], index);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-lg text-gray-800 whitespace-pre-line">{content.prompt}</p>

      <div className="grid gap-2">
        {options.map((option, i) => (
          <button
            key={`${i}-${option}`}
            type="button"
            disabled={disabled}
            onClick={() => choose(i)}
            className={`text-left px-4 py-3 rounded-2xl border transition-colors disabled:cursor-not-allowed ${
              selected === i
                ? 'bg-violet-500 border-violet-500 text-white'
                : 'bg-white/40 border-white/50 text-gray-800 hover:bg-white/60'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {!helpers.autoSubmit && (
        <button
          type="button"
          disabled={selected === null || disabled}
          onClick={() => selected !== null && onAnswer(options[selected], selected)}
          className="w-full py-3 rounded-2xl bg-violet-500 text-white font-semibold hover:bg-violet-600 disabled:opacity-50 transition-colors"
        >
          Submit
        </button>
      )}
    </div>
  );
}
