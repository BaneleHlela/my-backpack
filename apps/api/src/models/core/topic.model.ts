// A topic within a subject (e.g. "Vocabulary" under "English", "Differentiation" under "Calculus").
// Topics are the third level of the hierarchy: Field → Subject → Topic → MiniApp.
// Compound unique index on subjectId + slug prevents duplicate topic slugs within a subject.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface ITopicDocument extends Document {
  _id: Types.ObjectId;
  subjectId: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const topicSchema = new Schema<ITopicDocument>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String },
    iconUrl: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

topicSchema.index({ subjectId: 1, slug: 1 }, { unique: true });

const Topic: Model<ITopicDocument> = mongoose.model<ITopicDocument>('Topic', topicSchema);

export default Topic;
