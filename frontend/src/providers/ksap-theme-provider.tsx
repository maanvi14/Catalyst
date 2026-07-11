"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  KSAPColor,
  KSAPMode,
  KSAPStyle,
  KSAPThemeKey,
  ksapTokens,
  validColors
} from "@/theme/ksap-tokens";

interface KSAPThemeContextValue {
  style: KSAPStyle;
  color: KSAPColor;
  mode: KSAPMode;
  setStyle: (style: KSAPStyle) => void;
  setColor: (color: KSAPColor) => void;
  setMode: (mode: KSAPMode) => void;
  isModern: boolean;
  isDark: boolean;
  colorsForStyle: KSAPColor[];
}

const STORAGE_KEYS = {
  style: "ksap-style",
  color: "ksap-color",
  mode: "ksap-mode"
} as const;

const defaultTheme = {
  style: "modern" as KSAPStyle,
  color: "violet" as KSAPColor,
  mode: "dark" as KSAPMode
};

const KSAPThemeContext = createContext<KSAPThemeContextValue | undefined>(undefined);

function readStoredValue<T extends string>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  return (window.localStorage.getItem(key) as T | null) ?? fallback;
}

export function KSAPThemeProvider({ children }: { children: React.ReactNode }) {
  const [style, setStyleState] = useState<KSAPStyle>(defaultTheme.style);
  const [color, setColorState] = useState<KSAPColor>(defaultTheme.color);
  const [mode, setModeState] = useState<KSAPMode>(defaultTheme.mode);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const nextStyle = readStoredValue(STORAGE_KEYS.style, defaultTheme.style);
    const nextColor = readStoredValue(STORAGE_KEYS.color, defaultTheme.color);
    const nextMode = readStoredValue(STORAGE_KEYS.mode, defaultTheme.mode);
    const supportedColor = validColors[nextStyle]?.includes(nextColor) ? nextColor : validColors[nextStyle][0];

    setStyleState(nextStyle);
    setColorState(supportedColor);
    setModeState(nextMode);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const key = `${style}-${color}-${mode}` as KSAPThemeKey;
    const tokens = ksapTokens[key] ?? ksapTokens["modern-violet-dark"];
    const root = document.documentElement;

    Object.entries(tokens).forEach(([name, value]) => root.style.setProperty(name, value));
    root.dataset.ksapStyle = style;
    root.dataset.ksapColor = color;
    root.dataset.ksapMode = mode;
    root.classList.toggle("dark", mode === "dark");
  }, [style, color, mode]);

  const value = useMemo<KSAPThemeContextValue>(
    () => ({
      style,
      color,
      mode,
      setStyle: (nextStyle) => {
        const nextColor = validColors[nextStyle][0];
        setStyleState(nextStyle);
        setColorState(nextColor);
        window.localStorage.setItem(STORAGE_KEYS.style, nextStyle);
        window.localStorage.setItem(STORAGE_KEYS.color, nextColor);
      },
      setColor: (nextColor) => {
        if (!validColors[style].includes(nextColor)) {
          return;
        }

        setColorState(nextColor);
        window.localStorage.setItem(STORAGE_KEYS.color, nextColor);
      },
      setMode: (nextMode) => {
        setModeState(nextMode);
        window.localStorage.setItem(STORAGE_KEYS.mode, nextMode);
      },
      isModern: style === "modern",
      isDark: mode === "dark",
      colorsForStyle: validColors[style]
    }),
    [style, color, mode]
  );

  return (
    <KSAPThemeContext.Provider value={value}>
      <div suppressHydrationWarning>{isHydrated ? children : children}</div>
    </KSAPThemeContext.Provider>
  );
}

export function useKSAPTheme() {
  const context = useContext(KSAPThemeContext);

  if (!context) {
    throw new Error("useKSAPTheme must be used within KSAPThemeProvider");
  }

  return context;
}

