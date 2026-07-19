// Shared types for quiz sessions and answer records.
// Mirrors quizSession.model.ts, quiz.model.ts, and answerRecord.model.ts.

export type SessionStatus = 'active' | 'completed' | 'abandoned';
export type BucketFilter = 'all' | 'learning' | 'mastered';
export type ResponseType = 'mcq_selection' | 'text_input' | 'voice_transcript' | 'true_false';
export type GradingMethod = 'exact_match' | 'keyword_match' | 'ai_graded' | 'pending';
export type QuizMode = 'dynamic' | 'fixed';
// 'immediate' shows correctness/points right after each question; 'end' defers all
// feedback to a single breakdown on the results screen.
export type FeedbackMode = 'immediate' | 'end';

export interface QuizSettings {
  questionCount: number;
  timeLimit?: number;
  questionTypes: string[];
  bucketFilter: BucketFilter;
  feedbackMode: FeedbackMode;
  shuffleQuestions: boolean; // randomize question order at session-start time instead of
                             // using the quiz's authored/selected order
}

export interface IQuiz {
  _id: string;
  miniAppId: string;
  sourceMiniAppIds: string[];
  title: string;
  mode: QuizMode;
  questionIds: string[];
  settings: QuizSettings;
  isUserAdjustable: boolean;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionResults {
  totalQuestions: number;
  answered: number;
  skipped: number;
  correct: number;
  totalPointsAvailable: number;
  totalPointsAwarded: number;
  percentageScore: number;
  timeTakenMs: number;
}

export interface IQuizSession {
  _id: string;
  profileId: string;
  miniAppId: string;
  status: SessionStatus;
  questionIds: string[];
  settings: QuizSettings;
  results?: SessionResults;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAnswerRecord {
  _id: string;
  profileId: string;
  questionId: string;
  termId: string;
  miniAppId: string;
  sessionId: string;
  responseType: ResponseType;
  rawResponse: string;
  selectedOptionIndex?: number;
  maxPoints: number;
  pointsAwarded: number;
  isCorrect: boolean;
  gradingMethod: GradingMethod;
  answeredAt: string;
  timeToAnswerMs: number;
  wasTimedOut: boolean;
  attemptNumber: number;
  wasSkipped: boolean;
  confidenceBefore: number;
  confidenceAfter: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionDto {
  miniAppId: string;
  settings?: Partial<QuizSettings>;
}

export interface CaptureAnswerDto {
  questionId: string;
  responseType: ResponseType;
  rawResponse: string;
  selectedOptionIndex?: number;
  timeToAnswerMs: number;
  wasTimedOut?: boolean;
  wasSkipped?: boolean;
}
