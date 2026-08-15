// Shared UI for mcq_term_to_def, mcq_def_to_term, mcq_correct_usage,
// mcq_incorrect_usage, mcq_fill_blank — a selectable option list.
// content.prompt already carries the fully-composed question text from the
// generator (e.g. "What is the correct definition of \"ephemeral\"?").
//
// Selecting an option never submits immediately — the learner always confirms
// with the dedicated Submit button, regardless of helpers.autoSubmit (that flag
// is reserved for DnD interaction patterns, not click-to-select ones).
import { useEffect, useState } from 'react';
import { Loader2, Volume2 } from 'lucide-react';
import { ASSETS } from '@my-backpack/shared';
import type { IQuestionContent, IQuestionHelpers } from '@my-backpack/shared';
import SpokenText from '../SpokenText';

// Fisher-Yates — same local-per-file convention as DndSinglePattern.tsx's shuffle().
function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface McqPatternProps {
  content: IQuestionContent;
  helpers: IQuestionHelpers;
  lang: string;
  disabled?: boolean;
  isSubmitting?: boolean;
  onAnswer: (rawResponse: string, selectedOptionIndex?: number) => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

function resolveAssetUrl(path?: string): string | undefined {
  if (!path) return undefined;
  return path.startsWith('http') ? path : `${ASSETS.GCS_BASE}/${path}`;
}

function playAudio(path?: string) {
  const url = resolveAssetUrl(path);
  if (url) void new Audio(url).play();
}

export default function McqPattern({ content, lang, disabled, isSubmitting, onAnswer }: McqPatternProps) {
  const [selected, setSelected] = useState<number | null>(null);
  // Options are always shuffled client-side — grading matches on rawResponse text against
  // content.correctAnswer (see quizSession.service.ts), never on index, so display order is
  // free to vary independently of the authored/seeded order.
  const [options, setOptions] = useState<string[]>(() => shuffle(content.options ?? []));

  // Reset per-question state whenever a new question loads — previously `selected` (and the
  // shuffled order) carried over from the prior question when the next one was the same
  // pattern type, since this component isn't remounted between questions.
  useEffect(() => {
    setSelected(null);
    setOptions(shuffle(content.options ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

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
