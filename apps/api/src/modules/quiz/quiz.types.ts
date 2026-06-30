// DTO types for the quiz module — request shapes for /api/quiz routes.
import { ResponseType } from '../../models/learning/answerRecord.model';
import { BucketFilter, FeedbackMode } from '../../models/learning/quizSession.model';

export interface CreateSessionDto {
  miniAppId: string;
  settings?: {
    questionCount?: number;
    timeLimit?: number;
    questionTypes?: string[];
    bucketFilter?: BucketFilter;
    feedbackMode?: FeedbackMode;
  };
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
