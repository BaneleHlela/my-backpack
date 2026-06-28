// Manages the full quiz session lifecycle: creation, answer capture, completion, abandonment.
//
// Question selection priority (selectQuestions):
//   1. Terms due for spaced-repetition review (status 'reviewing', nextReviewAt <= now)
//   2. Learning terms with the lowest confidence score (most uncertain first)
//   3. Unseen terms in the bucket (in bucket insertion order)
//
// Answer capture (captureAnswer):
//   — Determines isCorrect and pointsAwarded using 'exact_match' by default.
//     DnD answers are evaluated via evaluateDnDAnswer.
//     Voice answers use gradingMethod: 'pending' (transcription deferred).
//   — Calls adaptiveLearning.service to update confidenceScore and term status.
//   — Returns the next unanswered question in the session, or null if all done.
//
// recalculateLearningVelocity is triggered inside completeSession when at least
// MASTERY_MILESTONE new masteries occurred during the session.
import { Types } from 'mongoose';
import QuizSession, {
  IQuizSessionDocument,
  ISessionSettings,
  ISessionResults,
  SessionStatus,
  BucketFilter,
} from '../models/learning/quizSession.model';
import Question, { IQuestionDocument, QuestionType, QuestionSource } from '../models/apps/language/vocabulary/question.model';
import { IQuestionContent, IDropZone } from '../modules/question/question.types';
import AnswerRecord from '../models/learning/answerRecord.model';
import LearningRecord from '../models/learning/learningRecord.model';
import BucketEntry from '../models/apps/language/vocabulary/bucketEntry.model';
import TermBucket from '../models/apps/language/vocabulary/termBucket.model';
import AdaptiveProfile from '../models/learning/adaptiveProfile.model';
import Term from '../models/apps/language/vocabulary/term.model';
import { updateLearningRecord, recalculateLearningVelocity } from './adaptiveLearning.service';
import { ResponseType, GradingMethod } from '../models/learning/answerRecord.model';
import { EntryStatus } from '../models/apps/language/vocabulary/bucketEntry.model';

const MASTERY_MILESTONE = 10;

const DND_TYPES = new Set<QuestionType>([
  'dnd_single', 'dnd_select', 'dnd_count', 'dnd_sort',
  'dnd_sequence', 'dnd_match', 'dnd_fill', 'dnd_build',
]);

// ── DnD answer evaluation ─────────────────────────────────

interface DnDPlacement {
  draggableId: string;
  dropZoneId: string;
}

// Evaluates a DnD answer. rawResponse is JSON.stringify({ placements: DnDPlacement[] }).
export function evaluateDnDAnswer(
  question: IQuestionDocument,
  rawResponse: string
): { isCorrect: boolean; pointsAwarded: number } {
  const content = question.content as IQuestionContent;
  const dropZones: IDropZone[] = content.dropZones ?? [];

  let placements: DnDPlacement[];
  try {
    const parsed = JSON.parse(rawResponse) as { placements?: DnDPlacement[] };
    placements = parsed.placements ?? [];
  } catch {
    return { isCorrect: false, pointsAwarded: 0 };
  }

  const placementMap = new Map<string, string[]>();
  for (const p of placements) {
    if (!placementMap.has(p.dropZoneId)) placementMap.set(p.dropZoneId, []);
    placementMap.get(p.dropZoneId)!.push(p.draggableId);
  }

  let allZonesCorrect = true;

  for (const zone of dropZones) {
    const placed = placementMap.get(zone.id) ?? [];

    if (question.type === 'dnd_count') {
      // Exact quantity check — requiredCount items of any requiredDraggableId
      const validItems = placed.filter((id) => zone.requiredDraggableIds.includes(id));
      if (validItems.length !== (zone.requiredCount ?? zone.requiredDraggableIds.length)) {
        allZonesCorrect = false;
        break;
      }
    } else if (question.type === 'dnd_sequence') {
      // Order matters — placements must match requiredDraggableIds in order
      const ordered = placements
        .filter((p) => p.dropZoneId === zone.id)
        .map((p) => p.draggableId);
      if (ordered.join(',') !== zone.requiredDraggableIds.join(',')) {
        allZonesCorrect = false;
        break;
      }
    } else {
      // All other DnD types: set equality
      const placedSet = new Set(placed);
      const requiredSet = new Set(zone.requiredDraggableIds);
      const setsMatch =
        placedSet.size === requiredSet.size &&
        [...requiredSet].every((id) => placedSet.has(id));
      if (!setsMatch) {
        allZonesCorrect = false;
        break;
      }
    }
  }

  return {
    isCorrect: allZonesCorrect,
    pointsAwarded: allZonesCorrect ? question.maxPoints : 0,
  };
}

