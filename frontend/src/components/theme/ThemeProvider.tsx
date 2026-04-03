"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ThemeMode } from "@/lib/userPreferences";
import { getStoredTheme, setStoredTheme } from "@/lib/userPreferences";

type Ctx = {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setThemeState(getStoredTheme());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    setStoredTheme(theme);
    document.documentElement.dataset.theme = theme;
    document.body.style.background = "";
    document.body.style.color = "";
  }, [theme, ready]);

  const setTheme = useCallback((t: ThemeMode) => setThemeState(t), []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const c = useContext(ThemeContext);
  if (!c) throw new Error("useTheme must be used within ThemeProvider");
  return c;
}
