// Business logic for the roadmap system: progress tracking, node unlocking, and assessments.
import { Types } from 'mongoose';
import Roadmap from '../../models/learning/roadmap.model';
import RoadmapNode, { IRoadmapNodeDocument } from '../../models/learning/roadmapNode.model';
import ProfileRoadmapProgress, {
  INodeProgressEntry,
  NodeStatus,
} from '../../models/learning/profileRoadmapProgress.model';
import Question from '../../models/apps/language/vocabulary/question.model';
import QuizSession from '../../models/learning/quizSession.model';
import AnswerRecord from '../../models/learning/answerRecord.model';
import {
  RoadmapWithProgressResult,
  NodeDetailResult,
  NodeCompletionResult,
  StartAssessmentResult,
} from './roadmap.types';
import { QuestionType } from '../../models/apps/language/vocabulary/question.model';

// Determines the effective status of a node when it has no entry in the nodeProgress map.
function defaultNodeStatus(node: IRoadmapNodeDocument): NodeStatus {
  if (node.position === 1 || node.unlockRequires.length === 0) return 'unlocked';
  return 'locked';
}

// Returns roadmap, all active nodes with per-node progress, and summary stats.
export async function getRoadmapWithProgress(
  miniAppId: string,
  profileId: string
): Promise<RoadmapWithProgressResult> {
  const roadmap = await Roadmap.findOne({ miniAppId, isActive: true });
  if (!roadmap) throw new Error('Roadmap not found');

  const nodes = await RoadmapNode.find({ roadmapId: roadmap._id, isActive: true }).sort({
    position: 1,
  });

  let progress = await ProfileRoadmapProgress.findOne({
    profileId,
    roadmapId: roadmap._id,
  });

  if (!progress) {
    progress = await ProfileRoadmapProgress.create({
      profileId,
      roadmapId: roadmap._id,
      miniAppId,
    });
  }

  let completedNodes = 0;
  const nodesWithProgress = nodes.map((node) => {
    const nodeId = node._id.toString();
    const entry = progress!.nodeProgress.get(nodeId);
    const progressStatus: NodeStatus = entry ? entry.status : defaultNodeStatus(node);
    const stars = entry ? entry.stars : 0;
    const isUnlocked = progressStatus !== 'locked';
    if (progressStatus === 'completed') completedNodes++;

    return Object.assign(node, { progressStatus, stars, isUnlocked });
  });

  return {
    roadmap,
    nodes: nodesWithProgress,
    totalStars: progress.totalStars,
    completedNodes,
    totalNodes: nodes.length,
  };
}

// Returns a single node with its study material, questions, and this profile's progress entry.
export async function getNodeWithProgress(
  nodeId: string,
  profileId: string,
  ageGroupFilter?: QuestionType[]
): Promise<NodeDetailResult> {
  const node = await RoadmapNode.findById(nodeId);
  if (!node || !node.isActive) throw new Error('Node not found');

  const progress = await ProfileRoadmapProgress.findOne({
    roadmapId: node.roadmapId,
    profileId,
  });

  const entry = progress?.nodeProgress.get(nodeId) ?? null;
  const progressStatus: NodeStatus = entry ? entry.status : defaultNodeStatus(node);
  const isUnlocked = progressStatus !== 'locked';

  const questionQuery: Record<string, unknown> = { nodeId, isActive: true };
  if (ageGroupFilter && ageGroupFilter.length > 0) {
    questionQuery['type'] = { $in: ageGroupFilter };
  }
  const questions = await Question.find(questionQuery);

  return { node, progress: entry, questions, isUnlocked };
}

// Marks the study material as viewed and moves status from 'unlocked' to 'in_progress'.
export async function markStudyMaterialViewed(
  nodeId: string,
  profileId: string
): Promise<INodeProgressEntry> {
  const node = await RoadmapNode.findById(nodeId);
  if (!node) throw new Error('Node not found');

  let progress = await ProfileRoadmapProgress.findOne({
    roadmapId: node.roadmapId,
    profileId,
  });

  if (!progress) {
    progress = await ProfileRoadmapProgress.create({
      profileId,
      roadmapId: node.roadmapId,
      miniAppId: node.roadmapId, // will be overwritten below via roadmap lookup
    });
  }

  const key = nodeId.toString();
  const existing = progress.nodeProgress.get(key);

  const updated: INodeProgressEntry = {
    status:
      !existing || existing.status === 'unlocked' ? 'in_progress' : (existing.status as NodeStatus),
    stars: existing?.stars ?? 0,
    attempts: existing?.attempts ?? 0,
    bestScore: existing?.bestScore ?? 0,
    lastAttemptAt: existing?.lastAttemptAt,
    completedAt: existing?.completedAt,
    studyMaterialViewedAt: existing?.studyMaterialViewedAt ?? new Date(),
  };

  progress.nodeProgress.set(key, updated);
  progress.lastActivityAt = new Date();
  progress.markModified('nodeProgress');
  await progress.save();

  return updated;
}

