// An isolated replica set exercises real MongoDB indexes and transactions. No app database,
// Anthropic request or external dictionary lookup is used. Run: pnpm --filter @my-backpack/api test:buckets
import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import TermBucket from '../models/apps/language/vocabulary/termBucket.model';
import BucketEntry from '../models/apps/language/vocabulary/bucketEntry.model';
import Term from '../models/apps/language/vocabulary/term.model';
import Definition from '../models/apps/language/vocabulary/definition.model';
import Question from '../models/apps/language/vocabulary/question.model';
import Profile from '../models/core/profile.model';
import MiniApp from '../models/core/miniApp.model';
import Quiz from '../models/learning/quiz.model';
import QuizSession from '../models/learning/quizSession.model';
import LearningRecord from '../models/learning/learningRecord.model';
import AnswerRecord from '../models/learning/answerRecord.model';
import AdaptiveProfile from '../models/learning/adaptiveProfile.model';
import * as buckets from '../modules/vocab/bucket.service';
import { previewBucketWords } from '../modules/vocab/bucketRecommendations.service';
import {
  createQuizSession,
  selectQuestions,
} from '../services/quizSession.service';
import { updateLearningRecord } from '../services/adaptiveLearning.service';
import { parseAndStoreTerm } from '../services/dictionaryApi.service';
import { migrateMultipleBuckets } from '../seed/migrations/2026-09-multiple-buckets';
import { bucketFields, idList } from '../modules/vocab/bucket.validation';

let mongo: MongoMemoryReplSet;
let appId: string;
let profileId: string;
let otherProfileId: string;

before(
  async () => {
    process.env.AI_QUESTION_GENERATION_ENABLED = 'false';
    process.env.DICTIONARY_BULK_LOOKUP_ENABLED = 'false';
    mongo = await MongoMemoryReplSet.create({
      binary: { version: '7.0.14' },
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    await mongoose.connect(mongo.getUri(), { autoIndex: false });
    for (const model of Object.values(mongoose.models))
      await model.createIndexes();
  },
  { timeout: 180000 }
);

after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});
beforeEach(async () => {
  for (const model of Object.values(mongoose.models))
    await model.deleteMany({});
  appId = (
    await MiniApp.create({
      subjectId: new Types.ObjectId(),
      name: 'Dictionary',
      slug: 'dictionary',
      type: 'dictionary',
    })
  )._id.toString();
  profileId = new Types.ObjectId().toString();
  otherProfileId = new Types.ObjectId().toString();
});

async function word(name = 'orbit', miniAppId = appId) {
  const term = await Term.create({
    word: name,
    miniAppId,
    source: 'dictionary_api',
  });
  const definitions = await Definition.create([
    {
      termId: term._id,
      definition: 'A path around an object.',
      partOfSpeech: 'noun',
      order: 0,
    },
    {
      termId: term._id,
      definition: 'To move around an object.',
      partOfSpeech: 'verb',
      order: 1,
    },
  ]);
  // Seed ready questions so membership background preparation remains an idempotent no-op.
  const questions = await Question.create(
    definitions.map((d) => ({
      termId: term._id,
      definitionId: d._id,
      miniAppId,
      type: 'text_input_def' as const,
      source: 'auto' as const,
      maxPoints: 1,
      content: { prompt: d.definition, correctAnswer: name },
    }))
  );
  return { term, definitions, questions };
}
const selection = (
  bucketIds?: string[] | null,
  bucketFilter: 'all' | 'learning' | 'mastered' = 'all'
) => ({
  bucketIds,
  bucketFilter,
  questionCount: 10,
  questionTypes: ['text_input_def'],
  feedbackMode: 'immediate' as const,
  shuffleQuestions: false,
});
const rejects = (promise: Promise<unknown>, code: number) =>
  assert.rejects(
    promise,
    (e: { statusCode?: number }) => e.statusCode === code
  );