export interface CreateSessionInput {
  miniAppId: string;
  settings: {
    questionCount?: number;
    timeLimit?: number;
    questionTypes?: string[];
    bucketFilter?: BucketFilter;
  };
}

export interface CaptureAnswerInput {
  questionId: string;
  responseType: ResponseType;
  rawResponse: string;
  selectedOptionIndex?: number;
  timeToAnswerMs: number;
  wasTimedOut?: boolean;
  wasSkipped?: boolean;
}

export interface CaptureAnswerResult {
  answerRecordId: string;
  isCorrect: boolean;
  pointsAwarded: number;
  confidenceAfter: number;
  nextQuestion: IQuestionDocument | null;
  sessionComplete: boolean;
}

// Selects an ordered list of question ObjectIds for the session based on the profile's bucket.
async function selectQuestions(
  profileId: string,
  miniAppId: string,
  settings: ISessionSettings
): Promise<Types.ObjectId[]> {
  const bucket = await TermBucket.findOne({ profileId, miniAppId });
  if (!bucket) return [];

  const statusFilter: EntryStatus[] =
    settings.bucketFilter === 'all'
      ? ['learning', 'mastered', 'paused']
      : settings.bucketFilter === 'mastered'
      ? ['mastered']
      : ['learning'];

  const entries = await BucketEntry.find({
    bucketId: bucket._id,
    status: { $in: statusFilter },
  });
  if (entries.length === 0) return [];

  const termIds = entries.map((e) => e.termId.toString());

  const records = await LearningRecord.find({
    profileId,
    termId: { $in: termIds },
  });
  const recordMap = new Map(records.map((r) => [r.termId.toString(), r]));

  // Priority 1: due for review
  const dueForReview = records
    .filter((r) => r.status === 'reviewing' && r.nextReviewAt && r.nextReviewAt <= new Date())
    .map((r) => r.termId.toString());

  // Priority 2: actively learning, lowest confidence first
  const learning = records
    .filter((r) => r.status === 'learning')
    .sort((a, b) => a.confidenceScore - b.confidenceScore)
    .map((r) => r.termId.toString());

  // Priority 3: unseen (in bucket order)
  const unseen = termIds.filter(
    (id) => !recordMap.has(id) || recordMap.get(id)?.status === 'unseen'
  );

  const prioritised = Array.from(new Set([...dueForReview, ...learning, ...unseen]));
  const selected = prioritised.slice(0, settings.questionCount);

  const questionIds: Types.ObjectId[] = [];
  const typeFilter: QuestionType[] | undefined =
    settings.questionTypes.length > 0 ? (settings.questionTypes as QuestionType[]) : undefined;

  for (const termId of selected) {
    const qs = await Question.find({
      termId,
      miniAppId,
      isActive: true,
      ...(typeFilter ? { type: { $in: typeFilter } } : {}),
    });
    if (qs.length > 0) {
      // Pick a random question for variety
      const q = qs[Math.floor(Math.random() * qs.length)];
      questionIds.push(q._id as Types.ObjectId);
    }
  }

  return questionIds;
}

// Creates a new quiz session and returns it along with the first question to display.
export async function createSession(
  profileId: string,
  input: CreateSessionInput
): Promise<{ session: IQuizSessionDocument; firstQuestion: IQuestionDocument | null }> {
  const settings: ISessionSettings = {
    questionCount: input.settings.questionCount ?? 10,
    timeLimit: input.settings.timeLimit,
    questionTypes: input.settings.questionTypes ?? [],
    bucketFilter: input.settings.bucketFilter ?? 'learning',
  };

  const questionIds = await selectQuestions(profileId, input.miniAppId, settings);

  const session = new QuizSession({
    profileId,
    miniAppId: input.miniAppId,
    status: 'active',
    questionIds,
    settings,
    startedAt: new Date(),
  });
  await session.save();

  const firstQuestion =
    questionIds.length > 0 ? await Question.findById(questionIds[0]) : null;

  return { session, firstQuestion };
}

