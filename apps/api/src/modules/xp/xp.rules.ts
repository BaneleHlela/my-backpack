import type { XpAward } from '@my-backpack/shared';

export function calculateXp(input: {
  earned: number;
  available: number;
  completed: boolean;
  allQuestionsRecorded: boolean;
  playModeId?: string;
  timeLimit?: number;
}): XpAward {
  const base = Number.isFinite(input.earned) ? Math.max(0, input.earned) : 0;
  let bonusReason: XpAward['bonusReason'] = 'below-threshold';
  let bonusRate = 0;
  if (!input.completed || !input.allQuestionsRecorded) bonusReason = 'incomplete';
  else if ((input.playModeId && input.playModeId !== 'classic') || (input.timeLimit ?? 0) > 0) {
    bonusReason = 'mode-ineligible';
  } else if (input.available > 0) {
    // Do not use the rounded display percentage: 74.6% must not qualify for 75%.
    const ratio = base / input.available;
    bonusRate = ratio >= 1 ? 0.25 : ratio >= 0.9 ? 0.2 : ratio >= 0.75 ? 0.1 : 0;
    if (bonusRate > 0) bonusReason = 'performance';
  }
  const bonus = Math.round(base * bonusRate);
  return { base, bonus, total: base + bonus, bonusRate, bonusReason };
}
