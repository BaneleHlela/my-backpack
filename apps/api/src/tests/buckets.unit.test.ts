// Fast service boundary checks using real Mongoose documents and mocked database calls.
// The separate integration suite verifies actual transactions and indexes.
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { Types } from 'mongoose';
import TermBucket from '../models/apps/language/vocabulary/termBucket.model';
import BucketEntry from '../models/apps/language/vocabulary/bucketEntry.model';
import Question from '../models/apps/language/vocabulary/question.model';
import LearningRecord from '../models/learning/learningRecord.model';
import QuizSession from '../models/learning/quizSession.model';
import AdaptiveProfile from '../models/learning/adaptiveProfile.model';
import AnswerRecord from '../models/learning/answerRecord.model';
import {
  selectQuestions,
  captureAnswer,
} from '../services/quizSession.service';
import { updateLearningRecord } from '../services/adaptiveLearning.service';
import { bucketFields, idList } from '../modules/vocab/bucket.validation';

const profileId = new Types.ObjectId().toString();
const appId = new Types.ObjectId().toString();
const termId = new Types.ObjectId();
const definitionId = new Types.ObjectId();
const otherDefinitionId = new Types.ObjectId();
const bucket = new TermBucket({
  profileId,
  miniAppId: appId,
  name: 'Favorites',
  isFavorites: true,
});
const otherBucket = new TermBucket({
  profileId,
  miniAppId: appId,
  name: 'Science',
  includeInQuiz: false,
});
const question = new Question({
  miniAppId: appId,
  termId,
  definitionId,
  type: 'text_input_def',
  content: {},
});
const otherQuestion = new Question({
  miniAppId: appId,
  termId,
  definitionId: otherDefinitionId,
  type: 'text_input_def',
  content: {},
});
const settings = (bucketIds?: string[] | null) => ({
  questionCount: 10,
  questionTypes: ['text_input_def'],
  bucketFilter: 'all' as const,
  feedbackMode: 'immediate' as const,
  shuffleQuestions: false,
  bucketIds,
});

function mockSelection(
  t: TestContext,
  options: {
    buckets?: (typeof bucket)[];
    entries?: InstanceType<typeof BucketEntry>[];
    questions?: (typeof question)[];
  } = {}
) {
  const calls: { buckets?: unknown; entries?: unknown; questions?: unknown } =
    {};
  t.mock.method(
    TermBucket,
    'findOneAndUpdate',
    () =>
      Promise.resolve(bucket) as unknown as ReturnType<
        typeof TermBucket.findOneAndUpdate
      >
  );
  t.mock.method(TermBucket, 'find', (query: unknown) => {
    calls.buckets = query;
    return Promise.resolve(
      options.buckets ?? [bucket]
    ) as unknown as ReturnType<typeof TermBucket.find>;
  });
  t.mock.method(BucketEntry, 'find', (query: unknown) => {
    calls.entries = query;
    return {
      sort: () =>
        Promise.resolve(
          options.entries ?? [
            new BucketEntry({
              bucketId: bucket._id,
              profileId,
              termId,
              definitionId,
            }),
          ]
        ),
    } as unknown as ReturnType<typeof BucketEntry.find>;
  });
  t.mock.method(
    LearningRecord,
    'find',
    () =>
      Promise.resolve([]) as unknown as ReturnType<typeof LearningRecord.find>
  );
  t.mock.method(Question, 'find', (query: unknown) => {
    calls.questions = query;
    return Promise.resolve(
      options.questions ?? [question]
    ) as unknown as ReturnType<typeof Question.find>;
  });
  return calls;
}

test('quiz defaults stay within the profile and dictionary, and exclude paused memberships', async (t) => {
  const calls = mockSelection(t);
  const chosen = settings();
  assert.deepEqual(
    (await selectQuestions(profileId, [appId], chosen)).map(String),
    [question._id.toString()]
  );
  assert.deepEqual(calls.buckets, {
    profileId,
    miniAppId: { $in: [appId] },
    includeInQuiz: { $ne: false },
  });
  assert.deepEqual(calls.entries, {
    bucketId: { $in: [bucket._id] },
    status: { $ne: 'paused' },
  });
  assert.deepEqual(chosen.bucketIds, [bucket._id.toString()]);
});

