// DTO types for the quiz module — request shapes for /api/quiz routes.
import { ResponseType } from '../../models/learning/answerRecord.model';
import { BucketFilter } from '../../models/learning/quizSession.model';

export interface CreateSessionDto {
  miniAppId: string;
  settings?: {
    questionCount?: number;
    timeLimit?: number;
    questionTypes?: string[];
    bucketFilter?: BucketFilter;
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