// Validates that the node is unlocked and attempts are within limits, then creates a QuizSession.
export async function startNodeAssessment(
  nodeId: string,
  profileId: string
): Promise<StartAssessmentResult> {
  const node = await RoadmapNode.findById(nodeId);
  if (!node || !node.isActive) throw new Error('Node not found');

  const roadmap = await Roadmap.findById(node.roadmapId);
  if (!roadmap) throw new Error('Roadmap not found');

  let progress = await ProfileRoadmapProgress.findOne({
    roadmapId: node.roadmapId,
    profileId,
  });

  if (!progress) {
    progress = await ProfileRoadmapProgress.create({
      profileId,
      roadmapId: node.roadmapId,
      miniAppId: roadmap.miniAppId,
    });
  }

  const entry = progress.nodeProgress.get(nodeId.toString());
  const status: NodeStatus = entry ? entry.status : defaultNodeStatus(node);

  if (status === 'locked') throw new Error('Node is locked');

  const { attemptsAllowed } = node.assessment;
  if (attemptsAllowed > 0 && (entry?.attempts ?? 0) >= attemptsAllowed) {
    throw new Error('Maximum attempts reached for this node');
  }

  const nodeQuestions = await Question.find({ nodeId, isActive: true });
  const questionIds = nodeQuestions.map((q) => q._id as Types.ObjectId);
  const questionTypes = [...new Set(nodeQuestions.map((q) => q.type))];

  const session = await QuizSession.create({
    profileId,
    miniAppId: roadmap.miniAppId,
    status: 'active',
    questionIds,
    settings: {
      questionCount: questionIds.length,
      timeLimit: node.assessment.timeLimitSeconds,
      questionTypes,
      bucketFilter: 'all',
    },
    startedAt: new Date(),
  });

  const firstQuestion = questionIds.length > 0 ? await Question.findById(questionIds[0]) : null;

  return { session, firstQuestion };
}

// Fetches completed session results, updates node progress, unlocks next nodes, and returns outcome.
export async function completeNodeAssessment(
  nodeId: string,
  profileId: string,
  sessionId: string
): Promise<NodeCompletionResult> {
  const node = await RoadmapNode.findById(nodeId);
  if (!node) throw new Error('Node not found');

  const session = await QuizSession.findOne({ _id: sessionId, profileId });
  if (!session) throw new Error('Session not found');

  const answers = await AnswerRecord.find({ sessionId, profileId });
  const totalPointsAvailable = answers.reduce((s, a) => s + a.maxPoints, 0);
  const totalPointsAwarded = answers.reduce((s, a) => s + a.pointsAwarded, 0);
  const scoreRatio =
    totalPointsAvailable > 0 ? totalPointsAwarded / totalPointsAvailable : 0;

  const { passingScore } = node.assessment;
  let stars = 0;
  if (scoreRatio >= 1.0) stars = 3;
  else if (scoreRatio >= 0.85) stars = 2;
  else if (scoreRatio >= passingScore) stars = 1;

  const passed = stars >= 1;

  const roadmap = await Roadmap.findById(node.roadmapId);
  if (!roadmap) throw new Error('Roadmap not found');

  let progress = await ProfileRoadmapProgress.findOne({
    roadmapId: node.roadmapId,
    profileId,
  });

  if (!progress) {
    progress = await ProfileRoadmapProgress.create({
      profileId,
      roadmapId: node.roadmapId,
      miniAppId: roadmap.miniAppId,
    });
  }

  const key = nodeId.toString();
  const existing = progress.nodeProgress.get(key);
  const now = new Date();

  const newEntry: INodeProgressEntry = {
    status: passed ? 'completed' : (existing?.status ?? defaultNodeStatus(node)),
    stars: Math.max(existing?.stars ?? 0, stars),
    attempts: (existing?.attempts ?? 0) + 1,
    bestScore: Math.max(existing?.bestScore ?? 0, scoreRatio),
    lastAttemptAt: now,
    completedAt: passed && !existing?.completedAt ? now : existing?.completedAt,
    studyMaterialViewedAt: existing?.studyMaterialViewedAt,
  };

  progress.nodeProgress.set(key, newEntry);

  // Recalculate total stars across all nodes
  let totalStars = 0;
  progress.nodeProgress.forEach((entry) => {
    totalStars += entry.stars;
  });
  progress.totalStars = totalStars;
  progress.lastActivityAt = now;
  progress.markModified('nodeProgress');

  let nextNodeId: Types.ObjectId | null = null;
  if (passed) {
    nextNodeId = await unlockNextNodes(node._id as Types.ObjectId, profileId, node.roadmapId, progress);
    // Log rewards — rewards service comes later
    console.log(`Rewards for node ${node.title}: xp=${node.rewards.xp}, peanuts=${node.rewards.peanuts}`);
  }

  await progress.save();

  return {
    passed,
    stars,
    score: scoreRatio,
    rewards: passed ? node.rewards : null,
    nextNodeId,
  };
}

// Finds nodes whose unlockRequires are all completed and unlocks them.
// Returns the first newly unlocked nodeId, or null.
async function unlockNextNodes(
  completedNodeId: Types.ObjectId,
  profileId: string,
  roadmapId: Types.ObjectId,
  progress: Awaited<ReturnType<typeof ProfileRoadmapProgress.findOne>> & NonNullable<unknown>
): Promise<Types.ObjectId | null> {
  const candidates = await RoadmapNode.find({
    roadmapId,
    unlockRequires: completedNodeId,
    isActive: true,
  });

  let firstUnlocked: Types.ObjectId | null = null;

  for (const candidate of candidates) {
    const candidateKey = candidate._id.toString();
    const existingEntry = progress.nodeProgress.get(candidateKey);
    if (existingEntry?.status === 'completed' || existingEntry?.status === 'unlocked') continue;

    // Check all prerequisites are completed
    const allDone = candidate.unlockRequires.every((reqId) => {
      const reqEntry = progress.nodeProgress.get(reqId.toString());
      return reqEntry?.status === 'completed';
    });

    if (allDone) {
      progress.nodeProgress.set(candidateKey, {
        status: 'unlocked',
        stars: 0,
        attempts: 0,
        bestScore: 0,
      });
      if (!firstUnlocked) firstUnlocked = candidate._id as Types.ObjectId;
    }
  }

  return firstUnlocked;
}
