// Design tokens for My Backpack. Single source of truth for colour, spacing,
// radius, and typography values used across apps/web and apps/mobile.
// Mirrors docs/design/brand-guide.md — update both together.
//
// Values are lifted from the palette already in organic use across
// apps/web (grep for violet-/amber-/emerald-/rose- classes) — this file
// formalises what was already the de facto brand palette, it doesn't invent
// a new one.

export const colors = {
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

  surface: {
    glass: 'rgba(255,255,255,0.4)', // standard glass card fill
    glassSoft: 'rgba(255,255,255,0.3)', // secondary glass fill
    glassStrong: 'rgba(255,255,255,0.6)', // hover/pressed glass fill
    border: 'rgba(255,255,255,0.5)', // glass card border
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
