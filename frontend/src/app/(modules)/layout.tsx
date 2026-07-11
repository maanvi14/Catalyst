import { AppShell } from "@/components/layout/app-shell";

export default function ModulesLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

