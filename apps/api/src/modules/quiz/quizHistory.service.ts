// Read-only reporting queries for a profile's quiz-attempt history (Quiz History screen) — joins
// across QuizSession, Quiz, Course/MiniApp, Subject, Field, and RoadmapNode to reconstruct enough
// context (course/topic names, slugs, retake target) for a session that only stores raw ids.
// Kept separate from quizSession.service.ts (session lifecycle) and quiz.service.ts (Quiz-
// definition reads) since this is the only place that needs to join across the content hierarchy.
import { Types } from 'mongoose';
import QuizSession, { SessionStatus } from '../../models/learning/quizSession.model';
import Quiz, { QuizMode, IAssignedPlayMode } from '../../models/learning/quiz.model';
import Course from '../../models/core/course.model';
import MiniApp from '../../models/core/miniApp.model';
import Subject from '../../models/core/subject.model';
import Field from '../../models/core/field.model';
import RoadmapNode from '../../models/learning/roadmapNode.model';

export interface QuizHistoryFilters {
  contextId?: string;
  nodeId?: string;
  status?: 'completed' | 'abandoned' | 'all';
}

export interface QuizHistoryEntry {
  sessionId: string;
  quizId: string | null;
  quizTitle: string;
  quizMode: QuizMode | null;
  // The teacher's Quiz Modes assignment, if any — carried here so a retake can reproduce the
  // exact same session (hearts/timer/streak/etc.) a normal tap on this quiz would start,
  // instead of silently falling back to an ordinary session. null for un-assigned/miniApp quizzes.
  assignedPlayMode: IAssignedPlayMode | null;
  status: SessionStatus;
  percentageScore: number;
  correct: number;
  totalQuestions: number;
  startedAt: Date;
  completedAt: Date | null;
  timeTakenMs: number;
  contextType: 'course' | 'miniApp';
  contextId: string;
  contextName: string;
  contextSlug: string;
  fieldSlug: string;
  subjectSlug: string;
  nodeId: string | null;
  nodeTitle: string | null;
}

export interface QuizHistoryListResult {
  items: QuizHistoryEntry[];
  total: number;
  page: number;
  limit: number;
}

interface ContextInfo {
  contextType: 'course' | 'miniApp';
  name: string;
  slug: string;
  subjectSlug: string;
  fieldSlug: string;
}

// Resolves each distinct miniAppId to either a Course (roadmap/pool quizzes) or a MiniApp
// (Dictionary quizzes) — no MiniApp document exists for roadmap content, so Course is tried
// first (matches the established "miniAppId holds the Course's _id" convention — see CLAUDE.md).
async function resolveContexts(miniAppIds: string[]): Promise<Map<string, ContextInfo>> {
  const map = new Map<string, ContextInfo>();
  if (miniAppIds.length === 0) return map;

  const [courses, miniApps] = await Promise.all([
    Course.find({ _id: { $in: miniAppIds } }).lean(),
    MiniApp.find({ _id: { $in: miniAppIds } }).lean(),
  ]);

  const subjectIds = new Set<string>();
  courses.forEach((c) => subjectIds.add(c.subjectId.toString()));
  miniApps.forEach((m) => subjectIds.add(m.subjectId.toString()));

  const subjects =
    subjectIds.size > 0 ? await Subject.find({ _id: { $in: Array.from(subjectIds) } }).lean() : [];
  const subjectById = new Map(subjects.map((s) => [s._id.toString(), s]));

  const fieldIds = new Set(subjects.map((s) => s.fieldId.toString()));
  const fields = fieldIds.size > 0 ? await Field.find({ _id: { $in: Array.from(fieldIds) } }).lean() : [];
  const fieldById = new Map(fields.map((f) => [f._id.toString(), f]));

  for (const course of courses) {
    const subject = subjectById.get(course.subjectId.toString());
    const field = subject ? fieldById.get(subject.fieldId.toString()) : undefined;
    map.set(course._id.toString(), {
      contextType: 'course',
      name: course.name,
      slug: course.slug,
      subjectSlug: subject?.slug ?? '',
      fieldSlug: field?.slug ?? '',
    });
  }

  for (const miniApp of miniApps) {
    // Course id space and MiniApp id space never collide in practice, but be defensive.
    if (map.has(miniApp._id.toString())) continue;
    const subject = subjectById.get(miniApp.subjectId.toString());
    const field = subject ? fieldById.get(subject.fieldId.toString()) : undefined;
    map.set(miniApp._id.toString(), {
      contextType: 'miniApp',
      name: miniApp.name,
      slug: miniApp.slug,
      subjectSlug: subject?.slug ?? '',
      fieldSlug: field?.slug ?? '',
    });
  }

  return map;
}