// Captures one answer, updates learning records, and returns the next question.
export async function captureAnswer(
  sessionId: string,
  profileId: string,
  data: CaptureAnswerInput
): Promise<CaptureAnswerResult> {
  const session = await QuizSession.findOne({ _id: sessionId, profileId, status: 'active' });
  if (!session) throw new Error('Active session not found');

  const question = await Question.findById(data.questionId);
  if (!question) throw new Error('Question not found');

  const content = question.content as IQuestionContent;

  const adaptive = await AdaptiveProfile.findOne({ profileId });
  const masteryThreshold = adaptive?.masteryThreshold ?? 0.85;

  const existingRecord = await LearningRecord.findOne({
    profileId,
    termId: question.termId,
  });
  const confidenceBefore = existingRecord?.confidenceScore ?? 0;

  let isCorrect = false;
  let pointsAwarded = 0;
  let gradingMethod: GradingMethod = 'exact_match';

  if (data.wasTimedOut || data.wasSkipped) {
    isCorrect = false;
    pointsAwarded = 0;
    gradingMethod = 'exact_match';
  } else if (question.type === 'text_input_audio') {
    gradingMethod = 'pending';
    isCorrect = false;
    pointsAwarded = 0;
  } else if (DND_TYPES.has(question.type)) {
    const result = evaluateDnDAnswer(question, data.rawResponse);
    isCorrect = result.isCorrect;
    pointsAwarded = result.pointsAwarded;
    gradingMethod = 'exact_match';
  } else {
    const normalised = data.rawResponse.toLowerCase().trim();
    const correct = (content.correctAnswer ?? '').toLowerCase().trim();
    isCorrect = normalised === correct;

    if (isCorrect) {
      pointsAwarded = question.maxPoints;
    } else if (question.pointsCanBePartial) {
      // Partial credit: award half points if response contains the correct answer
      pointsAwarded = normalised.includes(correct) ? Math.floor(question.maxPoints * 0.5) : 0;
      isCorrect = pointsAwarded >= question.maxPoints * 0.5;
    } else {
      pointsAwarded = 0;
    }

    gradingMethod = question.type === 'fill_blank_typed' ? 'keyword_match' : 'exact_match';
  }

  const answerRecord = new AnswerRecord({
    profileId,
    questionId: question._id,
    termId: question.termId,
    miniAppId: question.miniAppId,
    sessionId,
    responseType: data.responseType,
    rawResponse: data.rawResponse,
    selectedOptionIndex: data.selectedOptionIndex,
    maxPoints: question.maxPoints,
    pointsAwarded,
    isCorrect,
    gradingMethod,
    answeredAt: new Date(),
    timeToAnswerMs: data.timeToAnswerMs,
    wasTimedOut: data.wasTimedOut ?? false,
    attemptNumber: 1,
    wasSkipped: data.wasSkipped ?? false,
    confidenceBefore,
    confidenceAfter: confidenceBefore, // updated below
  });
  await answerRecord.save();

  // Adaptive learning only applies to term-linked questions (vocab quiz).
  // Roadmap-only questions (mcq_audio without a termId) skip this step.
  let confidenceAfter = answerRecord.confidenceAfter;
  if (question.termId) {
    const updatedRecord = await updateLearningRecord(
      profileId,
      question.termId.toString(),
      question.miniAppId.toString(),
      answerRecord,
      masteryThreshold
    );
    confidenceAfter = updatedRecord.confidenceScore;
    answerRecord.confidenceAfter = confidenceAfter;
  }
  await answerRecord.save();

  // Trigger velocity recalculation when the profile hits a mastery milestone (every 10 terms)
  const masteredCount = await LearningRecord.countDocuments({
    profileId,
    miniAppId: question.miniAppId,
    questionsToFirstMastery: { $exists: true, $gt: 0 },
  });
  if (masteredCount > 0 && masteredCount % MASTERY_MILESTONE === 0) {
    recalculateLearningVelocity(profileId, question.miniAppId.toString()).catch((err) =>
      console.error('Velocity recalculation failed:', err)
    );
  }

  // Find the next question in session order that hasn't been answered yet
  const answeredIds = (
    await AnswerRecord.find({ sessionId, profileId }).select('questionId').lean()
  ).map((a) => a.questionId.toString());

  const nextQuestionId = session.questionIds.find(
    (qId) => !answeredIds.includes(qId.toString())
  );
  const nextQuestion = nextQuestionId
    ? await Question.findById(nextQuestionId)
    : null;

  return {
    answerRecordId: answerRecord._id.toString(),
    isCorrect,
    pointsAwarded,
    confidenceAfter,
    nextQuestion,
    sessionComplete: !nextQuestion,
  };
}

