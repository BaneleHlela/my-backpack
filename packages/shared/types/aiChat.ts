// Shared types for Course Chat's AI Helper.
// Mirrors aiChatMessage.model.ts.
import type { IQuestion } from './question';

export type AiChatRole = 'user' | 'assistant';

export interface IAiChatMessage {
  _id: string;
  profileId: string;
  courseId: string;
  role: AiChatRole;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAiChatSendMessageResponse {
  userMessage: IAiChatMessage;
  assistantMessage: IAiChatMessage;
}

// Book-to-course pipeline, Phase 4b — response of POST /ai-chat/course/:courseId/
// practice-questions (the "Quiz me on this chapter" suggested action). Personal,
// on-demand questions rendered inline in the chat — never wrapped in a QuizSession. See
// docs/content/book-to-course-design.md.
export interface IPracticeQuestionsResponse {
  questions: IQuestion[];
}
