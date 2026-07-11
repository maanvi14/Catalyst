"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Clock3, RotateCcw, Loader2 } from "lucide-react";
import { apiClient } from "@/services/api-client";
import { TraceResponse } from "@/types/api";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";

function AgentTraceContent() {
  const searchParams = useSearchParams();
  const agentGidParam = searchParams.get("agent_gid");
  const [runId] = useState("RUN-48213");

  // Fetch trace details from backend
  const { data: traceData, isLoading, isError, refetch } = useQuery<TraceResponse>({
    queryKey: ["agent-trace", runId],
    queryFn: () => apiClient.get<TraceResponse>(`/traces/${runId}`)
  });

  const [isRerunning, setIsRerunning] = useState(false);

  const handleRerun = async () => {
    setIsRerunning(true);
    try {
      const resp = await apiClient.post<{ message: string }>(`/traces/${runId}/rerun`);
      alert(`Trace rerun success: ${resp.message}`);
      refetch();
    } catch (e) {
      console.error(e);
      alert("Failed to queue rerun in backend");
    } finally {
      setIsRerunning(false);
    }
  };

  const handleExportTrace = () => {
    if (!traceData) return;
    const blob = new Blob([JSON.stringify(traceData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trace-${runId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <LoadingState label="Loading agent trace records" />;
  }

  if (isError || !traceData) {
    return (
      <ErrorState
        title="Failed to load trace logs"
        description="Start the uvicorn service to query agent traces."
      />
    );
  }

  return (
    <section className="space-y-6">
      
      {/* Header Info */}
      <div className="rounded-[1.75rem] border border-border bg-[radial-gradient(circle_at_top_left,_rgba(248,113,113,0.12),_transparent_34%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(8,15,25,0.94))] p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Agent Trace</p>
            <h1 className="mt-2 text-3xl font-semibold text-text md:text-5xl uppercase font-mono">
              {traceData.status}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRerun}
              disabled={isRerunning}
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white/5 px-4 py-2 text-sm font-semibold text-text hover:bg-white/10 transition disabled:opacity-50"
            >
              {isRerunning ? (
                <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              <span>{isRerunning ? "Rerunning..." : "Re-run"}</span>
            </button>
            <button
              onClick={handleExportTrace}
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white/5 px-4 py-2 text-sm font-semibold text-text hover:bg-white/10 transition"
            >
              <ArrowUpRight className="h-4 w-4" />
              Export trace
            </button>
          </div>
        </div>
        <div className="mt-4 text-sm text-slate-300 font-medium">
          Run ID: <span className="font-mono text-white">{traceData.run_id}</span> | Agent: <span className="font-mono text-white">{agentGidParam || traceData.agent_gid}</span> | Shipment: <span className="font-mono text-white">{traceData.shipment_gid}</span>
        </div>
      </div>

      {/* Step by step logs list */}
      <div className="space-y-4">
        {traceData.steps.map((step, index) => (
          <article
            key={`${step.title}-${index}`}
            className={`rounded-2xl border p-5 transition-transform duration-150 hover:-translate-y-[1px] ${
              step.status === "failed"
                ? "border-rose-500/30 bg-rose-500/10"
                : "border-border bg-surface"
            }`}
          >
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-subtle">
                  Step {index + 1}
                </p>
                <h2 className="mt-2 text-lg font-semibold text-text">{step.title}</h2>
                <p className="mt-2 text-sm text-subtle leading-relaxed">{step.detail}</p>
              </div>
              <div className="text-right text-sm text-subtle font-mono flex flex-col items-end gap-1 flex-shrink-0">
                <span className="flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                  {step.duration}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide ${
                  step.status === "failed"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/20"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20"
                }`}>
                  {step.status}
                </span>
              </div>
            </div>
          </article>
        ))}

        {traceData.steps.length === 0 && (
          <div className="p-12 text-center text-sm text-subtle italic border border-dashed border-border rounded-2xl">
            No trace execution steps recorded for this run.
          </div>
        )}
      </div>

    </section>
  );
}

export default function AgentTracePage() {
  return (
    <Suspense fallback={<LoadingState label="Initializing agent trace viewer" />}>
      <AgentTraceContent />
    </Suspense>
  );
}
