"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { apiClient } from "@/services/api-client";
import { AuditLog } from "@/types/api";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";

export default function AuditLogsPage() {
  // Fetch audit logs from backend
  const { data: auditLogs, isLoading, isError } = useQuery<AuditLog[]>({
    queryKey: ["audit-logs"],
    queryFn: () => apiClient.get<AuditLog[]>("/audit")
  });

  const [isExporting, setIsExporting] = useState(false);

  const handleExportCsv = async () => {
    if (!auditLogs) return;
    setIsExporting(true);
    try {
      // Call actual backend export endpoint
      const resp = await apiClient.post<{ filename: string; status: string }>("/audit/export");
      
      // Build and download CSV data
      const headers = ["Timestamp", "User", "Action", "Target", "Environment", "Result"];
      const rows = auditLogs.map((row) => [
        row.timestamp,
        row.user,
        row.action,
        row.target,
        row.environment,
        row.result
      ]);
      const csv = [headers, ...rows]
        .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
        .join("\n");
        
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = resp.filename || "audit-export.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Failed to export audit logs");
    } finally {
      setIsExporting(false);
    }
  };

  const count = useMemo(() => auditLogs?.length ?? 0, [auditLogs]);

  if (isLoading) {
    return <LoadingState label="Retrieving system audit log archives" />;
  }

  if (isError || !auditLogs) {
    return (
      <ErrorState
        title="Failed to load audit logs"
        description="Verify backend server connection."
      />
    );
  }

  return (
    <section className="space-y-6">
      
      {/* Telemetry header strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">Audit Logs</p>
          <h1 className="mt-2 text-3xl font-semibold text-text select-none">
            {count} events · Last 48h
          </h1>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={isExporting}
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-canvas/70 px-4 py-2 text-sm font-semibold text-text hover:bg-canvas transition disabled:opacity-50"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
        </button>
      </div>

      {/* Audit Logs Table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="min-w-full divide-y divide-border text-left text-sm">
          <thead className="bg-canvas/60 text-xs uppercase tracking-[0.16em] text-subtle select-none font-bold">
            <tr>
              <th className="px-5 py-3">Timestamp</th>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Target</th>
              <th className="px-5 py-3">Environment</th>
              <th className="px-5 py-3">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {auditLogs.map((row, index) => (
              <tr key={`${row.timestamp}-${row.action}-${row.target}-${index}`} className="hover:bg-white/3 transition-colors">
                <td className="px-5 py-3 text-subtle font-mono text-xs">{row.timestamp}</td>
                <td className="px-5 py-3 text-text font-semibold">{row.user}</td>
                <td className="px-5 py-3 text-subtle">{row.action}</td>
                <td className="px-5 py-3 text-subtle font-mono text-xs">{row.target}</td>
                <td className="px-5 py-3 text-subtle font-semibold">{row.environment}</td>
                <td className="px-5 py-3 text-text font-semibold">{row.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </section>
  );
}
