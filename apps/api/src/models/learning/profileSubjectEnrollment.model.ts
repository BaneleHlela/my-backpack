// Tracks one profile's enrollment in one subject.
// progressSummary is denormalized for fast dashboard display without aggregation.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type EnrollmentStatus = 'active' | 'paused' | 'completed';

export interface IProgressSummary {
  totalNodes: number;
  completedNodes: number;
  totalItems: number;
  completedItems: number;
  overallProgressPercent: number;
  lastActivityAt?: Date;
}

export interface IProfileSubjectEnrollmentDocument extends Document {
  _id: Types.ObjectId;
  profileId: Types.ObjectId;
  subjectId: Types.ObjectId;
  fieldId: Types.ObjectId;
  enrolledAt: Date;
  lastAccessedAt?: Date;
  status: EnrollmentStatus;
  progressSummary: IProgressSummary;
  createdAt: Date;
  updatedAt: Date;
}

const progressSummarySchema = new Schema<IProgressSummary>(
  {
    totalNodes: { type: Number, default: 0 },
    completedNodes: { type: Number, default: 0 },
    totalItems: { type: Number, default: 0 },
    completedItems: { type: Number, default: 0 },
    overallProgressPercent: { type: Number, default: 0, min: 0, max: 100 },
    lastActivityAt: { type: Date },
  },
  { _id: false }
);

const profileSubjectEnrollmentSchema = new Schema<IProfileSubjectEnrollmentDocument>(
  {
    profileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    fieldId: { type: Schema.Types.ObjectId, ref: 'Field', required: true },
    enrolledAt: { type: Date, default: Date.now },
    lastAccessedAt: { type: Date },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed'],
      default: 'active',
    },
    progressSummary: { type: progressSummarySchema, default: () => ({}) },
  },
  { timestamps: true }
);

profileSubjectEnrollmentSchema.index({ profileId: 1, subjectId: 1 }, { unique: true });
profileSubjectEnrollmentSchema.index({ profileId: 1, fieldId: 1 });
profileSubjectEnrollmentSchema.index({ profileId: 1, status: 1 });

const ProfileSubjectEnrollment: Model<IProfileSubjectEnrollmentDocument> =
  mongoose.model<IProfileSubjectEnrollmentDocument>(
    'ProfileSubjectEnrollment',
    profileSubjectEnrollmentSchema
  );

export default ProfileSubjectEnrollment;
