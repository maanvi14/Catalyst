import { EmptyState } from "@/components/shared/empty-state";

interface ModulePlaceholderProps {
  title: string;
  description?: string;
}

export function ModulePlaceholder({ title, description }: ModulePlaceholderProps) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">Foundation Route</p>
        <h1 className="mt-2 text-2xl font-semibold text-text">{title}</h1>
      </div>
      <EmptyState
        title={`${title} overview`}
        description={
          description ??
          "The route, layout, navigation, and API boundaries are established."
        }
      />
    </section>
  );
}

