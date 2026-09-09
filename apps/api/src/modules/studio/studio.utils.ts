// Shared helpers for the Content Studio CRUD modules (course/node/lesson/quiz/question).
export function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

// Mirrors apps/web/src/features/studio/utils/slug.ts — used server-side by the book-to-course
// pipeline (chapterIngestion.ts) to derive node slugs from AI-proposed chapter titles, since
// that flow has no admin-typed slug field to fall back on the way the hand-authoring UI does.
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
