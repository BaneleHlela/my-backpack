// Seeds the "General Dictionary Quiz" — the default, user-adjustable, dynamic Quiz for
// English vocabulary. Its content pool (sourceMiniAppIds) points at the Dictionary mini-app,
// since that's where Terms/BucketEntries/Questions actually get created when a profile
// searches and adds a word. The standalone Vocabulary "Quiz" mini-app was removed — quiz
// access now folds into the Dictionary UI, so miniAppId also points directly at Dictionary.
// Idempotent — re-running updates the existing record.
import Quiz from '../../models/learning/quiz.model';

export interface QuizzesSeedResult {
  generalQuizId: string;
}

export async function seedGeneralDictionaryQuiz(dictionaryMiniAppId: string): Promise<QuizzesSeedResult> {
  console.log('Seeding quizzes...');

  const quiz = await Quiz.findOneAndUpdate(
    { miniAppId: dictionaryMiniAppId, isDefault: true },
    {
      miniAppId: dictionaryMiniAppId,
      sourceMiniAppIds: [dictionaryMiniAppId],
      title: 'General Dictionary Quiz',
      mode: 'dynamic',
      questionIds: [],
      settings: {
        questionCount: 10,
        questionTypes: [],
        bucketFilter: 'learning',
        feedbackMode: 'immediate',
      },
      isUserAdjustable: true,
      isDefault: true,
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('  Seeded General Dictionary Quiz');

  return { generalQuizId: quiz._id.toString() };
}
