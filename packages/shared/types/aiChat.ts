// Shared types for Course Chat's AI Helper.
// Mirrors aiChatMessage.model.ts.

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
