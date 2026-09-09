// Maps the app's two brand fonts (packages/shared/constants/theme.ts's `fontFamilies` —
// Fredoka for display/headings, Nunito Sans for body copy — the single source of truth shared
// with apps/web) to the exact font names expo-font loads them under. RN has no equivalent of
// CSS's family + weight pairing for a statically-loaded font: @expo-google-fonts/* registers one
// fixed file per weight under its own weight-suffixed name (e.g. `Fredoka_700Bold`), so a plain
// `fontFamily: 'Fredoka'` would not resolve to anything. Keep this in sync with the weights
// loaded in app/_layout.tsx's `useFonts()` call — a weight referenced here that isn't loaded
// there silently falls back to the OS default font.
//
// `fonts.body.regular` is applied as the default for every `<Text>` in the app via
// src/components/AppText.tsx — import `Text` from there instead of 'react-native' everywhere.
// `fonts.display.*` is used explicitly, per-instance, for headings/short prominent labels
// (mirrors the old Chewy usage it replaced — see docs/technical/mobile-architecture.md's
// "Fonts" section).
export const fonts = {
  display: {
    regular: 'Fredoka_400Regular',
    medium: 'Fredoka_500Medium',
    semibold: 'Fredoka_600SemiBold',
    bold: 'Fredoka_700Bold',
  },
  body: {
    regular: 'NunitoSans_400Regular',
    medium: 'NunitoSans_500Medium',
    semibold: 'NunitoSans_600SemiBold',
    bold: 'NunitoSans_700Bold',
  },
} as const;
