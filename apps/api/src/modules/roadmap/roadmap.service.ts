// Business logic for the roadmap system: progress tracking, node/lesson unlocking.
// studyMaterial and assessment now live on Lesson documents, not on RoadmapNode.
import { Types } from 'mongoose';
import Roadmap from '../../models/learning/roadmap.model';
import RoadmapNode, { IRoadmapNodeDocument } from '../../models/learning/roadmapNode.model';
import Lesson, { ILessonDocument } from '../../models/learning/lesson.model';
import ProfileRoadmapProgress, {
  INodeProgressEntry,
  ILessonProgressEntry,
  NodeStatus,
  LessonStatus,
} from '../../models/learning/profileRoadmapProgress.model';
import Question from '../../models/apps/language/vocabulary/question.model';
import Quiz from '../../models/learning/quiz.model';
import QuizSession from '../../models/learning/quizSession.model';
import AnswerRecord from '../../models/learning/answerRecord.model';
import { createQuizSession } from '../../services/quizSession.service';
import {
  RoadmapWithProgressResult,
  NodeDetailResult,
  LessonDetailResult,
  LessonCompletionResult,
  StartLessonResult,
  LessonWithProgress,
} from './roadmap.types';
import { QuestionType } from '../../models/apps/language/vocabulary/question.model';
import { updateProgressSummary } from '../enrollment/enrollment.service';
import Subject from '../../models/core/subject.model';

// Default status for a node that has no progress entry yet.
function defaultNodeStatus(node: IRoadmapNodeDocument): NodeStatus {
  if (node.position === 1 || node.unlockRequires.length === 0) return 'unlocked';
  return 'locked';
}

// Empty node progress entry with initialised lesson map.
function emptyNodeEntry(status: NodeStatus, lessonProgress?: Map<string, ILessonProgressEntry>): INodeProgressEntry {
  return {
    status,
    stars: 0,
    attempts: 0,
    bestScore: 0,
    lessonProgress: lessonProgress ?? new Map(),
  };
}

// Returns roadmap with ordered nodes+lessons and per-item progress.
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
  let completedLessons = 0;
  let totalLessons = 0;

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

      // Attach ordered lessons with progress.
      const sortedLessonRefs = node.lessons.slice().sort((a, b) => a.position - b.position);
      const lessonIds = sortedLessonRefs.map((l) => l.lessonId);
      const lessonDocs = await Lesson.find({ _id: { $in: lessonIds }, isActive: true });
      const lessonDocMap = new Map(lessonDocs.map((l) => [l._id.toString(), l]));

      const lessons: LessonWithProgress[] = sortedLessonRefs
        .map((lr) => {
          const lesson = lessonDocMap.get(lr.lessonId.toString());
          if (!lesson) return null;
          const lessonId = lesson._id.toString();
          const lp = entry?.lessonProgress?.get(lessonId);
          const lessonStatus: LessonStatus = lp ? lp.status : (isUnlocked && sortedLessonRefs[0]?.lessonId.toString() === lessonId ? 'unlocked' : 'locked');
          if (lp?.status === 'completed') completedLessons++;
          totalLessons++;
          return Object.assign(lesson.toObject(), {
            progressStatus: lessonStatus,
            isUnlocked: lessonStatus !== 'locked',
          }) as LessonWithProgress;
        })
        .filter((l): l is LessonWithProgress => l !== null);

      return Object.assign(node.toObject(), { progressStatus, stars, isUnlocked, lessons });
    })
  );

  const validNodes = nodesWithProgress.filter((n): n is NonNullable<typeof n> => n !== null);

  return {
    roadmap,
    nodes: validNodes as RoadmapWithProgressResult['nodes'],
    totalStars: progress.totalStars,
    completedNodes,
    totalNodes: sortedNodeRefs.length,
    completedLessons,
    totalLessons,
  };
}

