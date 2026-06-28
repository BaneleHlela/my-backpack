// Validates generated question objects before they are saved to the database.
// Ensures structural correctness of the content field; does not check semantic quality.
import { GeneratedQuestion } from './nonAiGenerator';
import { QuestionType } from '../../models/apps/language/vocabulary/question.model';

const VALID_TYPES = new Set<QuestionType>([
  'mcq_term_to_def',
  'mcq_def_to_term',
  'mcq_correct_usage',
  'mcq_incorrect_usage',
  'mcq_fill_blank',
  'fill_blank_typed',
  'true_false_term_def',
  'true_false_def_term',
  'true_false_usage',
  'text_input_def',
  'text_input_audio',
  'text_input_example',
  'mcq_audio',
]);

const MCQ_TYPES = new Set<QuestionType>([
  'mcq_term_to_def',
  'mcq_def_to_term',
  'mcq_correct_usage',
  'mcq_incorrect_usage',
  'mcq_fill_blank',
  'mcq_audio',
]);

const TRUE_FALSE_TYPES = new Set<QuestionType>([
  'true_false_term_def',
  'true_false_def_term',
  'true_false_usage',
]);

export function validateQuestion(question: GeneratedQuestion): boolean {
  if (!VALID_TYPES.has(question.type)) return false;
  if (typeof question.maxPoints !== 'number' || question.maxPoints <= 0) return false;

  const c = question.content;

  // Non-DnD generated questions all require content.prompt and content.correctAnswer
  if (!c.prompt || c.prompt.trim() === '') return false;
  if (!c.correctAnswer || c.correctAnswer.trim() === '') return false;

  if (MCQ_TYPES.has(question.type)) {
    if (!Array.isArray(c.options) || c.options.length !== 4) return false;
    const correctAnswerCount = c.options.filter((o) => o === c.correctAnswer).length;
    if (correctAnswerCount !== 1) {
      console.warn(
        `Question rejected: correctAnswer appears ${correctAnswerCount} times in options ` +
          `(type: ${question.type})`
      );
      return false;
    }
  }

  if (TRUE_FALSE_TYPES.has(question.type)) {
    const opts = c.options;
    if (!Array.isArray(opts) || opts.length !== 2) return false;
    if (opts[0] !== 'True' || opts[1] !== 'False') return false;
    if (c.correctAnswer !== 'True' && c.correctAnswer !== 'False') return false;
  }

  return true;
}

export function validateAiResponse(parsed: unknown): string | null {
  if (!Array.isArray(parsed)) return 'Response is not an array';

  for (const item of parsed as unknown[]) {
    if (typeof item !== 'object' || item === null) return 'Array item is not an object';
    const q = item as Record<string, unknown>;

    if (!q.type || typeof q.type !== 'string') return 'Item missing type';
    if (q.type === 'sentence_for_blank') continue;

    if (!q.prompt || typeof q.prompt !== 'string') return `Item "${q.type}" missing prompt`;
    if (!q.correctAnswer || typeof q.correctAnswer !== 'string') {
      return `Item "${q.type}" missing correctAnswer`;
    }

    if (typeof q.options !== 'undefined') {
      if (!Array.isArray(q.options)) return `Item "${q.type}" options is not an array`;
      if (q.options.length !== 4) return `Item "${q.type}" options must have 4 items`;
      for (const opt of q.options as unknown[]) {
        if (typeof opt !== 'string' || opt.trim() === '') {
          return `Item "${q.type}" has empty string in options`;
        }
      }
    }
  }

  return null;
}
