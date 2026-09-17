import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import Subject from '../models/core/subject.model';
import Course from '../models/core/course.model';
import MiniApp from '../models/core/miniApp.model';
import Quiz from '../models/learning/quiz.model';
import QuizSession from '../models/learning/quizSession.model';
import Question from '../models/apps/language/vocabulary/question.model';
import AnswerRecord from '../models/learning/answerRecord.model';
import XpAward from '../models/learning/xpAward.model';
import { calculateXp } from '../modules/xp/xp.rules';
import { ensureSessionXp, getXpSummary, resolveXpContext } from '../modules/xp/xp.service';
import { completeSession, abandonSession, createQuizSession } from '../services/quizSession.service';

let mongo: MongoMemoryServer;
let profileId: string;
let contextId: string;
let quizId: string;
let subjectId: string;
before(async () => {
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
  await mongoose.connect(mongo.getUri(), { autoIndex: false });
  for (const model of Object.values(mongoose.models)) await model.createIndexes();
}, { timeout: 180000 });
after(async () => { await mongoose.disconnect(); await mongo?.stop(); });
beforeEach(async () => {
  for (const model of Object.values(mongoose.models)) await model.deleteMany({});
  profileId = new Types.ObjectId().toString();
  quizId = new Types.ObjectId().toString();
  subjectId = (await Subject.create({ fieldId: new Types.ObjectId(), name: 'English', slug: 'english' }))._id.toString();
  contextId = (await Course.create({ subjectId, name: 'Phonics', slug: 'phonics', roadmapId: new Types.ObjectId() }))._id.toString();
});
async function finished(overrides: Record<string, unknown> = {}) {
  return QuizSession.create({ profileId, miniAppId: contextId, quizId,
    xpContext: await resolveXpContext(contextId), xpTitle: 'Vowels',
    questionIds: Array.from({ length: 10 }, () => new Types.ObjectId()), status: 'completed',
    settings: { questionCount: 10, playModeId: 'classic' },
    results: { totalQuestions: 10, answered: 10, skipped: 0, correct: 8,
      totalPointsAvailable: 20, totalPointsAwarded: 16, percentageScore: 80, timeTakenMs: 100 },
    completedAt: new Date('2026-09-17T12:00:00Z'), ...overrides });
}

test('inclusive thresholds, fractional marks, and rounding use the exact mark ratio', () => {
  const xp = (earned: number, available = 100) => calculateXp({ earned, available, completed: true, allQuestionsRecorded: true, recordedQuestionCount: 10 });
  assert.equal(xp(74.6).bonusRate, 0);
  assert.equal(xp(75).bonusRate, .1);
  assert.equal(xp(89.6).bonusRate, .1);
  assert.equal(xp(90).bonusRate, .2);
  assert.equal(xp(99.6).bonusRate, .2);
  assert.equal(xp(100).bonusRate, .25);
  assert.equal(xp(16, 20).total, 18);
  assert.equal(xp(7.5, 10).total, 8.5);
  assert.equal(xp(0, 0).total, 0);
});

test('one persisted award under simultaneous retries, with identical totals at all levels', async () => {
  const session = await finished();
  const awards = await Promise.all(Array.from({ length: 8 }, () => ensureSessionXp(session)));
  assert.ok(awards.every((s) => s.results?.xp?.total === 18));
  assert.equal(await XpAward.countDocuments(), 1);
  const summary = await getXpSummary(profileId);
  assert.equal(summary.total, 18);
  assert.equal(summary.subjects[0].total, 18);
  assert.equal(summary.courses[0].total, 18);
  assert.deepEqual(summary.miniApps, []);
});

test('different attempts concurrently claim only one bonus per quiz per UTC day', async () => {
  const sessions = await Promise.all(Array.from({ length: 5 }, () => finished()));
  const results = await Promise.all(sessions.map(ensureSessionXp));
  assert.equal(results.reduce((sum, s) => sum + s.results!.xp!.bonus, 0), 2);
  assert.equal((await getXpSummary(profileId)).total, 82);
  assert.equal(results.filter((s) => s.results!.xp!.bonusReason === 'already-earned-today').length, 4);
  const tomorrow = await finished({ completedAt: new Date('2026-09-18T00:00:00Z') });
  assert.equal((await ensureSessionXp(tomorrow)).results!.xp!.bonus, 2);
});

test('awards and bonus eligibility are isolated between profiles', async () => {
  await ensureSessionXp(await finished());
  const other = new Types.ObjectId().toString();
  assert.equal((await getXpSummary(other)).total, 0);
  const award = await ensureSessionXp(await finished({ profileId: other }));
  assert.equal(award.results!.xp!.bonus, 2);
  assert.equal((await getXpSummary(profileId)).total, 18);
});

test('mini-app earnings roll up to their subject without inventing course ownership', async () => {
  const app = await MiniApp.create({ subjectId, name: 'Dictionary', slug: 'dictionary', type: 'dictionary' });
  const context = await resolveXpContext(app._id.toString());
  await ensureSessionXp(await finished({ miniAppId: app._id, xpContext: context }));
  const summary = await getXpSummary(profileId);
  assert.equal(summary.total, 18);
  assert.equal(summary.miniApps[0].total, 18);
  assert.equal(summary.subjects[0].id, subjectId);
  assert.deepEqual(summary.courses, []);
});

