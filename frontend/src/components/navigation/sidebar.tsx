"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-border bg-surface lg:block">
      <div className="flex h-16 items-center border-b border-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">C</div>
        <div className="ml-3">
          <p className="text-sm font-semibold text-text">Catalyst</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">OTM 26B</p>
        </div>
      </div>
      <nav className="space-y-1 px-3 py-4" aria-label="Primary navigation">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || (pathname === "/" && item.href === "/dashboard");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-subtle transition hover:bg-muted hover:text-text data-[active=true]:bg-muted data-[active=true]:text-text"
              data-active={isActive}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="absolute bottom-4 left-3 right-3 rounded-lg border border-border bg-muted p-3">
        <p className="text-xs text-subtle">Foundation</p>
        <p className="mt-1 text-sm font-semibold text-[var(--rw-status-success)]">API shell connected</p>
      </div>
    </aside>
  );
}