test('legacy migration preserves bucket IDs, memberships, dates and learning; dry run and repeat are safe', async () => {
  await Profile.collection.insertMany([
    { _id: new Types.ObjectId(profileId) },
    { _id: new Types.ObjectId(otherProfileId) },
  ]);
  await TermBucket.collection.createIndex(
    { profileId: 1, miniAppId: 1 },
    { unique: true }
  );
  const legacyId = new Types.ObjectId();
  await TermBucket.collection.insertOne({
    _id: legacyId,
    profileId: new Types.ObjectId(profileId),
    miniAppId: new Types.ObjectId(appId),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });
  const w = await word();
  await BucketEntry.create({
    bucketId: legacyId,
    profileId,
    termId: w.term._id,
    definitionId: w.definitions[0]._id,
    partOfSpeech: 'noun',
    status: 'learning',
    addedAt: new Date('2026-02-01'),
  });
  await LearningRecord.create({
    profileId,
    miniAppId: appId,
    termId: w.term._id,
    definitionId: w.definitions[0]._id,
    confidenceScore: 0.6,
    totalAnswers: 5,
    correctAnswers: 4,
    status: 'learning',
  });
  const entries = JSON.stringify(await BucketEntry.find().lean());
  const records = JSON.stringify(await LearningRecord.find().lean());
  await migrateMultipleBuckets();
  assert.equal(
    (await TermBucket.collection.findOne({ _id: legacyId }))?.isFavorites,
    undefined
  );
  await migrateMultipleBuckets(true);
  await migrateMultipleBuckets(true);
  const favorites = await buckets.ensureFavorites(profileId, appId);
  assert.equal(favorites._id.toString(), legacyId.toString());
  assert.equal(favorites.name, 'Favorites');
  assert.equal(favorites.visibility, 'private');
  assert.equal(await TermBucket.countDocuments({ isFavorites: true }), 2);
  assert.equal(JSON.stringify(await BucketEntry.find().lean()), entries);
  assert.equal(JSON.stringify(await LearningRecord.find().lean()), records);
  await buckets.createBucket(profileId, appId, { name: 'Science' }); // old unique index was removed
});

test('Favorites is unique under concurrency, private initially and cannot be renamed or deleted', async () => {
  const favorites = await Promise.all(
    Array.from({ length: 8 }, () => buckets.ensureFavorites(profileId, appId))
  );
  assert.equal(new Set(favorites.map((b) => b._id.toString())).size, 1);
  const id = favorites[0]._id.toString();
  await rejects(buckets.deleteBucket(profileId, id), 400);
  await rejects(buckets.updateBucket(profileId, id, { name: 'Renamed' }), 400);
  assert.equal(favorites[0].visibility, 'private');
});

test('memberships keep exact meanings and learning independently from buckets', async () => {
  const a = await buckets.createBucket(profileId, appId, { name: 'One' });
  const b = await buckets.createBucket(profileId, appId, { name: 'Two' });
  const w = await word();
  const ids = w.definitions.map((d) => d._id.toString());
  await buckets.addBucketDefinitions(profileId, a._id, ids);
  await buckets.addBucketDefinitions(profileId, b._id, [ids[0], ids[0]]);
  assert.equal(await LearningRecord.countDocuments({ profileId }), 2);
  assert.equal(await BucketEntry.countDocuments({ bucketId: b._id }), 1);
  await buckets.setMemberships(profileId, appId, ids[0], [b._id]);
  const detail = await buckets.bucketDetail(profileId, a._id, 1);
  assert.deepEqual(
    detail.words.map((d) => d.definitionId),
    [ids[1]]
  );
  await buckets.deleteBucket(profileId, a._id);
  assert.equal(await LearningRecord.countDocuments({ profileId }), 2);
  await rejects(
    buckets.setMemberships(otherProfileId, appId, ids[0], [b._id]),
    404
  );
  const foreignApp = new Types.ObjectId().toString();
  const foreignWord = await word('elsewhere', foreignApp);
  await rejects(
    buckets.addBucketDefinitions(profileId, b._id, [
      foreignWord.definitions[0]._id.toString(),
    ]),
    400
  );
});

