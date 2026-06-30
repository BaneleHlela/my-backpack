// Business logic for the vocabulary mini-app: word search, bucket management, and A-Z dictionary browsing.
// Coordinates the dictionaryApi, questionGenerator, and adaptiveLearning services.
import { Types } from 'mongoose';
import { searchWord, parseAndStoreTerm } from '../../services/dictionaryApi.service';
import { generateQuestionsForDefinition } from '../../services/questionGeneration/index';
import { AppError } from '../../utils/AppError';
import TermBucket from '../../models/apps/language/vocabulary/termBucket.model';
import BucketEntry from '../../models/apps/language/vocabulary/bucketEntry.model';
import LearningRecord from '../../models/learning/learningRecord.model';
import Question from '../../models/apps/language/vocabulary/question.model';
import Term, { ITermDocument } from '../../models/apps/language/vocabulary/term.model';
import Definition, { IDefinitionDocument } from '../../models/apps/language/vocabulary/definition.model';
import { EntryStatus } from '../../models/apps/language/vocabulary/bucketEntry.model';
import {
  AddToBucketResult,
  BucketTermEntry,
  PaginatedBucketResponse,
  TermDetailResult,
  DefinitionWithStatus,
  DictionaryBrowseResponse,
  AlphabetAvailabilityResponse,
  TrendingTermResult,
} from './vocab.types';
import { ContentPrefs } from '../../middleware/ageGroup.middleware';

export interface SearchResult {
  term: ITermDocument;
  definitions: IDefinitionDocument[];
  isInBucket: boolean;
  isNew: boolean;
}

// Searches for a word, persists it if new, and checks whether it's already in the profile's bucket.
export async function searchVocab(
  word: string,
  miniAppId: string,
  profileId: string
): Promise<SearchResult> {
  const entries = await searchWord(word);
  const { term, definitions, isNew } = await parseAndStoreTerm(entries, miniAppId);

  const bucket = await TermBucket.findOne({ profileId, miniAppId });
  let isInBucket = false;

  if (bucket) {
    const entry = await BucketEntry.exists({ bucketId: bucket._id, termId: term._id });
    isInBucket = !!entry;
  }

  return { term, definitions, isInBucket, isNew };
}

// Adds a specific definition of a term to a profile's bucket.
// Creates the bucket if it doesn't exist.
// Also bootstraps a per-definition LearningRecord and triggers auto question generation.
export async function addToBucket(
  profileId: string,
  termId: string,
  definitionId: string,
  miniAppId: string
): Promise<AddToBucketResult> {
  const term = await Term.findById(termId);
  if (!term) throw new AppError('Term not found', 404);

  const definition = await Definition.findById(definitionId);
  if (!definition) throw new AppError('Definition not found', 404);
  if (definition.termId.toString() !== termId) {
    throw new AppError('Definition does not belong to this term', 400);
  }

  // Get or create the bucket for this profile+miniApp
  let bucket = await TermBucket.findOne({ profileId, miniAppId });
  if (!bucket) {
    bucket = new TermBucket({ profileId, miniAppId });
    await bucket.save();
  }

  // Prevent duplicate entries per definition
  const existing = await BucketEntry.findOne({ bucketId: bucket._id, termId, definitionId });
  if (existing) throw new AppError('This definition is already in your bucket', 409);

  const entry = new BucketEntry({
    bucketId: bucket._id,
    termId,
    definitionId,
    profileId,
    partOfSpeech: definition.partOfSpeech,
    addedAt: new Date(),
    status: 'learning',
  });
  await entry.save();

  // Bootstrap a per-definition LearningRecord if one doesn't exist yet
  const existingRecord = await LearningRecord.findOne({ profileId, termId, definitionId });
  if (!existingRecord) {
    const record = new LearningRecord({
      profileId,
      termId,
      definitionId,
      miniAppId,
      confidenceScore: 0,
      status: 'unseen',
      totalAnswers: 0,
      correctAnswers: 0,
      reviewCount: 0,
    });
    await record.save();
  }

  // Generate the full question set (auto + AI) for this definition — fire-and-forget
  const existingQuestions = await Question.countDocuments({ termId, definitionId, isActive: true });
  if (existingQuestions === 0) {
    generateQuestionsForDefinition(termId, definitionId).catch((err: unknown) =>
      console.error('Question generation failed for term/definition:', termId, definitionId, err)
    );
  }

  return {
    entryId: entry._id.toString(),
    termId: term._id.toString(),
    definitionId: definition._id.toString(),
    partOfSpeech: definition.partOfSpeech,
    word: term.word,
    phonetic: term.phonetic,
    audioUrl: term.audioUrl,
    status: entry.status,
    addedAt: entry.addedAt,
    confidenceScore: existingRecord?.confidenceScore ?? 0,
    learningStatus: existingRecord?.status ?? 'unseen',
  };
}

