'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'dark' | 'light';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = 'cluster-theme';
const ThemeContext = createContext<ThemeContextValue | null>(null);
const DEFAULT_THEME: Theme = 'light';

function isTheme(value: string | null | undefined): value is Theme {
  return value === 'dark' || value === 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function readStoredTheme(): Theme | null {
  try {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (isTheme(storedTheme)) {
      return storedTheme;
    }
  } catch {}

  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const nextTheme = readStoredTheme() ?? DEFAULT_THEME;
    setThemeState(nextTheme);
    applyTheme(nextTheme);

    const handleStorage = () => {
      const syncedTheme = readStoredTheme() ?? DEFAULT_THEME;
      setThemeState(syncedTheme);
      applyTheme(syncedTheme);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    applyTheme(nextTheme);

    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {}
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