// Aggregates results, marks the session completed, and triggers velocity recalculation if warranted.
export async function completeSession(
  sessionId: string,
  profileId: string
): Promise<IQuizSessionDocument> {
  const session = await QuizSession.findOne({ _id: sessionId, profileId });
  if (!session) throw new Error('Session not found');
  if (session.status === 'completed') return session;

  const answerRecords = await AnswerRecord.find({ sessionId, profileId });

  const answered = answerRecords.filter((a) => !a.wasSkipped && !a.wasTimedOut).length;
  const skipped = answerRecords.filter((a) => a.wasSkipped || a.wasTimedOut).length;
  const correct = answerRecords.filter((a) => a.isCorrect).length;
  const totalPointsAvailable = answerRecords.reduce((s, a) => s + a.maxPoints, 0);
  const totalPointsAwarded = answerRecords.reduce((s, a) => s + a.pointsAwarded, 0);
  const percentageScore =
    totalPointsAvailable > 0
      ? Math.round((totalPointsAwarded / totalPointsAvailable) * 100)
      : 0;
  const timeTakenMs = answerRecords.reduce((s, a) => s + a.timeToAnswerMs, 0);

  const results: ISessionResults = {
    totalQuestions: session.questionIds.length,
    answered,
    skipped,
    correct,
    totalPointsAvailable,
    totalPointsAwarded,
    percentageScore,
    timeTakenMs,
  };

  session.status = 'completed';
  session.results = results;
  session.completedAt = new Date();
  await session.save();

  // Count new masteries achieved during this session
  const adaptive = await AdaptiveProfile.findOne({ profileId });
  const masteryThreshold = adaptive?.masteryThreshold ?? 0.85;
  const newMasteries = answerRecords.filter(
    (a) => a.confidenceBefore < masteryThreshold && a.confidenceAfter >= masteryThreshold
  ).length;

  if (newMasteries >= MASTERY_MILESTONE) {
    await recalculateLearningVelocity(profileId, session.miniAppId.toString());
  }

  // Update AdaptiveProfile.globalStats with session results and streak
  const adaptiveToUpdate = adaptive ?? new AdaptiveProfile({ profileId });
  const previousLastStudied = adaptiveToUpdate.globalStats.lastStudiedAt;
  const now = new Date();

  adaptiveToUpdate.globalStats.totalCorrectAnswers += correct;
  adaptiveToUpdate.globalStats.totalAnswers += answerRecords.length;
  adaptiveToUpdate.globalStats.overallAccuracy =
    adaptiveToUpdate.globalStats.totalAnswers > 0
      ? adaptiveToUpdate.globalStats.totalCorrectAnswers /
        adaptiveToUpdate.globalStats.totalAnswers
      : 0;

  if (!previousLastStudied) {
    adaptiveToUpdate.globalStats.currentStreak = 1;
  } else {
    const hoursSince =
      (now.getTime() - previousLastStudied.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) {
      // Studied again today — keep streak
    } else if (hoursSince < 48) {
      // Studied yesterday — extend streak
      adaptiveToUpdate.globalStats.currentStreak += 1;
    } else {
      // Gap > 48 hours — reset streak
      adaptiveToUpdate.globalStats.currentStreak = 1;
    }
  }

  if (
    adaptiveToUpdate.globalStats.currentStreak >
    adaptiveToUpdate.globalStats.longestStreak
  ) {
    adaptiveToUpdate.globalStats.longestStreak =
      adaptiveToUpdate.globalStats.currentStreak;
  }

  adaptiveToUpdate.globalStats.lastStudiedAt = now;
  adaptiveToUpdate.markModified('globalStats');
  await adaptiveToUpdate.save();

  return session;
}

