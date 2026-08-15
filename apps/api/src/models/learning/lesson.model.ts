// A pure study-material container — one lesson item inside a RoadmapNode.items[].
// Holds an ordered array of resources (video/pdf/image/notes/audio/steps) rendered on the
// lesson resource-hub page. Quizzes are no longer wrapped in a Lesson — a "quiz" item on
// RoadmapNode.items[] references a Quiz document directly (see roadmapNode.model.ts).
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type ResourceType = 'video' | 'pdf' | 'image' | 'notes' | 'audio' | 'steps';

export interface IResourceStep {
  title?: string;
  content: string; // markdown
}

export interface IResource {
  type: ResourceType;
  position: number;
  url?: string;            // video/pdf/image/audio
  caption?: string;        // video/image/audio
  title?: string;          // pdf
  markdown?: string;       // notes
  steps?: IResourceStep[]; // steps
  thumbnailUrl?: string;   // video
  description?: string;    // video
}

export interface ILessonDocument extends Document {
  _id: Types.ObjectId;
  nodeId: Types.ObjectId;
  roadmapId: Types.ObjectId;
  position: number;
  title: string;
  resources: IResource[];
  // Video-watch completion gating (August 2026) — teacher-configurable per lesson, opt-out.
  // When true (default) and the lesson has at least one 'video' resource, mobile's LessonModal
  // hides "Mark As Completed" until every video is watched and then completes automatically;
  // false restores the plain always-tappable button regardless of watch state. No effect on a
  // lesson with no video resources either way. Mongoose applies this default on read for
  // pre-existing documents that predate the field, so no backfill migration was needed.
  requireVideoWatch: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const resourceStepSchema = new Schema<IResourceStep>(
  {
    title: { type: String },
    content: { type: String, required: true },
  },
  { _id: false }
);

// Flat, optional-fields schema (not a Mongoose discriminator union) — matches the project's
// "keep it simple" convention; the shared-types layer still expresses IResource as a proper
// discriminated union for frontend type safety.
const resourceSchema = new Schema<IResource>(
  {
    type: { type: String, enum: ['video', 'pdf', 'image', 'notes', 'audio', 'steps'], required: true },
    position: { type: Number, required: true },
    url: { type: String },
    caption: { type: String },
    title: { type: String },
    markdown: { type: String },
    steps: { type: [resourceStepSchema] },
    thumbnailUrl: { type: String },
    description: { type: String },
  },
  { _id: false }
);

const lessonSchema = new Schema<ILessonDocument>(
  {
    nodeId: { type: Schema.Types.ObjectId, ref: 'RoadmapNode', required: true },
    roadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', required: true },
    position: { type: Number, required: true },
    title: { type: String, required: true },
    resources: { type: [resourceSchema], default: [] },
    requireVideoWatch: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

lessonSchema.index({ nodeId: 1, position: 1 });
lessonSchema.index({ roadmapId: 1 });

const Lesson: Model<ILessonDocument> = mongoose.model<ILessonDocument>('Lesson', lessonSchema);

export default Lesson;
