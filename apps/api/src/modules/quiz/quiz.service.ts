// Business logic for Quiz definitions (apps/api/src/models/learning/quiz.model.ts) —
// separate from quizSession.service.ts, which manages session lifecycle.
import Quiz, { IQuizDocument } from '../../models/learning/quiz.model';
import Question from '../../models/apps/language/vocabulary/question.model';
import TermBucket from '../../models/apps/language/vocabulary/termBucket.model';
import BucketEntry from '../../models/apps/language/vocabulary/bucketEntry.model';

// Lists active quizzes available for a mini-app, default quiz first.
export async function listQuizzes(miniAppId: string): Promise<IQuizDocument[]> {
  return Quiz.find({ miniAppId, isActive: true }).sort({ isDefault: -1, title: 1 });
}

// Resolves whether the default quiz for a mini-app currently has content to draw on.
// For 'fixed' quizzes it's just whether the quiz has any pinned questions; for 'pool'
// quizzes it's whether any active Question is scoped to the quiz's miniAppId; for
// 'dynamic' quizzes this checks the profile's bucket across the quiz's sourceMiniAppIds.
// Explicit three-way branch — a binary if/else here previously treated any non-'fixed'
// mode as 'dynamic', which would silently mis-route 'pool' quizzes into the bucket check
// (always false, since course content has no TermBucket) once that mode was added.
export async function hasQuizContent(miniAppId: string, profileId: string): Promise<boolean> {
  const quiz = await Quiz.findOne({ miniAppId, isDefault: true, isActive: true });
  if (!quiz) return false;

  if (quiz.mode === 'fixed') {
    return quiz.questionIds.length > 0;
  }

  if (quiz.mode === 'pool') {
    return (await Question.countDocuments({ miniAppId: quiz.miniAppId, isActive: true })) > 0;
  }

  const buckets = await TermBucket.find({ profileId, miniAppId: { $in: quiz.sourceMiniAppIds } });
  if (buckets.length === 0) return false;

  const bucketIds = buckets.map((b) => b._id);
  const entryCount = await BucketEntry.countDocuments({
    bucketId: { $in: bucketIds },
    status: 'learning',
  });
  return entryCount > 0;
}
