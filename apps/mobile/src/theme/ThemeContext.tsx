import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { lightColors, darkColors } from '@my-backpack/shared';
import { getThemePreference, saveThemePreference } from '../lib/secureStore';

export type ThemeName = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeName;
  colors: typeof lightColors;
  // false only for the brief window between mount and the SecureStore read below resolving —
  // AuthBootstrap (app/_layout.tsx) folds this into its existing isCheckingAuth/fontsReady
  // splash gate so the app never paints a frame in the default theme before flipping to a
  // saved light preference.
  isReady: boolean;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Dark is the default until a persisted preference is read back from SecureStore on mount.
// Toggled from ProfileSwitcherModal's row above the Sign out button (see secureStore.ts for
// why this is a device-level preference, not synced through Profile.preferences.theme).
const DEFAULT_THEME: ThemeName = 'dark';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getThemePreference().then((saved) => {
      if (cancelled) return;
      if (saved) setThemeState(saved);
      setIsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = (next: ThemeName) => {
    setThemeState(next);
    void saveThemePreference(next);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      colors: theme === 'dark' ? darkColors : lightColors,
      isReady,
      setTheme,
      toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    }),
    [theme, isReady],
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
