import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--rw-neutral-30)",
        surface: "var(--rw-neutral-0)",
        muted: "var(--rw-neutral-20)",
        border: "var(--rw-slate-border)",
        primary: "var(--rw-brand-primary)",
        text: "var(--rw-slate-primary)",
        subtle: "var(--rw-slate-secondary)",
        ai: "var(--rw-ai-accent)"
      },
      fontFamily: {
        sans: ["Inter", "Arial", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;

