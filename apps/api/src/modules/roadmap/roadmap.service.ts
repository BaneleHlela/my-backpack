// Business logic for the roadmap system: progress tracking, node/item unlocking.
// A RoadmapNode contains heterogeneous items — 'lesson' (pure study material) or 'quiz'
// (references a Quiz document directly). resources now live on Lesson documents.
import { Types } from 'mongoose';
import Roadmap from '../../models/learning/roadmap.model';
import RoadmapNode, { IRoadmapNodeDocument, INodeItemRef, NodeItemType } from '../../models/learning/roadmapNode.model';
import Lesson from '../../models/learning/lesson.model';
import ProfileRoadmapProgress, {
  INodeProgressEntry,
  IItemProgressEntry,
  NodeStatus,
  ItemStatus,
} from '../../models/learning/profileRoadmapProgress.model';
import Quiz from '../../models/learning/quiz.model';
import QuizSession from '../../models/learning/quizSession.model';
import AnswerRecord from '../../models/learning/answerRecord.model';
import { createQuizSession } from '../../services/quizSession.service';
import {
  RoadmapWithProgressResult,
  NodeDetailResult,
  LessonDetailResult,
  ItemCompletionResult,
  StartQuizItemResult,
  ResolvedNodeItem,
} from './roadmap.types';
import { updateProgressSummary } from '../enrollment/enrollment.service';
import Subject from '../../models/core/subject.model';

// Default status for a node that has no progress entry yet.
function defaultNodeStatus(node: IRoadmapNodeDocument): NodeStatus {
  if (node.position === 1 || node.unlockRequires.length === 0) return 'unlocked';
  return 'locked';
}

// Empty node progress entry with initialised item map.
function emptyNodeEntry(status: NodeStatus, itemProgress?: Map<string, IItemProgressEntry>): INodeProgressEntry {
  return {
    status,
    stars: 0,
    attempts: 0,
    bestScore: 0,
    itemProgress: itemProgress ?? new Map(),
  };
}

// Resolves a node's heterogeneous items[] (lesson + quiz refs) into full documents with
// per-item progress status, in position order. Shared by getRoadmapWithProgress and
// getNodeWithProgress so the mixed-item resolution logic isn't duplicated.
async function resolveNodeItems(
  node: IRoadmapNodeDocument,
  nodeEntry: INodeProgressEntry | undefined,
  isNodeUnlocked: boolean
): Promise<ResolvedNodeItem[]> {
  const sortedRefs = node.items.slice().sort((a, b) => a.position - b.position);

  const lessonIds = sortedRefs.filter((r) => r.itemType === 'lesson').map((r) => r.itemId);
  const quizIds = sortedRefs.filter((r) => r.itemType === 'quiz').map((r) => r.itemId);

  const [lessonDocs, quizDocs] = await Promise.all([
    lessonIds.length ? Lesson.find({ _id: { $in: lessonIds }, isActive: true }) : Promise.resolve([]),
    quizIds.length
      ? Quiz.find({ _id: { $in: quizIds }, isActive: true }).select('title questionIds')
      : Promise.resolve([]),
  ]);
  const lessonMap = new Map(lessonDocs.map((l) => [l._id.toString(), l]));
  const quizMap = new Map(quizDocs.map((q) => [q._id.toString(), q]));

  return sortedRefs
    .map((ref: INodeItemRef, idx): ResolvedNodeItem | null => {
      const itemKey = ref.itemId.toString();
      const ip = nodeEntry?.itemProgress?.get(itemKey);
      const status: ItemStatus = ip ? ip.status : isNodeUnlocked && idx === 0 ? 'unlocked' : 'locked';
      const isUnlocked = status !== 'locked';

      if (ref.itemType === 'lesson') {
        const lesson = lessonMap.get(itemKey);
        if (!lesson) return null;
        return {
          itemType: 'lesson',
          itemId: ref.itemId,
          position: ref.position,
          progressStatus: status,
          isUnlocked,
          lesson,
        };
      }

      const quiz = quizMap.get(itemKey);
      if (!quiz) return null;
      return {
        itemType: 'quiz',
        itemId: ref.itemId,
        position: ref.position,
        passingScore: ref.passingScore ?? 0.7,
        progressStatus: status,
        isUnlocked,
        quiz: { _id: quiz._id, title: quiz.title, questionCount: quiz.questionIds.length },
      };
    })
    .filter((i): i is ResolvedNodeItem => i !== null);
}

