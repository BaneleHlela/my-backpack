// A mini-app within a topic (e.g. "Dictionary", "Quiz" under "Vocabulary").
// MiniApps are the leaf level of the content hierarchy: Field → Subject → Topic → MiniApp.
// The type field tells the frontend which UI component to render.
// Compound unique index on topicId + slug prevents duplicates within the same topic.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type MiniAppType = 'quiz' | 'roadmap' | 'dictionary' | 'flashcards' | 'practice';

export interface IMiniAppDocument extends Document {
  _id: Types.ObjectId;
  topicId: Types.ObjectId;
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
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String },
    iconUrl: { type: String },
    type: {
      type: String,
      enum: ['quiz', 'roadmap', 'dictionary', 'flashcards', 'practice'],
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

miniAppSchema.index({ topicId: 1, slug: 1 }, { unique: true });

const MiniApp: Model<IMiniAppDocument> = mongoose.model<IMiniAppDocument>('MiniApp', miniAppSchema);

export default MiniApp;
