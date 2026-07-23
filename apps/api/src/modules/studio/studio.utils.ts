// Shared helpers for the Content Studio CRUD modules (course/node/lesson/quiz/question).
export function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}
