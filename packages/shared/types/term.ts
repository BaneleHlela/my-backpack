// Shared types for vocabulary terms and questions.
// Mirrors term.model.ts, definition.model.ts, and question.model.ts.

export type TermSource = 'dictionary_api' | 'manual';

export interface ITerm {
  _id: string;
  word: string;
  miniAppId: string;
  phonetic?: string;
  origin?: string;
  audioUrl?: string;
  source: TermSource;
  createdAt: string;
  updatedAt: string;
}

export interface IDefinition {
  _id: string;
  termId: string;
  partOfSpeech: string;
  definition: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type QuestionType =
  | 'mcq'
  | 'word_to_def'
  | 'def_to_word'
  | 'fill_blank'
  | 'true_false'
  | 'voice'
  | 'text_input';

export type QuestionSource = 'auto' | 'ai' | 'manual';

export interface IQuestion {
  _id: string;
  termId: string;
  miniAppId: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  maxPoints: number;
  pointsCanBePartial: boolean;
  source: QuestionSource;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