// Returns a node with its ordered lessons and per-lesson progress.
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

  const sortedLessonRefs = node.lessons.slice().sort((a, b) => a.position - b.position);
  const lessonDocs = await Lesson.find({
    _id: { $in: sortedLessonRefs.map((l) => l.lessonId) },
    isActive: true,
  });
  const lessonDocMap = new Map(lessonDocs.map((l) => [l._id.toString(), l]));

  const lessons: LessonWithProgress[] = sortedLessonRefs
    .map((lr, idx) => {
      const lesson = lessonDocMap.get(lr.lessonId.toString());
      if (!lesson) return null;
      const lp = entry?.lessonProgress?.get(lesson._id.toString());
      const lessonStatus: LessonStatus = lp
        ? lp.status
        : isUnlocked && idx === 0
          ? 'unlocked'
          : 'locked';
      return Object.assign(lesson.toObject(), {
        progressStatus: lessonStatus,
        isUnlocked: lessonStatus !== 'locked',
      }) as LessonWithProgress;
    })
    .filter((l): l is LessonWithProgress => l !== null);

  return { node, progress: entry, lessons, isUnlocked };
}

// Returns a lesson with its questions and progress for this profile.
export async function getLessonWithProgress(
  lessonId: string,
  profileId: string,
  ageGroupFilter?: QuestionType[]
): Promise<LessonDetailResult> {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson || !lesson.isActive) throw new Error('Lesson not found');

  const progress = await ProfileRoadmapProgress.findOne({
    roadmapId: lesson.roadmapId,
    profileId,
  });

  const nodeEntry = progress?.nodeProgress.get(lesson.nodeId.toString()) ?? null;
  const lp = nodeEntry?.lessonProgress?.get(lessonId) ?? null;
  const isUnlocked = lp ? lp.status !== 'locked' : false;

  const quiz = lesson.quizId ? await Quiz.findById(lesson.quizId) : null;
  const quizQuestionIds = quiz?.questionIds ?? [];

  const questionQuery: Record<string, unknown> = {
    _id: { $in: quizQuestionIds },
    isActive: true,
  };
  if (ageGroupFilter && ageGroupFilter.length > 0) {
    questionQuery['type'] = { $in: ageGroupFilter };
  }
  const questions = await Question.find(questionQuery);
  // Preserve the quiz's question order.
  const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));
  const orderedQuestions = quizQuestionIds
    .map((id) => questionMap.get(id.toString()))
    .filter((q): q is NonNullable<typeof q> => !!q);

  return { lesson, progress: lp, questions: orderedQuestions, isUnlocked };
}

// Marks study material viewed on a lesson. Auto-completes if lessonType === 'introduction'.
export async function markLessonStudyViewed(
  lessonId: string,
  profileId: string
): Promise<{ progress: ILessonProgressEntry; lessonCompleted: boolean }> {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new Error('Lesson not found');

  let progress = await ProfileRoadmapProgress.findOne({
    roadmapId: lesson.roadmapId,
    profileId,
  });
  if (!progress) throw new Error('Roadmap progress not found — enroll first');

  const nodeKey = lesson.nodeId.toString();
  const lessonKey = lessonId.toString();
  const nodeEntry = progress.nodeProgress.get(nodeKey) ?? emptyNodeEntry('unlocked');

  const existing = nodeEntry.lessonProgress.get(lessonKey);
  const now = new Date();

  const isIntro = lesson.lessonType === 'introduction';
  const updated: ILessonProgressEntry = {
    status: isIntro ? 'completed' : (existing?.status === 'locked' ? 'unlocked' : (existing?.status ?? 'in_progress')),
    attempts: existing?.attempts ?? 0,
    bestScore: existing?.bestScore ?? 0,
    studyMaterialViewedAt: existing?.studyMaterialViewedAt ?? now,
    completedAt: isIntro ? (existing?.completedAt ?? now) : existing?.completedAt,
    lastAttemptAt: existing?.lastAttemptAt,
  };

  nodeEntry.lessonProgress.set(lessonKey, updated);

  // For 'introduction' type, auto-complete the lesson and cascade.
  let lessonCompleted = false;
  if (isIntro && updated.status === 'completed') {
    lessonCompleted = true;
    await cascadeAfterLessonComplete(lesson, nodeEntry, nodeKey, progress, profileId);
  } else {
    progress.nodeProgress.set(nodeKey, nodeEntry);
  }

  progress.lastActivityAt = now;
  progress.markModified('nodeProgress');
  await progress.save();

  return { progress: updated, lessonCompleted };
}

