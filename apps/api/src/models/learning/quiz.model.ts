// Defines a configurable set of questions a profile can be quizzed on, decoupled from
// which MiniApp surfaces it. sourceMiniAppIds lists which miniApp(s)' Terms/Questions/
// BucketEntries the quiz pulls its content pool from — this lets sibling miniApps (e.g.
// Dictionary and Quiz under the same Topic) share one bucket/question pool even though
// they are separate MiniApp documents.
//
// mode: 'dynamic' quizzes (e.g. "General Dictionary Quiz") select questions live from the
// profile's bucket each session. mode: 'fixed' quizzes (e.g. a roadmap lesson's practice
// set) use a pinned questionIds list — RoadmapNode.items[] references these Quiz docs
// directly by _id (itemType: 'quiz'), there is no Lesson.quizId wrapper. mode: 'pool'
// quizzes (added for mobile's Quiz Modes feature) select a random slice of every active
// Question scoped to the quiz's miniAppId (a Course, for roadmap content) — questionIds
// stays empty, and sourceMiniAppIds/bucketFilter are unused for this mode. One
// isDefault:true, mode:'pool' Quiz is auto-created per Course (see
// studio/course.service.ts's createCourse and seed/migrations/2026-08-quiz-modes-pool.ts
// for the backfill) so `POST /api/quiz/session { miniAppId: courseId }` resolves to it the
// same way it already does for Dictionary's dynamic quiz.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import { BucketFilter } from './quizSession.model';

// Mirrors packages/shared/constants/quizPlayModes.ts's QuizPlayModeId — kept as a local,
// manually-synced string union (same convention as QuizMode/FeedbackMode below) rather than an
// import, since this file otherwise declares its own mirrored types throughout.
export type QuizPlayModeId =
  | 'classic'
  | 'hearts'
  | 'time_run'
  | 'streak'
  | 'perfect'
  | 'endless'
  | 'survival'
  | 'mastery';

export type QuizMode = 'dynamic' | 'fixed' | 'pool';

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

// A mode's mode-specific numeric setting(s) — only the field matching that mode's settingKey
// (see packages/shared/constants/quizPlayModes.ts's QuizPlayModeSettingKey) is ever meaningful
// for a given assignment; the rest stay undefined. Kept loose/all-optional rather than a
// discriminated union — this is authored once from Content Studio's dropdown-driven form, not
// hand-constructed, so the extra type safety isn't worth the schema complexity.
export interface IQuizPlayModeSettings {
  questionCount?: number;
  duration?: number;
  hearts?: number;
  mistakeLimit?: number;
  streakTarget?: number; // Mastery — consecutive correct answers required to pass
}

// A teacher's fixed assignment of exactly one Quiz Mode + its settings to this (mode:'fixed')
// quiz — see packages/shared/constants/quizPlayModes.ts's IAssignedPlayMode, which this mirrors.
export interface IAssignedPlayMode {
  id: QuizPlayModeId;
  settings: IQuizPlayModeSettings;
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
  // A teacher's fixed assignment of exactly one Quiz Mode (Classic/Hearts/Time Run/…) + its
  // settings, for a mode:'fixed' roadmap/node quiz ("Topic quiz"). null by default — the quiz
  // plays as an ordinary session, exactly as before Quiz Modes existed. When set (via Content
  // Studio's QuizEditorPage), mobile skips Quiz Mode Select entirely — no grid, no settings
  // pill, nothing for the learner to choose — and starts the session straight into that exact
  // mode/settings. Not read for mode:'dynamic'/'pool' quizzes (Dictionary's quiz, a course's
  // auto-created practice pool) — those are inherently "game" surfaces and always show the mode
  // grid for the learner to pick from, regardless of this field. See
  // docs/technical/mobile-architecture.md's "Quiz Modes" section.
  assignedPlayMode: IAssignedPlayMode | null;
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

const assignedPlayModeSchema = new Schema<IAssignedPlayMode>(
  {
    id: {
      type: String,
      enum: ['classic', 'hearts', 'time_run', 'streak', 'perfect', 'endless', 'survival', 'mastery'],
      required: true,
    },
    settings: {
      questionCount: { type: Number },
      duration: { type: Number },
      hearts: { type: Number },
      mistakeLimit: { type: Number },
      streakTarget: { type: Number },
    },
  },
  { _id: false }
);

const quizSchema = new Schema<IQuizDocument>(
  {
    miniAppId: { type: Schema.Types.ObjectId, ref: 'MiniApp', required: true },
    sourceMiniAppIds: { type: [Schema.Types.ObjectId], ref: 'MiniApp', default: [] },
    title: { type: String, required: true },
    mode: { type: String, enum: ['dynamic', 'fixed', 'pool'], required: true },
    questionIds: { type: [Schema.Types.ObjectId], ref: 'Question', default: [] },
    settings: { type: quizSettingsSchema, required: true },
    isUserAdjustable: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
    assignedPlayMode: { type: assignedPlayModeSchema, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

quizSchema.index({ miniAppId: 1, isActive: 1 });
quizSchema.index({ miniAppId: 1, isDefault: 1 });

const Quiz: Model<IQuizDocument> = mongoose.model<IQuizDocument>('Quiz', quizSchema);

export default Quiz;
