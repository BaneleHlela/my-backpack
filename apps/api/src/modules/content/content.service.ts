// Business logic for content navigation: fields, subjects, courses, and mini-apps.
import { Types } from 'mongoose';
import Field, { IFieldDocument } from '../../models/core/field.model';
import Subject, { ISubjectDocument } from '../../models/core/subject.model';
import Course, { ICourseDocument } from '../../models/core/course.model';
import MiniApp, { IMiniAppDocument } from '../../models/core/miniApp.model';
import { AppError } from '../../utils/AppError';

interface PopulatedRoadmapSummary {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  nodes: unknown[];
}

export interface CourseWithRoadmapSummary {
  _id: Types.ObjectId;
  subjectId: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  miniAppIds: Types.ObjectId[];
  curriculumTags: ICourseDocument['curriculumTags'];
  isActive: boolean;
  roadmap: { _id: Types.ObjectId; title: string; description?: string; nodeCount: number };
}

async function findFieldOrThrow(fieldSlug: string): Promise<IFieldDocument> {
  const field = await Field.findOne({ slug: fieldSlug, isActive: true });
  if (!field) throw new AppError(`Field '${fieldSlug}' not found`, 404);
  return field;
}

async function findSubjectOrThrow(fieldSlug: string, subjectSlug: string): Promise<ISubjectDocument> {
  const field = await findFieldOrThrow(fieldSlug);
  const subject = await Subject.findOne({ slug: subjectSlug, fieldId: field._id, isActive: true });
  if (!subject) throw new AppError(`Subject '${subjectSlug}' not found under field '${fieldSlug}'`, 404);
  return subject;
}

function toCourseSummary(course: ICourseDocument): CourseWithRoadmapSummary {
  const roadmap = course.roadmapId as unknown as PopulatedRoadmapSummary;
  return {
    _id: course._id,
    subjectId: course.subjectId,
    name: course.name,
    slug: course.slug,
    description: course.description,
    iconUrl: course.iconUrl,
    miniAppIds: course.miniAppIds,
    curriculumTags: course.curriculumTags,
    isActive: course.isActive,
    roadmap: {
      _id: roadmap._id,
      title: roadmap.title,
      description: roadmap.description,
      nodeCount: roadmap.nodes.length,
    },
  };
}

export async function getFields(): Promise<IFieldDocument[]> {
  return Field.find({ isActive: true }).sort({ name: 1 });
}

export async function getSubjectsByField(fieldSlug: string): Promise<ISubjectDocument[]> {
  const field = await findFieldOrThrow(fieldSlug);

  return Subject.find({ fieldId: field._id, isActive: true })
    .populate('fieldId', 'name slug')
    .sort({ name: 1 });
}

export async function getSubjectBySlug(
  fieldSlug: string,
  subjectSlug: string
): Promise<ISubjectDocument> {
  return findSubjectOrThrow(fieldSlug, subjectSlug);
}

export async function getCoursesBySubject(
  fieldSlug: string,
  subjectSlug: string
): Promise<CourseWithRoadmapSummary[]> {
  const subject = await findSubjectOrThrow(fieldSlug, subjectSlug);

  const courses = await Course.find({ subjectId: subject._id, isActive: true })
    .populate('roadmapId', 'title description nodes')
    .sort({ name: 1 });

  return courses.map(toCourseSummary);
}

export async function getCourseBySlug(
  fieldSlug: string,
  subjectSlug: string,
  courseSlug: string
): Promise<CourseWithRoadmapSummary> {
  const subject = await findSubjectOrThrow(fieldSlug, subjectSlug);

  const course = await Course.findOne({ slug: courseSlug, subjectId: subject._id, isActive: true })
    .populate('roadmapId', 'title description nodes')
    .populate('miniAppIds', 'name slug type description');
  if (!course) throw new AppError(`Course '${courseSlug}' not found under subject '${subjectSlug}'`, 404);

  return toCourseSummary(course);
}

export async function getMiniAppsBySubject(
  fieldSlug: string,
  subjectSlug: string
): Promise<IMiniAppDocument[]> {
  const subject = await findSubjectOrThrow(fieldSlug, subjectSlug);

  return MiniApp.find({ subjectId: subject._id, isActive: true })
    .populate('subjectId', 'name slug')
    .sort({ name: 1 });
}

export interface IMiniAppWithBreadcrumb {
  miniApp: IMiniAppDocument;
  subject: { _id: Types.ObjectId; name: string; slug: string };
  field: { _id: Types.ObjectId; name: string; slug: string };
}

export async function getMiniAppBySlug(
  fieldSlug: string,
  subjectSlug: string,
  miniAppSlug: string
): Promise<IMiniAppWithBreadcrumb> {
  const field = await findFieldOrThrow(fieldSlug);
  const subject = await findSubjectOrThrow(fieldSlug, subjectSlug);

  const miniApp = await MiniApp.findOne({ slug: miniAppSlug, subjectId: subject._id, isActive: true });
  if (!miniApp) throw new AppError(`Mini-app '${miniAppSlug}' not found under subject '${subjectSlug}'`, 404);

  return {
    miniApp,
    subject: { _id: subject._id as Types.ObjectId, name: subject.name, slug: subject.slug },
    field: { _id: field._id as Types.ObjectId, name: field.name, slug: field.slug },
  };
}
