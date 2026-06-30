// Dispatches to one of three shared interaction patterns based on question.type.
// The 8 dnd_* types and mcq_audio don't have a renderer yet — shown as a clearly
// labelled placeholder so the switch structure doesn't need a future rewrite.
import type { IQuestion, IQuestionHelpers } from '@my-backpack/shared';
import McqPattern from './patterns/McqPattern';
import TrueFalsePattern from './patterns/TrueFalsePattern';
import TypedInputPattern from './patterns/TypedInputPattern';

const MCQ_TYPES = new Set<IQuestion['type']>([
  'mcq_term_to_def',
  'mcq_def_to_term',
  'mcq_correct_usage',
  'mcq_incorrect_usage',
  'mcq_fill_blank',
]);

const TRUE_FALSE_TYPES = new Set<IQuestion['type']>([
  'true_false_term_def',
  'true_false_def_term',
  'true_false_usage',
]);

const TYPED_INPUT_TYPES = new Set<IQuestion['type']>([
  'fill_blank_typed',
  'text_input_def',
  'text_input_audio',
  'text_input_example',
]);

export interface QuestionRendererProps {
  question: IQuestion;
  helpers: IQuestionHelpers;
  disabled?: boolean;
  isSubmitting?: boolean;
  onAnswer: (rawResponse: string, selectedOptionIndex?: number) => void;
}

export default function QuestionRenderer({
  question,
  helpers,
  disabled,
  isSubmitting,
  onAnswer,
}: QuestionRendererProps) {
  const content = question.content;

  if (MCQ_TYPES.has(question.type)) {
    return (
      <McqPattern
        content={content}
        helpers={helpers}
        disabled={disabled}
        isSubmitting={isSubmitting}
        onAnswer={onAnswer}
      />
    );
  }

  if (TRUE_FALSE_TYPES.has(question.type)) {
    return (
      <TrueFalsePattern
        content={content}
        helpers={helpers}
        disabled={disabled}
        isSubmitting={isSubmitting}
        onAnswer={onAnswer}
      />
    );
  }

  if (TYPED_INPUT_TYPES.has(question.type)) {
    return (
      <TypedInputPattern
        type={question.type}
        termId={question.termId}
        content={content}
        helpers={helpers}
        disabled={disabled}
        isSubmitting={isSubmitting}
        onAnswer={onAnswer}
      />
    );
  }

  return (
    <div className="bg-white/30 backdrop-blur rounded-2xl border border-white/40 p-8 text-center">
      <span className="text-3xl">🚧</span>
      <p className="font-semibold text-gray-700 mt-2">Question type not yet supported</p>
      <p className="text-sm text-gray-500 mt-1">
        &ldquo;{question.type}&rdquo; questions will be playable in a future update.
      </p>
    </div>
  );
}
