// A course within a subject — the umbrella for a roadmap-based learning path (e.g. "Phonics",
// "IsiZulu HL Grade 1 CAPS"). Wraps exactly one Roadmap. Can additionally surface existing
// MiniApps (e.g. Dictionary) as convenience links, shown alongside the course content.
// Compound unique index on subjectId + slug prevents duplicate course slugs within a subject.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type CourseCurriculumType = 'CAPS' | 'IEB' | 'Cambridge' | 'University' | 'Other';

export interface ICourseCurriculumTag {
  curriculum: CourseCurriculumType;
  gradeLevel: string;
}

export interface ICourseDocument extends Document {
  _id: Types.ObjectId;
  subjectId: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  roadmapId: Types.ObjectId;
  miniAppIds: Types.ObjectId[];
  curriculumTags: ICourseCurriculumTag[];
  team?: unknown; // Reserved for future multi-instructor/team feature — see
                  // docs/product/course-marketplace-vision.md. No shape or behavior yet.
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const courseCurriculumTagSchema = new Schema<ICourseCurriculumTag>(
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

const courseSchema = new Schema<ICourseDocument>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String },
    iconUrl: { type: String },
    roadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', required: true },
    miniAppIds: { type: [Schema.Types.ObjectId], ref: 'MiniApp', default: [] },
    curriculumTags: { type: [courseCurriculumTagSchema], default: [] },
    team: { type: Schema.Types.Mixed },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

courseSchema.index({ subjectId: 1, slug: 1 }, { unique: true });

const Course: Model<ICourseDocument> = mongoose.model<ICourseDocument>('Course', courseSchema);

export default Course;
