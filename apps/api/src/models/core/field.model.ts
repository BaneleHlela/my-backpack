// Top-level content category (e.g. "Language", "Mathematics", "Engineering", "Science").
// Fields are the root of the content hierarchy: Field → Subject → Topic → MiniApp.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IFieldDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const fieldSchema = new Schema<IFieldDocument>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String },
    iconUrl: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Field: Model<IFieldDocument> = mongoose.model<IFieldDocument>('Field', fieldSchema);

export default Field;
