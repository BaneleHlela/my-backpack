// Generates the AI Helper's reply for one turn of a Course Chat conversation, via the Anthropic
// API. Same SDK/model as questionGeneration/aiGenerator.ts (Claude Haiku), but this call is
// synchronous and user-facing rather than fire-and-forget, so — unlike aiGenerator.ts — it wraps
// the API call in a try/catch and maps any failure to a 503 AppError rather than letting it
// propagate raw.
//
// Book-grounding (added for the book-to-course pipeline, see
// docs/content/book-to-course-design.md): when the course has a book attached
// (course.bookSource.extractedText, threaded through from aiChat.service.ts's sendChatMessage),
// the book text is appended to the system prompt as its own cacheable content block so the AI
// Helper stays grounded in what the learner is actually reading. The block is placed BEFORE the
// per-turn persona/course-context block — cache_control breakpoints only help if the stable,
// expensive-to-reprocess content comes first in render order (system renders after tools,
// before messages) — see shared prompt-caching guidance. Model selection also switches to
// Sonnet for a long book via modelSelection.ts's shared threshold, reused (not redefined) from
// the Phase 2b chapter-structure call.
import Anthropic from '@anthropic-ai/sdk';
import { AppError } from '../utils/AppError';
import { pickModelForBookText } from './bookIngestion/modelSelection';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_REPLY_TOKENS = 500;

export interface ChatContextMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GetAiChatReplyArgs {
  courseName: string;
  subjectName: string;
  simplifiedLanguage: boolean;
  history: ChatContextMessage[]; // prior turns, already capped + chronologically ordered
  userMessage: string;
  // Set when the course has a book attached (Course.bookSource.extractedText) — see
  // docs/content/book-to-course-design.md.
  bookText?: string;
}

interface SystemTextBlock {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

function buildSystemPrompt({
  courseName,
  subjectName,
  simplifiedLanguage,
  bookText,
}: Pick<
  GetAiChatReplyArgs,
  'courseName' | 'subjectName' | 'simplifiedLanguage' | 'bookText'
>): SystemTextBlock[] {
  const blocks: SystemTextBlock[] = [];

  // Book text first, its own cacheable block — large and stable across every turn of this
  // course's chat, so it belongs before the smaller per-turn persona/context block below.
  if (bookText) {
    blocks.push({
      type: 'text',
      text: `--- BOOK CONTENT ---\nThe learner is reading the physical book below alongside the app. Stay grounded in it: answer from what it actually says, and when helpful, reference the specific part of the book the learner is asking about.\n\n${bookText}\n--- END BOOK CONTENT ---`,
      cache_control: { type: 'ephemeral' },
    });
  }

  blocks.push({
    type: 'text',
    text: `You are the AI Helper inside My Backpack, a learning app. You are chatting with a learner who is currently studying "${courseName}" (part of ${subjectName}).

You are a supportive, patient AI study helper — not a real teacher, and not a substitute for one. If asked whether you're a real person, be honest that you're an AI.

Stay focused on helping with this course's subject matter. If asked something unrelated or inappropriate, gently redirect the conversation back to the course without being preachy about it.

Keep replies focused and reasonably brief — this is a back-and-forth chat, not an essay.
${simplifiedLanguage ? '\nThis learner is a young child. Use short sentences, simple everyday words, and a warm, encouraging tone.' : ''}`,
  });

  return blocks;
}

export async function getAiChatReply({
  courseName,
  subjectName,
  simplifiedLanguage,
  history,
  userMessage,
  bookText,
}: GetAiChatReplyArgs): Promise<string> {
  const system = buildSystemPrompt({ courseName, subjectName, simplifiedLanguage, bookText });
  const model = pickModelForBookText(bookText);

  let response;
  try {
    response = await anthropic.messages.create({
      model,
      max_tokens: MAX_REPLY_TOKENS,
      system,
      messages: [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: userMessage },
      ],
    });
  } catch (err) {
    console.error('AI Helper request failed:', err);
    throw new AppError('The AI Helper is unavailable right now — please try again shortly.', 503);
  }

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('')
    .trim();

  if (!text) {
    throw new AppError('The AI Helper is unavailable right now — please try again shortly.', 503);
  }

  return text;
}
