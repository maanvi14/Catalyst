"use client";

import { useQuery } from "@tanstack/react-query";
import { Settings, Shield, Server, Cpu, Database, Eye, Bell } from "lucide-react";
import { apiClient } from "@/services/api-client";
import { HealthResponse } from "@/types/api";

const CONFIG = {
  connection: {
    otmUrl: "https://otm-test.northwind.logistics:8443",
    envType: "OTM TEST 26B",
    apiCredentials: "●●●●●●●●●●●●● (service-account-otm)"
  },
  scanSchedule: {
    cron: "0 */4 * * * (Every 4 hours)",
    lastScan: "Today at 06:00"
  },
  alertChannels: {
    smtpServer: "smtp.internal.northwind.logistics:25",
    webhooks: "https://discord.com/api/webhooks/928312019"
  },
  retention: {
    days: "90 Days Retention",
    autoExport: "Monthly"
  },
  theme: {
    style: "Modern Violet",
    mode: "Dark Theme"
  },
  aiModel: {
    groqUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.1-8b-instant (Groq Cloud LLM)"
  }
};

export default function SettingsPage() {
  const { data: health } = useQuery<HealthResponse>({
    queryKey: ["health"],
    queryFn: () => apiClient.get<HealthResponse>("/health")
  });

  return (
    <section className="space-y-6">
      <div className="rounded-[1.75rem] border border-border bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.12),_transparent_34%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(8,15,25,0.94))] p-6 md:p-8">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-sky-400" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Settings</p>
            <h1 className="mt-2 text-3xl font-semibold text-text md:text-4xl">Platform Configuration</h1>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-300">
          Read-only system settings and service connectivity parameters.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        
        {/* Connection health info */}
        <section className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-sky-400" />
            <h2 className="text-lg font-semibold text-text">Oracle OTM Connector</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-canvas/70 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-subtle">Target Endpoint</p>
              <p className="mt-1 text-text font-mono break-all">{CONFIG.connection.otmUrl}</p>
            </div>
            <div className="rounded-xl border border-border bg-canvas/70 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-subtle">Environment Type</p>
              <p className="mt-1 text-text">{health?.environment ?? CONFIG.connection.envType}</p>
            </div>
            <div className="rounded-xl border border-border bg-canvas/70 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-subtle">Credentials</p>
              <p className="mt-1 text-text font-mono">{CONFIG.connection.apiCredentials}</p>
            </div>
          </div>
        </section>

        {/* Scan scheduler */}
        <section className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-text">Scan & Ingestion</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-canvas/70 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-subtle">Ingestion Scheduler</p>
              <p className="mt-1 text-text font-mono">{CONFIG.scanSchedule.cron}</p>
            </div>
            <div className="rounded-xl border border-border bg-canvas/70 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-subtle">Last Scan Ingested</p>
              <p className="mt-1 text-text">{CONFIG.scanSchedule.lastScan}</p>
            </div>
            <div className="rounded-xl border border-border bg-canvas/70 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-subtle">Ingested Service Name</p>
              <p className="mt-1 text-text font-mono">{health?.service ?? "catalyst-backend"}</p>
            </div>
          </div>
        </section>

        {/* Alert channels */}
        <section className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-text">Alert Channels</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-canvas/70 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-subtle">SMTP Server</p>
              <p className="mt-1 text-text font-mono">{CONFIG.alertChannels.smtpServer}</p>
            </div>
            <div className="rounded-xl border border-border bg-canvas/70 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-subtle">Webhook Destination</p>
              <p className="mt-1 text-text font-mono break-all">{CONFIG.alertChannels.webhooks}</p>
            </div>
          </div>
        </section>

        {/* AI model settings */}
        <section className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-text">AI Model Settings</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-canvas/70 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-subtle">Groq API Endpoint</p>
              <p className="mt-1 text-text font-mono">{CONFIG.aiModel.groqUrl}</p>
            </div>
            <div className="rounded-xl border border-border bg-canvas/70 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-subtle">Model In Use</p>
              <p className="mt-1 text-text font-semibold text-purple-200">{CONFIG.aiModel.model}</p>
            </div>
          </div>
        </section>

        {/* System audit log options */}
        <section className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-rose-400" />
            <h2 className="text-lg font-semibold text-text">Audit & Compliance</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-canvas/70 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-subtle">Retention Period</p>
              <p className="mt-1 text-text">{CONFIG.retention.days}</p>
            </div>
            <div className="rounded-xl border border-border bg-canvas/70 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-subtle">Auto-Export Schedule</p>
              <p className="mt-1 text-text">{CONFIG.retention.autoExport}</p>
            </div>
          </div>
        </section>

        {/* UI Theme preferences */}
        <section className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-text">Theme & Display</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-canvas/70 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-subtle">Active Style System</p>
              <p className="mt-1 text-text">{CONFIG.theme.style}</p>
            </div>
            <div className="rounded-xl border border-border bg-canvas/70 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-subtle">Theme Layout Mode</p>
              <p className="mt-1 text-text">{CONFIG.theme.mode}</p>
            </div>
          </div>
        </section>

      </div>
    </section>
  );
}
