"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowUpRight, RefreshCcw, Loader2 } from "lucide-react";
import { apiClient } from "@/services/api-client";
import { ConflictRead, ConflictDetail, ConflictAgentRead } from "@/types/api";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";

function ConflictsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const agentGidParam = searchParams.get("agent_gid");

  // Fetch conflicts list
  const { data: conflicts, isLoading, isError, refetch } = useQuery<ConflictRead[]>({
    queryKey: ["conflicts-list"],
    queryFn: () => apiClient.get<ConflictRead[]>("/conflicts")
  });

  const [expandedId, setExpandedId] = useState<string | null>("C-002");

  // Fetch conflict details dynamically when card is expanded
  const { data: conflictDetail, isLoading: isDetailLoading } = useQuery<ConflictDetail>({
    queryKey: ["conflict-detail", expandedId],
    queryFn: () => apiClient.get<ConflictDetail>(`/conflicts/${expandedId}`),
    enabled: expandedId !== null
  });

  // Handle URL deep link search filtering
  const filteredConflicts = useMemo(() => {
    if (!conflicts) return [];
    if (!agentGidParam) return conflicts;
    
    return conflicts.filter((c) =>
      c.affected_agents.some((a) => a.agent_gid === agentGidParam)
    );
  }, [conflicts, agentGidParam]);

  // Compute stats dynamically from the actual conflicts response
  const stats = useMemo(() => {
    if (!conflicts) return { critical: 0, warning: 0 };
    const critical = conflicts.filter((c) => c.severity === "high").length;
    const warning = conflicts.filter((c) => c.severity !== "high").length;
    return { critical, warning };
  }, [conflicts]);

  if (isLoading) {
    return <LoadingState label="Analyzing trigger conflicts" />;
  }

  if (isError || !conflicts) {
    return (
      <ErrorState
        title="Failed to load conflicts"
        description="Verify backend server connectivity."
      />
    );
  }

  return (
    <section className="space-y-6">
      
      {/* Header banner with dynamic counts */}
      <div className="rounded-[1.75rem] border border-border bg-[radial-gradient(circle_at_top_left,_rgba(248,113,113,0.15),_transparent_34%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(8,15,25,0.94))] p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Conflicts</p>
            <h1 className="mt-2 text-3xl font-semibold text-text md:text-5xl">
              {stats.critical} critical, {stats.warning} warning
            </h1>
            {agentGidParam && (
              <p className="mt-2 text-xs text-rose-300 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                Filtered by agent GID: {agentGidParam}
                <button
                  onClick={() => router.push("/conflicts")}
                  className="text-sky-300 hover:text-sky-100 hover:underline ml-2"
                >
                  Clear Filter
                </button>
              </p>
            )}
          </div>
          <button
            onClick={() => refetch()}
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white/5 px-4 py-2 text-sm font-semibold text-text hover:bg-white/10 transition"
          >
            <RefreshCcw className="h-4 w-4" />
            Re-scan now
          </button>
        </div>
      </div>

      {/* Accordion List of Conflicts */}
      <div className="space-y-4">
        {filteredConflicts.map((conflict) => {
          const isOpen = expandedId === conflict.conflict_id;
          
          return (
            <details
              key={conflict.conflict_id}
              className="group rounded-2xl border border-border bg-surface p-5"
              open={isOpen}
              onClick={(e) => {
                e.preventDefault(); // Control opening state in React
                setExpandedId(isOpen ? null : conflict.conflict_id);
              }}
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`mt-1 h-16 w-1 rounded-full ${
                    conflict.severity === "high" ? "bg-rose-500" : "bg-amber-500"
                  }`} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-text uppercase">
                        {conflict.conflict_id} | Severity: {conflict.severity}
                      </h2>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                        conflict.severity === "high"
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                      }`}>
                        {conflict.trigger_event}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-subtle">
                      {conflict.affected_agents.map((a) => a.agent_name).join(" ↔ ")}
                    </p>
                  </div>
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-subtle group-open:hidden">Expand</span>
              </summary>

              {isOpen && (
                <div className="mt-5 space-y-4">
                  {isDetailLoading || !conflictDetail ? (
                    <div className="flex items-center justify-center py-6 text-xs text-subtle font-semibold gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking conflict details...
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
                        <div className="rounded-2xl border border-border bg-canvas/70 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">Description</p>
                          <p className="mt-3 text-sm leading-6 text-text">
                            Multiple automated paths share trigger event `{conflictDetail.trigger_event}` under domains {conflictDetail.affected_agents.map((a: ConflictAgentRead) => `'${a.domain_gid}'`).join(" and ")}. Concurrent execution can lead to race conditions or duplicate transactions.
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-canvas/70 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">Suggested fix</p>
                          <p className="mt-3 text-sm leading-6 text-text">{conflictDetail.suggested_resolution}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                        {conflictDetail.affected_agents.map((agent: ConflictAgentRead) => (
                          <span
                            key={agent.agent_gid}
                            className="rounded-full border border-border bg-canvas/70 px-3 py-1 text-xs text-subtle font-mono"
                          >
                            {agent.source === "ai" ? "🤖" : "📘"} {agent.agent_gid}
                          </span>
                        ))}
                        <Link
                          href={`/workflow-map?agent_gid=${conflictDetail.affected_agents[0]?.agent_gid}`}
                          className="inline-flex items-center gap-1 font-medium text-sky-200 hover:text-sky-100"
                        >
                          View in map
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )}
            </details>
          );
        })}

        {filteredConflicts.length === 0 && (
          <div className="p-12 text-center text-sm text-subtle italic border border-dashed border-border rounded-2xl">
            No active conflicts recorded matching current query parameters.
          </div>
        )}
      </div>

    </section>
  );
}

export default function ConflictsPage() {
  return (
    <Suspense fallback={<LoadingState label="Initializing trigger conflicts space" />}>
      <ConflictsContent />
    </Suspense>
  );
}
