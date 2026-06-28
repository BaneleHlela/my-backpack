// A single step on a roadmap path. Contains an ordered array of lessons.
// Nodes are ordered via roadmap.nodes[]. unlockRequires lists prerequisite nodeIds.
// studyMaterial and assessment have moved to individual Lesson documents.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type NodeType = 'lesson' | 'checkpoint' | 'practice';
export type CurriculumType = 'CAPS' | 'IEB' | 'Cambridge' | 'University' | 'Other';

export interface ICurriculumTag {
  curriculum: CurriculumType;
  gradeLevel: string;
}

export interface INodeRewards {
  xp: number;
  peanuts: number;
  badge?: string;
}

export interface INodeLessonRef {
  lessonId: Types.ObjectId;
  position: number;
}

export interface IRoadmapNodeDocument extends Document {
  _id: Types.ObjectId;
  roadmapId: Types.ObjectId;
  title: string;
  description?: string;
  position: number;
  type: NodeType;
  curriculumTags: ICurriculumTag[];
  lessons: INodeLessonRef[];
  unlockRequires: Types.ObjectId[];
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

const nodeLessonRefSchema = new Schema<INodeLessonRef>(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    position: { type: Number, required: true },
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
    description: { type: String },
    position: { type: Number, required: true },
    type: {
      type: String,
      enum: ['lesson', 'checkpoint', 'practice'],
      default: 'lesson',
    },
    curriculumTags: { type: [curriculumTagSchema], default: [] },
    lessons: { type: [nodeLessonRefSchema], default: [] },
    unlockRequires: { type: [Schema.Types.ObjectId], ref: 'RoadmapNode', default: [] },
    rewards: { type: rewardsSchema, default: () => ({}) },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

roadmapNodeSchema.index({ roadmapId: 1, position: 1 });
roadmapNodeSchema.index({ roadmapId: 1, isActive: 1 });

const RoadmapNode: Model<IRoadmapNodeDocument> = mongoose.model<IRoadmapNodeDocument>(
  'RoadmapNode',
  roadmapNodeSchema
);

export default RoadmapNode;
