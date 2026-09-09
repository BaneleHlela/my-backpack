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

// Set when this Course was created (or later populated) via the book-to-course pipeline —
// see docs/content/book-to-course-design.md. `pdfPath` is a GCS path (not a full URL, the
// usual convention), `extractedText` is the raw, mechanically-extracted book text used both
// to propose/create chapters (Phases 2-3) and to ground the AI Helper (Phase 5). Deliberately
// NOT exposed on ICourseSummary or any public/dashboard read serializer — extractedText can
// be large (a whole book) and the frontend never needs it directly; where Studio needs to know
// only *whether* a course has a book attached, a derived `hasBookSource` boolean is added to
// the relevant dashboard course-write response instead (see course.controller.ts).
export interface ICourseBookSource {
  pdfPath: string;
  extractedText: string;
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
  bookSource?: ICourseBookSource;
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

const courseBookSourceSchema = new Schema<ICourseBookSource>(
  {
    pdfPath: { type: String, required: true },
    extractedText: { type: String, required: true },
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
    bookSource: { type: courseBookSourceSchema, default: undefined },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

courseSchema.index({ subjectId: 1, slug: 1 }, { unique: true });

const Course: Model<ICourseDocument> = mongoose.model<ICourseDocument>('Course', courseSchema);

export default Course;
