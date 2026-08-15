// Shared retake-routing logic for Quiz History — used by both the history list (QuizHistoryEntry
// items) and the review screen (the enriched SessionReviewResult.session), which carry the same
// course/topic context fields structurally. Retake always reuses an existing, already-working
// player rather than duplicating session/progress logic:
//  - a roadmap Topic quiz retakes through the existing node/item quiz route (full progress/
//    unlock tracking, since the item is already unlocked from having been completed once)
//  - a Dictionary quiz retakes through the existing mini-app quiz route
//  - anything else (e.g. a course pool-mode session with no node, likely taken via mobile)
//    retakes through the generic QuizHistoryPlayPage
export interface RetakeTarget {
  contextType: 'course' | 'miniApp';
  contextSlug: string;
  subjectSlug: string;
  fieldSlug: string;
  nodeId: string | null;
  quizId?: string | null;
}

export function getRetakePath(entry: RetakeTarget): string | null {
  if (entry.nodeId && entry.contextType === 'course' && entry.quizId) {
    return `/subject/${entry.subjectSlug}/course/${entry.contextSlug}/node/${entry.nodeId}/quiz/${entry.quizId}`;
  }
  if (entry.contextType === 'miniApp') {
    return `/field/${entry.fieldSlug}/subject/${entry.subjectSlug}/miniapp/${entry.contextSlug}/quiz`;
  }
  if (entry.quizId) {
    return `/quiz-history/play/${entry.quizId}`;
  }
  return null;
}
