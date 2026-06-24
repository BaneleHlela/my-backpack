// Auto-generates a starter set of questions for a vocabulary term based on its definitions.
// Called the first time any profile adds a term to their bucket.
//
// Questions created per term (all with source: 'auto'):
//   — Up to 3 WORD→DEF questions, one per definition ordered by 'order' field
//   — 1 DEF→WORD question using the primary (order=0) definition
//   — 1 TRUE_FALSE question using a synonym (statement: true) or antonym (statement: false)
//     from the primary definition, skipped if neither is available
//
// generateAutoQuestions() is idempotent: if the term already has active questions it returns
// them immediately without creating duplicates.
import Question, { IQuestionDocument, DEFAULT_MAX_POINTS } from '../models/apps/language/vocabulary/question.model';
import Definition from '../models/apps/language/vocabulary/definition.model';
import Term from '../models/apps/language/vocabulary/term.model';

export async function generateAutoQuestions(termId: string): Promise<IQuestionDocument[]> {
  const existing = await Question.find({ termId, isActive: true });
  if (existing.length > 0) return existing;

  const term = await Term.findById(termId);
  if (!term) throw new Error('Term not found');

  const definitions = await Definition.find({ termId }).sort({ order: 1 }).limit(3);
  if (definitions.length === 0) return [];

  const questions: IQuestionDocument[] = [];
  const miniAppId = term.miniAppId;
  const word = term.word;

  // WORD→DEF — one per definition (up to 3)
  for (const def of definitions) {
    const q = new Question({
      termId,
      miniAppId,
      type: 'word_to_def',
      prompt: `What does "${word}" mean?`,
      correctAnswer: def.definition,
      explanation: def.examples[0] ? `Example: ${def.examples[0]}` : undefined,
      maxPoints: DEFAULT_MAX_POINTS['word_to_def'],
      pointsCanBePartial: false,
      source: 'auto',
    });
    await q.save();
    questions.push(q);
  }

  // DEF→WORD — primary definition only
  const primary = definitions[0];
  if (primary) {
    const q = new Question({
      termId,
      miniAppId,
      type: 'def_to_word',
      prompt: `Which word matches this definition: "${primary.definition}"?`,
      correctAnswer: word,
      maxPoints: DEFAULT_MAX_POINTS['def_to_word'],
      pointsCanBePartial: false,
      source: 'auto',
    });
    await q.save();
    questions.push(q);
  }

  // TRUE_FALSE — prefer synonym (true statement), fall back to antonym (false statement)
  const synonym = primary?.synonyms[0];
  const antonym = primary?.antonyms[0];

  if (synonym) {
    const q = new Question({
      termId,
      miniAppId,
      type: 'true_false',
      prompt: `"${synonym}" is a synonym of "${word}".`,
      options: ['true', 'false'],
      correctAnswer: 'true',
      explanation: `"${synonym}" and "${word}" share a similar meaning.`,
      maxPoints: DEFAULT_MAX_POINTS['true_false'],
      pointsCanBePartial: false,
      source: 'auto',
    });
    await q.save();
    questions.push(q);
  } else if (antonym) {
    const q = new Question({
      termId,
      miniAppId,
      type: 'true_false',
      prompt: `"${antonym}" is a synonym of "${word}".`,
      options: ['true', 'false'],
      correctAnswer: 'false',
      explanation: `"${antonym}" is actually an antonym of "${word}", not a synonym.`,
      maxPoints: DEFAULT_MAX_POINTS['true_false'],
      pointsCanBePartial: false,
      source: 'auto',
    });
    await q.save();
    questions.push(q);
  }

  return questions;
}
