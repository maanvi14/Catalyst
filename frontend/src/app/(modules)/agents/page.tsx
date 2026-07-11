"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Copy,
  PlayCircle,
  AlertTriangle
} from "lucide-react";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { apiClient } from "@/services/api-client";
import { AgentRead, AgentDetail } from "@/types/api";

interface TestCase {
  id: string;
  name: string;
  status: string;
  expected?: string;
  actual?: string;
  reason?: string;
}

interface TestResults {
  cases: TestCase[];
  behavioral_diff?: Array<{ phase: string; detail: string }>;
}

interface DiffField {
  field: string;
  left: string;
  right: string;
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

interface PromotionResult {
  promotion_gated: boolean;
  message: string;
}

function AgentsContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const agentGidParam = searchParams.get("agent_gid");

  // Fetch agents list
  const { data: agents, isLoading: isListLoading, error: listError } = useQuery<AgentRead[]>({
    queryKey: ["agents-list"],
    queryFn: () => apiClient.get<AgentRead[]>("/agents")
  });

  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

  // Deep linking to selected agent GID
  useEffect(() => {
    if (agents && agents.length > 0) {
      if (agentGidParam) {
        const found = agents.find((a) => a.agent_gid === agentGidParam);
        if (found) {
          setSelectedAgentId(found.id);
          return;
        }
      }
      if (selectedAgentId === null) {
        setSelectedAgentId(agents[0].id);
      }
    }
  }, [agents, agentGidParam, selectedAgentId]);

  // Fetch details for the selected agent
  const { data: agentDetail, isLoading: isDetailLoading } = useQuery<AgentDetail>({
    queryKey: ["agent-detail", selectedAgentId],
    queryFn: () => apiClient.get<AgentDetail>(`/agents/${selectedAgentId}`),
    enabled: selectedAgentId !== null
  });

  const [draft, setDraft] = useState("");

  // Update draft textarea when agent detail changes
  useEffect(() => {
    if (agentDetail) {
      setDraft(agentDetail.definition || "");
    }
  }, [agentDetail]);

  // Run tests state and handlers
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<TestResults | null>(null);

  const handleRunTests = async () => {
    if (selectedAgentId === null) return;
    setIsRunningTests(true);
    setTestResults(null);
    try {
      const resp = await apiClient.post<TestResults>(`/agents/${selectedAgentId}/tests/run`, { draft });
      setTestResults(resp);
    } catch (e) {
      console.error(e);
      alert("Failed to execute regression suite on backend");
    } finally {
      setIsRunningTests(false);
    }
  };

  // Fetch behavioral diff from backend on agent selection
  const { data: diffData, isLoading: isDiffLoading } = useQuery<DiffResponse>({
    queryKey: ["agent-diff", selectedAgentId],
    queryFn: () => apiClient.post<DiffResponse>(`/agents/${selectedAgentId}/diff`, { left_env: "PROD", right_env: "TEST" }),
    enabled: selectedAgentId !== null
  });

