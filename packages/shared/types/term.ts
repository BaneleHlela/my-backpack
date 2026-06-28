// Shared types for vocabulary terms and definitions.
// Mirrors term.model.ts and definition.model.ts.
// Question types have moved to packages/shared/types/question.ts.

export type TermSource = 'dictionary_api' | 'manual';
export type AIGenerationStatus = 'pending' | 'complete' | 'failed' | 'not_needed';

export interface ITerm {
  _id: string;
  word: string;
  miniAppId: string;
  phonetic?: string;
  origin?: string;
  audioUrl?: string;
  source: TermSource;
  aiGenerationStatus: AIGenerationStatus;
  aiGenerationAttempts: number;
  aiGenerationError?: string;
  aiGeneratedAt?: string;
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
