// Seeds the "General Dictionary Quiz" — the default, user-adjustable, dynamic Quiz for the
// English Vocabulary Quiz mini-app. Its content pool (sourceMiniAppIds) points at the
// Dictionary mini-app, since that's where Terms/BucketEntries/Questions actually get created
// when a profile searches and adds a word. Idempotent — re-running updates the existing record.
import Quiz from '../../models/learning/quiz.model';

export interface QuizzesSeedResult {
  generalQuizId: string;
}

export async function seedGeneralDictionaryQuiz(
  quizMiniAppId: string,
  dictionaryMiniAppId: string
): Promise<QuizzesSeedResult> {
  console.log('Seeding quizzes...');

  const quiz = await Quiz.findOneAndUpdate(
    { miniAppId: quizMiniAppId, isDefault: true },
    {
      miniAppId: quizMiniAppId,
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
