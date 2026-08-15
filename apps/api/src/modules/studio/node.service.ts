// Business logic for Content Studio RoadmapNode ("Topic") CRUD, plus shared helpers for
// appending/removing entries on RoadmapNode.items[] — reused by lesson.service.ts and
// quiz.service.ts so the renumber-after-delete logic (and keeping sibling Lesson.position
// fields in sync) isn't duplicated.
import { Types } from 'mongoose';
import RoadmapNode, {
  IRoadmapNodeDocument,
  ICurriculumTag,
  INodeRewards,
  IStarThreshold,
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

export interface UpdateNodeItemGradeSettingsInput {
  passingScore?: number;
  starThresholds?: IStarThreshold[];
}

// Updates the passingScore/starThresholds on one quiz item ref (see INodeItemRef in
// roadmapNode.model.ts) — the "Grade Settings" section of Content Studio's QuizEditorPage.
// Only meaningful for itemType: 'quiz'; a Quiz document itself has no passingScore/
// starThresholds fields since it can be reused outside roadmaps (same reasoning that already
// put passingScore on the item ref rather than on Quiz).
export async function updateNodeItemGradeSettings(
  nodeId: string,
  itemId: string,
  input: UpdateNodeItemGradeSettingsInput
): Promise<IRoadmapNodeDocument> {
  const node = await RoadmapNode.findById(nodeId);
  if (!node) throw new AppError('Node not found', 404);

  const idx = node.items.findIndex((i) => i.itemId.toString() === itemId);
  if (idx === -1) throw new AppError('Item not found on this node', 404);
  if (node.items[idx].itemType !== 'quiz') {
    throw new AppError('Grade settings only apply to quiz items', 400);
  }

  if (input.passingScore !== undefined && (input.passingScore < 0 || input.passingScore > 1)) {
    throw new AppError('passingScore must be between 0 and 1', 400);
  }
  if (input.starThresholds !== undefined) {
    for (const tier of input.starThresholds) {
      if (tier.minScore < 0 || tier.minScore > 1) {
        throw new AppError('starThresholds[].minScore must be between 0 and 1', 400);
      }
      if (tier.stars < 0 || tier.stars > 3 || !Number.isInteger(tier.stars)) {
        throw new AppError('starThresholds[].stars must be a whole number between 0 and 3', 400);
      }
    }
  }

  const updatedItems = node.items.map((i, i2) => {
    if (i2 !== idx) return i;
    return {
      itemType: i.itemType,
      itemId: i.itemId,
      position: i.position,
      passingScore: input.passingScore !== undefined ? input.passingScore : i.passingScore,
      starThresholds: input.starThresholds !== undefined ? input.starThresholds : i.starThresholds,
    };
  });

  await RoadmapNode.findByIdAndUpdate(nodeId, { items: updatedItems });

  const updated = await RoadmapNode.findById(nodeId);
  if (!updated) throw new AppError('Node not found', 404);
  return updated;
}
