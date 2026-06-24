// Core adaptive learning algorithm. Manages confidence scores, term status transitions,
// spaced-repetition scheduling, and learning velocity for each profile.
//
// Confidence score (0.0 → 1.0):
//   Starts at 0 for every term. Increases on correct answers, decreases on wrong ones.
//   The magnitude of each change scales with the partial-score ratio and the profile's
//   learningVelocity (faster learners get slightly bigger positive changes).
//   Result is always clamped to [0, 1].
//
// Term status lifecycle (stored in LearningRecord):
//   unseen → learning  (first answer given)
//   learning → mastered (confidence >= masteryThreshold, default 0.85)
//   mastered → reviewing (nextReviewAt is set; spaced-repetition cycle begins)
//   mastered/reviewing → learning (confidence drops back below threshold — rare)
//
// Spaced repetition interval ladder (reviewCount → days until next review):
//   0 → 1 day | 1 → 3 days | 2 → 7 days | 3+ → 14 days
//
// learningVelocity:
//   = platformAvgQuestionsToMaster / profileAvgQuestionsToMaster
//   Platform average is hardcoded at 5 for now.
//   Recalculated after every 10 terms mastered per mini-app.
import LearningRecord, { ILearningRecordDocument, LearningStatus } from '../models/learning/learningRecord.model';
import AdaptiveProfile, { IMiniAppStats } from '../models/learning/adaptiveProfile.model';
import BucketEntry from '../models/apps/language/vocabulary/bucketEntry.model';
import TermBucket from '../models/apps/language/vocabulary/termBucket.model';
import { IAnswerRecordDocument } from '../models/learning/answerRecord.model';

const PLATFORM_AVG_QUESTIONS_TO_MASTER = 5;
const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14];

// Calculates the delta to apply to confidenceScore for a single answer.
// Caller must clamp the result before storing.
export function calculateConfidenceChange(
  isCorrect: boolean,
  pointsAwarded: number,
  maxPoints: number,
  velocity: number
): number {
  const baseChange = isCorrect ? 0.15 : -0.20;
  const ratio = maxPoints > 0 ? pointsAwarded / maxPoints : 0;
  return baseChange * ratio * velocity;
}

// Sets nextReviewAt and transitions the record into 'reviewing' status.
// Mutates in place — caller must save after calling this.
export function scheduleNextReview(record: ILearningRecordDocument): void {
  const idx = Math.min(record.reviewCount, REVIEW_INTERVALS_DAYS.length - 1);
  const days = REVIEW_INTERVALS_DAYS[idx] ?? 14;
  record.nextReviewAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  record.reviewCount += 1;
  record.status = 'reviewing';
}

// Updates (or creates) the LearningRecord for a profile/term pair after one answer.
// Status lifecycle: unseen → learning → reviewing (mastery crossed; scheduleNextReview sets this)
//   reviewing + correct  → scheduleNextReview (advance interval)
//   reviewing + wrong    → learning (relapse penalty -0.10 applied on top of normal delta)
// BucketEntry is synced when mastery is first crossed (→ 'mastered') or on relapse (→ 'learning').
export async function updateLearningRecord(
  profileId: string,
  termId: string,
  miniAppId: string,
  answerRecord: IAnswerRecordDocument,
  masteryThreshold: number
): Promise<ILearningRecordDocument> {
  let record = await LearningRecord.findOne({ profileId, termId });

  if (!record) {
    record = new LearningRecord({
      profileId,
      termId,
      miniAppId,
      confidenceScore: 0.0,
      status: 'unseen' as LearningStatus,
      totalAnswers: 0,
      correctAnswers: 0,
      reviewCount: 0,
    });
  }

  // Fetch the profile's velocity for this mini-app
  const adaptive = await AdaptiveProfile.findOne({ profileId });
  const miniAppKey = miniAppId.toString();
  const stats = adaptive?.miniAppStats?.get(miniAppKey);
  const velocity = stats?.learningVelocity ?? 1.0;

  const delta = calculateConfidenceChange(
    answerRecord.isCorrect,
    answerRecord.pointsAwarded,
    answerRecord.maxPoints,
    velocity
  );

  const prevStatus = record.status;
  record.confidenceScore = Math.min(1, Math.max(0, record.confidenceScore + delta));
  record.totalAnswers += 1;
  if (answerRecord.isCorrect) record.correctAnswers += 1;
  record.lastAnsweredAt = answerRecord.answeredAt;

  if (prevStatus === 'unseen') {
    record.status = 'learning';
  }

  // First-time mastery crossing — term was learning/unseen and confidence now meets threshold
  const crossedMastery =
    record.confidenceScore >= masteryThreshold && prevStatus !== 'reviewing';

  if (crossedMastery) {
    if (!record.masteredAt) {
      record.masteredAt = new Date();
      record.questionsToFirstMastery = record.totalAnswers;
    }
    scheduleNextReview(record); // transitions status to 'reviewing'

    // Sync BucketEntry to 'mastered' on first crossing
    const bucket = await TermBucket.findOne({ profileId, miniAppId });
    if (bucket) {
      await BucketEntry.findOneAndUpdate(
        { bucketId: bucket._id, termId },
        { status: 'mastered' }
      );
    }
  } else if (prevStatus === 'reviewing') {
    if (answerRecord.isCorrect) {
      // Successful review — push the next review further out
      scheduleNextReview(record);
    } else {
      // Relapse — reset to active learning with an extra confidence penalty
      record.confidenceScore = Math.max(0, record.confidenceScore - 0.10);
      record.status = 'learning';

      const bucket = await TermBucket.findOne({ profileId, miniAppId });
      if (bucket) {
        await BucketEntry.findOneAndUpdate(
          { bucketId: bucket._id, termId },
          { status: 'learning' }
        );
      }
    }
  }

  await record.save();
  return record;
}

// Returns all LearningRecords for a profile+miniApp where nextReviewAt is past due.
export async function getTermsDueForReview(
  profileId: string,
  miniAppId: string
): Promise<ILearningRecordDocument[]> {
  return LearningRecord.find({
    profileId,
    miniAppId,
    status: 'reviewing',
    nextReviewAt: { $lte: new Date() },
  });
}

// Recalculates learningVelocity for a profile in one mini-app by comparing their
// average questions-to-mastery against the platform average.
// Should be called after every 10 newly mastered terms.
export async function recalculateLearningVelocity(
  profileId: string,
  miniAppId: string
): Promise<void> {
  const masteredRecords = await LearningRecord.find({
    profileId,
    miniAppId,
    status: { $in: ['mastered', 'reviewing'] },
    questionsToFirstMastery: { $exists: true, $gt: 0 },
  });

  if (masteredRecords.length === 0) return;

  const totalQ = masteredRecords.reduce(
    (sum, r) => sum + (r.questionsToFirstMastery ?? 0),
    0
  );
  const avgQuestionsToMaster = totalQ / masteredRecords.length;
  const velocity = PLATFORM_AVG_QUESTIONS_TO_MASTER / avgQuestionsToMaster;

  let adaptive = await AdaptiveProfile.findOne({ profileId });
  if (!adaptive) {
    adaptive = new AdaptiveProfile({ profileId });
  }

  const miniAppKey = miniAppId.toString();
  const existing = adaptive.miniAppStats.get(miniAppKey);

  const updated: IMiniAppStats = {
    avgQuestionsToMaster,
    totalTermsMastered: masteredRecords.length,
    totalTermsAttempted: existing?.totalTermsAttempted ?? masteredRecords.length,
    learningVelocity: velocity,
  };

  adaptive.miniAppStats.set(miniAppKey, updated);
  await adaptive.save();
}