// Validates lesson is unlocked and has questions, creates a QuizSession.
export async function startLesson(
  lessonId: string,
  profileId: string
): Promise<StartLessonResult> {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson || !lesson.isActive) throw new Error('Lesson not found');
  if (!lesson.quizId) throw new Error('Lesson has no questions');

  const progress = await ProfileRoadmapProgress.findOne({
    roadmapId: lesson.roadmapId,
    profileId,
  });
  if (!progress) throw new Error('Roadmap progress not found — enroll first');

  const nodeEntry = progress.nodeProgress.get(lesson.nodeId.toString());
  const lp = nodeEntry?.lessonProgress?.get(lessonId);
  if (!lp || lp.status === 'locked') throw new Error('Lesson is locked');

  return createQuizSession(profileId, lesson.quizId.toString());
}

// Completes a lesson: evaluates quiz results, updates progress, unlocks next lesson/node.
export async function completeLesson(
  lessonId: string,
  profileId: string,
  sessionId: string
): Promise<LessonCompletionResult> {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new Error('Lesson not found');

  const session = await QuizSession.findOne({ _id: sessionId, profileId });
  if (!session) throw new Error('Session not found');

  const answers = await AnswerRecord.find({ sessionId, profileId });
  const totalPointsAvailable = answers.reduce((s, a) => s + a.maxPoints, 0);
  const totalPointsAwarded = answers.reduce((s, a) => s + a.pointsAwarded, 0);
  const scoreRatio = totalPointsAvailable > 0 ? totalPointsAwarded / totalPointsAvailable : 0;

  let progress = await ProfileRoadmapProgress.findOne({
    roadmapId: lesson.roadmapId,
    profileId,
  });
  if (!progress) throw new Error('Roadmap progress not found — enroll first');

  const nodeKey = lesson.nodeId.toString();
  const lessonKey = lessonId.toString();
  const nodeEntry = progress.nodeProgress.get(nodeKey) ?? emptyNodeEntry('unlocked');
  const existing = nodeEntry.lessonProgress.get(lessonKey);
  const now = new Date();

  const isPractice = lesson.lessonType === 'practice';
  const isAssessment = lesson.lessonType === 'assessment';
  const passed = isPractice || scoreRatio >= lesson.passingScore;

  const updatedLp: ILessonProgressEntry = {
    status: passed ? 'completed' : 'in_progress',
    attempts: (existing?.attempts ?? 0) + 1,
    bestScore: Math.max(existing?.bestScore ?? 0, scoreRatio),
    lastAttemptAt: now,
    completedAt: passed ? (existing?.completedAt ?? now) : existing?.completedAt,
    studyMaterialViewedAt: existing?.studyMaterialViewedAt,
  };

  nodeEntry.lessonProgress.set(lessonKey, updatedLp);

  let lessonCompleted = false;
  let nodeCompleted = false;
  let nextLessonId: Types.ObjectId | null = null;
  let rewards: { xp: number; peanuts: number; badge?: string } | null = null;

  if (passed) {
    lessonCompleted = true;
    const result = await cascadeAfterLessonComplete(lesson, nodeEntry, nodeKey, progress, profileId);
    nodeCompleted = result.nodeCompleted;
    nextLessonId = result.nextLessonId;
    if (nodeCompleted) rewards = result.rewards;
  } else {
    progress.nodeProgress.set(nodeKey, nodeEntry);
  }

  progress.lastActivityAt = now;
  progress.markModified('nodeProgress');
  await progress.save();

  // Stars on assessment lessons — track against the node.
  if (isAssessment && passed) {
    let stars = 0;
    if (scoreRatio >= 1.0) stars = 3;
    else if (scoreRatio >= 0.85) stars = 2;
    else stars = 1;
    const ne = progress.nodeProgress.get(nodeKey);
    if (ne) {
      ne.stars = Math.max(ne.stars, stars);
      let totalStars = 0;
      progress.nodeProgress.forEach((e) => { totalStars += e.stars; });
      progress.totalStars = totalStars;
      progress.markModified('nodeProgress');
      await progress.save();
    }
  }

  return { lessonCompleted, nodeCompleted, nextLessonId, rewards };
}

