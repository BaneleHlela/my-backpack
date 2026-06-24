// DTO types for the vocab module — request shapes and response payloads for /api/vocab routes.
import { EntryStatus } from '../../models/apps/language/vocabulary/bucketEntry.model';
import { ITermDocument } from '../../models/apps/language/vocabulary/term.model';
import { IDefinitionDocument } from '../../models/apps/language/vocabulary/definition.model';
import { IQuestionDocument } from '../../models/apps/language/vocabulary/question.model';
import { ILearningRecordDocument } from '../../models/learning/learningRecord.model';

export interface SearchVocabQuery {
  word: string;
  miniAppId: string;
}

export interface AddToBucketDto {
  termId: string;
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

export interface BucketEntryWithDetails {
  entryId: string;
  termId: string;
  word: string;
  phonetic?: string;
  audioUrl?: string;
  status: EntryStatus;
  addedAt: Date;
  confidenceScore: number;
  learningStatus: string;
}

export interface PaginatedBucketResponse {
  entries: BucketEntryWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TermDetailResult {
  term: ITermDocument;
  definitions: IDefinitionDocument[];
  questions: IQuestionDocument[];
  learningRecord: ILearningRecordDocument | null;
  inBucket: boolean;
}
