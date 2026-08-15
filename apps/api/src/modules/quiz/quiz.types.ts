// DTO types for the quiz module — request shapes for /api/quiz routes.
import { ResponseType } from '../../models/learning/answerRecord.model';
import { BucketFilter, FeedbackMode } from '../../models/learning/quizSession.model';

export interface CreateSessionDto {
  // Either miniAppId (resolves to that mini-app's default quiz — the original behavior) or
  // quizId (starts/retakes this exact Quiz directly, bypassing the isDefault lookup — used by
  // Quiz History's retake flow, where the quiz may not be the mini-app's default, e.g. a
  // roadmap Topic quiz) must be provided.
  miniAppId?: string;
  quizId?: string;
  settings?: {
    questionCount?: number;
    timeLimit?: number;
    questionTypes?: string[];
    bucketFilter?: BucketFilter;
    feedbackMode?: FeedbackMode;
    shuffleQuestions?: boolean;
  };
}

export interface QuizHistoryQuery {
  contextId?: string;
  nodeId?: string;
  status?: 'completed' | 'abandoned' | 'all';
  page?: string;
  limit?: string;
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

export interface ListQuizzesQuery {
  miniAppId: string;
}

export interface HasQuizContentQuery {
  miniAppId: string;
}