// Shared logic after a lesson is marked completed:
// unlocks the next lesson in the node, or completes the node and unlocks next nodes.
async function cascadeAfterLessonComplete(
  lesson: ILessonDocument,
  nodeEntry: INodeProgressEntry,
  nodeKey: string,
  progress: Awaited<ReturnType<typeof ProfileRoadmapProgress.findOne>> & NonNullable<unknown>,
  profileId: string
): Promise<{ nodeCompleted: boolean; nextLessonId: Types.ObjectId | null; rewards: { xp: number; peanuts: number; badge?: string } | null }> {
  const node = await RoadmapNode.findById(lesson.nodeId);
  if (!node) return { nodeCompleted: false, nextLessonId: null, rewards: null };

  const sortedLessonRefs = node.lessons.slice().sort((a, b) => a.position - b.position);
  const currentIdx = sortedLessonRefs.findIndex((l) => l.lessonId.toString() === lesson._id.toString());
  const nextRef = sortedLessonRefs[currentIdx + 1];

  let nextLessonId: Types.ObjectId | null = null;
  if (nextRef) {
    // Unlock the next lesson.
    const nextLp = nodeEntry.lessonProgress.get(nextRef.lessonId.toString());
    if (!nextLp || nextLp.status === 'locked') {
      nodeEntry.lessonProgress.set(nextRef.lessonId.toString(), {
        status: 'unlocked',
        attempts: 0,
        bestScore: 0,
      });
    }
    nextLessonId = nextRef.lessonId as Types.ObjectId;
    nodeEntry.status = 'in_progress';
    progress.nodeProgress.set(nodeKey, nodeEntry);
    return { nodeCompleted: false, nextLessonId, rewards: null };
  }

  // No next lesson — check if all lessons are complete.
  const allLessonsDone = sortedLessonRefs.every((lr) => {
    const lp = nodeEntry.lessonProgress.get(lr.lessonId.toString());
    return lp?.status === 'completed';
  });

  if (allLessonsDone) {
    const now = new Date();
    nodeEntry.status = 'completed';
    nodeEntry.completedAt = nodeEntry.completedAt ?? now;
    progress.nodeProgress.set(nodeKey, nodeEntry);

    // Unlock next nodes.
    await unlockNextNodes(node._id as Types.ObjectId, node.roadmapId, progress);

    // Recalculate total stars.
    let totalStars = 0;
    progress.nodeProgress.forEach((e) => { totalStars += e.stars; });
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
    return { nodeCompleted: true, nextLessonId: null, rewards: node.rewards };
  }

  progress.nodeProgress.set(nodeKey, nodeEntry);
  return { nodeCompleted: false, nextLessonId: null, rewards: null };
}

// Finds nodes whose unlockRequires are all completed and sets them to 'unlocked'.
// Unlocks the first lesson of each newly unlocked node.
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
      const lessonProgress: Map<string, ILessonProgressEntry> = new Map();
      const sortedLessons = candidate.lessons.slice().sort((a, b) => a.position - b.position);
      sortedLessons.forEach((lr, idx) => {
        lessonProgress.set(lr.lessonId.toString(), {
          status: idx === 0 ? 'unlocked' : 'locked',
          attempts: 0,
          bestScore: 0,
        });
      });

      progress.nodeProgress.set(candidateKey, emptyNodeEntry('unlocked', lessonProgress));
    }
  }
}
