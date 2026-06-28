// One roadmap per mini-app. Defines the top-level container for a learning path.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IRoadmapDocument extends Document {
  _id: Types.ObjectId;
  miniAppId: Types.ObjectId;
  title: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roadmapSchema = new Schema<IRoadmapDocument>(
  {
    miniAppId: { type: Schema.Types.ObjectId, ref: 'MiniApp', required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Roadmap: Model<IRoadmapDocument> = mongoose.model<IRoadmapDocument>(
  'Roadmap',
  roadmapSchema
);

export default Roadmap;
