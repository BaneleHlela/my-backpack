// Shared types for the adaptive learning system.
// Mirrors learningRecord.model.ts, adaptiveProfile.model.ts, termBucket.model.ts,
// and bucketEntry.model.ts.

export type LearningStatus = 'unseen' | 'learning' | 'mastered' | 'reviewing';
export type EntryStatus = 'learning' | 'mastered' | 'paused';

export interface ILearningRecord {
  _id: string;
  profileId: string;
  termId: string;
  miniAppId: string;
  confidenceScore: number;
  status: LearningStatus;
  totalAnswers: number;
  correctAnswers: number;
  lastAnsweredAt?: string;
  nextReviewAt?: string;
  masteredAt?: string;
  questionsToFirstMastery?: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IMiniAppStats {
  avgQuestionsToMaster: number;
  totalTermsMastered: number;
  totalTermsAttempted: number;
  learningVelocity: number;
}

export interface IGlobalStats {
  avgQuestionsToMaster: number;
  totalCorrectAnswers: number;
  totalAnswers: number;
  overallAccuracy: number;
  currentStreak: number;
  longestStreak: number;
  lastStudiedAt?: string;
}

export interface IAdaptiveProfile {
  _id: string;
  profileId: string;
  miniAppStats: Record<string, IMiniAppStats>;
  globalStats: IGlobalStats;
  masteryThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface ITermBucket {
  _id: string;
  profileId: string;
  miniAppId: string;
  createdAt: string;
  updatedAt: string;
}

export interface IBucketEntry {
  _id: string;
  bucketId: string;
  termId: string;
  profileId: string;
  addedAt: string;
  status: EntryStatus;
  createdAt: string;
  updatedAt: string;
}
