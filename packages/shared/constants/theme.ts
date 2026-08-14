// Design tokens for My Backpack. Single source of truth for colour, spacing,
// radius, and typography values used across apps/web and apps/mobile.
// Mirrors docs/design/brand-guide.md — update both together.
//
// Values are lifted from the palette already in organic use across
// apps/web (grep for violet-/amber-/emerald-/rose- classes) — this file
// formalises what was already the de facto brand palette, it doesn't invent
// a new one.

// Explicit (non-literal) type so lightColors/darkColors are interchangeable wherever a
// "current theme's colours" value is threaded through (see apps/mobile/src/theme/ThemeContext.tsx)
// — without this, each object's `as const` below would infer its own incompatible literal-string type.
export interface IThemeColors {
  background: string;
  primary: { light: string; DEFAULT: string; dark: string; darker: string };
  success: { light: string; DEFAULT: string; dark: string };
  warning: { light: string; DEFAULT: string; dark: string };
  error: { light: string; DEFAULT: string; dark: string };
  text: { primary: string; secondary: string; muted: string; faint: string };
  // Text colour for content rendered directly on a GlassCard/blurred surface. Unlike `text.*`
  // above (which flips for dark mode, since it's meant for the flat `background` colour),
  // `glassText.*` is identical in lightColors/darkColors — `surface.*` below is deliberately
  // unchanged between themes (a white-based translucent fill designed to sit over a wallpaper
  // image in both modes, per its own comment), so text sitting on top of it must stay on the
  // same dark-on-light grey scale in both themes too, or it goes illegible in dark mode. Always
  // use this — never `text.*` — for Text rendered inside a GlassCard.
  glassText: { primary: string; secondary: string; muted: string; faint: string };
  surface: { glass: string; glassSoft: string; glassStrong: string; border: string };
}

export const lightColors: IThemeColors = {
  background: '#fcfded', // warm cream — see brand-guide.md

  primary: {
    light: '#a78bfa', // violet-400
    DEFAULT: '#8b5cf6', // violet-500
    dark: '#7c3aed', // violet-600
    darker: '#6d28d9', // violet-700 — for text-on-light emphasis
  },

  success: {
    light: '#d1fae5', // emerald-100
    DEFAULT: '#10b981', // emerald-500
    dark: '#047857', // emerald-700
  },

  warning: {
    light: '#fef3c7', // amber-100
    DEFAULT: '#f59e0b', // amber-500
    dark: '#b45309', // amber-700
  },

  error: {
    light: '#ffe4e6', // rose-100
    DEFAULT: '#f43f5e', // rose-500
    dark: '#be123c', // rose-700
  },

  text: {
    primary: '#1f2937', // gray-800 — headings
    secondary: '#4b5563', // gray-600 — body text
    muted: '#9ca3af', // gray-400 — placeholders
    faint: '#d1d5db', // gray-300 — disabled/unavailable states
  },

  // Same values as `text.*` above in light mode — glass surfaces are dark-on-light here too.
  glassText: {
    primary: '#1f2937', // gray-800
    secondary: '#4b5563', // gray-600
    muted: '#9ca3af', // gray-400
    faint: '#d1d5db', // gray-300
  },

  surface: {
    glass: 'rgba(255,255,255,0.4)', // standard glass card fill
    glassSoft: 'rgba(255,255,255,0.3)', // secondary glass fill
    glassStrong: 'rgba(255,255,255,0.6)', // hover/pressed glass fill
    border: 'rgba(255,255,255,0.5)', // glass card border
  },
} as const;

// Dark variant — same semantic shape as lightColors. primary stays
// unchanged (the violet accent already reads fine on a dark surface);
// success/warning/error swap their `light` (backdrop) tone for a deep
// emerald-900/amber-900/rose-900 fill instead of the pale light-mode tint,
// `DEFAULT`/`dark` stay the same accent colours. surface.* is unchanged —
// the white-based glass opacities were designed to sit over a wallpaper
// image in both modes, not the flat `background` colour.
export const darkColors: IThemeColors = {
  background: '#1f2937', // gray-800

  primary: {
    light: '#a78bfa', // violet-400 — unchanged from light mode
    DEFAULT: '#8b5cf6', // violet-500
    dark: '#7c3aed', // violet-600
    darker: '#6d28d9', // violet-700
  },

  success: {
    light: '#064e3b', // emerald-900 (was emerald-100 in light mode)
    DEFAULT: '#10b981', // emerald-500 — unchanged
    dark: '#047857', // emerald-700 — unchanged
  },

  warning: {
    light: '#78350f', // amber-900 (was amber-100 in light mode)
    DEFAULT: '#f59e0b', // amber-500 — unchanged
    dark: '#b45309', // amber-700 — unchanged
  },

  error: {
    light: '#881337', // rose-900 (was rose-100 in light mode)
    DEFAULT: '#f43f5e', // rose-500 — unchanged
    dark: '#be123c', // rose-700 — unchanged
  },

  text: {
    primary: '#fcfded', // cream
    secondary: '#d1d5db', // gray-300
    muted: '#9ca3af', // gray-400
    faint: '#4b5563', // gray-600
  },

  // Deliberately identical to lightColors.glassText, not flipped — see the interface comment.
  // `text.*` above would put light-grey/cream text on the glass surface's still-light fill,
  // which is the "grey text invisible in dark mode" bug this token exists to avoid.
  glassText: {
    primary: '#1f2937',
    secondary: '#4b5563',
    muted: '#9ca3af',
    faint: '#d1d5db',
  },

  surface: {
    glass: 'rgba(255,255,255,0.4)', // unchanged — same white-based opacity as light mode
    glassSoft: 'rgba(255,255,255,0.3)',
    glassStrong: 'rgba(255,255,255,0.6)',
    border: 'rgba(255,255,255,0.5)',
  },
} as const;

export const radii = {
  sm: 8,
  md: 16,
  lg: 24, // the brand's default card radius (web's rounded-3xl)
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  bodyChild: 18, // brand-guide.md: minimum 18px body text for children
  body: 16,
  small: 13,
  heading: 24,
  headingLg: 28,
} as const;
