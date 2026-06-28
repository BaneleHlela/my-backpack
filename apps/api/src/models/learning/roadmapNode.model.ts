// A single step on a roadmap path. Contains study material and assessment config.
// Nodes are ordered by position (1-based). unlockRequires lists prerequisite nodeIds.
// assessment.questionAssignments links Question documents with display order and helper overrides.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import { INodeQuestionAssignment } from '../../modules/question/question.types';

export type NodeType = 'lesson' | 'checkpoint' | 'practice';
export type CurriculumType = 'CAPS' | 'IEB' | 'Cambridge' | 'University' | 'Other';

export interface ICurriculumTag {
  curriculum: CurriculumType;
  gradeLevel: string;
}

export interface IStudyMaterial {
  notes?: string;
  audioUrl?: string;
  videoUrl?: string;
  bookReference?: {
    bookId?: Types.ObjectId;
    chapterNumber?: number;
    pageStart?: number;
    pageEnd?: number;
  };
}

export interface IAssessmentSettings {
  passingScore: number;
  attemptsAllowed: number;
  timeLimitSeconds?: number;
  questionAssignments: INodeQuestionAssignment[];
}

export interface INodeRewards {
  xp: number;
  peanuts: number;
  badge?: string;
}

export interface IRoadmapNodeDocument extends Document {
  _id: Types.ObjectId;
  roadmapId: Types.ObjectId;
  title: string;
  description?: string;
  position: number;
  type: NodeType;
  curriculumTags: ICurriculumTag[];
  studyMaterial: IStudyMaterial;
  assessment: IAssessmentSettings;
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

const bookReferenceSchema = new Schema(
  {
    bookId: { type: Schema.Types.ObjectId },
    chapterNumber: { type: Number },
    pageStart: { type: Number },
    pageEnd: { type: Number },
  },
  { _id: false }
);

const studyMaterialSchema = new Schema<IStudyMaterial>(
  {
    notes: { type: String },
    audioUrl: { type: String },
    videoUrl: { type: String },
    bookReference: { type: bookReferenceSchema },
  },
  { _id: false }
);

const questionAssignmentSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    order: { type: Number, required: true },
    // Partial IQuestionHelpers — overrides question.content.defaultHelpers for this node context.
    helperOverrides: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const assessmentSchema = new Schema<IAssessmentSettings>(
  {
    passingScore: { type: Number, default: 0.7 },
    attemptsAllowed: { type: Number, default: 3 },
    timeLimitSeconds: { type: Number },
    questionAssignments: { type: [questionAssignmentSchema], default: [] },
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
    studyMaterial: { type: studyMaterialSchema, default: () => ({}) },
    assessment: { type: assessmentSchema, default: () => ({}) },
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
