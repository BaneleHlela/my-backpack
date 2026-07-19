// Defines a configurable set of questions a profile can be quizzed on, decoupled from
// which MiniApp surfaces it. sourceMiniAppIds lists which miniApp(s)' Terms/Questions/
// BucketEntries the quiz pulls its content pool from — this lets sibling miniApps (e.g.
// Dictionary and Quiz under the same Topic) share one bucket/question pool even though
// they are separate MiniApp documents.
//
// mode: 'dynamic' quizzes (e.g. "General Dictionary Quiz") select questions live from the
// profile's bucket each session. mode: 'fixed' quizzes (e.g. a roadmap lesson's practice
// set) use a pinned questionIds list. Lessons reference a Quiz via Lesson.quizId instead
// of storing questionIds directly.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import { BucketFilter } from './quizSession.model';

export type QuizMode = 'dynamic' | 'fixed';

// 'immediate' shows correctness/points right after each question (a submit-per-question
// flow); 'end' defers all feedback to a single breakdown on the results screen.
export type FeedbackMode = 'immediate' | 'end';

export interface IQuizSettings {
  questionCount: number;
  timeLimit?: number;
  questionTypes: string[];
  bucketFilter: BucketFilter;
  feedbackMode: FeedbackMode;
  shuffleQuestions: boolean; // randomize question order at session-start time instead of
                             // using the quiz's authored/selected order
}

export interface IQuizDocument extends Document {
  _id: Types.ObjectId;
  miniAppId: Types.ObjectId;
  sourceMiniAppIds: Types.ObjectId[];
  title: string;
  mode: QuizMode;
  questionIds: Types.ObjectId[];
  settings: IQuizSettings;
  isUserAdjustable: boolean;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const quizSettingsSchema = new Schema<IQuizSettings>(
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

const quizSchema = new Schema<IQuizDocument>(
  {
    miniAppId: { type: Schema.Types.ObjectId, ref: 'MiniApp', required: true },
    sourceMiniAppIds: { type: [Schema.Types.ObjectId], ref: 'MiniApp', default: [] },
    title: { type: String, required: true },
    mode: { type: String, enum: ['dynamic', 'fixed'], required: true },
    questionIds: { type: [Schema.Types.ObjectId], ref: 'Question', default: [] },
    settings: { type: quizSettingsSchema, required: true },
    isUserAdjustable: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

quizSchema.index({ miniAppId: 1, isActive: 1 });
quizSchema.index({ miniAppId: 1, isDefault: 1 });

const Quiz: Model<IQuizDocument> = mongoose.model<IQuizDocument>('Quiz', quizSchema);

export default Quiz;
