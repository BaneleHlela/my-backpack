// Auto-generates a starter set of questions for a specific definition of a vocabulary term.
// Called when a profile adds a definition to their bucket (fire-and-forget).
//
// This is the lightweight bootstrap generator. The full generic question set (with AI questions)
// is generated separately via services/questionGeneration/index.ts triggered from admin routes.
//
// Questions created per definition:
//   — 1 text_input_def: shown definition, type the term
//   — 1 mcq_term_to_def: show term, pick correct definition (requires 3 distractors)
//   — 1 true_false_term_def: synonym statement (true) or antonym statement (false)
import Question, { IQuestionDocument, DEFAULT_MAX_POINTS } from '../models/apps/language/vocabulary/question.model';
import Definition from '../models/apps/language/vocabulary/definition.model';
import Term from '../models/apps/language/vocabulary/term.model';

const textHelpers = {
  autoReadPrompt: false,
  autoReadOptions: false,
  autoSubmit: true,
  hintsAllowed: 0,
  hintDelaySeconds: 0,
};

export async function generateAutoQuestions(
  termId: string,
  definitionId: string
): Promise<IQuestionDocument[]> {
  const existing = await Question.find({ termId, definitionId, isActive: true });
  if (existing.length > 0) return existing;

  const term = await Term.findById(termId);
  if (!term) throw new Error('Term not found');

  const definition = await Definition.findById(definitionId);
  if (!definition) throw new Error('Definition not found');

  const questions: IQuestionDocument[] = [];
  const miniAppId = term.miniAppId;
  const word = term.word;

  // text_input_def — shown definition, type the term
  const textInput = new Question({
    termId,
    definitionId,
    miniAppId,
    type: 'text_input_def',
    maxPoints: DEFAULT_MAX_POINTS['text_input_def'],
    pointsCanBePartial: false,
    source: 'auto',
    content: {
      prompt: `${definition.definition}\n\nType the word that matches this definition.`,
      correctAnswer: word,
      explanation: definition.examples[0] ? `Example: ${definition.examples[0]}` : undefined,
      defaultHelpers: textHelpers,
    },
  });
  await textInput.save();
  questions.push(textInput);

  // true_false_term_def — prefer synonym (true), fall back to antonym (false)
  const synonym = definition.synonyms[0];
  const antonym = definition.antonyms[0];

  if (synonym) {
    const tf = new Question({
      termId,
      definitionId,
      miniAppId,
      type: 'true_false_term_def',
      maxPoints: DEFAULT_MAX_POINTS['true_false_term_def'],
      pointsCanBePartial: false,
      source: 'auto',
      content: {
        prompt: `True or false: "${synonym}" is a synonym of "${word}".`,
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: `"${synonym}" and "${word}" share a similar meaning.`,
        defaultHelpers: textHelpers,
      },
    });
    await tf.save();
    questions.push(tf);
  } else if (antonym) {
    const tf = new Question({
      termId,
      definitionId,
      miniAppId,
      type: 'true_false_term_def',
      maxPoints: DEFAULT_MAX_POINTS['true_false_term_def'],
      pointsCanBePartial: false,
      source: 'auto',
      content: {
        prompt: `True or false: "${antonym}" is a synonym of "${word}".`,
        options: ['True', 'False'],
        correctAnswer: 'False',
        explanation: `"${antonym}" is actually an antonym of "${word}", not a synonym.`,
        defaultHelpers: textHelpers,
      },
    });
    await tf.save();
    questions.push(tf);
  }

  // mcq_term_to_def — show term, pick correct definition; needs 3 distractors
  const otherSameTerm = await Definition.find({
    termId,
    _id: { $ne: definition._id },
  }).limit(3);

  let distractors = otherSameTerm.map((d) => d.definition);

  if (distractors.length < 3) {
    const needed = 3 - distractors.length;
    const otherTermDefs = await Definition.find({
      termId: { $ne: definition.termId },
    })
      .sort({ _id: -1 })
      .limit(needed);
    distractors = distractors.concat(otherTermDefs.map((d) => d.definition));
  }

  if (distractors.length >= 3) {
    const options = [definition.definition, ...distractors.slice(0, 3)].sort(
      () => Math.random() - 0.5
    );
    const mcq = new Question({
      termId,
      definitionId,
      miniAppId,
      type: 'mcq_term_to_def',
      maxPoints: DEFAULT_MAX_POINTS['mcq_term_to_def'],
      pointsCanBePartial: false,
      source: 'auto',
      content: {
        prompt: `What is the correct definition of "${word}"?`,
        options,
        correctAnswer: definition.definition,
        defaultHelpers: textHelpers,
      },
    });
    await mcq.save();
    questions.push(mcq);
  }

  return questions;
}
