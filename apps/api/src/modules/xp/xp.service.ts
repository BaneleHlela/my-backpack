import { Types } from 'mongoose';
import type { XpAward, XpContext, XpSummary } from '@my-backpack/shared';
import Course from '../../models/core/course.model';
import MiniApp from '../../models/core/miniApp.model';
import Subject from '../../models/core/subject.model';
import QuizSession, { IQuizSessionDocument } from '../../models/learning/quizSession.model';
import XpAwardModel, { IXpAward } from '../../models/learning/xpAward.model';
import { calculateXp } from './xp.rules';

export async function resolveXpContext(contextId: string): Promise<XpContext | undefined> {
  const course = await Course.findById(contextId).lean();
  const owner = course ?? await MiniApp.findById(contextId).lean();
  if (!owner) return undefined;
  const subject = await Subject.findById(owner.subjectId).lean();
  return {
    contextId,
    contextType: course ? 'course' : 'miniApp',
    contextName: owner.name,
    subjectId: owner.subjectId.toString(),
    subjectName: subject?.name ?? 'Subject',
    subjectSlug: subject?.slug ?? '',
    ...(course ? { courseSlug: course.slug } : {}),
  };
}

function awardFields(award: XpAward): XpAward {
  return { base: award.base, bonus: award.bonus, total: award.total,
    bonusRate: award.bonusRate, bonusReason: award.bonusReason };
}

// Safe to retry after completion, a lost response, or a crash between the ledger insert and
// saving the results cache. Legacy sessions have no xpContext and never receive retroactive XP.
export async function ensureSessionXp(session: IQuizSessionDocument): Promise<IQuizSessionDocument> {
  if (!session.xpContext || !session.results || session.status === 'active') return session;
  let award = await XpAwardModel.findById(session._id);
  if (!award) {
    const results = session.results;
    const candidate = calculateXp({
      earned: results.totalPointsAwarded,
      available: results.totalPointsAvailable,
      completed: session.status === 'completed',
      allQuestionsRecorded: results.answered + results.skipped === results.totalQuestions,
      playModeId: session.settings.playModeId,
      timeLimit: session.settings.timeLimit,
    });
    const earnedAt = session.completedAt ?? session.updatedAt;
    const data: IXpAward = {
      _id: session._id,
      profileId: session.profileId,
      context: session.xpContext,
      title: session.xpTitle ?? 'Quiz practice',
      earnedAt,
      ...candidate,
      ...(candidate.bonus > 0 && session.quizId ? {
        bonusKey: `${session.profileId}:${session.quizId}:${earnedAt.toISOString().slice(0, 10)}`,
      } : {}),
    };
    try {
      award = await XpAwardModel.create(data);
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      award = await XpAwardModel.findById(session._id);
      if (!award) {
        // Another attempt already claimed this quiz's bonus today. Keep all base marks.
        delete data.bonusKey;
        Object.assign(data, { bonus: 0, bonusRate: 0, total: data.base, bonusReason: 'already-earned-today' });
        try { award = await XpAwardModel.create(data); }
        catch (retryError) {
          if ((retryError as { code?: number }).code !== 11000) throw retryError;
          award = await XpAwardModel.findById(session._id);
          if (!award) throw retryError;
        }
      }
    }
  }
  const xp = awardFields(award);
  await QuizSession.updateOne({ _id: session._id, profileId: session.profileId }, { $set: { 'results.xp': xp } });
  session.results.xp = xp;
  return session;
}

export async function getXpSummary(profileId: string): Promise<XpSummary> {
  // Recover awards if a previous request stopped after persisting the final score.
  const pending = await QuizSession.find({ profileId, status: { $in: ['completed', 'abandoned'] },
    xpContext: { $exists: true }, results: { $exists: true }, 'results.xp': { $exists: false } }).limit(50);
  for (const session of pending) await ensureSessionXp(session);
  const [groups, recent] = await Promise.all([
    XpAwardModel.aggregate<{ _id: XpContext; total: number }>([
      { $match: { profileId: new Types.ObjectId(profileId) } },
      { $group: { _id: '$context', total: { $sum: '$total' } } },
    ]),
    XpAwardModel.find({ profileId }).sort({ earnedAt: -1, _id: -1 }).limit(10).lean(),
  ]);
  const summary: XpSummary = { profileId, total: 0, subjects: [], courses: [], miniApps: [], recent: [] };
  const add = (list: XpSummary['subjects'], id: string, name: string, total: number) => {
    const item = list.find((entry) => entry.id === id);
    if (item) item.total += total;
    else list.push({ id, name, total });
  };
  for (const { _id: context, total } of groups) {
    summary.total += total;
    add(summary.subjects, context.subjectId, context.subjectName, total);
    add(context.contextType === 'course' ? summary.courses : summary.miniApps,
      context.contextId, context.contextName, total);
  }
  for (const list of [summary.subjects, summary.courses, summary.miniApps]) list.sort((a, b) => b.total - a.total);
  summary.recent = recent.map((award) => ({ ...awardFields(award), sessionId: award._id.toString(),
    title: award.title, contextName: award.context.contextName, earnedAt: award.earnedAt.toISOString() }));
  return summary;
}
