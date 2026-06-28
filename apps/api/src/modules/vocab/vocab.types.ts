// DTO types for the vocab module — request shapes and response payloads for /api/vocab routes.
import { EntryStatus } from '../../models/apps/language/vocabulary/bucketEntry.model';
import { ITermDocument } from '../../models/apps/language/vocabulary/term.model';
import { IDefinitionDocument } from '../../models/apps/language/vocabulary/definition.model';
import { IQuestionDocument } from '../../models/apps/language/vocabulary/question.model';

export interface SearchVocabQuery {
  word: string;
  miniAppId: string;
}

export interface AddToBucketDto {
  termId: string;
  definitionId: string;
  miniAppId: string;
}

export interface RemoveFromBucketParams {
  termId: string;
}

export interface GetBucketQuery {
  miniAppId: string;
  status?: 'learning' | 'mastered' | 'all';
  page?: string;
  limit?: string;
}

export interface AddToBucketResult {
  entryId: string;
  termId: string;
  definitionId: string;
  partOfSpeech: string;
  word: string;
  phonetic?: string;
  audioUrl?: string;
  status: EntryStatus;
  addedAt: Date;
  confidenceScore: number;
  learningStatus: string;
}

export interface BucketTermEntry {
  entry: {
    _id: string;
    termId: string;
    definitionId: string;
    partOfSpeech: string;
    status: EntryStatus;
    addedAt: Date;
    confidenceScore: number;
  };
  term: {
    _id: string;
    word: string;
    phonetic?: string;
    audioUrl?: string;
  };
  definition: {
    _id: string;
    definition: string;
    examples: string[];
    partOfSpeech: string;
  };
}

export interface PaginatedBucketResponse {
  terms: BucketTermEntry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface DefinitionWithStatus {
  definition: IDefinitionDocument;
  inBucket: boolean;
  learningRecord: {
    confidenceScore: number;
    status: string;
    totalAnswers: number;
  } | null;
}

export interface TermDetailResult {
  term: ITermDocument;
  definitions: DefinitionWithStatus[];
  questions: IQuestionDocument[];
}

export interface DictionaryBrowseQuery {
  miniAppId: string;
  letter?: string;
  page?: string;
  limit?: string;
}

export interface AlphabetQuery {
  miniAppId: string;
}

export interface TrendingQuery {
  miniAppId: string;
  limit?: string;
}

export interface DictionaryTermPreview {
  _id: string;
  word: string;
  phonetic?: string;
  audioUrl?: string;
  definitionCount: number;
}

export interface DictionaryBrowseResponse {
  terms: DictionaryTermPreview[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  letter: string;
}

export interface AlphabetAvailabilityResponse {
  available: string[];
}

export interface TrendingTermResult {
  term: {
    _id: string;
    word: string;
    phonetic?: string;
    audioUrl?: string;
  };
  primaryDefinition: string | null;
  bucketCount: number;
}

export interface RecentQuery {
  miniAppId: string;
  limit?: string;
}
