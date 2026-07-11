"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/navigation/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWorkflowMap = pathname === "/workflow-map";

  return (
    <div className="min-h-screen bg-canvas text-text">
      <Sidebar />
      <div className="lg:pl-72">
        <Header />
        {isWorkflowMap ? (
          <main className="w-full h-[calc(100vh-4rem)] bg-[var(--color-surface,#111827)] flex flex-col overflow-hidden relative">
            {children}
          </main>
        ) : (
          <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">{children}</main>
        )}
      </div>
    </div>
  );
}