// Removes a term from the profile's bucket. Does NOT delete the LearningRecord (history is kept).
export async function removeFromBucket(
  profileId: string,
  termId: string,
  miniAppId: string
): Promise<void> {
  const bucket = await TermBucket.findOne({ profileId, miniAppId });
  if (!bucket) throw new Error('Bucket not found');

  const entry = await BucketEntry.findOne({ bucketId: bucket._id, termId });
  if (!entry) throw new Error('Term not found in bucket');

  await entry.deleteOne();
}

// Returns full term detail with per-definition bucket and learning status.
export async function getTermDetail(
  termId: string,
  profileId: string,
  contentPrefs: ContentPrefs
): Promise<TermDetailResult> {
  const term = await Term.findById(termId);
  if (!term) throw new Error('Term not found');

  const [allDefinitions, allQuestions, learningRecords, bucket] = await Promise.all([
    Definition.find({ termId }).sort({ order: 1 }),
    Question.find({ termId, isActive: true }),
    LearningRecord.find({ profileId, termId }),
    TermBucket.findOne({ profileId, miniAppId: term.miniAppId }),
  ]);

  const definitions = allDefinitions.slice(0, contentPrefs.maxDefinitions);
  const questions = allQuestions.filter((q) =>
    contentPrefs.allowedQuestionTypes.includes(q.type)
  );

  // Build a set of definitionIds that are already in the bucket
  const addedDefinitionIds = new Set<string>();
  if (bucket) {
    const bucketEntries = await BucketEntry.find({ bucketId: bucket._id, termId });
    bucketEntries.forEach((e) => addedDefinitionIds.add(e.definitionId.toString()));
  }

  const definitionsWithStatus: DefinitionWithStatus[] = definitions.map((def) => {
    const lr = learningRecords.find(
      (r) => r.definitionId?.toString() === def._id.toString()
    );
    return {
      definition: def,
      inBucket: addedDefinitionIds.has(def._id.toString()),
      learningRecord: lr
        ? {
            confidenceScore: lr.confidenceScore,
            status: lr.status,
            totalAnswers: lr.totalAnswers,
          }
        : null,
    };
  });

  return {
    term,
    definitions: definitionsWithStatus,
    questions,
  };
}

// Internal type for the A-Z browse aggregation result.
interface BrowseAggregationResult {
  _id: Types.ObjectId;
  word: string;
  phonetic?: string;
  audioUrl?: string;
  definitionCount: number;
}

// Internal type for the trending aggregation result.
interface TrendingAggregationResult {
  term: {
    _id: Types.ObjectId;
    word: string;
    phonetic?: string;
    audioUrl?: string;
  };
  primaryDefinition: string | null;
  bucketCount: number;
}