test('abandoned and game modes retain base XP without performance bonuses', async () => {
  for (const playModeId of ['hearts', 'time_run', 'mastery', 'endless', 'perfect', 'survival', 'streak']) {
    const s = await ensureSessionXp(await finished({ settings: { questionCount: 10, playModeId } }));
    assert.equal(s.results!.xp!.total, 16);
    assert.equal(s.results!.xp!.bonusReason, 'mode-ineligible');
  }
  const abandoned = await ensureSessionXp(await finished({ status: 'abandoned' }));
  assert.equal(abandoned.results!.xp!.total, 16);
  assert.equal(abandoned.results!.xp!.bonusReason, 'incomplete');
});

test('summary repairs a crash between final score, ledger insert, and results cache', async () => {
  const s = await finished();
  assert.equal((await getXpSummary(profileId)).total, 18);
  await QuizSession.updateOne({ _id: s._id }, { $unset: { 'results.xp': 1 } });
  assert.equal((await getXpSummary(profileId)).total, 18);
  assert.equal(await XpAward.countDocuments(), 1);
  assert.equal((await QuizSession.findById(s._id))!.results!.xp!.total, 18);
});

test('legacy completed sessions never receive retrospective XP', async () => {
  const legacy = await finished({ xpContext: undefined });
  await ensureSessionXp(legacy);
  assert.equal((await getXpSummary(profileId)).total, 0);
});

async function activeAttempt() {
  const questions = await Question.create([0, 1].map((i) => ({ miniAppId: contextId, type: 'mcq_general' as const,
    source: 'manual' as const, content: { prompt: `Question ${i}`, correctAnswer: 'yes' }, maxPoints: 10 })));
  const quiz = await Quiz.create({ miniAppId: contextId, title: 'Practice', mode: 'fixed',
    questionIds: questions.map((q) => q._id), settings: { questionCount: 2 } });
  const { session } = await createQuizSession(profileId, quiz._id.toString());
  const answer = (index: number) => AnswerRecord.create({ profileId, sessionId: session._id,
    miniAppId: contextId, questionId: questions[index]._id, responseType: 'text_input', rawResponse: 'yes',
    maxPoints: 10, pointsAwarded: 10, isCorrect: true, gradingMethod: 'exact_match',
    timeToAnswerMs: 100, confidenceBefore: 0, confidenceAfter: 0 });
  return { session, answer, quiz };
}

test('early completion includes unanswered marks and cannot claim a perfect bonus', async () => {
  const { session, answer } = await activeAttempt();
  await answer(0);
  const result = await completeSession(session._id.toString(), profileId);
  assert.equal(result.results!.percentageScore, 50);
  assert.equal(result.results!.xp!.total, 10);
  assert.equal(result.results!.xp!.bonusReason, 'incomplete');
  await assert.rejects(completeSession(session._id.toString(), new Types.ObjectId().toString()));
});

test('duplicate answer rows do not inflate marks; simultaneous completion awards once', async () => {
  const { session, answer } = await activeAttempt();
  await answer(0); await answer(0); await answer(1);
  const results = await Promise.all(Array.from({ length: 4 }, () => completeSession(session._id.toString(), profileId)));
  assert.ok(results.every((r) => r.results!.totalPointsAwarded === 20 && r.results!.xp!.total === 20));
  assert.equal(await XpAward.countDocuments(), 1);
});

test('completion after abandonment cannot change the terminal status or add a bonus', async () => {
  const { session, answer } = await activeAttempt();
  await answer(0); await answer(1);
  await abandonSession(session._id.toString(), profileId);
  const result = await completeSession(session._id.toString(), profileId);
  assert.equal(result.status, 'abandoned');
  assert.equal(result.results!.xp!.total, 20);
  assert.equal(await XpAward.countDocuments(), 1);
});

test('teacher-assigned modes are snapshotted on roadmap sessions', async () => {
  const { quiz } = await activeAttempt();
  quiz.assignedPlayMode = { id: 'hearts', settings: { hearts: 3 } };
  await quiz.save();
  const { session } = await createQuizSession(profileId, quiz._id.toString(), { playModeId: 'classic' });
  assert.equal(session.settings.playModeId, 'hearts');
  assert.equal(session.xpContext!.contextType, 'course');
});


test('nine recorded questions get base only; ten including a skip qualify without consuming the bonus early', async () => {
  const short = await finished();
  short.results!.totalQuestions = 9;
  short.results!.answered = 8;
  short.results!.skipped = 1;
  await short.save();
  const shortResult = await ensureSessionXp(short);
  assert.equal(shortResult.results!.xp!.total, 16);
  assert.equal(shortResult.results!.xp!.bonusReason, 'too-few-questions');
  const ten = await finished();
  ten.results!.answered = 9;
  ten.results!.skipped = 1;
  await ten.save();
  assert.equal((await ensureSessionXp(ten)).results!.xp!.bonus, 2);
});
