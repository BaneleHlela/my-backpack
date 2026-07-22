// A pure ordered container of nodes, referenced from Course.roadmapId. Doesn't carry any
// subject/miniApp context itself — that lives on the Course that wraps it.
// nodes[] is the canonical ordered list of nodes in this roadmap.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IRoadmapNodeRef {
  nodeId: Types.ObjectId;
  position: number;
}

export interface IRoadmapDocument extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  nodes: IRoadmapNodeRef[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roadmapNodeRefSchema = new Schema<IRoadmapNodeRef>(
  {
    nodeId: { type: Schema.Types.ObjectId, ref: 'RoadmapNode', required: true },
    position: { type: Number, required: true },
  },
  { _id: false }
);

const roadmapSchema = new Schema<IRoadmapDocument>(
  {
    title: { type: String, required: true },
    description: { type: String },
    nodes: { type: [roadmapNodeRefSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Roadmap: Model<IRoadmapDocument> = mongoose.model<IRoadmapDocument>(
  'Roadmap',
  roadmapSchema
);

export default Roadmap;