test('private buckets resist guessed IDs; public copies expose no author progress and survive privacy changes', async () => {
  const a = await buckets.createBucket(profileId, appId, { name: 'Space' });
  const w = await word();
  await buckets.addBucketDefinitions(profileId, a._id, [
    w.definitions[0]._id.toString(),
  ]);
  await LearningRecord.updateOne(
    { profileId },
    { confidenceScore: 0.9, status: 'reviewing' }
  );
  await rejects(buckets.bucketDetail(otherProfileId, a._id, 1), 404);
  await rejects(buckets.copyBucket(otherProfileId, a._id), 404);
  await rejects(
    buckets.updateBucket(otherProfileId, a._id, { visibility: 'public' }),
    404
  );
  await rejects(buckets.deleteBucket(otherProfileId, a._id), 404);
  await buckets.updateBucket(profileId, a._id, { visibility: 'public' });
  const publicView = await buckets.bucketDetail(otherProfileId, a._id, 1);
  assert.equal('confidenceScore' in publicView.words[0], false);
  assert.equal('status' in publicView.words[0], false);
  assert.equal('profileId' in publicView.bucket, false);
  assert.equal(
    (await buckets.discoverBuckets(otherProfileId, appId, 'Space', 1)).buckets
      .length,
    1
  );
  const copy = await buckets.copyBucket(otherProfileId, a._id);
  const copied = await buckets.bucketDetail(otherProfileId, copy.bucketId, 1);
  assert.equal(copied.bucket.visibility, 'private');
  assert.equal(copied.bucket.isOwner, true);
  assert.equal(copied.words[0].confidenceScore, 0);
  await buckets.updateBucket(profileId, a._id, { visibility: 'private' });
  assert.equal(
    (await buckets.discoverBuckets(otherProfileId, appId, '', 1)).buckets
      .length,
    0
  );
  assert.equal(
    (await buckets.bucketDetail(otherProfileId, copy.bucketId, 1)).words.length,
    1
  );
  assert.equal(
    await TermBucket.countDocuments({
      profileId: otherProfileId,
      isFavorites: true,
    }),
    1
  );
});

test('quizzes honor defaults and overrides, deduplicate meanings, reject foreign buckets and persist mode preferences', async () => {
  const a = await buckets.createBucket(profileId, appId, { name: 'One' });
  const b = await buckets.createBucket(profileId, appId, {
    name: 'Two',
    includeInQuiz: false,
  });
  const w = await word();
  const ids = w.definitions.map((d) => d._id.toString());
  await buckets.addBucketDefinitions(profileId, a._id, [ids[0]]);
  await buckets.addBucketDefinitions(profileId, b._id, ids);
  assert.equal(
    (await selectQuestions(profileId, [appId], selection())).length,
    1
  );
  const selected = selection([a._id, b._id, a._id]);
  assert.equal((await selectQuestions(profileId, [appId], selected)).length, 2);
  assert.equal(selected.bucketIds?.length, 2);
  await rejects(
    selectQuestions(otherProfileId, [appId], selection([a._id])),
    400
  );
  const quiz = await Quiz.create({
    miniAppId: appId,
    sourceMiniAppIds: [appId],
    title: 'Words',
    mode: 'dynamic',
    isDefault: true,
    settings: selection(),
  });
  await buckets.saveQuizBuckets(profileId, quiz._id.toString(), 'hearts', [
    b._id,
  ]);
  const result = await createQuizSession(profileId, quiz._id.toString(), {
    playModeId: 'hearts',
    bucketFilter: 'all',
  });
  assert.deepEqual(result.session.settings.bucketIds, [b._id]);
  assert.equal(result.session.questionIds.length, 2);
  const classic = await buckets.quizBucketOptions(
    profileId,
    appId,
    undefined,
    'classic'
  );
  assert.equal(classic.bucketIds, null);
  await buckets.deleteBucket(profileId, b._id);
  await rejects(
    createQuizSession(profileId, quiz._id.toString(), { playModeId: 'hearts' }),
    400
  );
  await buckets.saveQuizBuckets(profileId, quiz._id.toString(), 'hearts', null);
  assert.ok(
    (
      await createQuizSession(profileId, quiz._id.toString(), {
        playModeId: 'hearts',
      })
    ).firstQuestion
  );
});

test('empty or paused selections never create sessions; fixed and pool quizzes retain their authored sources', async () => {
  const a = await buckets.createBucket(profileId, appId, { name: 'Empty' });
  const quiz = await Quiz.create({
    miniAppId: appId,
    sourceMiniAppIds: [appId],
    title: 'Words',
    mode: 'dynamic',
    settings: selection(),
  });
  for (const ids of [[], [a._id]])
    await rejects(
      createQuizSession(profileId, quiz._id.toString(), selection(ids)),
      400
    );
  const w = await word();
  await buckets.addBucketDefinitions(profileId, a._id, [
    w.definitions[0]._id.toString(),
  ]);
  const e = await BucketEntry.findOne({ bucketId: a._id });
  assert.ok(e);
  await buckets.setEntryPaused(profileId, a._id, e._id.toString(), true);
  await rejects(
    createQuizSession(profileId, quiz._id.toString(), selection([a._id])),
    400
  );
  assert.equal(await QuizSession.countDocuments(), 0);
  const fixed = await Quiz.create({
    miniAppId: appId,
    title: 'Assigned',
    mode: 'fixed',
    questionIds: [...w.questions].reverse().map((q) => q._id),
    settings: selection(),
  });
  const result = await createQuizSession(profileId, fixed._id.toString(), {
    bucketIds: [],
  });
  assert.deepEqual(
    result.session.questionIds.map(String),
    [...w.questions].reverse().map((q) => q._id.toString())
  );
  const pool = await Quiz.create({
    miniAppId: appId,
    title: 'Practice',
    mode: 'pool',
    settings: selection(),
  });
  assert.equal(
    (await createQuizSession(profileId, pool._id.toString(), { bucketIds: [] }))
      .session.questionIds.length,
    2
  );
});

