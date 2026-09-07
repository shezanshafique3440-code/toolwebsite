'use client';

import * as React from 'react';

type Theme = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export const THEME_STORAGE_KEY = 'productpilot-theme';

/**
 * Inlined in <head> so the correct theme is applied before first paint and the
 * page never flashes the wrong surface colour.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

/**
 * The stored preference is external mutable state, so it is read through
 * `useSyncExternalStore` rather than mirrored into component state inside an
 * effect. That keeps server and client renders consistent and avoids the
 * cascading re-render that a state-sync effect would cause.
 */
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // `storage` fires when another tab changes the preference.
  window.addEventListener('storage', listener);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
    media.removeEventListener('change', listener);
  };
}

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  } catch {
    // Storage can be unavailable (private mode); fall back to the system theme.
    return 'system';
  }
}

function resolve(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Snapshots must be referentially stable, so the pair is cached and only
// rebuilt when the underlying values actually change.
let snapshot: { theme: Theme; resolvedTheme: 'light' | 'dark' } = { theme: 'system', resolvedTheme: 'light' };
const serverSnapshot: { theme: Theme; resolvedTheme: 'light' | 'dark' } = { theme: 'system', resolvedTheme: 'light' };

function getSnapshot() {
  const theme = readTheme();
  const resolvedTheme = resolve(theme);
  if (theme !== snapshot.theme || resolvedTheme !== snapshot.resolvedTheme) {
    snapshot = { theme, resolvedTheme };
  }
  return snapshot;
}

function getServerSnapshot() {
  return serverSnapshot;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, resolvedTheme } = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Keep the document class in step with the resolved theme.
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  }, [resolvedTheme]);

  const setTheme = React.useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage unavailable: the choice still applies for this page view.
    }
    notify();
  }, []);

  const value = React.useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
