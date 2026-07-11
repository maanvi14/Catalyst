import {
  Activity,
  Bot,
  ClipboardList,
  GitCompareArrows,
  LayoutDashboard,
  List,
  Map,
  MessageSquareText,
  Route,
  ScrollText,
  Settings,
  ShieldAlert
} from "lucide-react";

export const navigationItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Workflow Map", href: "/workflow-map", icon: Map },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Conflicts", href: "/conflicts", icon: ShieldAlert },
  { label: "Version Comparison", href: "/version-comparison", icon: GitCompareArrows },
  { label: "Agent Trace", href: "/agent-trace", icon: Route },
  { label: "Process Health", href: "/process-health", icon: Activity },
  { label: "Audit Logs", href: "/audit-logs", icon: ScrollText },
  { label: "Ask Catalyst", href: "/ask-catalyst", icon: MessageSquareText },
  { label: "Comma List", href: "/comma-list", icon: List },
  { label: "Settings", href: "/settings", icon: Settings }
] as const;

export const foundationItems = [
  { label: "REST API Layer", status: "Ready", icon: ClipboardList },
  { label: "Graph Engine Boundary", status: "Stubbed", icon: Route },
  { label: "Conflict Engine Boundary", status: "Stubbed", icon: ShieldAlert }
] as const;