test('answers update only their meaning and synchronize mastery across memberships while preserving pause', async () => {
  const a = await buckets.createBucket(profileId, appId, { name: 'One' });
  const b = await buckets.createBucket(profileId, appId, { name: 'Two' });
  const w = await word();
  const ids = w.definitions.map((d) => d._id.toString());
  await buckets.addBucketDefinitions(profileId, a._id, ids);
  await buckets.addBucketDefinitions(profileId, b._id, [ids[0]]);
  await AdaptiveProfile.create({ profileId });
  await LearningRecord.updateOne(
    { profileId, definitionId: ids[0] },
    { status: 'learning', confidenceScore: 0.84 }
  );
  const e = await BucketEntry.findOne({ bucketId: b._id });
  assert.ok(e);
  await buckets.setEntryPaused(profileId, b._id, e._id.toString(), true);
  await updateLearningRecord(
    profileId,
    w.term._id.toString(),
    appId,
    new AnswerRecord({
      isCorrect: true,
      pointsAwarded: 1,
      maxPoints: 1,
      answeredAt: new Date(),
    }),
    0.85,
    ids[0]
  );
  assert.equal(
    (await LearningRecord.findOne({ profileId, definitionId: ids[0] }))
      ?.totalAnswers,
    1
  );
  assert.equal(
    (await LearningRecord.findOne({ profileId, definitionId: ids[1] }))
      ?.totalAnswers,
    0
  );
  assert.equal(
    (await BucketEntry.findOne({ bucketId: a._id, definitionId: ids[0] }))
      ?.status,
    'mastered'
  );
  assert.equal((await BucketEntry.findById(e._id))?.status, 'paused');
  await buckets.setEntryPaused(profileId, b._id, e._id.toString(), false);
  assert.equal((await BucketEntry.findById(e._id))?.status, 'mastered');
});

test('word previews use real cached definitions; unresolved words require a lookup without bulk permission', async () => {
  const a = await buckets.createBucket(profileId, appId, { name: 'Space' });
  const w = await word();
  const previews = await previewBucketWords(profileId, a._id, [
    'orbit',
    'unresolvedexample',
  ]);
  assert.equal(previews[0].definitions[0]._id, w.definitions[0]._id.toString());
  assert.equal(previews[0].status, 'ready');
  assert.equal(previews[1].status, 'lookup_required');
  assert.equal(previews[1].definitions.length, 0);
  assert.equal(await BucketEntry.countDocuments(), 0);
  await rejects(
    buckets.addBucketDefinitions(profileId, a._id, [
      new Types.ObjectId().toString(),
    ]),
    404
  );
});

test('dictionary imports keep headwords and dictionaries separate and retain source provenance', async () => {
  const entry = (word: string) => ({
    word,
    meanings: [
      {
        partOfSpeech: 'noun',
        synonyms: [],
        antonyms: [],
        definitions: [
          {
            definition: 'An example meaning.',
            synonyms: [],
            antonyms: [],
            sourceEntryId: word + ':1',
            sourceEntryUuid: 'entry-uuid',
            sourceSenseKey: 'shortdef:0',
          },
        ],
      },
    ],
  });
  const first = await parseAndStoreTerm(
    [entry('example'), entry('related')],
    appId
  );
  assert.equal(first.definitions.length, 1);
  assert.equal(first.definitions[0].sourceEntryId, 'example:1');
  const second = await parseAndStoreTerm(
    [entry('example')],
    new Types.ObjectId().toString()
  );
  assert.notEqual(first.term._id.toString(), second.term._id.toString());
});

test('bucket input validation rejects malformed IDs, visibility and excessive lists', () => {
  assert.throws(() => idList([{ $ne: null }]));
  assert.throws(() => idList(Array(101).fill(profileId)));
  assert.throws(() => bucketFields({ name: ' ', visibility: 'public' }, true));
  assert.throws(() => bucketFields({ visibility: 'everyone' }));
  assert.throws(() => bucketFields({ includeInQuiz: 'false' }));
});
