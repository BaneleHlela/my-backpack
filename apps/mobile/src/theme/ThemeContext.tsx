import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { lightColors, darkColors } from '@my-backpack/shared';

export type ThemeName = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeName;
  colors: typeof lightColors;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// No persistence or user toggle yet — there's no Settings screen to host one
// (see CLAUDE.md / mobile-architecture.md). Dark is the default active theme.
const ACTIVE_THEME: ThemeName = 'dark';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: ACTIVE_THEME,
      colors: ACTIVE_THEME === 'dark' ? darkColors : lightColors,
    }),
    [],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
