// Phase 3 of the book-to-course pipeline: turns an admin-approved chapter list (Phase 2's AI
// proposal, possibly hand-edited — titles/ranges changed, chapters added/removed/reordered)
// into real content. Sets Course.bookSource, then creates one RoadmapNode + one draft 'Reading'
// Lesson per chapter, in order, via the existing createNode/createLesson from
// studio/node.service.ts and studio/lesson.service.ts — exactly as Content Studio's own
// hand-authoring UI would. Deliberately does not create quizzes — that's Phase 4
// (nodeBookQuestions.ts / chapterPracticeQuestions.ts), kept as a separate, explicit action so
// an admin can fix chapter boundaries before spending an AI call generating questions against
// them. See docs/content/book-to-course-design.md.
import Course, { ICourseDocument } from '../../models/core/course.model';
import { AppError } from '../../utils/AppError';
import { createNode } from '../../modules/studio/node.service';
import { createLesson } from '../../modules/studio/lesson.service';
import { slugify } from '../../modules/studio/studio.utils';

export interface ChapterInput {
  title: string;
  startPage?: number;
  endPage?: number;
}

export interface CreateChaptersFromBookInput {
  pdfPath: string;
  extractedText: string;
  chapters: ChapterInput[];
}

function pageRangeText(chapter: ChapterInput): string {
  if (chapter.startPage !== undefined && chapter.endPage !== undefined) {
    return `pages ${chapter.startPage}–${chapter.endPage}`;
  }
  if (chapter.startPage !== undefined) {
    return `page ${chapter.startPage} onward`;
  }
  return 'the assigned pages';
}

export async function createChaptersFromBook(
  courseId: string,
  input: CreateChaptersFromBookInput
): Promise<ICourseDocument> {
  const course = await Course.findOne({ _id: courseId, isActive: true });
  if (!course) throw new AppError('Course not found', 404);
  if (!input.chapters.length) throw new AppError('At least one chapter is required', 400);

  course.bookSource = { pdfPath: input.pdfPath, extractedText: input.extractedText };
  await course.save();

  // Dedupe slugs within this batch — createNode itself still guards against a collision with
  // a pre-existing node slug on the roadmap (e.g. a retried/partial prior run).
  const usedSlugs = new Set<string>();
  for (const chapter of input.chapters) {
    const base = slugify(chapter.title) || 'chapter';
    let slug = base;
    let suffix = 2;
    while (usedSlugs.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    usedSlugs.add(slug);

    const node = await createNode(courseId, { title: chapter.title, slug });

    // A draft reading pointer, editable afterward through the existing lesson editor like any
    // other lesson — not final copy.
    const markdown = `Read ${pageRangeText(chapter)}: *${chapter.title}*`;
    await createLesson(node._id.toString(), {
      title: 'Reading',
      resources: [{ type: 'notes', position: 1, markdown }],
    });
  }

  return course;
}
