// A small fixed accent-cycling palette for the colorful card treatments introduced in the
// August 2026 design pass (GradientListCard, MiniAppGridCard) — see
// docs/design motivations reference images (subjects_example_2, ideal_card_design_with_background_svg).
// Reuses the 4 existing theme semantic colors (primary/error/warning/success) so most of the
// palette stays inside the established design-token system, plus 2 hand-picked extra accents
// (sky, pink) added *only* here for card-cycling variety — not written into
// packages/shared/constants/theme.ts, since those aren't semantic colors used anywhere else.
// `accentIndex % ACCENT_PALETTE.length` is how callers pick a stable-but-varied color per card.
import type { IThemeColors } from '@my-backpack/shared';

export interface AccentTone {
  light: string;
  DEFAULT: string;
  dark: string;
}

const SKY: AccentTone = { light: '#7dd3fc', DEFAULT: '#0ea5e9', dark: '#0369a1' };
const PINK: AccentTone = { light: '#f9a8d4', DEFAULT: '#ec4899', dark: '#9d174d' };

export function getAccentPalette(colors: IThemeColors): AccentTone[] {
  return [colors.primary, colors.error, colors.warning, colors.success, SKY, PINK];
}

export function getAccent(colors: IThemeColors, index: number): AccentTone {
  const palette = getAccentPalette(colors);
  return palette[((index % palette.length) + palette.length) % palette.length];
}