// Returns roadmap with ordered nodes+items and per-item progress.
// Accepts either miniAppId or subjectId to locate the roadmap.
export async function getRoadmapWithProgress(
  profileId: string,
  miniAppId?: string,
  subjectId?: string
): Promise<RoadmapWithProgressResult> {
  const query: Record<string, unknown> = { isActive: true };
  if (miniAppId) query['miniAppId'] = miniAppId;
  else if (subjectId) query['subjectId'] = subjectId;
  else throw new Error('miniAppId or subjectId required');

  const roadmap = await Roadmap.findOne(query);
  if (!roadmap) throw new Error('Roadmap not found');

  // Use roadmap.nodes[] as canonical order.
  const sortedNodeRefs = roadmap.nodes.slice().sort((a, b) => a.position - b.position);
  const nodeIds = sortedNodeRefs.map((r) => r.nodeId);
  const nodeDocMap = new Map<string, IRoadmapNodeDocument>();
  const nodeDocs = await RoadmapNode.find({ _id: { $in: nodeIds }, isActive: true });
  nodeDocs.forEach((n) => nodeDocMap.set(n._id.toString(), n));

  let progress = await ProfileRoadmapProgress.findOne({ profileId, roadmapId: roadmap._id });
  if (!progress) {
    progress = await ProfileRoadmapProgress.create({
      profileId,
      roadmapId: roadmap._id,
      miniAppId: roadmap.miniAppId,
    });
  }

  let completedNodes = 0;
  let completedItems = 0;
  let totalItems = 0;

  const nodesWithProgress = await Promise.all(
    sortedNodeRefs.map(async (ref) => {
      const node = nodeDocMap.get(ref.nodeId.toString());
      if (!node) return null;

      const nodeId = node._id.toString();
      const entry = progress!.nodeProgress.get(nodeId);
      const progressStatus: NodeStatus = entry ? entry.status : defaultNodeStatus(node);
      const stars = entry?.stars ?? 0;
      const isUnlocked = progressStatus !== 'locked';
      if (progressStatus === 'completed') completedNodes++;

      const items = await resolveNodeItems(node, entry, isUnlocked);
      items.forEach((item) => {
        totalItems++;
        if (item.progressStatus === 'completed') completedItems++;
      });

      return Object.assign(node.toObject(), { progressStatus, stars, isUnlocked, items });
    })
  );

  const validNodes = nodesWithProgress.filter((n): n is NonNullable<typeof n> => n !== null);

  return {
    roadmap,
    nodes: validNodes as RoadmapWithProgressResult['nodes'],
    totalStars: progress.totalStars,
    completedNodes,
    totalNodes: sortedNodeRefs.length,
    completedItems,
    totalItems,
  };
}

// Returns a node with its ordered items and per-item progress.
export async function getNodeWithProgress(
  nodeId: string,
  profileId: string
): Promise<NodeDetailResult> {
  const node = await RoadmapNode.findById(nodeId);
  if (!node || !node.isActive) throw new Error('Node not found');

  const progress = await ProfileRoadmapProgress.findOne({ roadmapId: node.roadmapId, profileId });
  const entry = progress?.nodeProgress.get(nodeId) ?? null;
  const progressStatus: NodeStatus = entry ? entry.status : defaultNodeStatus(node);
  const isUnlocked = progressStatus !== 'locked';

  const items = await resolveNodeItems(node, entry ?? undefined, isUnlocked);

  return { node, progress: entry, items, isUnlocked };
}

