"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, PlayCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/services/api-client";
import { ProcessJob } from "@/types/api";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { useMemo, useState } from "react";

export default function ProcessHealthPage() {
  // Fetch processes list from backend
  const { data: processes, isLoading, isError, refetch } = useQuery<ProcessJob[]>({
    queryKey: ["processes-health"],
    queryFn: () => apiClient.get<ProcessJob[]>("/processes")
  });

  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);

  // Compute status indicators dynamically from actual processes response
  const counts = useMemo(() => {
    if (!processes) return { healthy: 0, degraded: 0, failing: 0 };
    return processes.reduce(
      (acc, job) => {
        const h = job.health.toLowerCase();
        if (h === "healthy") acc.healthy++;
        else if (h === "degraded") acc.degraded++;
        else if (h === "failing") acc.failing++;
        return acc;
      },
      { healthy: 0, degraded: 0, failing: 0 }
    );
  }, [processes]);

  // Find if there is any failing job (missed its run) to display in the banner
  const failingJob = useMemo(() => {
    if (!processes) return null;
    return processes.find((job) => job.health === "failing" || job.last_run === "—missed—");
  }, [processes]);

  const handleTriggerJob = async (jobName: string) => {
    setTriggeringJob(jobName);
    try {
      await apiClient.post(`/processes/${encodeURIComponent(jobName)}/trigger`);
      alert(`Process '${jobName}' batch run triggered successfully!`);
      refetch();
    } catch (e) {
      console.error(e);
      alert(`Failed to trigger process '${jobName}'.`);
    } finally {
      setTriggeringJob(null);
    }
  };

  if (isLoading) {
    return <LoadingState label="Querying background system processes" />;
  }

  if (isError || !processes) {
    return (
      <ErrorState
        title="Failed to load processes health"
        description="Verify backend server connection."
      />
    );
  }

  return (
    <section className="space-y-6">
      
      {/* Header indicators with dynamic counts */}
      <div className="flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-border bg-surface p-5 select-none font-semibold">
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
          {counts.healthy} healthy
        </span>
        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
          {counts.degraded} degraded
        </span>
        <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-200">
          {counts.failing} failing
        </span>
      </div>

      {/* Conditional Alert Banner only shown if a job has actually missed its run */}
      {failingJob && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-rose-100 animate-pulse">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-400 shrink-0" />
            <div>
              <p className="font-semibold leading-relaxed">
                {failingJob.job_name} missed its schedule run (CRON: {failingJob.schedule}) — the corresponding model is serving stale or degraded forecasts.
              </p>
              <button
                onClick={() => handleTriggerJob(failingJob.job_name)}
                disabled={triggeringJob === failingJob.job_name}
                type="button"
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-50 hover:bg-rose-400/20 transition disabled:opacity-50"
              >
                {triggeringJob === failingJob.job_name ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
                <span>{triggeringJob === failingJob.job_name ? "Triggering..." : "Trigger now"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Processes List Table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="min-w-full divide-y divide-border text-left text-sm">
          <thead className="bg-canvas/60 text-xs uppercase tracking-[0.16em] text-subtle select-none font-bold">
            <tr>
              <th className="px-5 py-3">Job Name</th>
              <th className="px-5 py-3">Schedule (CRON)</th>
              <th className="px-5 py-3">Last Run</th>
              <th className="px-5 py-3">Duration</th>
              <th className="px-5 py-3">Trend</th>
              <th className="px-5 py-3">Health Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {processes.map((job) => {
              const h = job.health.toLowerCase();
              return (
                <tr key={job.job_name} className="hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3 font-semibold text-text">{job.job_name}</td>
                  <td className="px-5 py-3 text-subtle font-mono text-xs">{job.schedule}</td>
                  <td className="px-5 py-3 text-subtle font-medium">{job.last_run}</td>
                  <td className="px-5 py-3 text-subtle font-mono text-xs">{job.duration}</td>
                  <td className={`px-5 py-3 font-bold ${
                    job.trend === "▲" ? "text-emerald-400" : job.trend === "▼" ? "text-rose-400" : "text-slate-400"
                  }`}>
                    {job.trend}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      h === "healthy"
                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                        : h === "degraded"
                        ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
                        : "border-rose-500/25 bg-rose-500/10 text-rose-300"
                    }`}>
                      <span className={`h-2 w-2 rounded-full ${
                        h === "healthy" ? "bg-emerald-400" : h === "degraded" ? "bg-amber-400" : "bg-rose-400"
                      }`} />
                      {job.health}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </section>
  );
}
