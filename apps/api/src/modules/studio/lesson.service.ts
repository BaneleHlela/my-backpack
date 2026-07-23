// Business logic for Content Studio Lesson CRUD. A Lesson is pure study material
// (resources[]) — one 'lesson'-type item on its parent RoadmapNode.items[]. Resource
// entries with a `url` are expected to already be GCS paths from the asset-upload
// endpoint — this module doesn't handle file upload itself.
import RoadmapNode from '../../models/learning/roadmapNode.model';
import Lesson, { ILessonDocument, IResource } from '../../models/learning/lesson.model';
import { AppError } from '../../utils/AppError';
import { removeNodeItem } from './node.service';

export interface CreateLessonInput {
  title: string;
  resources: IResource[];
}

export async function createLesson(nodeId: string, input: CreateLessonInput): Promise<ILessonDocument> {
  const node = await RoadmapNode.findOne({ _id: nodeId, isActive: true });
  if (!node) throw new AppError('Node not found', 404);

  const position = node.items.length + 1;

  const lesson = await Lesson.create({
    nodeId: node._id,
    roadmapId: node.roadmapId,
    position,
    title: input.title,
    resources: input.resources ?? [],
  });

  await RoadmapNode.findByIdAndUpdate(node._id, {
    $push: { items: { itemType: 'lesson', itemId: lesson._id, position } },
  });

  return lesson;
}

export interface UpdateLessonInput {
  title?: string;
  resources?: IResource[];
}

export async function updateLesson(lessonId: string, input: UpdateLessonInput): Promise<ILessonDocument> {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new AppError('Lesson not found', 404);

  if (input.title !== undefined) lesson.title = input.title;
  if (input.resources !== undefined) lesson.resources = input.resources;

  await lesson.save();
  return lesson;
}

export async function deleteLesson(lessonId: string): Promise<void> {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new AppError('Lesson not found', 404);

  lesson.isActive = false;
  await lesson.save();

  await removeNodeItem(lesson.nodeId, lessonId);
}
