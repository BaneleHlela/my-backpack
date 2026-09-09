// Shared Haiku/Sonnet model-selection for AI calls over a book's full extracted text — used by
// suggestChapterStructure.ts (Phase 2b) and aiChatHelper.service.ts's book-grounded system
// prompt (Phase 5). A long book needs more room to reason across its whole text in one pass
// than Haiku comfortably gives, so calls over the threshold use Sonnet instead. Kept as one
// named constant so the cutover point is easy to tune later without hunting down every call
// site. See docs/content/book-to-course-design.md.
export const BOOK_TEXT_SONNET_TOKEN_THRESHOLD = 150_000;

export const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
export const SONNET_MODEL = 'claude-sonnet-5';

// Rough chars/4 heuristic — good enough for a threshold check, not billing.
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function pickModelForBookText(bookText?: string | null): string {
  if (!bookText) return HAIKU_MODEL;
  return estimateTokenCount(bookText) > BOOK_TEXT_SONNET_TOKEN_THRESHOLD ? SONNET_MODEL : HAIKU_MODEL;
}
