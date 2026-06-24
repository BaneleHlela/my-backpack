// Top-level content category (e.g. "Language", "Mathematics").
// Subjects are the root of the content hierarchy: Subject → Topic → MiniApp.
// Each subject has a unique slug used in URLs and seeding.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface ISubjectDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subjectSchema = new Schema<ISubjectDocument>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String },
    iconUrl: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Subject: Model<ISubjectDocument> = mongoose.model<ISubjectDocument>(
  'Subject',
  subjectSchema
);

export default Subject;
