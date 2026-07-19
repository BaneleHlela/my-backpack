// Groups a set of questions into a single study session for one profile.
// Created when the profile starts a quiz; updated progressively as they answer.
// At session end the results sub-document is populated with aggregated stats.
//
// Session lifecycle:
//   active → (all questions answered or profile calls complete) → completed
//   active → (profile quits early)                             → abandoned
//
// The 'settings' sub-document is snapshotted at creation time so results are always
// reproducible even if global defaults change later.
//
// 'questionIds' is the ordered list the session was built with; individual AnswerRecords
// link back to this session via sessionId.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import type { FeedbackMode } from './quiz.model';

export type SessionStatus = 'active' | 'completed' | 'abandoned';
export type BucketFilter = 'all' | 'learning' | 'mastered';
export type { FeedbackMode };

export interface ISessionSettings {
  questionCount: number;
  timeLimit?: number;
  questionTypes: string[];
  bucketFilter: BucketFilter;
  feedbackMode: FeedbackMode;
  shuffleQuestions: boolean;
}

export interface ISessionResults {
  totalQuestions: number;
  answered: number;
  skipped: number;
  correct: number;
  totalPointsAvailable: number;
  totalPointsAwarded: number;
  percentageScore: number;
  timeTakenMs: number;
}

export interface IQuizSessionDocument extends Document {
  _id: Types.ObjectId;
  profileId: Types.ObjectId;
  miniAppId: Types.ObjectId;
  status: SessionStatus;
  questionIds: Types.ObjectId[];
  settings: ISessionSettings;
  results?: ISessionResults;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSettingsSchema = new Schema<ISessionSettings>(
  {
    questionCount: { type: Number, required: true },
    timeLimit: { type: Number },
    questionTypes: { type: [String], default: [] },
    bucketFilter: {
      type: String,
      enum: ['all', 'learning', 'mastered'],
      default: 'learning',
    },
    feedbackMode: {
      type: String,
      enum: ['immediate', 'end'],
      default: 'immediate',
    },
    shuffleQuestions: { type: Boolean, default: false },
  },
  { _id: false }
);

const sessionResultsSchema = new Schema<ISessionResults>(
  {
    totalQuestions: { type: Number, required: true },
    answered: { type: Number, required: true },
    skipped: { type: Number, required: true },
    correct: { type: Number, required: true },
    totalPointsAvailable: { type: Number, required: true },
    totalPointsAwarded: { type: Number, required: true },
    percentageScore: { type: Number, required: true },
    timeTakenMs: { type: Number, required: true },
  },
  { _id: false }
);

const quizSessionSchema = new Schema<IQuizSessionDocument>(
  {
    profileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    miniAppId: { type: Schema.Types.ObjectId, ref: 'MiniApp', required: true },
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      default: 'active',
    },
    questionIds: { type: [Schema.Types.ObjectId], ref: 'Question', default: [] },
    settings: { type: sessionSettingsSchema, required: true },
    results: { type: sessionResultsSchema },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

quizSessionSchema.index({ profileId: 1, status: 1 });
quizSessionSchema.index({ profileId: 1, miniAppId: 1 });

const QuizSession: Model<IQuizSessionDocument> = mongoose.model<IQuizSessionDocument>(
  'QuizSession',
  quizSessionSchema
);

export default QuizSession;
