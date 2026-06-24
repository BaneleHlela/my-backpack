// Business logic for the vocabulary mini-app: word search, bucket management.
// Coordinates the dictionaryApi, questionGenerator, and adaptiveLearning services.
import { searchWord, parseAndStoreTerm } from '../../services/dictionaryApi.service';
import { generateAutoQuestions } from '../../services/questionGenerator.service';
import TermBucket from '../../models/apps/language/vocabulary/termBucket.model';
import BucketEntry from '../../models/apps/language/vocabulary/bucketEntry.model';
import LearningRecord from '../../models/learning/learningRecord.model';
import Question from '../../models/apps/language/vocabulary/question.model';
import Term, { ITermDocument } from '../../models/apps/language/vocabulary/term.model';
import Definition, { IDefinitionDocument } from '../../models/apps/language/vocabulary/definition.model';
import { EntryStatus } from '../../models/apps/language/vocabulary/bucketEntry.model';
import {
  BucketEntryWithDetails,
  PaginatedBucketResponse,
  TermDetailResult,
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

// Adds a term to a profile's bucket. Creates the bucket if it doesn't exist.
// Also bootstraps a LearningRecord and triggers auto question generation on first add.
export async function addToBucket(
  profileId: string,
  termId: string,
  miniAppId: string
): Promise<BucketEntryWithDetails> {
  const term = await Term.findById(termId);
  if (!term) throw new Error('Term not found');

  // Get or create the bucket for this profile+miniApp
  let bucket = await TermBucket.findOne({ profileId, miniAppId });
  if (!bucket) {
    bucket = new TermBucket({ profileId, miniAppId });
    await bucket.save();
  }

  // Prevent duplicate bucket entries
  const existing = await BucketEntry.findOne({ bucketId: bucket._id, termId });
  if (existing) throw new Error('Term is already in your bucket');

  const entry = new BucketEntry({
    bucketId: bucket._id,
    termId,
    profileId,
    addedAt: new Date(),
    status: 'learning',
  });
  await entry.save();

  // Bootstrap a LearningRecord if one doesn't exist yet
  const existingRecord = await LearningRecord.findOne({ profileId, termId });
  if (!existingRecord) {
    const record = new LearningRecord({
      profileId,
      termId,
      miniAppId,
      confidenceScore: 0,
      status: 'unseen',
      totalAnswers: 0,
      correctAnswers: 0,
      reviewCount: 0,
    });
    await record.save();
  }

  // Generate starter questions if none exist yet — fire-and-forget so the user gets an instant response
  const existingQuestions = await Question.countDocuments({ termId, isActive: true });
  if (existingQuestions === 0) {
    generateAutoQuestions(termId).catch((err) =>
      console.error('Auto question generation failed for term:', termId, err)
    );
  }

  return {
    entryId: entry._id.toString(),
    termId: term._id.toString(),
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

// Returns full term detail including filtered definitions, questions, learning record, and bucket status.
export async function getTermDetail(
  termId: string,
  profileId: string,
  contentPrefs: ContentPrefs
): Promise<TermDetailResult> {
  const term = await Term.findById(termId);
  if (!term) throw new Error('Term not found');

  const [allDefinitions, allQuestions, learningRecord, bucket] = await Promise.all([
    Definition.find({ termId }).sort({ order: 1 }),
    Question.find({ termId, isActive: true }),
    LearningRecord.findOne({ profileId, termId }),
    TermBucket.findOne({ profileId, miniAppId: term.miniAppId }),
  ]);

  const definitions = allDefinitions.slice(0, contentPrefs.maxDefinitions);
  const questions = allQuestions.filter((q) =>
    contentPrefs.allowedQuestionTypes.includes(q.type)
  );

  let inBucket = false;
  if (bucket) {
    const entry = await BucketEntry.exists({ bucketId: bucket._id, termId });
    inBucket = !!entry;
  }

  return {
    term,
    definitions,
    questions,
    learningRecord: learningRecord ?? null,
    inBucket,
  };
}

// Returns paginated bucket entries with term details and learning status.
export async function getBucket(
  profileId: string,
  miniAppId: string,
  status: 'learning' | 'mastered' | 'all',
  page: number,
  limit: number
): Promise<PaginatedBucketResponse> {
  const bucket = await TermBucket.findOne({ profileId, miniAppId });
  if (!bucket) {
    return { entries: [], total: 0, page, limit, totalPages: 0 };
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

  const [terms, learningRecords] = await Promise.all([
    Term.find({ _id: { $in: termIds } }).lean(),
    LearningRecord.find({ profileId, termId: { $in: termIds } }).lean(),
  ]);

  const termMap = new Map(terms.map((t) => [t._id.toString(), t]));
  const recordMap = new Map(learningRecords.map((r) => [r.termId.toString(), r]));

  const entries: BucketEntryWithDetails[] = rawEntries.map((e) => {
    const term = termMap.get(e.termId.toString());
    const record = recordMap.get(e.termId.toString());
    return {
      entryId: e._id.toString(),
      termId: e.termId.toString(),
      word: term?.word ?? '',
      phonetic: term?.phonetic,
      audioUrl: term?.audioUrl,
      status: e.status,
      addedAt: e.addedAt,
      confidenceScore: record?.confidenceScore ?? 0,
      learningStatus: record?.status ?? 'unseen',
    };
  });

  return {
    entries,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
