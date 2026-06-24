// Tracks a profile's confidence score and answer history for a single vocabulary term.
// Updated after every answer via adaptiveLearning.service.ts.
//
// Confidence score (0.0 → 1.0):
//   Starts at 0. Increases on correct answers, decreases on incorrect ones.
//   The magnitude scales with the score ratio and the profile's learningVelocity.
//
// Status lifecycle:
//   unseen   → term is in bucket but profile has never answered a question for it
//   learning → profile has started; confidence is below the mastery threshold
//   mastered → confidence has reached or exceeded AdaptiveProfile.masteryThreshold (default 0.85)
//   reviewing → previously mastered; in the spaced-repetition review cycle
//
// Spaced repetition:
//   nextReviewAt is set by scheduleNextReview() using a ladder: 1 → 3 → 7 → 14 days.
//   reviewCount tracks which rung of the ladder to use next.
//
// questionsToFirstMastery is recorded once when the term first crosses the mastery threshold.
// It feeds the learningVelocity calculation in AdaptiveProfile.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type LearningStatus = 'unseen' | 'learning' | 'mastered' | 'reviewing';

export interface ILearningRecordDocument extends Document {
  _id: Types.ObjectId;
  profileId: Types.ObjectId;
  termId: Types.ObjectId;
  miniAppId: Types.ObjectId;
  confidenceScore: number;
  status: LearningStatus;
  totalAnswers: number;
  correctAnswers: number;
  lastAnsweredAt?: Date;
  nextReviewAt?: Date;
  masteredAt?: Date;
  questionsToFirstMastery?: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const learningRecordSchema = new Schema<ILearningRecordDocument>(
  {
    profileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    termId: { type: Schema.Types.ObjectId, ref: 'Term', required: true },
    miniAppId: { type: Schema.Types.ObjectId, ref: 'MiniApp', required: true },
    confidenceScore: { type: Number, default: 0.0, min: 0, max: 1 },
    status: {
      type: String,
      enum: ['unseen', 'learning', 'mastered', 'reviewing'],
      default: 'unseen',
    },
    totalAnswers: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    lastAnsweredAt: { type: Date },
    nextReviewAt: { type: Date },
    masteredAt: { type: Date },
    questionsToFirstMastery: { type: Number },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

learningRecordSchema.index({ profileId: 1, termId: 1 }, { unique: true });
learningRecordSchema.index({ profileId: 1, miniAppId: 1, status: 1 });
learningRecordSchema.index({ profileId: 1, miniAppId: 1, nextReviewAt: 1 });

const LearningRecord: Model<ILearningRecordDocument> = mongoose.model<ILearningRecordDocument>(
  'LearningRecord',
  learningRecordSchema
);

export default LearningRecord;
