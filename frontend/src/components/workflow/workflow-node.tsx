import { Handle, NodeProps, Position } from "reactflow";
import { Diamond } from "lucide-react";
import { GraphNodeData } from "@/types/api";

// Domain accent colors — visually DISTINCT from agent-type indicator colors
const DOMAIN_ACCENT_COLORS: Record<string, string> = {
  "SHIPMENT": "#3B82F6",        // Blue
  "ORDER_RELEASE": "#3B82F6",   // Blue (same lane as Shipment)
  "INVOICE": "#14B8A6",         // Teal
  "GTM": "#8B5CF6",             // Purple
};

const AI_RECOVERY_ACCENT = "#F97316"; // Orange for AI & Recovery
const UNCLASSIFIED_ACCENT = "#6B7280"; // Gray for unclassified
const DEFAULT_ACCENT = "#94A3B8"; // Slate fallback

function getDomainAccentColor(subtitle: string | undefined): string {
  if (!subtitle) return DEFAULT_ACCENT;
  const trigger = subtitle.toUpperCase();
  const prefix = trigger.split(" - ")[0]?.trim();

  if (prefix && DOMAIN_ACCENT_COLORS[prefix]) return DOMAIN_ACCENT_COLORS[prefix];

  // AI & Recovery keywords
  const aiKeywords = ["ANOMAL", "RECOV", "PREDICT", "ESTIMAT", "FORECAST"];
  if (aiKeywords.some(kw => trigger.includes(kw))) return AI_RECOVERY_ACCENT;

  return UNCLASSIFIED_ACCENT;
}

// Agent type indicator colors — distinct from domain accent palette
const AGENT_TYPE_COLORS = {
  classic: { bg: "#64748B", label: "Classic" },       // Slate
  ai: { bg: "#D97706", label: "AI" },                 // Amber
  aiLimited: { bg: "#DC2626", label: "AI · Limited" } // Red-amber
};

export function WorkflowNode({ data, selected }: NodeProps<GraphNodeData>) {
  const isAiAgent = data.entity_type === "oracle_ai_agent";
  const isLimited = data.subtitle?.toLowerCase().includes("limited") || data.kind === "AI (Limited Visibility)" || data.is_limited;

  const accentColor = getDomainAccentColor(data.subtitle);

  // Override highlight border styling in Blast Radius or Pathfinder Mode
  const inlineStyle: React.CSSProperties = {};
  if (data.border_highlight_color) {
    inlineStyle.borderColor = data.border_highlight_color;
    inlineStyle.borderWidth = "2px";
    inlineStyle.borderStyle = "solid";
  } else if (selected) {
    inlineStyle.borderColor = "#3B82F6";
    inlineStyle.borderWidth = "2px";
    inlineStyle.boxShadow = "0 0 0 4px rgba(59, 130, 246, 0.12)";
  }

  // Fallbacks for success rate and version
  const successRate = data.success_rate || (isAiAgent ? "98.8%" : "96.7%");
  const version = data.version || (isAiAgent ? "v1.7.3" : "v1.1.2");
  const formattedVersion = version.startsWith("v") ? version : `v${version}`;

  // Agent type config
  const agentTypeConfig = isAiAgent
    ? (isLimited ? AGENT_TYPE_COLORS.aiLimited : AGENT_TYPE_COLORS.ai)
    : AGENT_TYPE_COLORS.classic;

  return (
    <div
      className="min-w-[230px] max-w-[230px] rounded-xl bg-white border border-[#E5E5E5] transition-all duration-200 relative overflow-hidden"
      style={{
        boxShadow: selected
          ? "0 4px 20px rgba(0,0,0,0.12)"
          : "0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        ...inlineStyle
      }}
    >
      {/* Domain accent left-edge bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[5px] rounded-l-xl"
        style={{ backgroundColor: accentColor }}
      />

      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-slate-300 !bg-white hover:!bg-slate-100"
      />

      <div className="pl-4 pr-3 pt-3 pb-2.5">
        {/* Header Row: Agent type indicator and Badges */}
        <div className="flex items-start justify-between gap-1.5 mb-1.5">
          {/* Agent type badge — uses distinct color system from domain accent */}
          <span
            className="px-1.5 py-0.5 rounded text-white text-[8px] font-extrabold tracking-wide"
            style={{ backgroundColor: agentTypeConfig.bg }}
          >
            {agentTypeConfig.label}
          </span>

          {/* Badges container — top-right corner */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Bottleneck badge — dark diamond, distinct from conflict pill */}
            {data.is_spof && (
              <span
                className="flex items-center justify-center bg-slate-800 text-white rounded-sm px-1 py-0.5 text-[8px] font-extrabold gap-0.5 shadow-sm"
                title="Single Point of Failure / Bottleneck"
              >
                <Diamond className="h-2.5 w-2.5" />
                SPOF
              </span>
            )}
            {/* Conflict badge — red pill */}
            {data.is_conflicted && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#DC2626] text-white text-[8px] font-extrabold flex items-center gap-0.5 shadow-sm">
                <span>⚡</span>
                <span>{data.conflict_count ?? ""}</span>
              </span>
            )}
          </div>
        </div>

        {/* Title (Agent Name) and Trigger Event */}
        <div className="space-y-0.5">
          <p className="text-[11px] font-bold text-slate-800 truncate leading-tight" title={data.label}>
            {data.label}
          </p>
          <p className="text-[9px] font-semibold tracking-wide text-slate-400 uppercase font-mono truncate">
            {data.subtitle || "—"}
          </p>
        </div>

        {/* Success percentage & Details footer */}
        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px]">
          <span className="text-emerald-600 font-bold">
            {successRate} success
          </span>

          <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
            <span>{data.domain_gid || "NWL"}</span>
            <span>•</span>
            <span>{formattedVersion}</span>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-slate-300 !bg-white hover:!bg-slate-100"
      />
    </div>
  );
}