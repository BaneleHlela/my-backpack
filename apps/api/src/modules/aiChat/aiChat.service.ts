// Business logic for Course Chat's AI Helper — history fetch, per-profile rate limiting, and
// orchestrating a send-message turn.
import { Types } from 'mongoose';
import AiChatMessage, { IAiChatMessageDocument } from '../../models/learning/aiChatMessage.model';
import Course from '../../models/core/course.model';
import Subject from '../../models/core/subject.model';
import { AppError } from '../../utils/AppError';
import { getAiChatReply, ChatContextMessage } from '../../services/aiChatHelper.service';
import { ContentPrefs } from '../../middleware/ageGroup.middleware';
import {
  MAX_MESSAGE_LENGTH,
  CHAT_HISTORY_CONTEXT_LIMIT,
  CHAT_HISTORY_FETCH_LIMIT,
  COOLDOWN_MS,
  DAILY_MESSAGE_LIMIT,
} from './aiChat.types';

export async function getChatHistory(
  profileId: string,
  courseId: string
): Promise<IAiChatMessageDocument[]> {
  if (!Types.ObjectId.isValid(courseId)) throw new AppError('Invalid courseId', 400);

  // Most-recent-N, then flipped back to chronological order — a defensive cap, not real
  // pagination (not needed yet at this scale, per CLAUDE.md's keep-it-simple guidance).
  const messages = await AiChatMessage.find({ profileId, courseId })
    .sort({ createdAt: -1 })
    .limit(CHAT_HISTORY_FETCH_LIMIT);

  return messages.reverse();
}

// Both checks are per-profile (not per-course) and derived directly from this collection —
// no separate counter/Redis, since neither has an existing precedent in this codebase.
async function checkRateLimit(profileId: string): Promise<void> {
  const lastMessage = await AiChatMessage.findOne({ profileId, role: 'user' }).sort({
    createdAt: -1,
  });

  if (lastMessage && Date.now() - lastMessage.createdAt.getTime() < COOLDOWN_MS) {
    throw new AppError('Please wait a moment before sending another message.', 429);
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const countToday = await AiChatMessage.countDocuments({
    profileId,
    role: 'user',
    createdAt: { $gte: since },
  });

  if (countToday >= DAILY_MESSAGE_LIMIT) {
    throw new AppError("You've reached today's AI Helper message limit. Try again tomorrow.", 429);
  }
}

interface SendChatMessageArgs {
  profileId: string;
  courseId: string;
  message: string;
  contentPrefs: ContentPrefs;
}

interface SendChatMessageResult {
  userMessage: IAiChatMessageDocument;
  assistantMessage: IAiChatMessageDocument;
}

export async function sendChatMessage({
  profileId,
  courseId,
  message,
  contentPrefs,
}: SendChatMessageArgs): Promise<SendChatMessageResult> {
  const trimmed = message.trim();
  if (!trimmed) throw new AppError('message is required', 400);
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new AppError(`message must be ${MAX_MESSAGE_LENGTH} characters or fewer`, 400);
  }
  if (!Types.ObjectId.isValid(courseId)) throw new AppError('Invalid courseId', 400);

  const course = await Course.findOne({ _id: courseId, isActive: true });
  if (!course) throw new AppError('Course not found', 404);

  const subject = await Subject.findById(course.subjectId).select('name');
  if (!subject) throw new AppError('Subject not found', 404);

  await checkRateLimit(profileId);

  // Context sent to Claude is capped independently of the full persisted history, to keep
  // token cost/latency bounded even once a thread has grown large.
  const recentMessages = await AiChatMessage.find({ profileId, courseId })
    .sort({ createdAt: -1 })
    .limit(CHAT_HISTORY_CONTEXT_LIMIT);

  const history: ChatContextMessage[] = recentMessages
    .reverse()
    .map((m) => ({ role: m.role, content: m.content }));

  const replyText = await getAiChatReply({
    courseName: course.name,
    subjectName: subject.name,
    simplifiedLanguage: contentPrefs.simplifiedLanguage,
    history,
    userMessage: trimmed,
  });

  // Only persisted once the AI reply succeeds — avoids saving a user message with no reply
  // that the client would have no clean way to retry against.
  const userMessage = await AiChatMessage.create({
    profileId,
    courseId,
    role: 'user',
    content: trimmed,
  });
  const assistantMessage = await AiChatMessage.create({
    profileId,
    courseId,
    role: 'assistant',
    content: replyText,
  });

  return { userMessage, assistantMessage };
}
