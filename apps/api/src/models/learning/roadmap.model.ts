// Top-level container for a learning path. Belongs to a subject, a miniApp, or both.
// At least one of subjectId or miniAppId must be present (enforced by pre-validate hook).
// nodes[] is the canonical ordered list of nodes in this roadmap.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IRoadmapNodeRef {
  nodeId: Types.ObjectId;
  position: number;
}

export interface IRoadmapDocument extends Document {
  _id: Types.ObjectId;
  subjectId?: Types.ObjectId;
  miniAppId?: Types.ObjectId;
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
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    miniAppId: { type: Schema.Types.ObjectId, ref: 'MiniApp' },
    title: { type: String, required: true },
    description: { type: String },
    nodes: { type: [roadmapNodeRefSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Either subjectId or miniAppId must be present.
roadmapSchema.pre('validate', function () {
  if (!this.subjectId && !this.miniAppId) {
    throw new Error('Roadmap must belong to either a subjectId or a miniAppId');
  }
});

roadmapSchema.index({ subjectId: 1 }, { sparse: true });
roadmapSchema.index({ miniAppId: 1 }, { sparse: true });

const Roadmap: Model<IRoadmapDocument> = mongoose.model<IRoadmapDocument>(
  'Roadmap',
  roadmapSchema
);

export default Roadmap;
