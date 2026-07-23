// Business logic for Content Studio RoadmapNode ("Topic") CRUD, plus shared helpers for
// appending/removing entries on RoadmapNode.items[] — reused by lesson.service.ts and
// quiz.service.ts so the renumber-after-delete logic (and keeping sibling Lesson.position
// fields in sync) isn't duplicated.
import { Types } from 'mongoose';
import RoadmapNode, {
  IRoadmapNodeDocument,
  ICurriculumTag,
  INodeRewards,
} from '../../models/learning/roadmapNode.model';
import Roadmap from '../../models/learning/roadmap.model';
import Lesson from '../../models/learning/lesson.model';
import Course from '../../models/core/course.model';
import { AppError } from '../../utils/AppError';
import { isDuplicateKeyError } from './studio.utils';

export interface CreateNodeInput {
  title: string;
  slug: string;
  description?: string;
  curriculumTags?: ICurriculumTag[];
}

export async function createNode(courseId: string, input: CreateNodeInput): Promise<IRoadmapNodeDocument> {
  const course = await Course.findOne({ _id: courseId, isActive: true });
  if (!course) throw new AppError('Course not found', 404);

  const roadmap = await Roadmap.findById(course.roadmapId);
  if (!roadmap) throw new AppError("Roadmap not found for this course", 404);

  const position = roadmap.nodes.length + 1;

  let node: IRoadmapNodeDocument;
  try {
    node = await RoadmapNode.create({
      roadmapId: roadmap._id,
      title: input.title,
      slug: input.slug,
      description: input.description,
      position,
      curriculumTags: input.curriculumTags ?? [],
      items: [],
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new AppError(`A node with slug '${input.slug}' already exists on this roadmap`, 409);
    }
    throw err;
  }

  await Roadmap.findByIdAndUpdate(roadmap._id, {
    $push: { nodes: { nodeId: node._id, position } },
  });

  return node;
}

export interface UpdateNodeInput {
  title?: string;
  description?: string;
  curriculumTags?: ICurriculumTag[];
  unlockRequires?: string[];
  rewards?: Partial<INodeRewards>;
}

export async function updateNode(nodeId: string, input: UpdateNodeInput): Promise<IRoadmapNodeDocument> {
  const node = await RoadmapNode.findById(nodeId);
  if (!node) throw new AppError('Node not found', 404);

  if (input.title !== undefined) node.title = input.title;
  if (input.description !== undefined) node.description = input.description;
  if (input.curriculumTags !== undefined) node.curriculumTags = input.curriculumTags;
  if (input.unlockRequires !== undefined) {
    node.unlockRequires = input.unlockRequires.map((id) => new Types.ObjectId(id));
  }
  if (input.rewards !== undefined) node.rewards = { ...node.rewards, ...input.rewards };

  await node.save();
  return node;
}

export async function reorderNodes(courseId: string, nodeIds: string[]): Promise<void> {
  const course = await Course.findOne({ _id: courseId, isActive: true });
  if (!course) throw new AppError('Course not found', 404);

  const roadmap = await Roadmap.findById(course.roadmapId);
  if (!roadmap) throw new AppError('Roadmap not found for this course', 404);

  const currentIds = roadmap.nodes.map((n) => n.nodeId.toString()).sort();
  const requestedIds = [...nodeIds].sort();
  const isSameSet =
    currentIds.length === requestedIds.length && currentIds.every((id, i) => id === requestedIds[i]);
  if (!isSameSet) {
    throw new AppError("nodeIds must match exactly the roadmap's current set of nodes", 400);
  }

  const reordered = nodeIds.map((nodeId, idx) => ({
    nodeId: new Types.ObjectId(nodeId),
    position: idx + 1,
  }));

  await Roadmap.findByIdAndUpdate(roadmap._id, { nodes: reordered });

  await Promise.all(
    reordered.map((ref) => RoadmapNode.findByIdAndUpdate(ref.nodeId, { position: ref.position }))
  );
}

export async function deleteNode(nodeId: string): Promise<void> {
  const node = await RoadmapNode.findById(nodeId);
  if (!node) throw new AppError('Node not found', 404);

  node.isActive = false;
  await node.save();

  const roadmap = await Roadmap.findById(node.roadmapId);
  if (!roadmap) return;

  const remaining = roadmap.nodes
    .filter((n) => n.nodeId.toString() !== nodeId)
    .sort((a, b) => a.position - b.position)
    .map((n, idx) => ({ nodeId: n.nodeId, position: idx + 1 }));

  await Roadmap.findByIdAndUpdate(roadmap._id, { nodes: remaining });

  await Promise.all(
    remaining.map((ref) => RoadmapNode.findByIdAndUpdate(ref.nodeId, { position: ref.position }))
  );
}

// Finds the node containing a given item (used by quiz.service.ts — a Quiz document has no
// direct nodeId field, it's only referenced via RoadmapNode.items[]).
export async function findNodeByItemId(itemId: string): Promise<IRoadmapNodeDocument | null> {
  return RoadmapNode.findOne({ 'items.itemId': itemId });
}

// Removes an item from a node's items[] and renumbers the remaining items so there's no gap.
// Also keeps sibling Lesson.position fields in sync with the renumbered positions, since
// Lesson.position duplicates the same ordering data as its node.items[] entry.
export async function removeNodeItem(nodeId: Types.ObjectId | string, itemId: string): Promise<void> {
  const node = await RoadmapNode.findById(nodeId);
  if (!node) throw new AppError('Node not found', 404);

  const remaining = node.items
    .filter((i) => i.itemId.toString() !== itemId)
    .sort((a, b) => a.position - b.position)
    .map((i, idx) => ({
      itemType: i.itemType,
      itemId: i.itemId,
      position: idx + 1,
      ...(i.passingScore !== undefined ? { passingScore: i.passingScore } : {}),
    }));

  await RoadmapNode.findByIdAndUpdate(node._id, { items: remaining });

  await Promise.all(
    remaining
      .filter((i) => i.itemType === 'lesson')
      .map((i) => Lesson.findByIdAndUpdate(i.itemId, { position: i.position }))
  );
}
