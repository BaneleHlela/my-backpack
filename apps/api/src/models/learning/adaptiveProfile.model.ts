// One document per profile. Stores the profile's aggregate learning statistics and is used
// by adaptiveLearning.service.ts to personalise question selection and confidence updates.
//
// miniAppStats is a Map keyed by miniAppId (as string). Each entry tracks:
//   learningVelocity — ratio of platform average to this profile's average questions-to-mastery.
//     > 1.0 = profile masters terms faster than average (needs fewer questions).
//     < 1.0 = profile is slower than average (needs more questions).
//   Recalculated after every 10 terms mastered in that mini-app.
//   Platform average is hardcoded at 5 questions-to-mastery for now.
//
// masteryThreshold — when confidenceScore hits this, the term transitions to 'mastered'.
// Stored per profile so it can be tuned individually later without a migration.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

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
  lastStudiedAt?: Date;
}

export interface IAdaptiveProfileDocument extends Document {
  _id: Types.ObjectId;
  profileId: Types.ObjectId;
  miniAppStats: Map<string, IMiniAppStats>;
  globalStats: IGlobalStats;
  masteryThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

const miniAppStatsSchema = new Schema<IMiniAppStats>(
  {
    avgQuestionsToMaster: { type: Number, default: 5 },
    totalTermsMastered: { type: Number, default: 0 },
    totalTermsAttempted: { type: Number, default: 0 },
    learningVelocity: { type: Number, default: 1.0 },
  },
  { _id: false }
);

const globalStatsSchema = new Schema<IGlobalStats>(
  {
    avgQuestionsToMaster: { type: Number, default: 5 },
    totalCorrectAnswers: { type: Number, default: 0 },
    totalAnswers: { type: Number, default: 0 },
    overallAccuracy: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastStudiedAt: { type: Date },
  },
  { _id: false }
);

const adaptiveProfileSchema = new Schema<IAdaptiveProfileDocument>(
  {
    profileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true, unique: true },
    miniAppStats: { type: Map, of: miniAppStatsSchema, default: () => new Map() },
    globalStats: {
      type: globalStatsSchema,
      default: () => ({
        avgQuestionsToMaster: 5,
        totalCorrectAnswers: 0,
        totalAnswers: 0,
        overallAccuracy: 0,
        currentStreak: 0,
        longestStreak: 0,
      }),
    },
    masteryThreshold: { type: Number, default: 0.85 },
  },
  { timestamps: true }
);

const AdaptiveProfile: Model<IAdaptiveProfileDocument> = mongoose.model<IAdaptiveProfileDocument>(
  'AdaptiveProfile',
  adaptiveProfileSchema
);

export default AdaptiveProfile;
