// Business logic for Content Studio Course CRUD. Creating a course also creates its
// (empty) Roadmap in the same request — a Course always wraps exactly one Roadmap.
// All deletes are soft (isActive: false) — real learner progress can already be attached.
import { Types } from 'mongoose';
import Course, { ICourseDocument, ICourseCurriculumTag } from '../../models/core/course.model';
import Roadmap from '../../models/learning/roadmap.model';
import Subject from '../../models/core/subject.model';
import { AppError } from '../../utils/AppError';
import { isDuplicateKeyError } from './studio.utils';

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

  try {
    return await Course.create({
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
