// A subject within a field (e.g. "English" under "Language", "Calculus" under "Mathematics").
// Subjects are the second level of the hierarchy: Field → Subject → Topic → MiniApp.
// Compound unique index on fieldId + slug prevents duplicate subject slugs within a field.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface ISubjectDocument extends Document {
  _id: Types.ObjectId;
  fieldId: Types.ObjectId;
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
    fieldId: { type: Schema.Types.ObjectId, ref: 'Field', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String },
    iconUrl: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subjectSchema.index({ fieldId: 1, slug: 1 }, { unique: true });

const Subject: Model<ISubjectDocument> = mongoose.model<ISubjectDocument>('Subject', subjectSchema);

export default Subject;
