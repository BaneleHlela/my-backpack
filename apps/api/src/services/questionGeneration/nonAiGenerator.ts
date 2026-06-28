// Generates all non-AI questions for a term+definition pair.
// Returns plain question objects (not saved) — the orchestrator handles saving.
// Some questions may be flagged with needsAiSentence: true when no example sentence exists;
// the orchestrator passes that flag to aiGenerator.ts to generate the sentence via AI.
import { IDefinitionDocument } from '../../models/apps/language/vocabulary/definition.model';
import { ITermDocument } from '../../models/apps/language/vocabulary/term.model';
import { QuestionType, QuestionSource } from '../../models/apps/language/vocabulary/question.model';
import { IQuestionContent } from '../../modules/question/question.types';

export type GeneratedQuestion = {
  type: QuestionType;
  content: IQuestionContent;
  maxPoints: number;
  source: QuestionSource;
  needsAiSentence?: boolean;
};

// Text-based questions get minimal helpers — no audio reading, autoSubmit, no hints.
const textHelpers: IQuestionContent['defaultHelpers'] = {
  autoReadPrompt: false,
  autoReadOptions: false,
  autoSubmit: true,
  hintsAllowed: 0,
  hintDelaySeconds: 0,
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function generateNonAiQuestions(
  term: ITermDocument,
  definition: IDefinitionDocument,
  distractorDefs: IDefinitionDocument[],
  distractorTerms: ITermDocument[]
): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];
  const word = term.word;

  // MCQ-1: show term, select correct definition
  questions.push({
    type: 'mcq_term_to_def',
    maxPoints: 4,
    source: 'auto',
    content: {
      prompt: `What is the correct definition of "${word}"?`,
      options: shuffle([definition.definition, ...distractorDefs.map((d) => d.definition)]).slice(0, 4),
      correctAnswer: definition.definition,
      defaultHelpers: textHelpers,
    },
  });

  // MCQ-2: show definition, select correct term
  questions.push({
    type: 'mcq_def_to_term',
    maxPoints: 4,
    source: 'auto',
    content: {
      prompt: `${definition.definition}\n\nWhich word matches this definition?`,
      options: shuffle([word, ...distractorTerms.map((t) => t.word)]).slice(0, 4),
      correctAnswer: word,
      defaultHelpers: textHelpers,
    },
  });

  // TF-1 true version: term + definition match
  questions.push({
    type: 'true_false_term_def',
    maxPoints: 2,
    source: 'auto',
    content: {
      prompt: `True or false: "${word}" means "${definition.definition}"`,
      options: ['True', 'False'],
      correctAnswer: 'True',
      defaultHelpers: textHelpers,
    },
  });

  // TF-1 false version: term + wrong definition (skip if no distractor)
  if (distractorDefs[0]) {
    questions.push({
      type: 'true_false_term_def',
      maxPoints: 2,
      source: 'auto',
      content: {
        prompt: `True or false: "${word}" means "${distractorDefs[0].definition}"`,
        options: ['True', 'False'],
        correctAnswer: 'False',
        defaultHelpers: textHelpers,
      },
    });
  }

  // TF-2 true version: definition + correct term match
  questions.push({
    type: 'true_false_def_term',
    maxPoints: 2,
    source: 'auto',
    content: {
      prompt: `True or false: The word that means "${definition.definition}" is "${word}"`,
      options: ['True', 'False'],
      correctAnswer: 'True',
      defaultHelpers: textHelpers,
    },
  });

  // TF-2 false version: definition + wrong term (skip if no distractor)
  if (distractorTerms[0]) {
    questions.push({
      type: 'true_false_def_term',
      maxPoints: 2,
      source: 'auto',
      content: {
        prompt: `True or false: The word that means "${definition.definition}" is "${distractorTerms[0].word}"`,
        options: ['True', 'False'],
        correctAnswer: 'False',
        defaultHelpers: textHelpers,
      },
    });
  }

  // TI-1: shown definition, type the term
  questions.push({
    type: 'text_input_def',
    maxPoints: 5,
    source: 'auto',
    content: {
      prompt: `${definition.definition}\n\nType the word that matches this definition.`,
      correctAnswer: word,
      defaultHelpers: textHelpers,
    },
  });

  // TI-2: hear audio, type the term (only if audio exists)
  if (term.audioUrl) {
    questions.push({
      type: 'text_input_audio',
      maxPoints: 5,
      source: 'auto',
      content: {
        prompt: 'Listen to the audio and type the word you hear.',
        correctAnswer: word,
        defaultHelpers: textHelpers,
      },
    });
  }

  // MCQ-5, FIB-1, TI-3 share a sentence
  const exampleSentence = definition.examples?.[0] ?? null;

  if (exampleSentence) {
    const sentenceWithBlank = exampleSentence.replace(new RegExp(word, 'gi'), '___');

    // MCQ-5: fill blank, select correct word
    questions.push({
      type: 'mcq_fill_blank',
      maxPoints: 4,
      source: 'auto',
      content: {
        prompt: `Fill in the blank:\n\n${sentenceWithBlank}`,
        options: shuffle([word, ...distractorTerms.slice(0, 3).map((t) => t.word)]).slice(0, 4),
        correctAnswer: word,
        defaultHelpers: textHelpers,
      },
    });

    // FIB-1: fill blank, type exact word
    questions.push({
      type: 'fill_blank_typed',
      maxPoints: 6,
      source: 'auto',
      content: {
        prompt: `Fill in the blank (type the exact word):\n\n${sentenceWithBlank}`,
        correctAnswer: word,
        defaultHelpers: textHelpers,
      },
    });

    // TI-3: complete sentence by typing missing word
    questions.push({
      type: 'text_input_example',
      maxPoints: 5,
      source: 'auto',
      content: {
        prompt: `Complete the sentence by typing the missing word:\n\n${sentenceWithBlank}`,
        correctAnswer: word,
        defaultHelpers: textHelpers,
      },
    });
  } else {
    // Flag these three as needing an AI-generated sentence
    questions.push({
      type: 'mcq_fill_blank',
      maxPoints: 4,
      source: 'auto',
      needsAiSentence: true,
      content: { prompt: '', correctAnswer: word, defaultHelpers: textHelpers },
    });
    questions.push({
      type: 'fill_blank_typed',
      maxPoints: 6,
      source: 'auto',
      needsAiSentence: true,
      content: { prompt: '', correctAnswer: word, defaultHelpers: textHelpers },
    });
    questions.push({
      type: 'text_input_example',
      maxPoints: 5,
      source: 'auto',
      needsAiSentence: true,
      content: { prompt: '', correctAnswer: word, defaultHelpers: textHelpers },
    });
  }

  return questions;
}
