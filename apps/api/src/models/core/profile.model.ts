// Mongoose model for Profile — the entity that actually uses the app
import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export type AgeGroup = 'child' | 'teen' | 'adult';

export type EducationLevel =
  | 'grade-r'
  | 'grade-1'
  | 'grade-2'
  | 'grade-3'
  | 'grade-4'
  | 'grade-5'
  | 'grade-6'
  | 'grade-7'
  | 'grade-8'
  | 'grade-9'
  | 'grade-10'
  | 'grade-11'
  | 'grade-12'
  | 'certificate'
  | 'diploma'
  | 'bachelors'
  | 'honours'
  | 'masters'
  | 'phd'
  | 'professional'
  | 'other';

export interface IEducationResult {
  subject: string;
  grade: string;
  year: number;
  level: string;
}

export interface IEducation {
  currentLevel?: EducationLevel;
  institution?: string;
  results: IEducationResult[];
}

export interface IPreferences {
  language: string;
  theme: 'light' | 'dark';
}

export interface IProfileDocument extends Document {
  _id: Types.ObjectId;
  accountId: Types.ObjectId;
  displayName: string;
  avatarUrl?: string;
  ageGroup: AgeGroup;
  dateOfBirth?: Date;
  isOwner: boolean;
  isPlatformAdmin: boolean;
  isSetupComplete: boolean;
  pin?: string;
  education: IEducation;
  preferences: IPreferences;
  progress: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  comparePin(candidate: string): Promise<boolean>;
}

const educationResultSchema = new Schema<IEducationResult>(
  {
    subject: { type: String, required: true },
    grade: { type: String, required: true },
    year: { type: Number, required: true },
    level: { type: String, required: true },
  },
  { _id: false }
);

const profileSchema = new Schema<IProfileDocument>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    displayName: { type: String, required: true, trim: true },
    avatarUrl: { type: String },
    ageGroup: { type: String, enum: ['child', 'teen', 'adult'], required: true },
    dateOfBirth: { type: Date },
    isOwner: { type: Boolean, default: false },
    isPlatformAdmin: { type: Boolean, default: false },
    isSetupComplete: { type: Boolean, default: false },
    pin: { type: String },
    education: {
      currentLevel: {
        type: String,
        enum: [
          'grade-r','grade-1','grade-2','grade-3','grade-4','grade-5','grade-6',
          'grade-7','grade-8','grade-9','grade-10','grade-11','grade-12',
          'certificate','diploma','bachelors','honours','masters','phd','professional','other',
        ],
      },
      institution: { type: String },
      results: { type: [educationResultSchema], default: [] },
    },
    preferences: {
      language: { type: String, default: 'en' },
      theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    },
    progress: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

profileSchema.pre('save', async function () {
  if (!this.isModified('pin') || !this.pin) return;
  this.pin = await bcrypt.hash(this.pin, 10);
});

profileSchema.methods.comparePin = async function (candidate: string): Promise<boolean> {
  if (!this.pin) return false;
  return bcrypt.compare(candidate, this.pin);
};

const Profile: Model<IProfileDocument> = mongoose.model<IProfileDocument>(
  'Profile',
  profileSchema
);

export default Profile;