// Saves partial results and marks the session abandoned.
export async function abandonSession(
  sessionId: string,
  profileId: string
): Promise<IQuizSessionDocument> {
  const session = await QuizSession.findOne({ _id: sessionId, profileId, status: 'active' });
  if (!session) throw new Error('Active session not found');

  const answerRecords = await AnswerRecord.find({ sessionId, profileId });

  const answered = answerRecords.filter((a) => !a.wasSkipped && !a.wasTimedOut).length;
  const skipped = answerRecords.filter((a) => a.wasSkipped || a.wasTimedOut).length;
  const correct = answerRecords.filter((a) => a.isCorrect).length;
  const totalPointsAvailable = answerRecords.reduce((s, a) => s + a.maxPoints, 0);
  const totalPointsAwarded = answerRecords.reduce((s, a) => s + a.pointsAwarded, 0);
  const percentageScore =
    totalPointsAvailable > 0
      ? Math.round((totalPointsAwarded / totalPointsAvailable) * 100)
      : 0;
  const timeTakenMs = answerRecords.reduce((s, a) => s + a.timeToAnswerMs, 0);

  session.status = 'abandoned';
  session.results = {
    totalQuestions: session.questionIds.length,
    answered,
    skipped,
    correct,
    totalPointsAvailable,
    totalPointsAwarded,
    percentageScore,
    timeTakenMs,
  };
  session.completedAt = new Date();
  await session.save();

  return session;
}

// Returns a session document. Throws if not found or not owned by this profile.
export async function getSessionResults(
  sessionId: string,
  profileId: string
): Promise<IQuizSessionDocument> {
  const session = await QuizSession.findOne({ _id: sessionId, profileId });
  if (!session) throw new Error('Session not found');
  return session;
}

export interface SessionSummary {
  _id: Types.ObjectId;
  profileId: Types.ObjectId;
  miniAppId: Types.ObjectId;
  status: SessionStatus;
  settings: ISessionSettings;
  results?: ISessionResults;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionWithTerm {
  _id: Types.ObjectId;
  termId: Types.ObjectId;
  miniAppId: Types.ObjectId;
  type: QuestionType;
  content: IQuestionContent;
  maxPoints: number;
  pointsCanBePartial: boolean;
  source: QuestionSource;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  term: { word: string; phonetic?: string } | null;
}

export interface SessionStateResult {
  session: SessionSummary;
  currentQuestion: QuestionWithTerm | null;
  progress: {
    answered: number;
    total: number;
    correct: number;
    currentStreak: number;
  };
}

// Returns the current state of a session: session summary, the next unanswered question with
// its term, and aggregated progress for the session so far.
export async function getSessionState(
  sessionId: string,
  profileId: string
): Promise<SessionStateResult> {
  const session = await QuizSession.findOne({ _id: sessionId, profileId });
  if (!session) throw new Error('Session not found');

  const answerRecords = await AnswerRecord.find({ sessionId, profileId })
    .sort({ answeredAt: 1 })
    .lean();

  const answered = answerRecords.length;
  const correct = answerRecords.filter((a) => a.isCorrect).length;

  // Count consecutive correct answers from the most recent backwards
  let currentStreak = 0;
  for (let i = answerRecords.length - 1; i >= 0; i--) {
    if (answerRecords[i].isCorrect) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Find the next unanswered question in session order
  const answeredQuestionIds = new Set(answerRecords.map((a) => a.questionId.toString()));
  const currentQuestionId = session.questionIds.find(
    (qId) => !answeredQuestionIds.has(qId.toString())
  );

  let currentQuestion: QuestionWithTerm | null = null;
  if (currentQuestionId) {
    const question = await Question.findById(currentQuestionId).lean();
    if (question) {
      const term = await Term.findById(question.termId).select('word phonetic').lean();
      currentQuestion = {
        _id: question._id as Types.ObjectId,
        termId: question.termId as Types.ObjectId,
        miniAppId: question.miniAppId as Types.ObjectId,
        type: question.type,
        content: question.content as IQuestionContent,
        maxPoints: question.maxPoints,
        pointsCanBePartial: question.pointsCanBePartial,
        source: question.source,
        isActive: question.isActive,
        createdAt: question.createdAt,
        updatedAt: question.updatedAt,
        term: term ? { word: term.word, phonetic: term.phonetic } : null,
      };
    }
  }

  // Strip questionIds from the session response
  const sessionObj = session.toObject() as {
    _id: Types.ObjectId;
    profileId: Types.ObjectId;
    miniAppId: Types.ObjectId;
    status: SessionStatus;
    questionIds: Types.ObjectId[];
    settings: ISessionSettings;
    results?: ISessionResults;
    startedAt: Date;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  };
  const { questionIds: _qs, ...sessionSummary } = sessionObj;

  return {
    session: sessionSummary,
    currentQuestion,
    progress: {
      answered,
      total: session.questionIds.length,
      correct,
      currentStreak,
    },
  };
}
