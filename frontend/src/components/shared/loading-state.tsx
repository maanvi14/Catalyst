export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-lg border border-border bg-surface">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden="true" />
      <span className="ml-3 text-sm font-medium text-subtle">{label}</span>
    </div>
  );
}

