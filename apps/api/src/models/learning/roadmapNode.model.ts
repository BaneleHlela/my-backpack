// A single step on a roadmap path — "Topic" in the UI/dashboard vocabulary. Contains an
// ordered array of heterogeneous items — currently 'lesson' (a pure study-material Lesson
// document) or 'quiz' (references a Quiz document directly, no wrapper Lesson). Extensible
// later to 'resource' | 'notes' | 'chatbot' etc — not built yet. Nodes are ordered via
// roadmap.nodes[]. unlockRequires lists prerequisite nodeIds. slug is unique per roadmapId.
// linkedCourseIds is reserved for the deferred multi-provider-course feature (always empty
// today — see docs/product/course-marketplace-vision.md).
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type NodeType = 'lesson' | 'checkpoint' | 'practice';
export type CurriculumType = 'CAPS' | 'IEB' | 'Cambridge' | 'University' | 'Other';
// 'project' is reserved — no Project model, resolution, or progress logic exists yet (no icon
// asset either). Extensible: future 'resource' | 'notes' | 'chatbot'
export type NodeItemType = 'lesson' | 'quiz' | 'project';

export interface ICurriculumTag {
  curriculum: CurriculumType;
  gradeLevel: string;
}

export interface INodeRewards {
  xp: number;
  peanuts: number;
  badge?: string;
}

// One tier of a quiz item's star-grading scale — see packages/shared/types/roadmap.ts's
// IStarThreshold (mirrored here) for the full writeup.
export interface IStarThreshold {
  minScore: number;
  stars: number;
}

export interface INodeItemRef {
  itemType: NodeItemType;
  itemId: Types.ObjectId; // Lesson._id or Quiz._id depending on itemType
  position: number;
  passingScore?: number;  // only meaningful when itemType === 'quiz'
  starThresholds?: IStarThreshold[]; // only meaningful when itemType === 'quiz' — see IStarThreshold
}

export interface IRoadmapNodeDocument extends Document {
  _id: Types.ObjectId;
  roadmapId: Types.ObjectId;
  title: string;
  slug: string;
  description?: string;
  position: number;
  type: NodeType;
  curriculumTags: ICurriculumTag[];
  items: INodeItemRef[];
  unlockRequires: Types.ObjectId[];
  // Reserved for the deferred multi-provider-course feature (see
  // docs/product/course-marketplace-vision.md) — always empty for now, no matching/selection
  // logic built around it yet.
  linkedCourseIds: Types.ObjectId[];
  rewards: INodeRewards;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const curriculumTagSchema = new Schema<ICurriculumTag>(
  {
    curriculum: {
      type: String,
      enum: ['CAPS', 'IEB', 'Cambridge', 'University', 'Other'],
      required: true,
    },
    gradeLevel: { type: String, required: true },
  },
  { _id: false }
);

const starThresholdSchema = new Schema<IStarThreshold>(
  {
    minScore: { type: Number, required: true, min: 0, max: 1 },
    stars: { type: Number, required: true, min: 0, max: 3 },
  },
  { _id: false }
);

const nodeItemRefSchema = new Schema<INodeItemRef>(
  {
    itemType: { type: String, enum: ['lesson', 'quiz', 'project'], required: true },
    // No static `ref` — polymorphic (Lesson or Quiz depending on itemType), resolved manually
    // in the service layer via two separate find() calls split by itemType.
    itemId: { type: Schema.Types.ObjectId, required: true },
    position: { type: Number, required: true },
    passingScore: { type: Number, min: 0, max: 1 },
    starThresholds: { type: [starThresholdSchema], default: undefined },
  },
  { _id: false }
);

const rewardsSchema = new Schema<INodeRewards>(
  {
    xp: { type: Number, default: 0 },
    peanuts: { type: Number, default: 0 },
    badge: { type: String },
  },
  { _id: false }
);

const roadmapNodeSchema = new Schema<IRoadmapNodeDocument>(
  {
    roadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String },
    position: { type: Number, required: true },
    type: {
      type: String,
      enum: ['lesson', 'checkpoint', 'practice'],
      default: 'lesson',
    },
    curriculumTags: { type: [curriculumTagSchema], default: [] },
    items: { type: [nodeItemRefSchema], default: [] },
    unlockRequires: { type: [Schema.Types.ObjectId], ref: 'RoadmapNode', default: [] },
    linkedCourseIds: { type: [Schema.Types.ObjectId], ref: 'Course', default: [] },
    rewards: { type: rewardsSchema, default: () => ({}) },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

roadmapNodeSchema.index({ roadmapId: 1, position: 1 });
roadmapNodeSchema.index({ roadmapId: 1, isActive: 1 });
roadmapNodeSchema.index({ roadmapId: 1, slug: 1 }, { unique: true });

const RoadmapNode: Model<IRoadmapNodeDocument> = mongoose.model<IRoadmapNodeDocument>(
  'RoadmapNode',
  roadmapNodeSchema
);

export default RoadmapNode;
