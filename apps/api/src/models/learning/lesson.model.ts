// One step inside a RoadmapNode. Nodes contain an ordered array of lessons.
// lessonType controls auto-completion rules and pass/fail behaviour.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type LessonType = 'introduction' | 'practice' | 'assessment';

export interface ILessonStudyMaterial {
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

export interface ILessonDocument extends Document {
  _id: Types.ObjectId;
  nodeId: Types.ObjectId;
  roadmapId: Types.ObjectId;
  position: number;
  title: string;
  lessonType: LessonType;
  studyMaterial?: ILessonStudyMaterial;
  questionIds: Types.ObjectId[];
  passingScore: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const bookReferenceSchema = new Schema(
  {
    bookId: { type: Schema.Types.ObjectId },
    chapterNumber: { type: Number },
    pageStart: { type: Number },
    pageEnd: { type: Number },
  },
  { _id: false }
);

const studyMaterialSchema = new Schema<ILessonStudyMaterial>(
  {
    notes: { type: String },
    audioUrl: { type: String },
    videoUrl: { type: String },
    bookReference: { type: bookReferenceSchema },
  },
  { _id: false }
);

const lessonSchema = new Schema<ILessonDocument>(
  {
    nodeId: { type: Schema.Types.ObjectId, ref: 'RoadmapNode', required: true },
    roadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', required: true },
    position: { type: Number, required: true },
    title: { type: String, required: true },
    lessonType: {
      type: String,
      enum: ['introduction', 'practice', 'assessment'],
      required: true,
    },
    studyMaterial: { type: studyMaterialSchema },
    questionIds: { type: [Schema.Types.ObjectId], ref: 'Question', default: [] },
    passingScore: { type: Number, default: 0.7, min: 0, max: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

lessonSchema.index({ nodeId: 1, position: 1 });
lessonSchema.index({ roadmapId: 1 });

const Lesson: Model<ILessonDocument> = mongoose.model<ILessonDocument>('Lesson', lessonSchema);

export default Lesson;
