// A mini-app within a subject (e.g. "Dictionary" under "English"). MiniApps are the third
// level of the content hierarchy: Field → Subject → MiniApp. Roadmap-based learning paths are
// no longer MiniApps — see course.model.ts.
// The type field tells the frontend which UI component to render.
// Compound unique index on subjectId + slug prevents duplicates within the same subject.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type MiniAppType = 'quiz' | 'dictionary' | 'flashcards' | 'practice';

export interface IMiniAppDocument extends Document {
  _id: Types.ObjectId;
  subjectId: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  type: MiniAppType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const miniAppSchema = new Schema<IMiniAppDocument>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String },
    iconUrl: { type: String },
    type: {
      type: String,
      enum: ['quiz', 'dictionary', 'flashcards', 'practice'],
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

miniAppSchema.index({ subjectId: 1, slug: 1 }, { unique: true });

const MiniApp: Model<IMiniAppDocument> = mongoose.model<IMiniAppDocument>('MiniApp', miniAppSchema);

export default MiniApp;
