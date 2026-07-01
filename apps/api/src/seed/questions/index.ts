// Runs all per-subject question seeders. Each seeder now takes (nodeId, introLessonId) and is
// the sole writer of that node's RoadmapNode.items[] — it builds the Quiz documents and
// rebuilds the full ordered items list (1 lesson item + N quiz items) each run.
import { seedVowelQuestions } from './isizulu/vowels.questions';
import { seedConsonantQuestions } from './isizulu/consonants.questions';
import { seedEnglishVocabBasics } from './english/vocab-basics.questions';
import { seedEnglishVowelQuestions } from './english/vowels.questions';
import { seedCvcWordsQuestions } from './english/cvc-words.questions';
import { seedDragIntroQuestions } from './math/drag-intro.questions';
import { seedCountingQuestions } from './math/counting.questions';

export interface QuestionSeedContext {
  // IsiZulu — vowels
  vowelsNodeId: string;
  vowelsIntroLessonId: string;
  dictionaryMiniAppId: string;
  // IsiZulu — consonants
  consonantsNodeId: string;
  consonantsIntroLessonId: string;
  // Math — drag intro
  dragNodeId: string;
  dragIntroLessonId: string;
  // Math — counting
  countingNodeId: string;
  countingIntroLessonId: string;
  // English — vowels
  englishVowelsNodeId: string;
  englishVowelsIntroLessonId: string;
  // English — CVC words
  cvcNodeId: string;
  cvcIntroLessonId: string;
}

export async function seedAllQuestions(context: QuestionSeedContext): Promise<void> {
  console.log('Seeding questions...');
  await seedVowelQuestions(context.vowelsNodeId, context.vowelsIntroLessonId);
  await seedConsonantQuestions(context.consonantsNodeId, context.consonantsIntroLessonId);
  await seedEnglishVocabBasics(context.dictionaryMiniAppId);
  await seedEnglishVowelQuestions(context.englishVowelsNodeId, context.englishVowelsIntroLessonId);
  await seedCvcWordsQuestions(context.cvcNodeId, context.cvcIntroLessonId);
  await seedDragIntroQuestions(context.dragNodeId, context.dragIntroLessonId);
  await seedCountingQuestions(context.countingNodeId, context.countingIntroLessonId);
}
