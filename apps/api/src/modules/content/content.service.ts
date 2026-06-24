// Business logic for content navigation: subjects, topics, and mini-apps.
import Subject, { ISubjectDocument } from '../../models/core/subject.model';
import Topic, { ITopicDocument } from '../../models/core/topic.model';
import MiniApp, { IMiniAppDocument } from '../../models/core/miniApp.model';

export async function getActiveSubjects(): Promise<ISubjectDocument[]> {
  return Subject.find({ isActive: true }).sort({ name: 1 });
}

export async function getTopicsBySubjectSlug(slug: string): Promise<ITopicDocument[]> {
  const subject = await Subject.findOne({ slug, isActive: true });
  if (!subject) throw new Error('Subject not found');

  return Topic.find({ subjectId: subject._id, isActive: true })
    .populate('subjectId', 'name slug')
    .sort({ name: 1 });
}

export async function getMiniAppsByTopicSlug(slug: string): Promise<IMiniAppDocument[]> {
  const topic = await Topic.findOne({ slug, isActive: true });
  if (!topic) throw new Error('Topic not found');

  return MiniApp.find({ topicId: topic._id, isActive: true })
    .populate('topicId', 'name slug')
    .sort({ name: 1 });
}

export async function getMiniAppBySlug(slug: string): Promise<IMiniAppDocument> {
  const miniApp = await MiniApp.findOne({ slug, isActive: true }).populate({
    path: 'topicId',
    select: 'name slug subjectId',
    populate: { path: 'subjectId', select: 'name slug' },
  });
  if (!miniApp) throw new Error('Mini-app not found');
  return miniApp;
}
