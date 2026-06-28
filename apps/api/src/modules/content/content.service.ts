// Business logic for content navigation: fields, subjects, topics, and mini-apps.
import Field, { IFieldDocument } from '../../models/core/field.model';
import Subject, { ISubjectDocument } from '../../models/core/subject.model';
import Topic, { ITopicDocument } from '../../models/core/topic.model';
import MiniApp, { IMiniAppDocument } from '../../models/core/miniApp.model';
import { AppError } from '../../utils/AppError';
import { Types } from 'mongoose';

export interface IMiniAppWithBreadcrumb {
  miniApp: IMiniAppDocument;
  topic: { _id: Types.ObjectId; name: string; slug: string };
  subject: { _id: Types.ObjectId; name: string; slug: string };
  field: { _id: Types.ObjectId; name: string; slug: string };
}

export async function getFields(): Promise<IFieldDocument[]> {
  return Field.find({ isActive: true }).sort({ name: 1 });
}

export async function getSubjectsByField(fieldSlug: string): Promise<ISubjectDocument[]> {
  const field = await Field.findOne({ slug: fieldSlug, isActive: true });
  if (!field) throw new AppError(`Field '${fieldSlug}' not found`, 404);

  return Subject.find({ fieldId: field._id, isActive: true })
    .populate('fieldId', 'name slug')
    .sort({ name: 1 });
}

export async function getTopicsBySubject(
  fieldSlug: string,
  subjectSlug: string
): Promise<ITopicDocument[]> {
  const field = await Field.findOne({ slug: fieldSlug, isActive: true });
  if (!field) throw new AppError(`Field '${fieldSlug}' not found`, 404);

  const subject = await Subject.findOne({ slug: subjectSlug, fieldId: field._id, isActive: true });
  if (!subject) throw new AppError(`Subject '${subjectSlug}' not found under field '${fieldSlug}'`, 404);

  return Topic.find({ subjectId: subject._id, isActive: true })
    .populate('subjectId', 'name slug')
    .sort({ name: 1 });
}

export async function getMiniAppsByTopic(
  fieldSlug: string,
  subjectSlug: string,
  topicSlug: string
): Promise<IMiniAppDocument[]> {
  const field = await Field.findOne({ slug: fieldSlug, isActive: true });
  if (!field) throw new AppError(`Field '${fieldSlug}' not found`, 404);

  const subject = await Subject.findOne({ slug: subjectSlug, fieldId: field._id, isActive: true });
  if (!subject) throw new AppError(`Subject '${subjectSlug}' not found under field '${fieldSlug}'`, 404);

  const topic = await Topic.findOne({ slug: topicSlug, subjectId: subject._id, isActive: true });
  if (!topic) throw new AppError(`Topic '${topicSlug}' not found under subject '${subjectSlug}'`, 404);

  return MiniApp.find({ topicId: topic._id, isActive: true })
    .populate('topicId', 'name slug')
    .sort({ name: 1 });
}

export async function getMiniAppBySlug(
  fieldSlug: string,
  subjectSlug: string,
  topicSlug: string,
  miniAppSlug: string
): Promise<IMiniAppWithBreadcrumb> {
  const field = await Field.findOne({ slug: fieldSlug, isActive: true });
  if (!field) throw new AppError(`Field '${fieldSlug}' not found`, 404);

  const subject = await Subject.findOne({ slug: subjectSlug, fieldId: field._id, isActive: true });
  if (!subject) throw new AppError(`Subject '${subjectSlug}' not found under field '${fieldSlug}'`, 404);

  const topic = await Topic.findOne({ slug: topicSlug, subjectId: subject._id, isActive: true });
  if (!topic) throw new AppError(`Topic '${topicSlug}' not found under subject '${subjectSlug}'`, 404);

  const miniApp = await MiniApp.findOne({ slug: miniAppSlug, topicId: topic._id, isActive: true });
  if (!miniApp) throw new AppError(`Mini-app '${miniAppSlug}' not found under topic '${topicSlug}'`, 404);

  return {
    miniApp,
    topic: { _id: topic._id as Types.ObjectId, name: topic.name, slug: topic.slug },
    subject: { _id: subject._id as Types.ObjectId, name: subject.name, slug: subject.slug },
    field: { _id: field._id as Types.ObjectId, name: field.name, slug: field.slug },
  };
}
