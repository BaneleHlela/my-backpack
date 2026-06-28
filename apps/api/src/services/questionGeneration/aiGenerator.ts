// Generates AI-powered questions (usage, correct/incorrect, true/false) via the Anthropic API.
// Also generates an example sentence for fill-blank questions when needsSentence is true.
// Returns plain question objects (not saved) — the orchestrator handles saving.
import Anthropic from '@anthropic-ai/sdk';
import { IDefinitionDocument } from '../../models/apps/language/vocabulary/definition.model';
import { ITermDocument } from '../../models/apps/language/vocabulary/term.model';
import { IQuestionContent } from '../../modules/question/question.types';
import { GeneratedQuestion } from './nonAiGenerator';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// Text-based questions get minimal helpers — consistent with nonAiGenerator.
const textHelpers: IQuestionContent['defaultHelpers'] = {
  autoReadPrompt: false,
  autoReadOptions: false,
  autoSubmit: true,
  hintsAllowed: 0,
  hintDelaySeconds: 0,
};

// Parsed shape returned by the AI for each question block.
interface AiQuestionBlock {
  type: string;
  prompt?: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  maxPoints?: number;
  sentence?: string;
}

export async function generateAiQuestions(
  term: ITermDocument,
  definition: IDefinitionDocument,
  needsSentence: boolean,
  distractorTerms: ITermDocument[]
): Promise<GeneratedQuestion[]> {
  const word = term.word;
  const sentenceJsonFragment = needsSentence
    ? `,{
    "type": "sentence_for_blank",
    "sentence": "the generated sentence"
  }`
    : '';

  const prompt = `You are generating vocabulary learning questions for an education app.

Word: ${word}
Part of speech: ${definition.partOfSpeech}
THIS SPECIFIC DEFINITION BEING TESTED: "${definition.definition}"
${definition.examples?.length ? `Example of this specific meaning: ${definition.examples.join(', ')}` : ''}
${definition.synonyms?.length ? `Synonyms for this specific meaning: ${definition.synonyms.join(', ')}` : ''}

IMPORTANT: This word may have multiple meanings. ALL questions must ONLY relate to this specific definition shown above. Do NOT use other meanings of this word in any options or sentences.

Generate the following questions and return ONLY a valid JSON array.
No preamble, no explanation, no markdown. Just the JSON array.

1. mcq_correct_usage:
Show 4 sentences. Exactly ONE uses "${word}" with the meaning: "${definition.definition}"
The other 3 sentences must use "${word}" INCORRECTLY for this specific meaning. They may use it in a grammatically valid way but with a different or wrong meaning, or in a context that doesn't match this definition.
Make wrong options plausible but clearly incorrect for THIS meaning.

2. mcq_incorrect_usage:
Show 4 sentences. Exactly ONE uses "${word}" incorrectly for the meaning: "${definition.definition}"
The other 3 use it correctly for this specific meaning.
Wrong options should be subtle — a slight misuse, wrong context, or the word forced where it doesn't naturally fit this meaning.

3. true_false_usage:
Write ONE sentence. Randomly decide if it correctly or incorrectly uses "${word}" with the meaning: "${definition.definition}"
Set correctAnswer "True" if correct usage, "False" if incorrect.
The sentence must be clearly about this specific definition, not other meanings.

${needsSentence ? `4. sentence_for_blank:
Generate ONE natural sentence that uses "${word}" to mean specifically: "${definition.definition}"
The word "${word}" must appear exactly once.
The sentence should make the meaning clear from context.
This will be used for fill-in-the-blank questions.` : ''}

Return this exact JSON structure:
[
  {
    "type": "mcq_correct_usage",
    "prompt": "Which sentence uses '${word}' to mean '${definition.definition}'?",
    "options": ["sentence1", "sentence2", "sentence3", "sentence4"],
    "correctAnswer": "the correct sentence exactly as it appears in options",
    "explanation": "why this sentence correctly matches this specific meaning",
    "maxPoints": 5
  },
  {
    "type": "mcq_incorrect_usage",
    "prompt": "Which sentence does NOT correctly use '${word}' to mean '${definition.definition}'?",
    "options": ["sentence1", "sentence2", "sentence3", "sentence4"],
    "correctAnswer": "the incorrect sentence exactly as it appears in options",
    "explanation": "why this usage is wrong for this specific meaning",
    "maxPoints": 7
  },
  {
    "type": "true_false_usage",
    "prompt": "True or false: In the following sentence, '${word}' is used to mean '${definition.definition}':\\n\\n\\"[sentence here]\\"",
    "options": ["True", "False"],
    "correctAnswer": "True or False",
    "explanation": "brief explanation tied to this specific meaning",
    "maxPoints": 3
  }${sentenceJsonFragment}
]

Double-check before returning:
- Do all sentences relate ONLY to the definition: "${definition.definition}"?
- Does mcq_correct_usage have EXACTLY one correct sentence?
- Does mcq_incorrect_usage have EXACTLY one incorrect sentence?
- Are all option strings non-empty?`;

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = message.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('');

  const clean = rawText
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  let parsed: AiQuestionBlock[];
  try {
    parsed = JSON.parse(clean) as AiQuestionBlock[];
  } catch {
    throw new Error(`AI returned invalid JSON: ${rawText.substring(0, 200)}`);
  }

  const sentenceEntry = parsed.find((q) => q.type === 'sentence_for_blank');
  const aiGeneratedSentence = sentenceEntry?.sentence ?? null;

  const questionBlocks = parsed.filter((q) => q.type !== 'sentence_for_blank');

  const results: GeneratedQuestion[] = questionBlocks.map((q) => ({
    type: q.type as GeneratedQuestion['type'],
    maxPoints: q.maxPoints ?? 5,
    source: 'ai' as const,
    content: {
      prompt: q.prompt ?? '',
      options: q.options,
      correctAnswer: q.correctAnswer ?? '',
      explanation: q.explanation,
      defaultHelpers: textHelpers,
    },
  }));

  // Build MCQ-5, FIB-1, TI-3 using the AI-generated sentence
  if (needsSentence && aiGeneratedSentence) {
    const sentenceWithBlank = aiGeneratedSentence.replace(new RegExp(word, 'gi'), '___');

    results.push({
      type: 'mcq_fill_blank',
      maxPoints: 4,
      source: 'ai',
      content: {
        prompt: `Fill in the blank:\n\n${sentenceWithBlank}`,
        options: shuffle([word, ...distractorTerms.slice(0, 3).map((t) => t.word)]).slice(0, 4),
        correctAnswer: word,
        defaultHelpers: textHelpers,
      },
    });

    results.push({
      type: 'fill_blank_typed',
      maxPoints: 6,
      source: 'ai',
      content: {
        prompt: `Fill in the blank (type the exact word):\n\n${sentenceWithBlank}`,
        correctAnswer: word,
        defaultHelpers: textHelpers,
      },
    });

    results.push({
      type: 'text_input_example',
      maxPoints: 5,
      source: 'ai',
      content: {
        prompt: `Complete the sentence by typing the missing word:\n\n${sentenceWithBlank}`,
        correctAnswer: word,
        defaultHelpers: textHelpers,
      },
    });
  }

  return results;
}
