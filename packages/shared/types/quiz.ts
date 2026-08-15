// Shared types for quiz sessions and answer records.
// Mirrors quizSession.model.ts, quiz.model.ts, and answerRecord.model.ts.
import type { IAssignedPlayMode } from '../constants/quizPlayModes';
import type { IQuestionContent, QuestionType } from './question';

export type SessionStatus = 'active' | 'completed' | 'abandoned';
export type BucketFilter = 'all' | 'learning' | 'mastered';
export type ResponseType = 'mcq_selection' | 'text_input' | 'voice_transcript' | 'true_false';
export type GradingMethod = 'exact_match' | 'keyword_match' | 'ai_graded' | 'pending';
// 'pool' selects a random slice of every active Question scoped to the quiz's miniAppId
// (a Course, for roadmap content) — no pinned questionIds, no bucket. Added for mobile's
// Quiz Modes feature; see apps/api/src/models/learning/quiz.model.ts for the full writeup.
export type QuizMode = 'dynamic' | 'fixed' | 'pool';
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
  // A teacher's fixed assignment of exactly one Quiz Mode + its settings, for mode:'fixed'
  // Topic quizzes — null by default (the quiz plays as an ordinary session). When set, mobile
  // skips Quiz Mode Select entirely and starts the learner straight into that exact mode, no
  // choice involved. Not read for 'dynamic'/'pool' quizzes, which always show the mode grid
  // for the learner to pick from. See quiz.model.ts / constants/quizPlayModes.ts.
  assignedPlayMode: IAssignedPlayMode | null;
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
  // The Quiz this session was created from — optional, absent on sessions created before this
  // field existed (August 2026). See quizSession.model.ts.
  quizId?: string;
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
  // Either miniAppId (resolves to that mini-app's default quiz) or quizId (starts/retakes this
  // exact quiz directly — used by Quiz History's retake flow) must be provided.
  miniAppId?: string;
  quizId?: string;
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

// ── Quiz History ──────────────────────────────────────────────────────────
// One completed/abandoned attempt, enriched with enough course/topic context and slugs to
// render a history list entry and build a retake/review link without extra round-trips.
// Mirrors apps/api/src/modules/quiz/quizHistory.service.ts's QuizHistoryEntry.
export interface QuizHistoryEntry {
  sessionId: string;
  quizId: string | null;
  quizTitle: string;
  quizMode: QuizMode | null;
  // The teacher's Quiz Modes assignment, if any (see IQuiz.assignedPlayMode) — lets a retake
  // reproduce the exact session (hearts/timer/streak/etc.) a normal tap on this quiz would
  // start. null for un-assigned/miniApp quizzes.
  assignedPlayMode: IAssignedPlayMode | null;
  status: SessionStatus;
  percentageScore: number;
  correct: number;
  totalQuestions: number;
  startedAt: string;
  completedAt: string | null;
  timeTakenMs: number;
  // 'course' — a roadmap Topic quiz or a course's auto-created practice pool (miniAppId is a
  // Course._id). 'miniApp' — a Dictionary quiz (miniAppId is an actual MiniApp._id).
  contextType: 'course' | 'miniApp';
  contextId: string;
  contextName: string;
  contextSlug: string;
  fieldSlug: string;
  subjectSlug: string;
  // Set only when this quiz is a roadmap Topic's quiz item — null for Dictionary/pool quizzes.
  nodeId: string | null;
  nodeTitle: string | null;
}

export interface QuizHistoryListResult {
  items: QuizHistoryEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface QuizHistoryFilterOptions {
  courses: { id: string; name: string; slug: string; subjectSlug: string; fieldSlug: string }[];
  topics: { nodeId: string; nodeTitle: string; contextId: string }[];
}

// One question's full review record for a persisted session — reconstructed server-side from
// AnswerRecord + Question (unlike quizSlice's AnsweredQuestionSummary, which only exists
// in-memory during a live session). attempted: false means the learner never reached this
// question (e.g. an abandoned session).
export interface SessionReviewItem {
  questionId: string;
  type: QuestionType;
  content: IQuestionContent;
  maxPoints: number;
  attempted: boolean;
  rawResponse: string | null;
  selectedOptionIndex?: number;
  isCorrect: boolean | null;
  pointsAwarded: number;
  wasSkipped: boolean;
  wasTimedOut: boolean;
  answeredAt: string | null;
  timeToAnswerMs: number | null;
}

export interface SessionReviewResult {
  // Enriched with the same course/topic context as one QuizHistoryEntry (quizTitle through
  // nodeTitle), so the review screen can build a retake link without a second round-trip.
  session: Omit<IQuizSession, 'questionIds'> & {
    quizTitle: string;
    quizMode: QuizMode | null;
    assignedPlayMode: IAssignedPlayMode | null;
    contextType: 'course' | 'miniApp';
    contextId: string;
    contextName: string;
    contextSlug: string;
    fieldSlug: string;
    subjectSlug: string;
    nodeId: string | null;
    nodeTitle: string | null;
  };
  items: SessionReviewItem[];
}
