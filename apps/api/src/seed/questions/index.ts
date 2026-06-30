// Runs all per-subject question seeders.
import { seedVowelQuestions } from './isizulu/vowels.questions';
import { seedEnglishVocabBasics } from './english/vocab-basics.questions';

export interface QuestionSeedContext {
  practiceLessonId: string;
  dictionaryMiniAppId: string;
}

export async function seedAllQuestions(context: QuestionSeedContext): Promise<void> {
  console.log('Seeding questions...');
  await seedVowelQuestions(context.practiceLessonId);
  await seedEnglishVocabBasics(context.dictionaryMiniAppId);
}
