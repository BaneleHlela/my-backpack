// Shared helpers for a quiz item's "grade settings" — the teacher-configured passingScore
// (minimum score ratio to pass) and starThresholds (score ratio -> stars awarded) that live on
// a RoadmapNode.items[] quiz ref (see INodeItemRef in roadmapNode.model.ts). Used by
// modules/studio/quiz.service.ts (read, for the QuizEditorPage's Grade Settings section) and
// modules/roadmap/roadmap.service.ts (write, when a quiz item is completed).
import { IStarThreshold } from '../models/learning/roadmapNode.model';

// Reproduces the pre-existing hardcoded scale (100% -> 3 stars, 85% -> 2 stars, passingScore ->
// 1 star) so quiz items authored before grade settings existed keep their exact prior behavior
// with no data migration needed.
export const DEFAULT_PASSING_SCORE = 0.7;

export function defaultStarThresholds(passingScore: number): IStarThreshold[] {
  return [
    { minScore: 1.0, stars: 3 },
    { minScore: 0.85, stars: 2 },
    { minScore: passingScore, stars: 1 },
  ];
}

// Always-defined grade settings for a quiz item, falling back to the historical defaults above
// when the teacher hasn't set anything custom.
export function resolveGradeSettings(
  passingScore: number | undefined,
  starThresholds: IStarThreshold[] | undefined
): { passingScore: number; starThresholds: IStarThreshold[] } {
  const resolvedPassingScore = passingScore ?? DEFAULT_PASSING_SCORE;
  const resolvedThresholds =
    starThresholds && starThresholds.length > 0 ? starThresholds : defaultStarThresholds(resolvedPassingScore);
  return { passingScore: resolvedPassingScore, starThresholds: resolvedThresholds };
}

// Stars awarded for a given scoreRatio (0-1), highest-qualifying tier wins. Only called after a
// passing check elsewhere — a scoreRatio below every tier (e.g. a custom scale that doesn't
// bottom out at passingScore) returns 0 rather than throwing.
export function computeStars(
  scoreRatio: number,
  passingScore: number | undefined,
  starThresholds: IStarThreshold[] | undefined
): number {
  const resolved = resolveGradeSettings(passingScore, starThresholds).starThresholds;
  const sorted = resolved.slice().sort((a, b) => b.minScore - a.minScore);
  for (const tier of sorted) {
    if (scoreRatio >= tier.minScore) return Math.max(0, Math.min(3, Math.round(tier.stars)));
  }
  return 0;
}
