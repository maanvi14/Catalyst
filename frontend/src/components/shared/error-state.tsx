import { CircleAlert } from "lucide-react";

export function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-border bg-surface px-6 text-center">
      <CircleAlert className="mb-3 h-8 w-8 text-[var(--rw-status-error)]" aria-hidden="true" />
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-subtle">{description}</p>
    </div>
  );
}

