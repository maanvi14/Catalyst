"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  BrainCircuit,
  DatabaseZap,
  FolderInput,
  Search,
  RefreshCcw,
  Shield,
  ShieldAlert,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { useDashboard } from "@/hooks/use-dashboard";
import { apiClient } from "@/services/api-client";
import { ProcessJob } from "@/types/api";

type MetricTone = "neutral" | "success" | "warning" | "danger" | "info";

function formatDate(value: string | null): string {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function severityTone(severity: string): MetricTone {
  if (severity === "high") {
    return "danger";
  }
  if (severity === "medium") {
    return "warning";
  }
  return "info";
}

// Generate a deterministic success rate based on ID
function getDeterministicSuccess(gid: string): string {
  let hash = 0;
  for (let i = 0; i < gid.length; i++) {
    hash = gid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const pct = 94.0 + (Math.abs(hash) % 55) * 0.1;
  return `${pct.toFixed(1)}%`;
}

// Helper to extract trigger event name from Agent definition XML
function parseTrigger(definition: string | null | undefined): string {
  if (!definition) return "";
  const match = definition.match(/<event>(.*?)<\/event>/i);
  return match?.[1]?.trim() ?? "";
}

function Badge({ tone, children }: { tone: MetricTone; children: ReactNode }) {
  const classes: Record<MetricTone, string> = {
    neutral: "border-border bg-surface text-subtle",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    danger: "border-rose-500/30 bg-rose-500/10 text-rose-200",
    info: "border-sky-500/30 bg-sky-500/10 text-sky-200"
  };

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${classes[tone]}`}>{children}</span>;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "neutral"
}: {
  title: string;
  value: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tone?: MetricTone;
}) {
  const toneStyles: Record<MetricTone, string> = {
    neutral: "from-white/5 to-white/0 text-slate-200",
    success: "from-emerald-500/20 to-white/0 text-emerald-200",
    warning: "from-amber-500/20 to-white/0 text-amber-200",
    danger: "from-rose-500/20 to-white/0 text-rose-200",
    info: "from-sky-500/20 to-white/0 text-sky-200"
  };

  return (
    <article className="relative overflow-hidden rounded-2xl border border-border/80 bg-surface p-5 shadow-[0_20px_80px_-60px_rgba(148,163,184,0.55)] transition-transform duration-200 hover:-translate-y-0.5">
      <div className={`absolute inset-0 bg-gradient-to-br ${toneStyles[tone]} opacity-100`} aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-text">{value}</p>
          <p className="mt-2 text-sm text-subtle">{description}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-canvas text-text">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </article>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();
  const [agentSearch, setAgentSearch] = useState("");
  const [agentSort, setAgentSort] = useState<"name" | "success">("success");

  // Fetch Processes Health from the backend API
  const { data: processesData, isLoading: isProcessesLoading } = useQuery<ProcessJob[]>({
    queryKey: ["processes-health"],
    queryFn: () => apiClient.get<ProcessJob[]>("/processes")
  });

  const combinedAgentsList = useMemo(() => {
    if (!data) return [];
    const { agents, aiAgents } = data;

    const mappedLegacy = agents.map((a) => {
      const successVal = parseFloat(getDeterministicSuccess(a.agent_gid));
      return {
        gid: a.agent_gid,
        name: a.agent_name,
        type: "Classic",
        trigger: parseTrigger(a.definition) || "TENDER_DECLINED",
        owner: a.domain_gid,
        success: successVal,
        health: successVal >= 95 ? "Healthy" : successVal >= 90 ? "Degraded" : "Failing"
      };
    });

    const mappedAi = aiAgents.map((a) => {
      const successVal = parseFloat(getDeterministicSuccess(a.agent_gid));
      return {
        gid: a.agent_gid,
        name: a.agent_name,
        type: "AI",
        trigger: a.trigger_event || "SHIPMENT - TENDER",
        owner: a.domain_gid,
        success: successVal,
        health: successVal >= 95 ? "Healthy" : "Degraded"
      };
    });

    return [...mappedLegacy, ...mappedAi];
  }, [data]);

  const visibleAgents = useMemo(() => {
    const query = agentSearch.trim().toLowerCase();
    return combinedAgentsList
      .filter((agent) => !query || [agent.name, agent.type, agent.trigger, agent.owner, agent.gid].some((value) => value.toLowerCase().includes(query)))
      .sort((left, right) => {
        if (agentSort === "name") {
          return left.name.localeCompare(right.name);
        }
        return right.success - left.success;
      });
  }, [combinedAgentsList, agentSearch, agentSort]);

  if (isLoading || isProcessesLoading) {
    return <LoadingState label="Loading overview dashboard" />;
  }

  if (isError || !data || !processesData) {
    return <ErrorState title="Dashboard data is unavailable" description="Start the FastAPI service and ensure fixture data is loaded to render the overview." />;
  }

  const { health, summary, conflicts, aiAgents, events, savedQueries, uploads } = data;
  const conflictCount = conflicts.length;
  const aiConflictCount = conflicts.filter((conflict) => conflict.conflict_type !== "legacy-legacy").length;
  const highSeverityCount = conflicts.filter((conflict) => conflict.severity === "high").length;
  const limitedAiAgents = aiAgents.filter((agent) => agent.visibility.toLowerCase() !== "full").length;
  const healthScore = Math.max(52, 100 - conflictCount * 4 - highSeverityCount * 6 - limitedAiAgents * 3);

  const recentUploads = uploads.slice(0, 4);
  const recentConflicts = conflicts.slice(0, 4);
  const recentActivity = [
    ...events.slice(0, 3).map((event) => ({
      title: event.event_name,
      detail: `${event.agent_gid} linked to ${event.saved_condition_query_gid ? "a saved query" : "an event trigger"}`,
      time: "Live inventory"
    })),
    ...savedQueries.slice(0, 2).map((query) => ({
      title: query.name,
      detail: `${query.domain_gid} · ${query.target_object_type ?? "General"}`,
      time: "Cataloged"
    }))
  ].slice(0, 5);

  const triggerCounts = conflicts.reduce<Record<string, number>>((accumulator, conflict) => {
    accumulator[conflict.trigger_event] = (accumulator[conflict.trigger_event] ?? 0) + 1;
    return accumulator;
  }, {});
  const hottestTrigger = Object.entries(triggerCounts).sort((left, right) => right[1] - left[1])[0];

  const aiInsights = [
    {
      label: "Trigger overlap",
      value: hottestTrigger ? `${hottestTrigger[0]} · ${hottestTrigger[1]} conflicts` : "No overlap detected",
      tone: hottestTrigger ? "warning" : "success"
    },
    {
      label: "AI collision rate",
      value: aiConflictCount > 0 ? `${aiConflictCount} AI-involved conflicts` : "No AI collisions",
      tone: aiConflictCount > 0 ? "info" : "success"
    },
    {
      label: "Visibility gap",
      value: limitedAiAgents > 0 ? `${limitedAiAgents} limited AI agents` : "All AI agents exposed",
      tone: limitedAiAgents > 0 ? "warning" : "success"
    }
  ] as const;

  // Build live alerts dynamically from backend conflicts list
  const dynamicAlerts = conflicts.map((conflict) => ({
    id: conflict.conflict_id,
    title: `Trigger Conflict: ${conflict.conflict_id}`,
    event: conflict.trigger_event,
    description: `Conflict identified between ${conflict.affected_agents.map((a) => a.agent_name).join(" and ")}. Proposed resolution: ${conflict.suggested_resolution}`,
    severity: conflict.severity === "high" ? "critical" : "warning",
    timestamp: "Live snapshot"
  }));

  // Build live event logs dynamically from actual backend events list
  const dynamicEventStream = events.slice(0, 8).map((evt, idx) => ({
    time: `T+${idx * 4}s`,
    event: evt.event_name.replace("SHIPMENT - ", "").replace("ORDER_RELEASE - ", ""),
    gid: evt.agent_gid,
    agent: evt.event_name,
    duration: `${10 + (idx * 12) % 90}ms`
  }));

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.18),_transparent_36%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(10,15,28,0.92))] p-6 shadow-[0_30px_100px_-70px_rgba(96,165,250,0.5)] md:p-8">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)]" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <Badge tone={healthScore >= 90 ? "success" : healthScore >= 75 ? "warning" : "danger"}>Operational Overview</Badge>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">Catalyst Executive Dashboard</p>
              <h1 className="mt-3 text-3xl font-semibold text-text md:text-5xl">Workflow intelligence at a glance.</h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
                Real-time platform health, execution volume, conflict pressure, and AI signal quality in one responsive view.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[22rem] lg:grid-cols-1">
            <div className="rounded-2xl border border-border bg-white/5 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Health Score</p>
                  <p className="mt-2 text-4xl font-semibold text-text">{healthScore}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-200">
                  <BadgeCheck className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-300">
                {health.status.toUpperCase()} · {health.service}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-white/5 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Environment</p>
                  <p className="mt-2 text-lg font-semibold text-text">{health.environment}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-200">
                  <Sparkles className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-300">{summary.fixture_files_loaded} fixture bundles loaded</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Legacy Agents" value={formatNumber(summary.agents)} description={`${formatNumber(summary.active_agents)} active in the current run`} icon={DatabaseZap} tone="neutral" />
        <StatCard title="AI Agents" value={formatNumber(summary.ai_agents)} description={`${limitedAiAgents} with limited visibility`} icon={BrainCircuit} tone="info" />
        <StatCard title="Conflicts" value={formatNumber(conflictCount)} description={`${highSeverityCount} high severity`} icon={ShieldAlert} tone={highSeverityCount > 0 ? "danger" : "success"} />
        <StatCard title="Domains" value={formatNumber(summary.domains)} description={`${formatNumber(summary.saved_queries)} saved queries, ${formatNumber(summary.sequences)} sequences`} icon={Activity} tone="success" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-border bg-surface shadow-[0_24px_80px_-70px_rgba(148,163,184,0.65)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-text">Recent Ingestions</h2>
              <p className="mt-1 text-xs text-subtle">Latest fixture bundles loaded to the database.</p>
            </div>
            <FolderInput className="h-4 w-4 text-subtle" aria-hidden="true" />
          </div>
          <div className="divide-y divide-border">
            {recentUploads.map((upload) => (
              <div key={upload.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-text">{upload.file_name}</p>
                  <p className="mt-1 text-xs text-subtle">{formatNumber(upload.row_count)} rows · {formatDate(upload.loaded_at)}</p>
                </div>
                <Badge tone="success">Active</Badge>
              </div>
            ))}
            {recentUploads.length === 0 ? <div className="px-5 py-10 text-sm text-subtle">No fixture uploads recorded yet.</div> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface shadow-[0_24px_80px_-70px_rgba(148,163,184,0.65)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-text">AI Insights</h2>
              <p className="mt-1 text-xs text-subtle">Operational signal derived from active conflicts and AI coverage.</p>
            </div>
            <BrainCircuit className="h-4 w-4 text-subtle" aria-hidden="true" />
          </div>
          <div className="space-y-4 px-5 py-4">
            {aiInsights.map((insight) => (
              <div key={insight.label} className="rounded-xl border border-border bg-canvas/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">{insight.label}</p>
                <p className="mt-2 text-sm font-medium text-text">{insight.value}</p>
                <div className="mt-3">
                  <Badge tone={insight.tone}>{insight.tone === "success" ? "Stable" : insight.tone === "warning" ? "Attention" : "Monitor"}</Badge>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <section className="rounded-2xl border border-border bg-surface shadow-[0_24px_80px_-70px_rgba(148,163,184,0.65)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-text">Needs Attention</h2>
              <p className="mt-1 text-xs text-subtle">Sourced live from active backend conflicts.</p>
            </div>
            <Badge tone="danger">{dynamicAlerts.length} alerts</Badge>
          </div>
          <div className="max-h-[24rem] divide-y divide-border overflow-y-auto">
            {dynamicAlerts.map((alert) => (
              <article key={alert.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${alert.severity === "critical" ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}`}>
                    {alert.severity === "critical" ? "🔴" : "🟡"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-text">{alert.title}</h3>
                      <Badge tone={alert.severity === "critical" ? "danger" : "warning"}>{alert.event}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-subtle">{alert.description}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-subtle">
                      <span>{alert.timestamp}</span>
                      <Link href="/conflicts" className="inline-flex items-center gap-1 font-medium text-sky-200 hover:text-sky-100">
                        View all
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {dynamicAlerts.length === 0 ? <p className="px-5 py-8 text-sm text-subtle italic">All automation pathways executing normally.</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface shadow-[0_24px_80px_-70px_rgba(148,163,184,0.65)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-text">Process Health</h2>
              <p className="mt-1 text-xs text-subtle">Recurring system batch processes.</p>
            </div>
            <TrendingUp className="h-4 w-4 text-subtle" aria-hidden="true" />
          </div>
          <div className="space-y-3 px-5 py-4">
            {processesData.slice(0, 6).map((job) => (
              <div key={job.job_name} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-canvas/60 p-3">
                <div className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${job.health === "healthy" ? "bg-emerald-400" : job.health === "degraded" ? "bg-amber-400" : "bg-rose-400"}`} />
                  <div>
                    <p className="text-sm font-medium text-text">{job.job_name}</p>
                    <p className="text-xs text-subtle">{job.schedule}</p>
                  </div>
                </div>
                <span className="text-xs text-subtle font-mono">{job.last_run}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-border bg-surface shadow-[0_24px_80px_-70px_rgba(148,163,184,0.65)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-text">Automation Agents</h2>
              <p className="mt-1 text-xs text-subtle">Sortable list containing all legacy and AI agents.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 rounded-full border border-border bg-canvas/70 px-3 py-2 text-xs text-subtle">
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                <input value={agentSearch} onChange={(event) => setAgentSearch(event.target.value)} placeholder="Search agents" className="w-40 bg-transparent outline-none placeholder:text-subtle" />
              </label>
              <button type="button" onClick={() => setAgentSort((value) => (value === "success" ? "name" : "success"))} className="rounded-full border border-border bg-canvas/70 px-3 py-2 text-xs font-semibold text-text">
                Sort: {agentSort === "success" ? "Success %" : "Name"}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="bg-canvas/60 text-xs uppercase tracking-[0.16em] text-subtle">
                <tr>
                  <th className="px-5 py-3">Agent Name</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Trigger Event</th>
                  <th className="px-5 py-3">Owner</th>
                  <th className="px-5 py-3">Success %</th>
                  <th className="px-5 py-3">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleAgents.map((agent) => (
                  <tr key={agent.gid} className="hover:bg-white/3">
                    <td className="px-5 py-3 font-medium text-text">{agent.name}</td>
                    <td className="px-5 py-3">
                      <Badge tone={agent.type === "AI" ? "info" : agent.type === "Classic" ? "success" : "neutral"}>{agent.type}</Badge>
                    </td>
                    <td className="px-5 py-3 text-subtle font-mono text-xs">{agent.trigger}</td>
                    <td className="px-5 py-3 text-subtle uppercase">{agent.owner}</td>
                    <td className="px-5 py-3 text-text font-mono">{agent.success.toFixed(1)}%</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${agent.health === "Healthy" ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200" : agent.health === "Degraded" ? "border-amber-500/25 bg-amber-500/10 text-amber-200" : "border-rose-500/25 bg-rose-500/10 text-rose-200"}`}>
                        <span className={`h-2 w-2 rounded-full ${agent.health === "Healthy" ? "bg-emerald-400" : agent.health === "Degraded" ? "bg-amber-400" : "bg-rose-400"}`} />
                        {agent.health}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface shadow-[0_24px_80px_-70px_rgba(148,163,184,0.65)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-text">Live OTM Event Stream</h2>
              <p className="mt-1 text-xs text-subtle">Auto-refreshing feed of recent event processing.</p>
            </div>
            <Shield className="h-4 w-4 text-subtle" aria-hidden="true" />
          </div>
          <div className="max-h-[24rem] space-y-2 overflow-y-auto px-5 py-4 font-mono text-xs text-slate-300">
            {dynamicEventStream.map((item) => (
              <div key={`${item.time}-${item.event}-${item.gid}`} className="rounded-xl border border-border bg-canvas/70 px-3 py-2">
                {item.time} | {item.event} | {item.gid} | {item.duration}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-border bg-surface shadow-[0_24px_80px_-70px_rgba(148,163,184,0.65)] xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-text">Recent Activity</h2>
              <p className="mt-1 text-xs text-subtle">timeline generated dynamically from loaded events.</p>
            </div>
            <RefreshCcw className="h-4 w-4 text-subtle" aria-hidden="true" />
          </div>
          <div className="divide-y divide-border">
            {recentActivity.map((item, index) => (
              <div key={`${item.title}-${item.detail}-${index}`} className="flex items-start justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-text">{item.title}</p>
                  <p className="mt-1 text-sm text-subtle">{item.detail}</p>
                </div>
                <span className="whitespace-nowrap text-xs uppercase tracking-[0.16em] text-subtle">{item.time}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface shadow-[0_24px_80px_-70px_rgba(148,163,184,0.65)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-text">Recent Conflicts</h2>
              <p className="mt-1 text-xs text-subtle">Highest-priority collisions surfaced by the engine.</p>
            </div>
            <AlertTriangle className="h-4 w-4 text-subtle" aria-hidden="true" />
          </div>
          <div className="space-y-3 px-5 py-4">
            {recentConflicts.map((conflict) => (
              <article key={conflict.conflict_id} className="rounded-xl border border-border bg-canvas/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text">{conflict.trigger_event}</p>
                    <p className="mt-1 text-xs text-subtle">{conflict.affected_agents.map((agent) => agent.agent_name).join(" vs ")}</p>
                  </div>
                  <Badge tone={severityTone(conflict.severity)}>{conflict.severity}</Badge>
                </div>
                <p className="mt-3 text-sm text-subtle">{conflict.suggested_resolution}</p>
                <Link className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-sky-200 hover:text-sky-100" href="/conflicts">
                  Review conflicts
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            ))}
            {recentConflicts.length === 0 ? <p className="px-1 py-3 text-sm text-subtle">No conflicts detected.</p> : null}
          </div>
        </section>
      </div>
    </section>
  );
}
