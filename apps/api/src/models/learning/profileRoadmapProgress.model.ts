// Tracks one profile's progress through one roadmap.
// nodeProgress is a Map keyed by nodeId (string); each entry contains
// an itemProgress Map keyed by itemId (string) for O(1) lookups — itemId works uniformly
// whether it points to a Lesson (itemType 'lesson') or a Quiz (itemType 'quiz').
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type NodeStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';
export type ItemStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';

export interface IItemProgressEntry {
  status: ItemStatus;
  completedAt?: Date;
  attempts: number;
  bestScore: number;
  studyMaterialViewedAt?: Date;
  lastAttemptAt?: Date;
}

export interface INodeProgressEntry {
  status: NodeStatus;
  stars: number;
  attempts: number;
  bestScore: number;
  lastAttemptAt?: Date;
  completedAt?: Date;
  itemProgress: Map<string, IItemProgressEntry>;
}

export interface IProfileRoadmapProgressDocument extends Document {
  _id: Types.ObjectId;
  profileId: Types.ObjectId;
  roadmapId: Types.ObjectId;
  miniAppId?: Types.ObjectId;
  nodeProgress: Map<string, INodeProgressEntry>;
  currentNodeId?: Types.ObjectId;
  totalStars: number;
  startedAt: Date;
  lastActivityAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const itemProgressEntrySchema = new Schema<IItemProgressEntry>(
  {
    status: {
      type: String,
      enum: ['locked', 'unlocked', 'in_progress', 'completed'],
      required: true,
    },
    completedAt: { type: Date },
    attempts: { type: Number, default: 0 },
    bestScore: { type: Number, default: 0, min: 0, max: 1 },
    studyMaterialViewedAt: { type: Date },
    lastAttemptAt: { type: Date },
  },
  { _id: false }
);

const nodeProgressEntrySchema = new Schema<INodeProgressEntry>(
  {
    status: {
      type: String,
      enum: ['locked', 'unlocked', 'in_progress', 'completed'],
      required: true,
    },
    stars: { type: Number, default: 0, min: 0, max: 3 },
    attempts: { type: Number, default: 0 },
    bestScore: { type: Number, default: 0, min: 0, max: 1 },
    lastAttemptAt: { type: Date },
    completedAt: { type: Date },
    itemProgress: {
      type: Map,
      of: itemProgressEntrySchema,
      default: () => new Map(),
    },
  },
  { _id: false }
);

const profileRoadmapProgressSchema = new Schema<IProfileRoadmapProgressDocument>(
  {
    profileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    roadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', required: true },
    miniAppId: { type: Schema.Types.ObjectId, ref: 'MiniApp' },
    nodeProgress: {
      type: Map,
      of: nodeProgressEntrySchema,
      default: () => new Map(),
    },
    currentNodeId: { type: Schema.Types.ObjectId, ref: 'RoadmapNode' },
    totalStars: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    lastActivityAt: { type: Date },
  },
  { timestamps: true }
);

profileRoadmapProgressSchema.index({ profileId: 1, roadmapId: 1 }, { unique: true });

const ProfileRoadmapProgress: Model<IProfileRoadmapProgressDocument> =
  mongoose.model<IProfileRoadmapProgressDocument>(
    'ProfileRoadmapProgress',
    profileRoadmapProgressSchema
  );

export default ProfileRoadmapProgress;