// Returns a lesson (pure study material — resources[]) with its progress for this profile.
export async function getLessonWithProgress(
  lessonId: string,
  profileId: string
): Promise<LessonDetailResult> {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson || !lesson.isActive) throw new Error('Lesson not found');

  const progress = await ProfileRoadmapProgress.findOne({
    roadmapId: lesson.roadmapId,
    profileId,
  });

  const nodeEntry = progress?.nodeProgress.get(lesson.nodeId.toString()) ?? null;
  const ip = nodeEntry?.itemProgress?.get(lessonId) ?? null;
  const isUnlocked = ip ? ip.status !== 'locked' : false;

  return { lesson, progress: ip, isUnlocked };
}

// Marks a lesson's resources viewed. Every lesson item unconditionally auto-completes on
// /study — a Lesson is always "just study material" now, with no practice/assessment notion.
export async function markLessonViewed(
  lessonId: string,
  profileId: string
): Promise<{ progress: IItemProgressEntry } & ItemCompletionResult> {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new Error('Lesson not found');

  const progress = await ProfileRoadmapProgress.findOne({
    roadmapId: lesson.roadmapId,
    profileId,
  });
  if (!progress) throw new Error('Roadmap progress not found — enroll first');

  const nodeKey = lesson.nodeId.toString();
  const itemKey = lessonId.toString();
  const nodeEntry = progress.nodeProgress.get(nodeKey) ?? emptyNodeEntry('unlocked');

  const existing = nodeEntry.itemProgress.get(itemKey);
  const now = new Date();

  const updated: IItemProgressEntry = {
    status: 'completed',
    attempts: existing?.attempts ?? 0,
    bestScore: existing?.bestScore ?? 0,
    studyMaterialViewedAt: existing?.studyMaterialViewedAt ?? now,
    completedAt: existing?.completedAt ?? now,
    lastAttemptAt: existing?.lastAttemptAt,
  };

  nodeEntry.itemProgress.set(itemKey, updated);

  const cascadeResult = await cascadeAfterItemComplete(lesson.nodeId, itemKey, nodeEntry, nodeKey, progress, profileId);

  progress.lastActivityAt = now;
  progress.markModified('nodeProgress');
  await progress.save();

  return { progress: updated, itemCompleted: true, ...cascadeResult };
}

// Validates the quiz item is unlocked, creates a QuizSession. itemId IS the quizId — quiz
// items reference Quiz documents directly, no wrapper Lesson/quizId indirection anymore.
export async function startQuizItem(
  nodeId: string,
  itemId: string,
  profileId: string
): Promise<StartQuizItemResult> {
  const node = await RoadmapNode.findById(nodeId);
  if (!node || !node.isActive) throw new Error('Node not found');

  const ref = node.items.find((i) => i.itemType === 'quiz' && i.itemId.toString() === itemId);
  if (!ref) throw new Error('Quiz item not found on this node');

  const progress = await ProfileRoadmapProgress.findOne({
    roadmapId: node.roadmapId,
    profileId,
  });
  if (!progress) throw new Error('Roadmap progress not found — enroll first');

  const nodeEntry = progress.nodeProgress.get(nodeId);
  const ip = nodeEntry?.itemProgress?.get(itemId);
  if (!ip || ip.status === 'locked') throw new Error('Item is locked');

  return createQuizSession(profileId, itemId);
}