test('custom bucket choices override defaults and duplicated meanings appear once', async (t) => {
  const entries = [bucket, otherBucket].map(
    (b) => new BucketEntry({ bucketId: b._id, profileId, termId, definitionId })
  );
  const calls = mockSelection(t, {
    buckets: [bucket, otherBucket],
    entries,
    questions: [question, otherQuestion],
  });
  const chosen = settings([
    bucket._id.toString(),
    otherBucket._id.toString(),
    bucket._id.toString(),
  ]);
  assert.deepEqual(
    (await selectQuestions(profileId, [appId], chosen)).map(String),
    [question._id.toString()]
  );
  assert.deepEqual(calls.buckets, {
    profileId,
    miniAppId: { $in: [appId] },
    _id: { $in: [bucket._id.toString(), otherBucket._id.toString()] },
  });
});

test('another meaning of the same word is never substituted for the selected definition', async (t) => {
  mockSelection(t, { questions: [otherQuestion] });
  await assert.rejects(
    selectQuestions(profileId, [appId], settings()),
    /No questions are ready/
  );
});

test('missing or inaccessible selected buckets fail without falling back to defaults', async (t) => {
  mockSelection(t);
  await assert.rejects(
    selectQuestions(
      profileId,
      [appId],
      settings([bucket._id.toString(), new Types.ObjectId().toString()])
    ),
    /no longer available/
  );
});

test('empty bucket selections fail before querying words', async (t) => {
  const calls = mockSelection(t, { buckets: [] });
  await assert.rejects(
    selectQuestions(profileId, [appId], settings([])),
    /Choose at least one bucket/
  );
  assert.equal(calls.entries, undefined);
});

test('empty buckets fail without querying or generating questions', async (t) => {
  const calls = mockSelection(t, { entries: [] });
  await assert.rejects(
    selectQuestions(profileId, [appId], settings()),
    /Add words/
  );
  assert.equal(calls.questions, undefined);
});

test('answer capture rejects a question outside the selected session before reading it', async (t) => {
  const session = new QuizSession({ questionIds: [question._id] });
  t.mock.method(
    QuizSession,
    'findOne',
    () =>
      Promise.resolve(session) as unknown as ReturnType<
        typeof QuizSession.findOne
      >
  );
  const find = t.mock.method(Question, 'findById', () => {
    throw new Error('Unexpected read');
  });
  await assert.rejects(
    captureAnswer(new Types.ObjectId().toString(), profileId, {
      questionId: otherQuestion._id.toString(),
      responseType: 'text_input',
      rawResponse: 'word',
      timeToAnswerMs: 500,
    }),
    /not part of the current quiz/
  );
  assert.equal(find.mock.callCount(), 0);
});

test('learning and mastery updates are scoped to the answered definition and preserve paused entries', async (t) => {
  const record = new LearningRecord({
    profileId,
    miniAppId: appId,
    termId,
    definitionId,
    confidenceScore: 0.84,
    status: 'learning',
  });
  let lookup: unknown;
  let sync: unknown;
  t.mock.method(LearningRecord, 'findOne', (query: unknown) => {
    lookup = query;
    return Promise.resolve(record) as unknown as ReturnType<
      typeof LearningRecord.findOne
    >;
  });
  t.mock.method(
    AdaptiveProfile,
    'findOne',
    () =>
      Promise.resolve(null) as unknown as ReturnType<
        typeof AdaptiveProfile.findOne
      >
  );
  t.mock.method(BucketEntry, 'updateMany', (query: unknown) => {
    sync = query;
    return Promise.resolve({}) as unknown as ReturnType<
      typeof BucketEntry.updateMany
    >;
  });
  t.mock.method(record, 'save', async () => record);
  await updateLearningRecord(
    profileId,
    termId.toString(),
    appId,
    new AnswerRecord({
      isCorrect: true,
      maxPoints: 1,
      pointsAwarded: 1,
      answeredAt: new Date(),
    }),
    0.85,
    definitionId.toString()
  );
  assert.deepEqual(lookup, {
    profileId,
    termId: termId.toString(),
    definitionId: definitionId.toString(),
  });
  assert.deepEqual(sync, {
    profileId,
    termId: termId.toString(),
    definitionId: definitionId.toString(),
    status: { $ne: 'paused' },
  });
  assert.equal(record.totalAnswers, 1);
  assert.equal(record.status, 'reviewing');
});

test('bucket inputs accept explicit false and reject malformed IDs, injected values and unbounded lists', () => {
  assert.deepEqual(
    bucketFields(
      { name: ' Science ', includeInQuiz: false, visibility: 'private' },
      true
    ),
    { name: 'Science', includeInQuiz: false, visibility: 'private' }
  );
  assert.throws(() => idList([{ $ne: null }]));
  assert.throws(() => idList(Array(101).fill(profileId)));
  assert.throws(() => bucketFields({ name: ' ', visibility: 'public' }, true));
  assert.throws(() => bucketFields({ includeInQuiz: 'false' }));
  assert.throws(() => bucketFields({ visibility: 'everyone' }));
});
