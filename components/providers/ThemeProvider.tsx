'use client';

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
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
const listeners = new Set<() => void>();

function isTheme(value: string | null | undefined): value is Theme {
  return value === 'dark' || value === 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function readThemeSnapshot(): Theme {
  if (typeof document === 'undefined') {
    return 'dark';
  }

  const currentTheme = document.documentElement.dataset.theme;
  if (isTheme(currentTheme)) {
    return currentTheme;
  }

  try {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (isTheme(storedTheme)) {
      return storedTheme;
    }
  } catch {}

  return 'dark';
}

function emitThemeChange() {
  listeners.forEach((listener) => listener());
}

function subscribeToTheme(listener: () => void) {
  listeners.add(listener);

  if (typeof window !== 'undefined') {
    const handleStorage = () => listener();
    window.addEventListener('storage', handleStorage);

    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', handleStorage);
    };
  }

  return () => {
    listeners.delete(listener);
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore<Theme>(
    subscribeToTheme,
    readThemeSnapshot,
    () => 'dark'
  );

  const setTheme = (nextTheme: Theme) => {
    applyTheme(nextTheme);

    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {}

    emitThemeChange();
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