// Resolves each distinct quizId to the RoadmapNode ("Topic") that references it as a 'quiz'
// item, if any — pool/dynamic quizzes and quizzes not on any node resolve to nothing.
async function resolveNodesByQuizId(
  quizIds: string[]
): Promise<Map<string, { nodeId: string; nodeTitle: string }>> {
  const map = new Map<string, { nodeId: string; nodeTitle: string }>();
  if (quizIds.length === 0) return map;

  const nodes = await RoadmapNode.find({ 'items.itemId': { $in: quizIds } })
    .select('title items')
    .lean();

  for (const node of nodes) {
    for (const item of node.items) {
      const itemIdStr = item.itemId.toString();
      if (item.itemType === 'quiz' && quizIds.includes(itemIdStr)) {
        map.set(itemIdStr, { nodeId: node._id.toString(), nodeTitle: node.title });
      }
    }
  }

  return map;
}

const DEFAULT_LIMIT = 20;

export async function listQuizHistory(
  profileId: string,
  filters: QuizHistoryFilters,
  page = 1,
  limit = DEFAULT_LIMIT
): Promise<QuizHistoryListResult> {
  const statusFilter: SessionStatus[] =
    filters.status === 'completed'
      ? ['completed']
      : filters.status === 'abandoned'
      ? ['abandoned']
      : ['completed', 'abandoned'];

  const query: Record<string, unknown> = { profileId, status: { $in: statusFilter } };

  if (filters.contextId) {
    query.miniAppId = filters.contextId;
  }

  if (filters.nodeId) {
    const node = await RoadmapNode.findById(filters.nodeId).select('items').lean();
    const quizIds = (node?.items ?? [])
      .filter((i) => i.itemType === 'quiz')
      .map((i) => i.itemId.toString());
    if (quizIds.length === 0) {
      return { items: [], total: 0, page, limit };
    }
    query.quizId = { $in: quizIds };
  }

  const [sessions, total] = await Promise.all([
    QuizSession.find(query)
      .sort({ startedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    QuizSession.countDocuments(query),
  ]);

  const quizIds = Array.from(
    new Set(sessions.filter((s) => s.quizId).map((s) => s.quizId!.toString()))
  );
  const miniAppIds = Array.from(new Set(sessions.map((s) => s.miniAppId.toString())));

  const [quizzes, contextByMiniAppId, nodeByQuizId] = await Promise.all([
    quizIds.length > 0 ? Quiz.find({ _id: { $in: quizIds } }).lean() : Promise.resolve([]),
    resolveContexts(miniAppIds),
    resolveNodesByQuizId(quizIds),
  ]);
  const quizById = new Map(quizzes.map((q) => [q._id.toString(), q]));

  const items: QuizHistoryEntry[] = sessions.map((session) => {
    const quizIdStr = session.quizId?.toString() ?? null;
    const quiz = quizIdStr ? quizById.get(quizIdStr) : undefined;
    const context = contextByMiniAppId.get(session.miniAppId.toString());
    const node = quizIdStr ? nodeByQuizId.get(quizIdStr) : undefined;

    return {
      sessionId: session._id.toString(),
      quizId: quizIdStr,
      quizTitle: quiz?.title ?? 'Quiz',
      quizMode: quiz?.mode ?? null,
      assignedPlayMode: quiz?.assignedPlayMode ?? null,
      status: session.status,
      percentageScore: session.results?.percentageScore ?? 0,
      correct: session.results?.correct ?? 0,
      totalQuestions: session.results?.totalQuestions ?? session.questionIds.length,
      startedAt: session.startedAt,
      completedAt: session.completedAt ?? null,
      timeTakenMs: session.results?.timeTakenMs ?? 0,
      contextType: context?.contextType ?? 'course',
      contextId: session.miniAppId.toString(),
      contextName: context?.name ?? 'Unknown',
      contextSlug: context?.slug ?? '',
      fieldSlug: context?.fieldSlug ?? '',
      subjectSlug: context?.subjectSlug ?? '',
      nodeId: node?.nodeId ?? null,
      nodeTitle: node?.nodeTitle ?? null,
    };
  });

  return { items, total, page, limit };
}

export interface QuizHistoryEntryContext {
  quizTitle: string;
  quizMode: QuizMode | null;
  assignedPlayMode: IAssignedPlayMode | null;
  contextType: 'course' | 'miniApp';
  contextId: string;
  contextName: string;
  contextSlug: string;
  fieldSlug: string;
  subjectSlug: string;
  nodeId: string | null;
  nodeTitle: string | null;
}

// Same enrichment as one listQuizHistory entry, but for a single already-fetched session —
// used by the session-review endpoint so its response carries enough context (course/topic
// names, slugs) to build a retake link without a second round-trip to /quiz/history.
export async function getEntryContext(session: {
  miniAppId: Types.ObjectId | string;
  quizId?: Types.ObjectId | string | null;
}): Promise<QuizHistoryEntryContext> {
  const miniAppId = session.miniAppId.toString();
  const quizIdStr = session.quizId ? session.quizId.toString() : null;

  const [contextByMiniAppId, nodeByQuizId, quiz] = await Promise.all([
    resolveContexts([miniAppId]),
    quizIdStr ? resolveNodesByQuizId([quizIdStr]) : Promise.resolve(new Map()),
    quizIdStr ? Quiz.findById(quizIdStr).lean() : Promise.resolve(null),
  ]);

  const context = contextByMiniAppId.get(miniAppId);
  const node = quizIdStr ? nodeByQuizId.get(quizIdStr) : undefined;

  return {
    quizTitle: quiz?.title ?? 'Quiz',
    quizMode: quiz?.mode ?? null,
    assignedPlayMode: quiz?.assignedPlayMode ?? null,
    contextType: context?.contextType ?? 'course',
    contextId: miniAppId,
    contextName: context?.name ?? 'Unknown',
    contextSlug: context?.slug ?? '',
    fieldSlug: context?.fieldSlug ?? '',
    subjectSlug: context?.subjectSlug ?? '',
    nodeId: node?.nodeId ?? null,
    nodeTitle: node?.nodeTitle ?? null,
  };
}

export interface QuizHistoryFilterOptions {
  courses: { id: string; name: string; slug: string; subjectSlug: string; fieldSlug: string }[];
  topics: { nodeId: string; nodeTitle: string; contextId: string }[];
}

// Filter dropdown options for the Quiz History screen — only courses/topics actually present in
// this profile's history (not every course/topic that exists platform-wide).
export async function getHistoryFilterOptions(profileId: string): Promise<QuizHistoryFilterOptions> {
  const baseQuery = {
    profileId,
    status: { $in: ['completed', 'abandoned'] as SessionStatus[] },
  };

  const [quizIdsRaw, miniAppIdsRaw] = await Promise.all([
    QuizSession.distinct('quizId', { ...baseQuery, quizId: { $ne: null } }),
    QuizSession.distinct('miniAppId', baseQuery),
  ]);
  const quizIds = (quizIdsRaw as Types.ObjectId[]).map((id) => id.toString());
  const miniAppIds = (miniAppIdsRaw as Types.ObjectId[]).map((id) => id.toString());

  const [contextByMiniAppId, nodeByQuizId, quizzes] = await Promise.all([
    resolveContexts(miniAppIds),
    resolveNodesByQuizId(quizIds),
    quizIds.length > 0 ? Quiz.find({ _id: { $in: quizIds } }).select('miniAppId').lean() : Promise.resolve([]),
  ]);
  const miniAppIdByQuizId = new Map(quizzes.map((q) => [q._id.toString(), q.miniAppId.toString()]));

  const courses = miniAppIds
    .map((id) => {
      const ctx = contextByMiniAppId.get(id);
      if (!ctx) return null;
      return { id, name: ctx.name, slug: ctx.slug, subjectSlug: ctx.subjectSlug, fieldSlug: ctx.fieldSlug };
    })
    .filter((c): c is { id: string; name: string; slug: string; subjectSlug: string; fieldSlug: string } => c !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  const seenNodeIds = new Set<string>();
  const topics: QuizHistoryFilterOptions['topics'] = [];
  for (const quizId of quizIds) {
    const node = nodeByQuizId.get(quizId);
    if (!node || seenNodeIds.has(node.nodeId)) continue;
    const contextId = miniAppIdByQuizId.get(quizId);
    if (!contextId) continue;
    seenNodeIds.add(node.nodeId);
    topics.push({ nodeId: node.nodeId, nodeTitle: node.nodeTitle, contextId });
  }
  topics.sort((a, b) => a.nodeTitle.localeCompare(b.nodeTitle));

  return { courses, topics };
}
