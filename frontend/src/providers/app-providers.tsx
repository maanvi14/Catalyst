"use client";

import { KSAPThemeProvider } from "@/providers/ksap-theme-provider";
import { QueryProvider } from "@/providers/query-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <KSAPThemeProvider>
      <QueryProvider>{children}</QueryProvider>
    </KSAPThemeProvider>
  );
}

