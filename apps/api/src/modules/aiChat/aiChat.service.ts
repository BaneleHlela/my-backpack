// Business logic for Course Chat's AI Helper — history fetch, per-profile rate limiting, and
// orchestrating a send-message turn. Also backs the book-to-course pipeline's Phase 4b
// (personal, on-demand practice questions) — see docs/content/book-to-course-design.md.
import { Types } from 'mongoose';
import AiChatMessage, { IAiChatMessageDocument } from '../../models/learning/aiChatMessage.model';
import Course from '../../models/core/course.model';
import Subject from '../../models/core/subject.model';
import ProfileRoadmapProgress, {
  INodeProgressEntry,
} from '../../models/learning/profileRoadmapProgress.model';
import Question, { IQuestionDocument } from '../../models/apps/language/vocabulary/question.model';
import { AppError } from '../../utils/AppError';
import { getAiChatReply, ChatContextMessage } from '../../services/aiChatHelper.service';
import { generateChapterQuestions } from '../../services/bookIngestion/chapterQuestions';
import { sliceChapterText } from '../../services/bookIngestion/chapterTextSlice';
import { ContentPrefs } from '../../middleware/ageGroup.middleware';
import {
  MAX_MESSAGE_LENGTH,
  CHAT_HISTORY_CONTEXT_LIMIT,
  CHAT_HISTORY_FETCH_LIMIT,
  COOLDOWN_MS,
  DAILY_MESSAGE_LIMIT,
  PRACTICE_QUESTIONS_PER_TURN,
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
    bookText: course.bookSource?.extractedText,
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

// ── Book-to-course pipeline, Phase 4b ─────────────────────
// Personal, on-demand practice questions for the AI Helper's "Quiz me on this chapter" chip.
// Treated as an ordinary AI Helper turn for rate-limiting (reuses checkRateLimit above) but
// does NOT write an AiChatMessage — this is a lightweight in-chat widget, not a chat turn.
// See docs/content/book-to-course-design.md.

// ProfileRoadmapProgress.currentNodeId is declared on the schema but is never set or read
// anywhere in roadmap.service.ts — dead field. The live "which node is the learner on" signal
// is nodeProgress: scan for the entry with status 'in_progress', taking the most recently
// attempted one if several qualify (there can be more than one node unlocked/in-progress at a
// time depending on unlockRequires branching).
function findCurrentNodeId(nodeProgress: Map<string, INodeProgressEntry> | undefined): string | null {
  if (!nodeProgress) return null;
  let best: { nodeId: string; lastAttemptAt: number } | null = null;
  for (const [nodeId, entry] of nodeProgress.entries()) {
    if (entry.status !== 'in_progress') continue;
    const ts = entry.lastAttemptAt ? new Date(entry.lastAttemptAt).getTime() : 0;
    if (!best || ts > best.lastAttemptAt) {
      best = { nodeId, lastAttemptAt: ts };
    }
  }
  return best?.nodeId ?? null;
}

// A start-of-book fallback slice, used only when the profile has no in_progress node yet (e.g.
// hasn't started the roadmap) — matches the prompt's "fall back to a slice from the start of
// bookSource.extractedText rather than failing the request" instruction.
const FALLBACK_SLICE_LENGTH = 20_000; // chars

export async function getPracticeQuestionsForProfile(
  profileId: string,
  courseId: string
): Promise<IQuestionDocument[]> {
  if (!Types.ObjectId.isValid(courseId)) throw new AppError('Invalid courseId', 400);

  const course = await Course.findOne({ _id: courseId, isActive: true });
  if (!course) throw new AppError('Course not found', 404);
  if (!course.bookSource?.extractedText) {
    throw new AppError('This course has no book attached — there is nothing to quiz on yet.', 400);
  }

  await checkRateLimit(profileId);

  const progress = await ProfileRoadmapProgress.findOne({ profileId, roadmapId: course.roadmapId });
  const currentNodeId = findCurrentNodeId(progress?.nodeProgress);

  const chapterText = currentNodeId
    ? await sliceChapterText(course.bookSource.extractedText, course.roadmapId.toString(), currentNodeId)
    : course.bookSource.extractedText.slice(0, FALLBACK_SLICE_LENGTH);

  const generated = await generateChapterQuestions(chapterText, PRACTICE_QUESTIONS_PER_TURN);
  if (generated.length === 0) {
    throw new AppError('Could not generate practice questions right now — try again shortly.', 502);
  }

  // Personal — isGeneric:false, profileId set — never added to the shared course-wide question
  // pool an idle "quiz me" tap could otherwise pollute for other learners (contrast with Phase
  // 4a's official generator, which saves isGeneric:true, profileId:null).
  return Question.insertMany(
    generated.map((q) => ({
      miniAppId: course._id,
      nodeId: currentNodeId ? new Types.ObjectId(currentNodeId) : undefined,
      type: q.type,
      content: q.content,
      maxPoints: q.maxPoints,
      pointsCanBePartial: false,
      source: 'ai' as const,
      isGeneric: false,
      profileId: new Types.ObjectId(profileId),
      isActive: true,
    }))
  );
}