  // Promote state and handler
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotionResult, setPromotionResult] = useState<PromotionResult | null>(null);

  const handlePromote = async () => {
    if (selectedAgentId === null) return;
    setIsPromoting(true);
    setPromotionResult(null);
    try {
      const resp = await apiClient.post<PromotionResult>(`/agents/${selectedAgentId}/promote`, { draft });
      setPromotionResult(resp);
      queryClient.invalidateQueries({ queryKey: ["agent-diff", selectedAgentId] });
      queryClient.invalidateQueries({ queryKey: ["version-diff"] });
    } catch (e) {
      console.error(e);
      alert("Promotion endpoint failed");
    } finally {
      setIsPromoting(false);
    }
  };

  // Determine gating based on actual test results
  const failedTest = useMemo(() => {
    if (!testResults?.cases) return null;
    return testResults.cases.find((tc) => tc.status === "FAIL");
  }, [testResults]);

  const allPassed = useMemo(() => {
    if (!testResults?.cases) return false;
    return testResults.cases.every((tc) => tc.status === "PASS");
  }, [testResults]);

  if (isListLoading) {
    return <LoadingState label="Loading agent profiles" />;
  }

  if (listError || !agents) {
    return (
      <ErrorState
        title="Failed to load agents"
        description="Verify backend is running on port 8000."
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr] h-full items-start">
      
      {/* Left Sidebar List of Agents */}
      <aside className="rounded-2xl border border-border bg-surface p-4 space-y-3 max-h-[calc(100vh-10rem)] overflow-y-auto custom-scrollbar">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">Select Agent</p>
        <div className="space-y-1">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => {
                setSelectedAgentId(agent.id);
                setTestResults(null);
                setPromotionResult(null);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                selectedAgentId === agent.id
                  ? "bg-[#1E3A5F]/75 border-[var(--color-orange,#E8792B)] text-[var(--color-text-primary,#E2E8F0)]"
                  : "bg-canvas/50 border-transparent text-[var(--color-text-secondary,#94A3B8)] hover:bg-canvas/80 hover:text-[var(--color-text-primary,#E2E8F0)]"
              }`}
            >
              <div className="truncate font-semibold">{agent.agent_name}</div>
              <div className="truncate text-[10px] text-slate-400 font-mono mt-0.5">{agent.agent_gid}</div>
            </button>
          ))}
        </div>
      </aside>

      {/* Right Workbench Details Area */}
      <section className="space-y-6 min-w-0">
        
        {isDetailLoading || !agentDetail ? (
          <div className="rounded-2xl border border-border bg-surface p-12 text-center text-sm text-subtle font-semibold">
            Loading agent workbench...
          </div>
        ) : (
          <>
            {/* Header Title */}
            <div className="rounded-2xl border border-border bg-surface p-5 flex flex-wrap justify-between items-start gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">
                  Agent Workbench | {agentDetail.domain_gid}
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-text">{agentDetail.agent_name}</h1>
                <p className="text-xs font-mono text-slate-400 mt-1">{agentDetail.agent_gid}</p>
              </div>
              <div className="flex gap-2">
                <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                  agentDetail.is_active
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-500/30 bg-slate-500/10 text-slate-400"
                }`}>
                  {agentDetail.is_active ? "Active" : "Inactive"}
                </span>
                {agentDetail.is_ai && (
                  <span className="px-2.5 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-300 text-[10px] font-bold uppercase tracking-wider">
                    AI Agent
                  </span>
                )}
              </div>
            </div>

            {/* Sandbox & Regression Grid */}
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              
              {/* Draft Sandbox Panel */}
              <section className="rounded-2xl border border-border bg-surface p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-text">Draft Sandbox</h2>
                    <button
                      onClick={() => setDraft(agentDetail.definition || "")}
                      className="rounded-full border border-border bg-canvas/70 px-3 py-1 text-[10px] font-semibold text-text hover:bg-canvas transition"
                    >
                      Reset Draft
                    </button>
                  </div>
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={12}
                    className="mt-4 w-full rounded-xl border border-border bg-canvas/80 p-4 font-mono text-xs text-text outline-none focus:ring-1 focus:ring-slate-500 transition"
                    placeholder="XML definition or query configurations..."
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(draft);
                      alert("Copied draft to clipboard!");
                    }}
                    className="rounded-full border border-border bg-canvas/70 px-3 py-1.5 text-xs font-semibold text-text inline-flex items-center gap-1.5 hover:bg-canvas transition"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy Draft
                  </button>
                </div>
              </section>

              {/* Regression Suite Panel */}
              <section className="rounded-2xl border border-border bg-surface p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-text">Regression Suite</h2>
                  <button
                    onClick={handleRunTests}
                    disabled={isRunningTests}
                    className="rounded-full border border-border bg-canvas/70 px-3 py-1.5 text-xs font-semibold text-text inline-flex items-center gap-1.5 hover:bg-canvas transition disabled:opacity-50"
                  >
                    <PlayCircle className="h-4 w-4 text-emerald-400" />
                    <span>{isRunningTests ? "Running..." : "Run Tests"}</span>
                  </button>
                </div>

                <div className="mt-4 space-y-2 max-h-[16rem] overflow-y-auto custom-scrollbar">
                  {isRunningTests ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3 border border-dashed border-border rounded-xl">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                      <p className="text-xs text-slate-400 font-semibold animate-pulse">Running regression test suite...</p>
                    </div>
                  ) : testResults?.cases ? (
                    testResults.cases.map((tc) => (
                      <div
                        key={tc.id}
                        className={`flex items-center justify-between rounded-xl border p-3 text-xs ${
                          tc.status === "FAIL"
                            ? "border-rose-500/30 bg-rose-500/10"
                            : "border-border bg-canvas/70"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-text truncate">{tc.id}: {tc.name}</p>
                          {tc.reason && (
                            <p className={`mt-1 text-[10px] leading-normal ${
                              tc.status === "FAIL" ? "text-rose-300" : "text-emerald-400"
                            }`}>
                              {tc.reason}
                            </p>
                          )}
                          {tc.status === "FAIL" && !tc.reason && (
                            <p className="mt-1 text-[10px] text-rose-300 leading-normal">
                              Expected: {tc.expected} | Actual: {tc.actual}
                            </p>
                          )}
                        </div>
                        <span className={`font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wider ${
                          tc.status === "PASS"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}>
                          {tc.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-subtle italic border border-dashed border-border rounded-xl">
                      No regression test runs executed. Click &apos;Run Tests&apos; above to verify conditions.
                    </div>
                  )}
                </div>
              </section>

            </div>

            {/* Behavioral Diff Panel */}
            <section className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-text">Behavioral Diff Summary</h2>
              
              {isDiffLoading ? (
                <div className="py-6 text-center text-xs text-subtle">Analyzing diff fields...</div>
              ) : diffData ? (
                <div className="mt-4 space-y-3">
                  <div className="bg-canvas/50 p-3 rounded-lg border border-border text-xs leading-relaxed">
                    <p className="font-bold text-[var(--color-orange,#E8792B)] mb-1 uppercase tracking-wider text-[9px]">Summary</p>
                    <p>{diffData.summary?.semantic_summary}</p>
                    {diffData.summary?.warning && (
                      <p className="mt-2 text-rose-300 flex items-start gap-1 font-semibold">
                        <AlertTriangle className="h-4.5 w-4.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>{diffData.summary.warning}</span>
                      </p>
                    )}
                  </div>
                  
                  {testResults?.behavioral_diff ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {testResults.behavioral_diff.map((diff) => (
                        <div key={diff.phase} className="rounded-xl border border-border bg-canvas/70 p-4">
                          <p className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-subtle">
                            {diff.phase} BEHAVIOR
                          </p>
                          <p className="mt-2 text-xs text-text leading-relaxed">{diff.detail}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-subtle italic">No diff data fetched.</div>
              )}
            </section>

            {/* Promotion Gated Warning & Info Banners */}
            {!testResults && (
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-blue-300 text-xs flex items-start gap-2">
                <AlertTriangle className="h-4.5 w-4.5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Promotion pending — Regression tests required.</p>
                  <p className="mt-1 opacity-90">Please run the regression test suite to verify the changes before promoting to PROD.</p>
                </div>
              </div>
            )}

            {failedTest && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-200 text-xs flex items-start gap-2">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Promotion gated — {failedTest.id} is failing.</p>
                  <p className="mt-1 opacity-90">Please resolve the failing timeout retry logic before promoting to PROD.</p>
                </div>
              </div>
            )}

            {allPassed && !promotionResult && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-200 text-xs flex items-start gap-2">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">All regression tests passed.</p>
                  <p className="mt-1 opacity-90">Ready for promotion to PROD environment.</p>
                </div>
              </div>
            )}

            {promotionResult && (
              <div className={`rounded-2xl p-4 text-xs flex items-start gap-2 ${
                promotionResult.promotion_gated
                  ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              }`}>
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <p className="font-semibold">{promotionResult.message}</p>
              </div>
            )}

            <div className="flex justify-end mt-2">
              <button
                onClick={handlePromote}
                disabled={isPromoting || !allPassed}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white/5 px-4 py-2 text-sm font-semibold text-text hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isPromoting ? "Promoting..." : "Promote to PROD"}</span>
              </button>
            </div>
          </>
        )}

      </section>

    </div>
  );
}

export default function AgentsPage() {
  return (
    <Suspense fallback={<LoadingState label="Initializing agent workbench" />}>
      <AgentsContent />
    </Suspense>
  );
}