// Completes a quiz item: evaluates quiz results, updates progress, unlocks next item/node.
export async function completeQuizItem(
  nodeId: string,
  itemId: string,
  profileId: string,
  sessionId: string
): Promise<ItemCompletionResult> {
  const node = await RoadmapNode.findById(nodeId);
  if (!node) throw new Error('Node not found');

  const ref = node.items.find((i) => i.itemType === 'quiz' && i.itemId.toString() === itemId);
  if (!ref) throw new Error('Quiz item not found on this node');

  const session = await QuizSession.findOne({ _id: sessionId, profileId });
  if (!session) throw new Error('Session not found');

  const answers = await AnswerRecord.find({ sessionId, profileId });
  const totalPointsAvailable = answers.reduce((s, a) => s + a.maxPoints, 0);
  const totalPointsAwarded = answers.reduce((s, a) => s + a.pointsAwarded, 0);
  const scoreRatio = totalPointsAvailable > 0 ? totalPointsAwarded / totalPointsAvailable : 0;

  const progress = await ProfileRoadmapProgress.findOne({
    roadmapId: node.roadmapId,
    profileId,
  });
  if (!progress) throw new Error('Roadmap progress not found — enroll first');

  const nodeKey = nodeId;
  const itemKey = itemId;
  const nodeEntry = progress.nodeProgress.get(nodeKey) ?? emptyNodeEntry('unlocked');
  const existing = nodeEntry.itemProgress.get(itemKey);
  const now = new Date();

  // A "practice" quiz item is seeded with passingScore 0, so scoreRatio >= 0 always passes —
  // reproduces the old lessonType === 'practice' auto-pass behavior without a special case.
  const passingScore = ref.passingScore ?? 0.7;
  const passed = scoreRatio >= passingScore;

  const updated: IItemProgressEntry = {
    status: passed ? 'completed' : 'in_progress',
    attempts: (existing?.attempts ?? 0) + 1,
    bestScore: Math.max(existing?.bestScore ?? 0, scoreRatio),
    lastAttemptAt: now,
    completedAt: passed ? existing?.completedAt ?? now : existing?.completedAt,
    studyMaterialViewedAt: existing?.studyMaterialViewedAt,
  };

  nodeEntry.itemProgress.set(itemKey, updated);

  let itemCompleted = false;
  let nodeCompleted = false;
  let nextItemId: Types.ObjectId | null = null;
  let nextItemType: NodeItemType | null = null;
  let rewards: { xp: number; peanuts: number; badge?: string } | null = null;

  if (passed) {
    itemCompleted = true;
    const result = await cascadeAfterItemComplete(node._id, itemKey, nodeEntry, nodeKey, progress, profileId);
    nodeCompleted = result.nodeCompleted;
    nextItemId = result.nextItemId;
    nextItemType = result.nextItemType;
    if (nodeCompleted) rewards = result.rewards;
  } else {
    progress.nodeProgress.set(nodeKey, nodeEntry);
  }

  progress.lastActivityAt = now;
  progress.markModified('nodeProgress');
  await progress.save();

  // Stars — awarded when the just-completed item is the last item in the node (structural
  // rule, no new field needed: every node's last item today is its assessment/challenge quiz,
  // reproducing the old lessonType === 'assessment' star-awarding behavior exactly).
  const sortedRefs = node.items.slice().sort((a, b) => a.position - b.position);
  const isLastItem = sortedRefs[sortedRefs.length - 1]?.itemId.toString() === itemId;
  if (isLastItem && passed) {
    let stars = 0;
    if (scoreRatio >= 1.0) stars = 3;
    else if (scoreRatio >= 0.85) stars = 2;
    else stars = 1;
    const ne = progress.nodeProgress.get(nodeKey);
    if (ne) {
      ne.stars = Math.max(ne.stars, stars);
      let totalStars = 0;
      progress.nodeProgress.forEach((e) => {
        totalStars += e.stars;
      });
      progress.totalStars = totalStars;
      progress.markModified('nodeProgress');
      await progress.save();
    }
  }

  return { itemCompleted, nodeCompleted, nextItemId, nextItemType, rewards };
}

