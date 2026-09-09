export interface VocabularyBucket {
  _id: string;
  miniAppId: string;
  name: string;
  description: string;
  color: string;
  visibility: 'private' | 'public';
  isFavorites: boolean;
  includeInQuiz: boolean;
  isOwner: boolean;
  entryCount: number;
  updatedAt: string;
}

export interface BucketWord {
  _id: string;
  termId: string;
  definitionId: string;
  word: string;
  definition: string;
  partOfSpeech: string;
  status?: 'learning' | 'mastered' | 'paused';
  confidenceScore?: number;
}

export interface BucketWordPreview {
  word: string;
  hint?: string;
  termId?: string;
  definitions: { _id: string; definition: string; partOfSpeech: string }[];
  status: 'ready' | 'lookup_required' | 'not_found';
}

export interface QuizBucketOptions {
  supported: boolean;
  quizId: string;
  miniAppIds: string[];
  buckets: VocabularyBucket[];
  bucketIds: string[] | null;
}

export const BUCKET_COLORS = [
  '#A78BFA',
  '#A3E635',
  '#38BDF8',
  '#FBBF24',
  '#FB7185',
  '#2DD4BF',
];