// Returns terms starting with a given letter, paginated, with definition counts (no auth required).
export async function browseByLetter(
  miniAppId: string,
  letter: string,
  page: number,
  limit: number
): Promise<DictionaryBrowseResponse> {
  const miniAppObjectId = new Types.ObjectId(miniAppId);
  const matchFilter = {
    miniAppId: miniAppObjectId,
    word: { $regex: `^${letter}`, $options: 'i' },
  };

  const [terms, total] = await Promise.all([
    Term.aggregate<BrowseAggregationResult>([
      { $match: matchFilter },
      { $sort: { word: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: 'definitions',
          localField: '_id',
          foreignField: 'termId',
          as: 'definitions',
        },
      },
      {
        $project: {
          word: 1,
          phonetic: 1,
          audioUrl: 1,
          definitionCount: { $size: '$definitions' },
        },
      },
    ]),
    Term.countDocuments(matchFilter),
  ]);

  return {
    terms: terms.map((t) => ({
      _id: t._id.toString(),
      word: t.word,
      phonetic: t.phonetic,
      audioUrl: t.audioUrl,
      definitionCount: t.definitionCount,
    })),
    pagination: {
      total,
      page,
      limit,
      hasMore: page * limit < total,
    },
    letter,
  };
}

// Returns which letters of the alphabet have at least one term for the given mini-app (no auth required).
export async function getAlphabet(miniAppId: string): Promise<AlphabetAvailabilityResponse> {
  const miniAppObjectId = new Types.ObjectId(miniAppId);


  const results = await Term.aggregate<{ _id: string }>([
    { $match: { miniAppId: miniAppObjectId } },
    {
      $group: {
        _id: { $toLower: { $substr: ['$word', 0, 1] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return { available: results.map((r) => r._id) };
}

// Returns the most-bucketed terms for a mini-app with a primary definition preview (no auth required).
export async function getTrending(
  miniAppId: string,
  limit: number
): Promise<TrendingTermResult[]> {
  const miniAppObjectId = new Types.ObjectId(miniAppId);

  const results = await BucketEntry.aggregate<TrendingAggregationResult>([
    {
      $lookup: {
        from: 'terms',
        localField: 'termId',
        foreignField: '_id',
        as: 'termDoc',
      },
    },
    { $unwind: '$termDoc' },
    { $match: { 'termDoc.miniAppId': miniAppObjectId } },
    {
      $group: {
        _id: '$termId',
        bucketCount: { $sum: 1 },
        term: { $first: '$termDoc' },
      },
    },
    { $sort: { bucketCount: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'definitions',
        let: { termId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$termId', '$$termId'] } } },
          { $sort: { order: 1 } },
          { $limit: 1 },
        ],
        as: 'primaryDef',
      },
    },
    {
      $project: {
        _id: 0,
        term: {
          _id: '$term._id',
          word: '$term.word',
          phonetic: '$term.phonetic',
          audioUrl: '$term.audioUrl',
        },
        primaryDefinition: {
          $cond: {
            if: { $gt: [{ $size: '$primaryDef' }, 0] },
            then: { $substr: [{ $arrayElemAt: ['$primaryDef.definition', 0] }, 0, 100] },
            else: null,
          },
        },
        bucketCount: 1,
      },
    },
  ]);

  return results.map((r) => ({
    term: {
      _id: r.term._id.toString(),
      word: r.term.word,
      phonetic: r.term.phonetic,
      audioUrl: r.term.audioUrl,
    },
    primaryDefinition: r.primaryDefinition,
    bucketCount: r.bucketCount,
  }));
}

// Returns the most recently added bucket entries for a profile, up to limit.
export async function getRecent(
  profileId: string,
  miniAppId: string,
  limit: number
): Promise<BucketTermEntry[]> {
  const bucket = await TermBucket.findOne({ profileId, miniAppId });
  if (!bucket) return [];

  const rawEntries = await BucketEntry.find({ bucketId: bucket._id })
    .sort({ addedAt: -1 })
    .limit(limit)
    .lean();

  if (rawEntries.length === 0) return [];

  const termIds = rawEntries.map((e) => e.termId);
  const definitionIds = rawEntries.map((e) => e.definitionId);

  const [terms, definitions, learningRecords] = await Promise.all([
    Term.find({ _id: { $in: termIds } }).lean(),
    Definition.find({ _id: { $in: definitionIds } }).lean(),
    LearningRecord.find({ profileId, termId: { $in: termIds } }).lean(),
  ]);

  const termMap = new Map(terms.map((t) => [t._id.toString(), t]));
  const defMap = new Map(definitions.map((d) => [d._id.toString(), d]));
  const recordMap = new Map(
    learningRecords.map((r) => [
      `${r.termId.toString()}:${r.definitionId?.toString() ?? ''}`,
      r,
    ])
  );

  return rawEntries.map((e) => {
    const term = termMap.get(e.termId.toString());
    const def = defMap.get(e.definitionId.toString());
    const record = recordMap.get(`${e.termId.toString()}:${e.definitionId.toString()}`);

    return {
      entry: {
        _id: e._id.toString(),
        termId: e.termId.toString(),
        definitionId: e.definitionId.toString(),
        partOfSpeech: e.partOfSpeech,
        status: e.status,
        addedAt: e.addedAt,
        confidenceScore: record?.confidenceScore ?? 0,
      },
      term: {
        _id: term?._id.toString() ?? e.termId.toString(),
        word: term?.word ?? '',
        phonetic: term?.phonetic,
        audioUrl: term?.audioUrl,
      },
      definition: {
        _id: def?._id.toString() ?? e.definitionId.toString(),
        definition: def?.definition ?? '',
        examples: def?.examples ?? [],
        partOfSpeech: def?.partOfSpeech ?? e.partOfSpeech,
      },
    };
  });
}

// Returns paginated bucket entries with term and definition details.
export async function getBucket(
  profileId: string,
  miniAppId: string,
  status: 'learning' | 'mastered' | 'all',
  page: number,
  limit: number
): Promise<PaginatedBucketResponse> {
  const bucket = await TermBucket.findOne({ profileId, miniAppId });
  if (!bucket) {
    return {
      terms: [],
      pagination: { total: 0, page, limit, hasMore: false },
    };
  }

  const statusFilter: EntryStatus[] =
    status === 'all' ? ['learning', 'mastered', 'paused'] : [status as EntryStatus];

  const total = await BucketEntry.countDocuments({
    bucketId: bucket._id,
    status: { $in: statusFilter },
  });

  const rawEntries = await BucketEntry.find({
    bucketId: bucket._id,
    status: { $in: statusFilter },
  })
    .sort({ addedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const termIds = rawEntries.map((e) => e.termId);
  const definitionIds = rawEntries.map((e) => e.definitionId);

  const [terms, definitions, learningRecords] = await Promise.all([
    Term.find({ _id: { $in: termIds } }).lean(),
    Definition.find({ _id: { $in: definitionIds } }).lean(),
    LearningRecord.find({ profileId, termId: { $in: termIds } }).lean(),
  ]);

  const termMap = new Map(terms.map((t) => [t._id.toString(), t]));
  const defMap = new Map(definitions.map((d) => [d._id.toString(), d]));
  // key: termId:definitionId for per-definition lookup
  const recordMap = new Map(
    learningRecords.map((r) => [
      `${r.termId.toString()}:${r.definitionId?.toString() ?? ''}`,
      r,
    ])
  );

  const bucketTermEntries: BucketTermEntry[] = rawEntries.map((e) => {
    const term = termMap.get(e.termId.toString());
    const def = defMap.get(e.definitionId.toString());
    const record = recordMap.get(
      `${e.termId.toString()}:${e.definitionId.toString()}`
    );

    return {
      entry: {
        _id: e._id.toString(),
        termId: e.termId.toString(),
        definitionId: e.definitionId.toString(),
        partOfSpeech: e.partOfSpeech,
        status: e.status,
        addedAt: e.addedAt,
        confidenceScore: record?.confidenceScore ?? 0,
      },
      term: {
        _id: term?._id.toString() ?? e.termId.toString(),
        word: term?.word ?? '',
        phonetic: term?.phonetic,
        audioUrl: term?.audioUrl,
      },
      definition: {
        _id: def?._id.toString() ?? e.definitionId.toString(),
        definition: def?.definition ?? '',
        examples: def?.examples ?? [],
        partOfSpeech: def?.partOfSpeech ?? e.partOfSpeech,
      },
    };
  });

  return {
    terms: bucketTermEntries,
    pagination: {
      total,
      page,
      limit,
      hasMore: page * limit < total,
    },
  };
}