// Shared logic after an item is marked completed:
// unlocks the next item in the node, or completes the node and unlocks next nodes.
async function cascadeAfterItemComplete(
  nodeId: Types.ObjectId,
  itemId: string,
  nodeEntry: INodeProgressEntry,
  nodeKey: string,
  progress: Awaited<ReturnType<typeof ProfileRoadmapProgress.findOne>> & NonNullable<unknown>,
  profileId: string
): Promise<{
  nodeCompleted: boolean;
  nextItemId: Types.ObjectId | null;
  nextItemType: NodeItemType | null;
  rewards: { xp: number; peanuts: number; badge?: string } | null;
}> {
  const node = await RoadmapNode.findById(nodeId);
  if (!node) return { nodeCompleted: false, nextItemId: null, nextItemType: null, rewards: null };

  const sortedRefs = node.items.slice().sort((a, b) => a.position - b.position);
  const currentIdx = sortedRefs.findIndex((i) => i.itemId.toString() === itemId);
  const nextRef = sortedRefs[currentIdx + 1];

  let nextItemId: Types.ObjectId | null = null;
  if (nextRef) {
    // Unlock the next item.
    const nextIp = nodeEntry.itemProgress.get(nextRef.itemId.toString());
    if (!nextIp || nextIp.status === 'locked') {
      nodeEntry.itemProgress.set(nextRef.itemId.toString(), {
        status: 'unlocked',
        attempts: 0,
        bestScore: 0,
      });
    }
    nextItemId = nextRef.itemId as Types.ObjectId;
    nodeEntry.status = 'in_progress';
    progress.nodeProgress.set(nodeKey, nodeEntry);
    return { nodeCompleted: false, nextItemId, nextItemType: nextRef.itemType, rewards: null };
  }

  // No next item — check if all items are complete.
  const allItemsDone = sortedRefs.every((ir) => {
    const ip = nodeEntry.itemProgress.get(ir.itemId.toString());
    return ip?.status === 'completed';
  });

  if (allItemsDone) {
    const now = new Date();
    nodeEntry.status = 'completed';
    nodeEntry.completedAt = nodeEntry.completedAt ?? now;
    progress.nodeProgress.set(nodeKey, nodeEntry);

    // Unlock next nodes.
    await unlockNextNodes(node._id as Types.ObjectId, node.roadmapId, progress);

    // Recalculate total stars.
    let totalStars = 0;
    progress.nodeProgress.forEach((e) => {
      totalStars += e.stars;
    });
    progress.totalStars = totalStars;

    // Update subject enrollment progress summary if applicable.
    const roadmap = await Roadmap.findById(node.roadmapId);
    if (roadmap?.subjectId) {
      const subject = await Subject.findById(roadmap.subjectId);
      if (subject) {
        await updateProgressSummary(profileId, subject._id.toString());
      }
    }

    console.log(`Node completed: ${node.title} — xp=${node.rewards.xp}, peanuts=${node.rewards.peanuts}`);
    return { nodeCompleted: true, nextItemId: null, nextItemType: null, rewards: node.rewards };
  }

  progress.nodeProgress.set(nodeKey, nodeEntry);
  return { nodeCompleted: false, nextItemId: null, nextItemType: null, rewards: null };
}

// Finds nodes whose unlockRequires are all completed and sets them to 'unlocked'.
// Unlocks the first item of each newly unlocked node.
async function unlockNextNodes(
  completedNodeId: Types.ObjectId,
  roadmapId: Types.ObjectId,
  progress: Awaited<ReturnType<typeof ProfileRoadmapProgress.findOne>> & NonNullable<unknown>
): Promise<void> {
  const candidates = await RoadmapNode.find({
    roadmapId,
    unlockRequires: completedNodeId,
    isActive: true,
  });

  for (const candidate of candidates) {
    const candidateKey = candidate._id.toString();
    const existingEntry = progress.nodeProgress.get(candidateKey);
    if (existingEntry?.status === 'completed' || existingEntry?.status === 'unlocked') continue;

    const allDone = candidate.unlockRequires.every((reqId) => {
      const reqEntry = progress.nodeProgress.get(reqId.toString());
      return reqEntry?.status === 'completed';
    });

    if (allDone) {
      const itemProgress: Map<string, IItemProgressEntry> = new Map();
      const sortedItems = candidate.items.slice().sort((a, b) => a.position - b.position);
      sortedItems.forEach((ir, idx) => {
        itemProgress.set(ir.itemId.toString(), {
          status: idx === 0 ? 'unlocked' : 'locked',
          attempts: 0,
          bestScore: 0,
        });
      });

      progress.nodeProgress.set(candidateKey, emptyNodeEntry('unlocked', itemProgress));
    }
  }
}
