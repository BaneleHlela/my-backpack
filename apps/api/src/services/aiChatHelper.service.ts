// Generates the AI Helper's reply for one turn of a Course Chat conversation, via the Anthropic
// API. Same SDK/model as questionGeneration/aiGenerator.ts (Claude Haiku), but this call is
// synchronous and user-facing rather than fire-and-forget, so — unlike aiGenerator.ts — it wraps
// the API call in a try/catch and maps any failure to a 503 AppError rather than letting it
// propagate raw.
import Anthropic from '@anthropic-ai/sdk';
import { AppError } from '../utils/AppError';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-haiku-4-5-20251001';
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
}

function buildSystemPrompt({
  courseName,
  subjectName,
  simplifiedLanguage,
}: Pick<GetAiChatReplyArgs, 'courseName' | 'subjectName' | 'simplifiedLanguage'>): string {
  return `You are the AI Helper inside My Backpack, a learning app. You are chatting with a learner who is currently studying "${courseName}" (part of ${subjectName}).

You are a supportive, patient AI study helper — not a real teacher, and not a substitute for one. If asked whether you're a real person, be honest that you're an AI.

Stay focused on helping with this course's subject matter. If asked something unrelated or inappropriate, gently redirect the conversation back to the course without being preachy about it.

Keep replies focused and reasonably brief — this is a back-and-forth chat, not an essay.
${simplifiedLanguage ? '\nThis learner is a young child. Use short sentences, simple everyday words, and a warm, encouraging tone.' : ''}`;
}

export async function getAiChatReply({
  courseName,
  subjectName,
  simplifiedLanguage,
  history,
  userMessage,
}: GetAiChatReplyArgs): Promise<string> {
  const systemPrompt = buildSystemPrompt({ courseName, subjectName, simplifiedLanguage });

  let response;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_REPLY_TOKENS,
      system: systemPrompt,
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
