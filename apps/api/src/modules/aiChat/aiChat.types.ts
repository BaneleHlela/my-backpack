// DTOs for /api/ai-chat.

export interface SendMessageDto {
  message: string;
}

export const MAX_MESSAGE_LENGTH = 2000;
export const CHAT_HISTORY_CONTEXT_LIMIT = 20; // turns sent to Claude as conversation context
export const CHAT_HISTORY_FETCH_LIMIT = 200; // defensive cap on a full history GET

export const COOLDOWN_MS = 5_000;
export const DAILY_MESSAGE_LIMIT = 50;
