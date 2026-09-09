import mongoose, { ClientSession } from 'mongoose';
import TermBucket, {
  ITermBucketDocument,
} from '../../models/apps/language/vocabulary/termBucket.model';
import BucketEntry from '../../models/apps/language/vocabulary/bucketEntry.model';
import Definition from '../../models/apps/language/vocabulary/definition.model';
import Term from '../../models/apps/language/vocabulary/term.model';
import MiniApp from '../../models/core/miniApp.model';
import LearningRecord from '../../models/learning/learningRecord.model';
import Quiz from '../../models/learning/quiz.model';
import QuizBucketPreference from '../../models/learning/quizBucketPreference.model';
import { AppError } from '../../utils/AppError';
import { generateQuestionsForDefinition } from '../../services/questionGeneration';
import { bucketFields, idList, objectId, playMode } from './bucket.validation';

export async function requireDictionary(miniAppId: string) {
  objectId(miniAppId, 'dictionary');
  if (
    !(await MiniApp.exists({
      _id: miniAppId,
      type: 'dictionary',
      isActive: true,
    }))
  )
    throw new AppError('Dictionary not found', 404);
}

// Converts a legacy header in place, or atomically creates Favorites. Never changes entries.
export async function ensureFavorites(profileId: string, miniAppId: string) {
  const query = {
    profileId,
    miniAppId,
    $or: [{ isFavorites: true }, { isFavorites: { $exists: false } }],
  };
  try {
    return await TermBucket.findOneAndUpdate(
      query,
      {
        $set: { isFavorites: true, name: 'Favorites' },
        $setOnInsert: {
          description: '',
          visibility: 'private',
          color: '#FBBF24',
          includeInQuiz: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    const bucket = await TermBucket.findOne(query);
    if (!bucket) throw error;
    return bucket;
  }
}

export async function ensureProfileFavorites(profileId: string) {
  const dictionaries = await MiniApp.find({
    type: 'dictionary',
    isActive: true,
  }).select('_id');
  for (const dictionary of dictionaries)
    await ensureFavorites(profileId, dictionary._id.toString());
}

export async function ownedBucket(
  profileId: string,
  bucketId: string,
  session?: ClientSession
) {
  objectId(bucketId, 'bucket');
  const bucket = await TermBucket.findOne({ _id: bucketId, profileId }).session(
    session ?? null
  );
  if (!bucket) throw new AppError('Bucket not found', 404);
  return bucket;
}

async function summaries(buckets: ITermBucketDocument[], profileId: string) {
  const counts = await BucketEntry.aggregate<{
    _id: mongoose.Types.ObjectId;
    count: number;
  }>([
    { $match: { bucketId: { $in: buckets.map((b) => b._id) } } },
    { $group: { _id: '$bucketId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
  return buckets.map((b) => ({
    _id: b._id.toString(),
    miniAppId: b.miniAppId.toString(),
    name: b.name,
    description: b.description,
    color: b.color,
    visibility: b.visibility,
    isFavorites: b.isFavorites,
    isOwner: b.profileId.toString() === profileId,
    includeInQuiz: b.profileId.toString() === profileId && b.includeInQuiz,
    entryCount: countMap.get(b._id.toString()) ?? 0,
    updatedAt: b.updatedAt,
  }));
}

export async function listBuckets(profileId: string, miniAppId: string) {
  await requireDictionary(miniAppId);
  await ensureFavorites(profileId, miniAppId);
  return summaries(
    await TermBucket.find({ profileId, miniAppId }).sort({
      isFavorites: -1,
      name: 1,
    }),
    profileId
  );
}

export async function createBucket(
  profileId: string,
  miniAppId: string,
  data: Record<string, unknown>
) {
  await requireDictionary(miniAppId);
  await ensureFavorites(profileId, miniAppId);
  const fields = bucketFields(data, true);
  try {
    const bucket = await TermBucket.create({
      ...fields,
      profileId,
      miniAppId,
      isFavorites: false,
    });
    return (await summaries([bucket], profileId))[0];
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      throw new AppError(
        'Bucket setup is being updated. Please try again shortly.',
        503
      );
    throw error;
  }
}

export async function updateBucket(
  profileId: string,
  bucketId: string,
  data: Record<string, unknown>
) {
  const bucket = await ownedBucket(profileId, bucketId);
  const fields = bucketFields(data);
  if (bucket.isFavorites && fields.name && fields.name !== 'Favorites')
    throw new AppError('Favorites keeps its name', 400);
  const updated = await TermBucket.findOneAndUpdate(
    { _id: bucketId, profileId },
    { $set: fields, $inc: { revision: 1 } },
    { new: true, runValidators: true }
  );
  if (!updated) throw new AppError('Bucket not found', 404);
  return (await summaries([updated], profileId))[0];
}

export async function deleteBucket(profileId: string, bucketId: string) {
  await mongoose.connection.transaction(async (session) => {
    const bucket = await ownedBucket(profileId, bucketId, session);
    if (bucket.isFavorites)
      throw new AppError('Favorites cannot be deleted', 400);
    await TermBucket.deleteOne({ _id: bucketId, profileId }, { session });
    await BucketEntry.deleteMany({ bucketId, profileId }, { session });
    // Keep saved custom selections intact: a deleted choice must not silently enable defaults.
  });
}

export async function discoverBuckets(
  profileId: string,
  miniAppId: string,
  search: string,
  page: number
) {
  await requireDictionary(miniAppId);
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const query = {
    miniAppId,
    visibility: 'public' as const,
    ...(escaped ? { name: { $regex: escaped, $options: 'i' } } : {}),
  };
  const [buckets, total] = await Promise.all([
    TermBucket.find(query)
      .sort({ updatedAt: -1, _id: 1 })
      .skip((page - 1) * 24)
      .limit(24),
    TermBucket.countDocuments(query),
  ]);
  return {
    buckets: await summaries(buckets, profileId),
    hasMore: page * 24 < total,
  };
}

export async function bucketDetail(
  profileId: string,
  bucketId: string,
  page: number,
  search = '',
  status = 'all',
  sort = 'recent'
) {
  objectId(bucketId, 'bucket');
  // A transaction keeps public visibility and content reads on one consistent snapshot.
  return mongoose.connection.transaction(async (session) => {
    const bucket = await TermBucket.findOne({
      _id: bucketId,
      $or: [{ profileId }, { visibility: 'public' }],
    }).session(session);
    if (!bucket) throw new AppError('Bucket not found', 404);
    const isOwner = bucket.profileId.toString() === profileId;
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const terms = escaped
      ? await Term.find({
          miniAppId: bucket.miniAppId,
          word: { $regex: escaped, $options: 'i' },
        })
          .select('_id')
          .session(session)
      : null;
    const filter = {
      bucketId: bucket._id,
      ...(terms ? { termId: { $in: terms.map((t) => t._id) } } : {}),
      ...(isOwner && ['learning', 'mastered', 'paused'].includes(status)
        ? { status: status as 'learning' | 'mastered' | 'paused' }
        : {}),
    };
    const sortKeys: Record<string, Record<string, 1 | -1>> = {
      recent: { addedAt: -1, _id: 1 },
      alphabetical: { sortWord: 1, _id: 1 },
      confidence: { sortConfidence: -1, _id: 1 },
      accuracy: { sortAccuracy: -1, _id: 1 },
      lastPracticed: { sortLast: -1, _id: 1 },
      dueForReview: { sortDue: 1, _id: 1 },
    };
    const entries = await BucketEntry.aggregate<
      InstanceType<typeof BucketEntry>
    >([
      { $match: filter },
      {
        $lookup: {
          from: Term.collection.name,
          localField: 'termId',
          foreignField: '_id',
          as: 'sortTerm',
        },
      },
      ...(isOwner
        ? [
            {
              $lookup: {
                from: LearningRecord.collection.name,
                let: { definition: '$definitionId', term: '$termId' },
                pipeline: [
                  {
                    $match: {
                      profileId: new mongoose.Types.ObjectId(profileId),
                      $expr: {
                        $and: [
                          { $eq: ['$definitionId', '$$definition'] },
                          { $eq: ['$termId', '$$term'] },
                        ],
                      },
                    },
                  },
                ],
                as: 'sortRecord',
              },
            },
          ]
        : []),
      {
        $set: {
          sortWord: { $first: '$sortTerm.word' },
          sortConfidence: {
            $ifNull: [{ $first: '$sortRecord.confidenceScore' }, 0],
          },
          sortLast: {
            $ifNull: [{ $first: '$sortRecord.lastAnsweredAt' }, new Date(0)],
          },
          sortDue: {
            $ifNull: [
              { $first: '$sortRecord.nextReviewAt' },
              new Date('9999-01-01'),
            ],
          },
          sortAccuracy: {
            $cond: [
              { $gt: [{ $first: '$sortRecord.totalAnswers' }, 0] },
              {
                $divide: [
                  { $first: '$sortRecord.correctAnswers' },
                  { $first: '$sortRecord.totalAnswers' },
                ],
              },
              -1,
            ],
          },
        },
      },
      {
        $sort:
          sortKeys[isOwner || sort === 'alphabetical' ? sort : 'recent'] ??
          sortKeys.recent,
      },
      { $skip: (page - 1) * 40 },
      { $limit: 40 },
    ]).session(session);
    const total = await BucketEntry.countDocuments(filter).session(session);
    const termDocs = await Term.find({
      _id: { $in: entries.map((e) => e.termId) },
    }).session(session);
    const definitions = await Definition.find({
      _id: { $in: entries.map((e) => e.definitionId) },
    }).session(session);
    const records = isOwner
      ? await LearningRecord.find({
          profileId,
          definitionId: { $in: entries.map((e) => e.definitionId) },
        }).session(session)
      : [];
    return {
      bucket: {
        _id: bucketId,
        miniAppId: bucket.miniAppId.toString(),
        name: bucket.name,
        description: bucket.description,
        color: bucket.color,
        visibility: bucket.visibility,
        isFavorites: bucket.isFavorites,
        isOwner,
        includeInQuiz: isOwner && bucket.includeInQuiz,
        entryCount: await BucketEntry.countDocuments({ bucketId }).session(
          session
        ),
        updatedAt: bucket.updatedAt,
      },
      words: entries.flatMap((e) => {
        const term = termDocs.find((t) => t._id.equals(e.termId));
        const def = definitions.find((d) => d._id.equals(e.definitionId));
        if (!term || !def) return [];
        return [
          {
            _id: e._id.toString(),
            termId: term._id.toString(),
            definitionId: def._id.toString(),
            word: term.word,
            definition: def.definition,
            partOfSpeech: def.partOfSpeech,
            ...(isOwner
              ? {
                  status: e.status,
                  confidenceScore:
                    records.find((r) => r.definitionId?.equals(e.definitionId))
                      ?.confidenceScore ?? 0,
                }
              : {}),
          },
        ];
      }),
      hasMore: page * 40 < total,
    };
  });
}

async function addDefinition(
  profileId: string,
  bucket: ITermBucketDocument,
  definitionId: string,
  session: ClientSession
) {
  const definition = await Definition.findById(
    objectId(definitionId, 'definition')
  ).session(session);
  if (!definition) throw new AppError('Definition not found', 404);
  const term = await Term.findOne({
    _id: definition.termId,
    miniAppId: bucket.miniAppId,
  }).session(session);
  if (!term) throw new AppError('This word belongs to another dictionary', 400);
  const record = await LearningRecord.findOneAndUpdate(
    { profileId, termId: term._id, definitionId },
    {
      $setOnInsert: { miniAppId: bucket.miniAppId, status: 'unseen' },
    },
    { upsert: true, new: true, session, setDefaultsOnInsert: true }
  );
  await BucketEntry.updateOne(
    { bucketId: bucket._id, termId: term._id, definitionId },
    {
      $setOnInsert: {
        profileId,
        partOfSpeech: definition.partOfSpeech,
        status: ['mastered', 'reviewing'].includes(record.status)
          ? 'mastered'
          : 'learning',
      },
    },
    { upsert: true, session, setDefaultsOnInsert: true }
  );
  return { termId: term._id.toString(), definitionId };
}

function prepareQuestions(refs: { termId: string; definitionId: string }[]) {
  // Basic templates only: adding/copying a bucket must not trigger one AI call per word.
  void (async () => {
    for (const ref of refs)
      await generateQuestionsForDefinition(ref.termId, ref.definitionId, {
        allowAi: false,
      }).catch(() => {
        console.error(
          'Could not prepare bucket questions for definition',
          ref.definitionId
        );
      });
  })();
}

export async function addBucketDefinitions(
  profileId: string,
  bucketId: string,
  definitions: unknown
) {
  if (
    !Array.isArray(definitions) ||
    definitions.length < 1 ||
    definitions.length > 20
  )
    throw new AppError('Choose 1–20 definitions', 400);
  const ids = [...new Set(definitions.map((id) => objectId(id, 'definition')))];
  const refs = await mongoose.connection.transaction(async (session) => {
    const bucket = await ownedBucket(profileId, bucketId, session);
    await TermBucket.updateOne(
      { _id: bucketId, profileId },
      { $inc: { revision: 1 } },
      { session }
    );
    const added = [];
    for (const id of ids)
      added.push(await addDefinition(profileId, bucket, id, session));
    return added;
  });
  prepareQuestions(refs);
}

export async function removeBucketEntry(
  profileId: string,
  bucketId: string,
  entryId: string
) {
  objectId(entryId, 'entry');
  await mongoose.connection.transaction(async (session) => {
    await ownedBucket(profileId, bucketId, session);
    await TermBucket.updateOne(
      { _id: bucketId, profileId },
      { $inc: { revision: 1 } },
      { session }
    );
    await BucketEntry.deleteOne(
      { _id: entryId, bucketId, profileId },
      { session }
    );
  });
}

export async function setMemberships(
  profileId: string,
  miniAppId: string,
  definitionId: string,
  selection: unknown
) {
  const bucketIds = idList(selection);
  objectId(definitionId, 'definition');
  await requireDictionary(miniAppId);
  const refs = await mongoose.connection.transaction(async (session) => {
    const buckets = await TermBucket.find({ profileId, miniAppId }).session(
      session
    );
    if (bucketIds.some((id) => !buckets.some((b) => b._id.toString() === id)))
      throw new AppError('Bucket not found', 404);
    // Lock every affected header so concurrent deletion cannot leave orphan entries.
    await TermBucket.updateMany(
      { _id: { $in: buckets.map((b) => b._id) } },
      { $inc: { revision: 1 } },
      { session }
    );
    const added = [];
    for (const bucket of buckets.filter((b) =>
      bucketIds.includes(b._id.toString())
    ))
      added.push(await addDefinition(profileId, bucket, definitionId, session));
    await BucketEntry.deleteMany(
      {
        profileId,
        definitionId,
        bucketId: {
          $in: buckets
            .filter((b) => !bucketIds.includes(b._id.toString()))
            .map((b) => b._id),
        },
      },
      { session }
    );
    return added;
  });
  prepareQuestions(refs.slice(0, 1));
}

export async function copyBucket(profileId: string, bucketId: string) {
  objectId(bucketId, 'bucket');
  const visible = await TermBucket.findOne({
    _id: bucketId,
    visibility: 'public',
  });
  if (!visible) throw new AppError('Public bucket not found', 404);
  await ensureFavorites(profileId, visible.miniAppId.toString());
  const result = await mongoose.connection.transaction(async (session) => {
    const source = await TermBucket.findOneAndUpdate(
      { _id: bucketId, visibility: 'public' },
      { $inc: { revision: 1 } },
      { new: true, session }
    );
    if (!source) throw new AppError('Public bucket not found', 404);
    const [copy] = await TermBucket.create(
      [
        {
          profileId,
          miniAppId: source.miniAppId,
          name: source.name,
          description: source.description,
          color: source.color,
          isFavorites: false,
          visibility: 'private',
          copiedFrom: source._id,
        },
      ],
      { session }
    );
    const entries = await BucketEntry.find({ bucketId }).session(session);
    const refs = [];
    for (const entry of entries)
      refs.push(
        await addDefinition(
          profileId,
          copy,
          entry.definitionId.toString(),
          session
        )
      );
    return { id: copy._id.toString(), refs };
  });
  prepareQuestions(result.refs);
  return { bucketId: result.id };
}

export async function quizBucketOptions(
  profileId: string,
  miniAppId: string | undefined,
  quizId: string | undefined,
  mode: unknown
) {
  const playModeId = playMode(mode);
  if (!miniAppId && !quizId)
    throw new AppError('Dictionary or quiz required', 400);
  if (miniAppId) objectId(miniAppId, 'dictionary');
  if (quizId) objectId(quizId, 'quiz');
  const quiz = await Quiz.findOne(
    quizId
      ? { _id: quizId, isActive: true }
      : { miniAppId, isDefault: true, isActive: true }
  );
  if (!quiz) throw new AppError('Quiz not found', 404);
  if (quiz.mode !== 'dynamic')
    return {
      supported: false,
      quizId: quiz._id.toString(),
      miniAppIds: [],
      buckets: [],
      bucketIds: null,
    };
  const miniAppIds = quiz.sourceMiniAppIds.map(String);
  for (const id of miniAppIds) await ensureFavorites(profileId, id);
  const buckets = await TermBucket.find({
    profileId,
    miniAppId: { $in: miniAppIds },
  }).sort({ isFavorites: -1, name: 1 });
  const preference = await QuizBucketPreference.findOne({
    profileId,
    quizId: quiz._id,
    playModeId,
  });
  return {
    supported: true,
    quizId: quiz._id.toString(),
    miniAppIds,
    buckets: await summaries(buckets, profileId),
    bucketIds: preference?.bucketIds?.map(String) ?? null,
  };
}

export async function saveQuizBuckets(
  profileId: string,
  quizId: string,
  mode: unknown,
  selection: unknown
) {
  const options = await quizBucketOptions(profileId, undefined, quizId, mode);
  if (!options.supported)
    throw new AppError('This quiz uses assigned questions', 400);
  const bucketIds = selection === null ? null : idList(selection);
  if (bucketIds?.some((id) => !options.buckets.some((b) => b._id === id)))
    throw new AppError('Bucket not found', 404);
  await QuizBucketPreference.findOneAndUpdate(
    { profileId, quizId, playModeId: playMode(mode) },
    { $set: { bucketIds } },
    { upsert: true }
  );
}

export async function setEntryPaused(
  profileId: string,
  bucketId: string,
  entryId: string,
  paused: unknown
) {
  objectId(entryId, 'entry');
  if (typeof paused !== 'boolean')
    throw new AppError('Choose whether to pause this word', 400);
  await mongoose.connection.transaction(async (session) => {
    await ownedBucket(profileId, bucketId, session);
    await TermBucket.updateOne(
      { _id: bucketId, profileId },
      { $inc: { revision: 1 } },
      { session }
    );
    const entry = await BucketEntry.findOne({
      _id: entryId,
      bucketId,
      profileId,
    }).session(session);
    if (!entry) throw new AppError('Word not found in this bucket', 404);
    const record = await LearningRecord.findOne({
      profileId,
      termId: entry.termId,
      definitionId: entry.definitionId,
    }).session(session);
    entry.status = paused
      ? 'paused'
      : record && ['mastered', 'reviewing'].includes(record.status)
        ? 'mastered'
        : 'learning';
    await entry.save({ session });
  });
}
