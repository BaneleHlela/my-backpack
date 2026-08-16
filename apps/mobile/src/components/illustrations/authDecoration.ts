// Shared FloatingBlobs/FloatingSparkles specs for the full-bleed auth/profile screens (login,
// signup, select-profile, profile-setup) — one set of decoration constants so all four screens
// in the pre-app flow read as the same visual family instead of each inventing its own
// scattering. Colors are fixed hex (not theme tokens) since they're meant to read as a subtle
// tint over the gradient background in both light/dark themes, not flip with them.
import type { BlobSpec } from './FloatingBlobs';
import type { SparklePoint } from './FloatingSparkles';

export const AUTH_BLOBS: BlobSpec[] = [
  { top: '8%', right: '-10%', size: 180, color: 'rgba(139,92,246,0.25)', duration: 7000 },
  { bottom: '15%', left: '-15%', size: 220, color: 'rgba(244,63,94,0.15)', duration: 8500 },
  { top: '45%', left: '-8%', size: 120, color: 'rgba(16,185,129,0.12)', duration: 6000 },
];

export const AUTH_SPARKLES: SparklePoint[] = [
  { top: '12%', left: '15%', size: 18, color: '#fbbf24', delay: 0, duration: 1800, kind: 'star' },
  { top: '20%', left: '75%', size: 12, color: '#fff', delay: 400, duration: 2200, kind: 'dot' },
  { top: '60%', left: '85%', size: 16, color: '#a78bfa', delay: 800, duration: 2000, kind: 'star' },
  { top: '70%', left: '10%', size: 10, color: '#fff', delay: 1200, duration: 1900, kind: 'dot' },
];
