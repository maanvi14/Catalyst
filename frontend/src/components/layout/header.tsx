import { Bell, Search } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:px-6">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-text">Workflow Intelligence Platform</p>
        <p className="truncate text-xs text-subtle">Oracle Transportation Management 26B</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="hidden h-10 items-center gap-2 rounded-md border border-border bg-muted px-3 text-sm text-subtle md:inline-flex"
          type="button"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Search modules
        </button>
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted text-text"
          type="button"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
        </button>
        <ThemeSwitcher />
      </div>
    </header>
  );
}

