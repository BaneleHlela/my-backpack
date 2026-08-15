// Retake-routing helper for Quiz History — mirrors apps/web's
// features/quizHistory/quizHistoryLinks.ts, but mobile resolves straight to a router.push call
// (Expo Router's typed routes are objects, not URL strings) instead of returning a path string.
//
// Deliberately reuses the two existing session-start entry points rather than adding a third
// "start by quizId directly" path mobile doesn't otherwise need (quizSlice.ts intentionally only
// ports the thunks the real screens call — see its module comment):
//  - a roadmap Topic quiz (quizMode 'fixed' + a resolved nodeId) retakes through the same
//    /quiz/[itemId] route tapping it on the path would use, carrying its assignedPlayMode
//    exactly as a normal tap would (via encodeAssignedPlayMode) — so a retake reproduces the
//    same hearts/timer/streak session a teacher assigned, not a silently-ordinary one
//  - a Dictionary or course-pool quiz (quizMode 'dynamic'/'pool') retakes through Quiz Mode
//    Select (/quiz/modes/dictionary/[miniAppId]), same as "Take Quiz"/"Game Quizzes" always do
//  - anything else (e.g. an orphaned fixed quiz whose node was later deleted, or a session from
//    before QuizSession.quizId existed) has no retake target — canRetake is false and callers
//    should hide/disable the action, same graceful-degradation rule the web version follows
import type { useRouter } from 'expo-router';
import type { QuizMode, IAssignedPlayMode } from '@my-backpack/shared';
import { encodeAssignedPlayMode } from './quizPlayModes';

type Router = ReturnType<typeof useRouter>;

// Narrow shape rather than the full QuizHistoryEntry — both a list entry and the enriched
// SessionReviewResult.session (which carries the same context fields but under different
// top-level names, e.g. _id instead of sessionId) structurally satisfy this.
export interface RetakeTarget {
  quizId?: string | null;
  quizMode: QuizMode | null;
  assignedPlayMode: IAssignedPlayMode | null;
  nodeId: string | null;
  subjectSlug: string;
  contextSlug: string;
  contextId: string;
  contextName: string;
}

export function canRetake(entry: RetakeTarget): boolean {
  if (entry.nodeId && entry.quizId && entry.quizMode === 'fixed') return true;
  if (entry.quizMode === 'dynamic' || entry.quizMode === 'pool') return true;
  return false;
}

export function navigateToRetake(router: Router, entry: RetakeTarget): void {
  if (entry.nodeId && entry.quizId && entry.quizMode === 'fixed') {
    router.push({
      pathname: '/quiz/[itemId]',
      params: {
        itemId: entry.quizId,
        nodeId: entry.nodeId,
        subjectSlug: entry.subjectSlug,
        courseSlug: entry.contextSlug,
        play: encodeAssignedPlayMode(entry.assignedPlayMode),
      },
    });
    return;
  }
  if (entry.quizMode === 'dynamic' || entry.quizMode === 'pool') {
    router.push({
      pathname: '/quiz/modes/dictionary/[miniAppId]',
      params: { miniAppId: entry.contextId, name: entry.contextName },
    });
  }
}
