"use client";

import { Check, Moon, Palette, Sun } from "lucide-react";
import { KSAPColor, KSAPMode, KSAPStyle } from "@/theme/ksap-tokens";
import { useKSAPTheme } from "@/providers/ksap-theme-provider";

const colorLabels: Record<KSAPColor, { label: string; swatch: string }> = {
  redwood: { label: "Redwood", swatch: "#C74634" },
  blue: { label: "Blue", swatch: "#0056B3" },
  white: { label: "White", swatch: "#FFFFFF" },
  "royal-blue": { label: "Royal Blue", swatch: "#1E40AF" },
  cyan: { label: "Cyan", swatch: "#0891B2" },
  violet: { label: "Violet", swatch: "#7C3AED" }
};

export function ThemeSwitcher() {
  const { style, color, mode, setStyle, setColor, setMode, colorsForStyle } = useKSAPTheme();

  return (
    <div className="group relative">
      <button
        className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-muted px-3 text-sm font-medium text-text transition hover:bg-[var(--rw-neutral-40)] focus:outline-none focus:ring-2 focus:ring-primary"
        type="button"
        aria-label="Open theme switcher"
      >
        <Palette className="h-4 w-4" aria-hidden="true" />
        <span className="hidden md:inline">
          {style === "modern" ? "Modern" : "Redwood"} / {mode === "dark" ? "Dark" : "Light"}
        </span>
      </button>
      <div className="invisible absolute right-0 top-12 z-50 w-80 rounded-lg border border-border bg-surface p-4 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <ThemeSection label="Style">
          <div className="grid grid-cols-2 gap-2">
            {(["modern", "redwood"] satisfies KSAPStyle[]).map((option) => (
              <button
                key={option}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium text-text data-[active=true]:border-primary data-[active=true]:bg-primary data-[active=true]:text-white"
                data-active={style === option}
                type="button"
                onClick={() => setStyle(option)}
              >
                {option === "modern" ? "Modern" : "Redwood"}
              </button>
            ))}
          </div>
        </ThemeSection>
        <ThemeSection label="Color">
          <div className="grid grid-cols-3 gap-2">
            {colorsForStyle.map((option) => (
              <button
                key={option}
                className="flex h-20 flex-col items-center justify-center gap-1 rounded-md border border-border bg-muted text-xs font-medium text-text data-[active=true]:border-primary"
                data-active={color === option}
                type="button"
                onClick={() => setColor(option)}
              >
                <span
                  className="h-5 w-5 rounded-full border border-border"
                  style={{ backgroundColor: colorLabels[option].swatch }}
                  aria-hidden="true"
                />
                {colorLabels[option].label}
                {color === option ? <Check className="h-3 w-3 text-primary" aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
        </ThemeSection>
        <ThemeSection label="Mode">
          <div className="grid grid-cols-2 gap-2">
            {(["light", "dark"] satisfies KSAPMode[]).map((option) => {
              const Icon = option === "light" ? Sun : Moon;

              return (
                <button
                  key={option}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-text data-[active=true]:border-primary data-[active=true]:bg-primary data-[active=true]:text-white"
                  data-active={mode === option}
                  type="button"
                  onClick={() => setMode(option)}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {option === "light" ? "Light" : "Dark"}
                </button>
              );
            })}
          </div>
        </ThemeSection>
      </div>
    </div>
  );
}

function ThemeSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-subtle">{label}</p>
      {children}
    </div>
  );
}

