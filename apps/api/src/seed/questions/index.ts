// Runs all per-subject question seeders.
import { seedVowelQuestions } from './isizulu/vowels.questions';
import { seedConsonantQuestions } from './isizulu/consonants.questions';
import { seedEnglishVocabBasics } from './english/vocab-basics.questions';
import { seedEnglishVowelQuestions } from './english/vowels.questions';
import { seedCvcWordsQuestions } from './english/cvc-words.questions';
import { seedDragIntroQuestions } from './math/drag-intro.questions';
import { seedCountingQuestions } from './math/counting.questions';

export interface QuestionSeedContext {
  // IsiZulu — vowels (existing)
  practiceLessonId: string;
  dictionaryMiniAppId: string;
  // IsiZulu — consonants
  consonantsPracticeLessonId: string;
  consonantsAssessmentLessonId: string;
  // Math — drag intro
  dragPracticeLessonId: string;
  dragAssessmentLessonId: string;
  // Math — counting
  countingPracticeLessonId: string;
  countingAssessmentLessonId: string;
  // English — vowels
  englishVowelsPracticeLessonId: string;
  // English — CVC words
  cvcPracticeLessonId: string;
  cvcAssessmentLessonId: string;
}

export async function seedAllQuestions(context: QuestionSeedContext): Promise<void> {
  console.log('Seeding questions...');
  await seedVowelQuestions(context.practiceLessonId);
  await seedConsonantQuestions(context.consonantsPracticeLessonId, context.consonantsAssessmentLessonId);
  await seedEnglishVocabBasics(context.dictionaryMiniAppId);
  await seedEnglishVowelQuestions(context.englishVowelsPracticeLessonId);
  await seedCvcWordsQuestions(context.cvcPracticeLessonId, context.cvcAssessmentLessonId);
  await seedDragIntroQuestions(context.dragPracticeLessonId, context.dragAssessmentLessonId);
  await seedCountingQuestions(context.countingPracticeLessonId, context.countingAssessmentLessonId);
}
