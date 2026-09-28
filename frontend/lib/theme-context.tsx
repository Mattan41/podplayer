"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark";

/**
 * The palette is fixed until a second theme exists, so it is not part of the
 * state. Mode is orthogonal to the palette: Zorn carries a light and a dark
 * block in `frontend/app/globals.css`, and switching mode rotates tokens inside
 * that one theme rather than loading another skin. See `docs/DECISIONS.md`
 * entry 13.
 */
const THEME = "zorn";

type ThemeContextValue = {
  mode: ThemeMode;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/*
 * The `<html>` element is the source of truth for the mode, and the FOUC script
 * in `frontend/app/layout.tsx` is the only writer at load time. The provider is
 * therefore a subscriber to that external store rather than a mirrored
 * `useState`, which is also what the `react-hooks/set-state-in-effect` rule
 * asks for: an effect that synchronises React with an external system must
 * subscribe, not copy the value into state on mount.
 *
 * `localStorage` is deliberately not consulted here. The inline script is the
 * single place that resolves the persisted preference and the
 * `prefers-color-scheme` fallback, and reading it in a second place would let
 * the two sources disagree.
 */
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getModeSnapshot(): ThemeMode {
  return document.documentElement.dataset.mode === "dark" ? "dark" : "light";
}

/*
 * The server has no DOM, so the first client render is always "light" and
 * hydration matches the server markup. React re-reads `getModeSnapshot` right
 * after hydration and re-renders if the script resolved the other mode. Only
 * the toggle label changes at that point, never the colours: the CSS tokens
 * were already painted from `data-mode` before hydration.
 */
function getServerModeSnapshot(): ThemeMode {
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore(
    subscribe,
    getModeSnapshot,
    getServerModeSnapshot,
  );

  const toggleMode = useCallback(() => {
    const next: ThemeMode = getModeSnapshot() === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.dataset.theme = THEME;
    root.dataset.mode = next;
    localStorage.setItem("mode", next);
    for (const listener of listeners) {
      listener();
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, toggleMode }),
    [mode, toggleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

