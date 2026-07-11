"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Download, GitCompareArrows, TriangleAlert, Loader2 } from "lucide-react";
import { DiffEditor } from "@monaco-editor/react";
import { apiClient } from "@/services/api-client";
import { AgentRead } from "@/types/api";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";

interface DiffField {
  field: string;
  left: string | null;
  right: string | null;
  change: string;
}

interface DiffSummary {
  additions: number;
  removals: number;
  modifications: number;
  semantic_summary: string;
  warning?: string;
}

interface DiffResponse {
  agent_id: number;
  left_env: string;
  right_env: string;
  left_version: string;
  right_version: string;
  summary: DiffSummary;
  fields: DiffField[];
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function VersionComparisonContent() {
  const searchParams = useSearchParams();
  const agentGidParam = searchParams.get("agent_gid");

  // Fetch agents list
  const { data: agentsData, isLoading: isAgentsLoading, error: agentsError } = useQuery<AgentRead[]>({
    queryKey: ["agents-list"],
    queryFn: () => apiClient.get<AgentRead[]>("/agents")
  });

  const [selectedAgentGid, setSelectedAgentGid] = useState("");
  const [leftEnv, setLeftEnv] = useState("PROD");
  const [rightEnv, setRightEnv] = useState("TEST");

  // Initialize selected agent with searchParam support
  useEffect(() => {
    if (agentsData && agentsData.length > 0) {
      if (agentGidParam) {
        const found = agentsData.find((a) => a.agent_gid === agentGidParam);
        if (found) {
          setSelectedAgentGid(found.agent_gid);
          return;
        }
      }
      if (!selectedAgentGid) {
        setSelectedAgentGid(agentsData[0].agent_gid);
      }
    }
  }, [agentsData, selectedAgentGid, agentGidParam]);

  const selectedAgentObj = useMemo(() => {
    return agentsData?.find((a) => a.agent_gid === selectedAgentGid);
  }, [agentsData, selectedAgentGid]);

  // Fetch diff from backend
  const { data: diffData, isLoading: isDiffLoading } = useQuery<DiffResponse>({
    queryKey: ["version-diff", selectedAgentObj?.id, leftEnv, rightEnv],
    queryFn: () =>
      apiClient.post<DiffResponse>(`/agents/${selectedAgentObj?.id}/diff`, {
        left_env: leftEnv,
        right_env: rightEnv
      }),
    enabled: selectedAgentObj !== undefined
  });

  // Construct PROD configuration JSON from left values in diff fields
  const originalJson = useMemo(() => {
    if (!diffData?.fields) return "{}";
    const fields = diffData.fields;
    const obj: Record<string, string | null> = {};
    fields.forEach((f: DiffField) => {
      obj[f.field] = f.left;
    });
    return JSON.stringify(obj, null, 2);
  }, [diffData]);

  // Construct TEST configuration JSON from right values in diff fields
  const modifiedJson = useMemo(() => {
    if (!diffData?.fields) return "{}";
    const fields = diffData.fields;
    const obj: Record<string, string | null> = {};
    fields.forEach((f: DiffField) => {
      obj[f.field] = f.right;
    });
    return JSON.stringify(obj, null, 2);
  }, [diffData]);

  const summary = useMemo(() => {
    if (!diffData?.summary) {
      return { additions: 0, removals: 0, modifications: 0 };
    }
    return {
      additions: diffData.summary.additions || 0,
      removals: diffData.summary.removals || 0,
      modifications: diffData.summary.modifications || 0
    };
  }, [diffData]);

  const handleExportDiff = () => {
    if (!diffData) return;
    downloadText(`${selectedAgentGid}.diff.json`, JSON.stringify(diffData, null, 2));
  };

  if (isAgentsLoading) {
    return <LoadingState label="Loading comparative agents list" />;
  }

  if (agentsError || !agentsData) {
    return (
      <ErrorState
        title="Failed to load compare agent profiles"
        description="Verify backend server connection."
      />
    );
  }

  return (
    <section className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-[1.75rem] border border-border bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.16),_transparent_34%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(8,15,25,0.94))] p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Agents & Diff</p>
            <h1 className="mt-2 text-3xl font-semibold text-text md:text-5xl">Side-by-side version comparison</h1>
          </div>
          <button
            onClick={handleExportDiff}
            disabled={!diffData}
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white/5 px-4 py-2 text-sm font-semibold text-text hover:bg-white/10 transition disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            Export Diff
          </button>
        </div>
      </div>

      {/* Select Controls Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <select
          value={selectedAgentGid}
          onChange={(event) => setSelectedAgentGid(event.target.value)}
          className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text outline-none focus:ring-1 focus:ring-slate-500"
        >
          {agentsData.map((agent) => (
            <option key={agent.agent_gid} value={agent.agent_gid}>
              {agent.agent_name} ({agent.agent_gid})
            </option>
          ))}
        </select>
        <select
          value={leftEnv}
          onChange={(event) => setLeftEnv(event.target.value)}
          className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text outline-none focus:ring-1 focus:ring-slate-500"
        >
          {["PROD", "TEST", "DEV"].map((env) => (
            <option key={env} value={env}>
              {env} (Original)
            </option>
          ))}
        </select>
        <select
          value={rightEnv}
          onChange={(event) => setRightEnv(event.target.value)}
          className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text outline-none focus:ring-1 focus:ring-slate-500"
        >
          {["PROD", "TEST", "DEV"].map((env) => (
            <option key={env} value={env}>
              {env} (Modified)
            </option>
          ))}
        </select>
      </div>

      {/* Diff Summary details from backend */}
      {isDiffLoading ? (
        <div className="rounded-2xl border border-border bg-surface p-12 flex justify-center text-sm text-subtle font-semibold gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
          Analyzing side-by-side differences...
        </div>
      ) : diffData ? (
        <>
          <section className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                +{summary.additions} additions
              </span>
              <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200">
                -{summary.removals} removal
              </span>
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
                ~{summary.modifications} modifications
              </span>
            </div>
            
            <p className="text-sm leading-6 text-text">
              {diffData.summary?.semantic_summary}
            </p>
            
            {diffData.summary?.warning && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                <div className="flex items-start gap-2">
                  <TriangleAlert className="mt-0.5 h-4.5 w-4.5 text-amber-400 shrink-0" />
                  <span>{diffData.summary.warning}</span>
                </div>
              </div>
            )}
          </section>

          {/* Monaco Diff Editor Rebuilding the lower half */}
          <div className="rounded-2xl border border-border bg-surface overflow-hidden p-1 space-y-2">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-canvas/30">
              <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <GitCompareArrows className="h-4 w-4 text-sky-400" />
                <span>Config diff: {leftEnv} vs {rightEnv}</span>
              </h2>
              <span className="text-xs font-mono text-slate-400">JSON representation</span>
            </div>
            
            <div className="h-[480px] w-full bg-[#0B1120] rounded-xl overflow-hidden">
              {/* Confirmed: Monaco DiffEditor is selected and utilized for read-only side-by-side comparative json diffing */}
              <DiffEditor
                height="100%"
                language="json"
                original={originalJson}
                modified={modifiedJson}
                options={{
                  readOnly: true,
                  renderSideBySide: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 12,
                  fontFamily: "JetBrains Mono, Consolas, monospace",
                  lineNumbers: "on",
                  scrollbar: {
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8
                  }
                }}
                theme="vs-dark"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center text-sm text-subtle font-semibold">
          Select an agent and environment to run configuration diffing.
        </div>
      )}

    </section>
  );
}

export default function VersionComparisonPage() {
  return (
    <Suspense fallback={<LoadingState label="Initializing version comparison" />}>
      <VersionComparisonContent />
    </Suspense>
  );
}
