import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-6 text-center">
      <Inbox className="mb-3 h-8 w-8 text-subtle" aria-hidden="true" />
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-subtle">{description}</p>
    </div>
  );
}

