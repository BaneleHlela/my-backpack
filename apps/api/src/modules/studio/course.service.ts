// Business logic for Content Studio Course CRUD. Creating a course also creates its
// (empty) Roadmap and its default practice-pool Quiz in the same request — a Course always
// wraps exactly one Roadmap, and (for mobile's Quiz Modes feature) always has exactly one
// mode:'pool', isDefault:true Quiz so `POST /api/quiz/session { miniAppId: course._id }`
// resolves the same way it already does for Dictionary's dynamic quiz. Existing courses
// (created before this) are backfilled by seed/migrations/2026-08-quiz-modes-pool.ts, not
// by this function.
// All deletes are soft (isActive: false) — real learner progress can already be attached.
import { Types } from 'mongoose';
import Course, { ICourseDocument, ICourseCurriculumTag } from '../../models/core/course.model';
import Roadmap from '../../models/learning/roadmap.model';
import Subject from '../../models/core/subject.model';
import Quiz from '../../models/learning/quiz.model';
import { AppError } from '../../utils/AppError';
import { isDuplicateKeyError } from './studio.utils';
import { extractPdfText } from '../../services/bookIngestion/pdfExtraction';
import { suggestChapterStructure, ProposedChapter } from '../../services/bookIngestion/chapterStructure';
import {
  createChaptersFromBook,
  ChapterInput,
} from '../../services/bookIngestion/chapterIngestion';

export interface CreateCourseInput {
  subjectId: string;
  name: string;
  slug: string;
  description?: string;
  curriculumTags?: ICourseCurriculumTag[];
}

export async function createCourse(input: CreateCourseInput): Promise<ICourseDocument> {
  const subject = await Subject.findOne({ _id: input.subjectId, isActive: true });
  if (!subject) throw new AppError('Subject not found', 404);

  const roadmap = await Roadmap.create({ title: `${input.name} Roadmap`, nodes: [] });

  let course: ICourseDocument;
  try {
    course = await Course.create({
      subjectId: subject._id,
      name: input.name,
      slug: input.slug,
      description: input.description,
      roadmapId: roadmap._id,
      curriculumTags: input.curriculumTags ?? [],
    });
  } catch (err) {
    // Roll back the just-created empty Roadmap so a slug conflict doesn't leave an orphan.
    await Roadmap.findByIdAndDelete(roadmap._id);
    if (isDuplicateKeyError(err)) {
      throw new AppError(`A course with slug '${input.slug}' already exists under this subject`, 409);
    }
    throw err;
  }

  try {
    await Quiz.create({
      miniAppId: course._id,
      sourceMiniAppIds: [course._id],
      title: `${input.name} Practice Pool`,
      mode: 'pool',
      questionIds: [],
      settings: {
        questionCount: 200, // deliberate v1 sentinel — see quiz.model.ts's mode:'pool' comment
        questionTypes: [],
        bucketFilter: 'all', // unused by pool-mode sourcing, kept for schema completeness
        feedbackMode: 'immediate',
        shuffleQuestions: false,
      },
      isUserAdjustable: true,
      isDefault: true,
      isActive: true,
    });
  } catch (err) {
    // Roll back the Course + Roadmap so a failed pool-quiz creation doesn't leave a course
    // with no way to ever start a Quiz Modes session.
    await Course.findByIdAndDelete(course._id);
    await Roadmap.findByIdAndDelete(roadmap._id);
    throw err;
  }

  return course;
}

export interface UpdateCourseInput {
  name?: string;
  description?: string;
  iconUrl?: string;
  miniAppIds?: string[];
  curriculumTags?: ICourseCurriculumTag[];
}

export async function updateCourse(courseId: string, input: UpdateCourseInput): Promise<ICourseDocument> {
  const course = await Course.findById(courseId);
  if (!course) throw new AppError('Course not found', 404);

  if (input.name !== undefined) course.name = input.name;
  if (input.description !== undefined) course.description = input.description;
  if (input.iconUrl !== undefined) course.iconUrl = input.iconUrl;
  if (input.miniAppIds !== undefined) {
    course.miniAppIds = input.miniAppIds.map((id) => new Types.ObjectId(id));
  }
  if (input.curriculumTags !== undefined) course.curriculumTags = input.curriculumTags;

  await course.save();
  return course;
}

export async function deleteCourse(courseId: string): Promise<void> {
  const course = await Course.findById(courseId);
  if (!course) throw new AppError('Course not found', 404);

  course.isActive = false;
  await course.save();
}

// ── Book-to-course pipeline (Phases 2-3) ──────────────────
// See docs/content/book-to-course-design.md for the full design, including the
// extraction-vs-judgment split (2a mechanical, 2b AI) and why chapter creation (Phase 3) is a
// separate approval step from the AI proposal (Phase 2).

export interface SuggestBookStructureResult {
  chapters: ProposedChapter[];
  extractedText: string;
}

// Phase 2: POST .../courses/:courseId/suggest-structure. Runs 2a (deterministic extraction)
// then 2b (AI proposal) and returns both — the frontend holds extractedText in memory to
// submit back in Phase 3 rather than re-extracting. Persists nothing.
export async function suggestBookStructure(
  courseId: string,
  pdfPath: string
): Promise<SuggestBookStructureResult> {
  const course = await Course.findOne({ _id: courseId, isActive: true });
  if (!course) throw new AppError('Course not found', 404);
  if (!pdfPath) throw new AppError('pdfPath is required', 400);

  const extractedText = await extractPdfText(pdfPath);
  
  const chapters = await suggestChapterStructure(extractedText);
  console.log(chapters);
  return { chapters, extractedText };
}

export interface ApplyBookChaptersInput {
  pdfPath: string;
  extractedText: string;
  chapters: ChapterInput[];
}

// Phase 3: POST .../courses/:courseId/book-chapters. The admin-edited version of Phase 2's
// proposal (titles/ranges may have changed, chapters added/removed/reordered). Thin pass-through
// to chapterIngestion.ts's createChaptersFromBook — kept here only so course.controller.ts can
// go on calling exclusively into course.service.ts, matching every other handler in this file.
export async function applyBookChapters(
  courseId: string,
  input: ApplyBookChaptersInput
): Promise<ICourseDocument> {
  if (!input.pdfPath) throw new AppError('pdfPath is required', 400);
  if (!input.extractedText) throw new AppError('extractedText is required', 400);
  return createChaptersFromBook(courseId, input);
}

// Strips the (potentially large) raw bookSource.extractedText from a course response and
// replaces it with a derived hasBookSource boolean — extractedText is never needed by the
// frontend (see ICourseBookSource's comment in course.model.ts). Used by every dashboard
// course-write response (create/update/apply-book-chapters) rather than the raw Mongoose
// document.
export function toDashboardCourseResponse(course: ICourseDocument): Record<string, unknown> {
  const obj = course.toObject() as Record<string, unknown> & { bookSource?: unknown };
  const hasBookSource = !!obj.bookSource;
  delete obj.bookSource;
  return { ...obj, hasBookSource };
}
