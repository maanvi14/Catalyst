export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

export interface DashboardAlert {
  id: string;
  severity: "critical" | "warning";
  title: string;
  description: string;
  event: string;
  timestamp: string;
}

export interface DemoAgentRow {
  name: string;
  type: "Rating" | "Compliance" | "AI" | "Tender" | "Tracking" | "Document" | "Invoice";
  trigger: string;
  owner: string;
  success: number;
  health: "Healthy" | "Degraded" | "Failed";
  gid: string;
}

export interface DemoEventStreamItem {
  time: string;
  event: string;
  gid: string;
  agent: string;
  duration: string;
}

export interface DemoJobRow {
  job_name: string;
  schedule: string;
  last_run: string;
  duration: string;
  trend: string;
  health: "healthy" | "degraded" | "failing";
}

export interface DemoConflictCard {
  id: string;
  severity: "Critical" | "Warning";
  trigger_event: string;
  left_agent: string;
  left_gid: string;
  right_agent: string;
  right_gid: string;
  description: string;
  suggested_fix: string;
}

export interface DemoDiffField {
  field: string;
  left: string;
  right: string;
  change: "added" | "removed" | "modified";
}

export interface DemoTraceStep {
  title: string;
  detail: string;
  duration: string;
  status: "ok" | "failed";
}

export interface DemoAuditRow {
  timestamp: string;
  user: string;
  action: string;
  target: string;
  environment: string;
  result: string;
}

export const dashboardAlerts: DashboardAlert[] = [
  { id: "a1", severity: "critical", title: "AI carrier ranking scores on null RATE_GID", description: "Carrier ranking is missing the upstream rate context for a handful of shipments.", event: "SHIPMENT_PLANNED", timestamp: "4m ago" },
  { id: "a2", severity: "warning", title: "Credit hold event arrived after auto-tender", description: "The compliance step lagged behind the tender decision in a recent trace.", event: "ORDER_RELEASED", timestamp: "19m ago" },
  { id: "a3", severity: "critical", title: "Dwell forecast wrote TENDER_HINT late", description: "Auto-tender observed an empty hint window before the AI path completed.", event: "SHIPMENT_PLANNED", timestamp: "1h ago" },
  { id: "a4", severity: "warning", title: "Invoice tolerance batch skipped a variance branch", description: "An edge-case invoice stayed in the saved work queue longer than expected.", event: "INVOICE_RECEIVED", timestamp: "2h ago" },
  { id: "a5", severity: "warning", title: "Tender status handler duplicated a response path", description: "Two execution branches were observed around a single tender response.", event: "TENDER_STATUS", timestamp: "3h ago" },
];

export const automationAgents: DemoAgentRow[] = [
  { name: "Auto-Tender on Plan", type: "Tender", trigger: "SHIPMENT_PLANNED", owner: "Operations", success: 97.8, health: "Healthy", gid: "AG-SHIP-AUTOTENDER" },
  { name: "AI Carrier Ranking", type: "AI", trigger: "SHIPMENT_PLANNED", owner: "AI Ops", success: 95.2, health: "Degraded", gid: "AG-AI-RANK" },
  { name: "Dwell Prediction", type: "AI", trigger: "SHIPMENT_PLANNED", owner: "AI Ops", success: 94.7, health: "Degraded", gid: "AG-AI-DWELL" },
  { name: "Rate & Service Selection", type: "Rating", trigger: "ORDER_RELEASED", owner: "Transportation", success: 98.1, health: "Healthy", gid: "AG-RATE-SERVICE" },
  { name: "Credit Hold Check", type: "Compliance", trigger: "ORDER_RELEASED", owner: "Finance", success: 99.3, health: "Healthy", gid: "AG-CREDIT-HOLD" },
  { name: "Tender Response Handler", type: "Tender", trigger: "TENDER_STATUS", owner: "Operations", success: 96.8, health: "Healthy", gid: "AG-TENDER-RESP" },
  { name: "Auto Re-Tender on Decline", type: "Tender", trigger: "TENDER_STATUS", owner: "Operations", success: 95.7, health: "Degraded", gid: "AG-SHIP-RETENDER" },
  { name: "Invoice Tolerance Batch", type: "Invoice", trigger: "INVOICE_RECEIVED", owner: "AP", success: 98.9, health: "Healthy", gid: "AG-INV-FRTAUDIT" },
  { name: "Variance Escalation", type: "Invoice", trigger: "INVOICE_RECEIVED", owner: "AP", success: 96.1, health: "Healthy", gid: "AG-INV-VARESC" },
  { name: "Document Archive", type: "Document", trigger: "DOCUMENT_COMPLETE", owner: "Shared Services", success: 99.0, health: "Healthy", gid: "AG-DOC-ARCHIVE" },
  { name: "Tracking Sync", type: "Tracking", trigger: "STATUS_UPDATE", owner: "Visibility", success: 97.1, health: "Healthy", gid: "AG-TRACK-SYNC" },
  { name: "Spot Rate Guard", type: "Compliance", trigger: "ORDER_RELEASED", owner: "Finance", success: 95.8, health: "Failed", gid: "AG-SPOT-GUARD" },
];

export const eventStream: DemoEventStreamItem[] = [
  { time: "13:44:21", event: "SHIPMENT_PLANNED", gid: "NWL.SH10293", agent: "Dwell Prediction", duration: "245ms ✓" },
  { time: "13:44:19", event: "SHIPMENT_PLANNED", gid: "NWL.SH10293", agent: "Auto-Tender on Plan", duration: "198ms ✓" },
  { time: "13:44:17", event: "ORDER_RELEASED", gid: "NWL.OR88412", agent: "Credit Hold Check", duration: "92ms ✓" },
  { time: "13:44:14", event: "TENDER_STATUS", gid: "NWL.TN44201", agent: "Tender Response Handler", duration: "74ms ✓" },
  { time: "13:44:11", event: "INVOICE_RECEIVED", gid: "NWL.IN22091", agent: "Invoice Tolerance Batch", duration: "151ms ✓" },
  { time: "13:44:08", event: "DOCUMENT_COMPLETE", gid: "NWL.DOC7731", agent: "Document Archive", duration: "88ms ✓" },
  { time: "13:44:05", event: "ORDER_RELEASED", gid: "NWL.OR88413", agent: "Rate & Service Selection", duration: "120ms ✓" },
];

export const processJobs: DemoJobRow[] = [
  { job_name: "Nightly Tender Sweep", schedule: "0 2 * * *", last_run: "Today 02:00", duration: "4m 12s", trend: "▲", health: "healthy" },
  { job_name: "Invoice Tolerance Batch", schedule: "0 */4 * * *", last_run: "Today 04:00", duration: "1m 38s", trend: "—", health: "healthy" },
  { job_name: "Credit Hold Reconcile", schedule: "0 */6 * * *", last_run: "Today 06:00", duration: "2m 05s", trend: "▼", health: "healthy" },
  { job_name: "Freight Bill Audit Batch", schedule: "0 6 * * *", last_run: "Today 06:00", duration: "12m 07s", trend: "▲", health: "healthy" },
  { job_name: "Carrier Rank Model Retrain", schedule: "0 3 * * 0", last_run: "Sun 03:00", duration: "28m 44s", trend: "▲", health: "degraded" },
  { job_name: "Document Archive", schedule: "0 23 * * *", last_run: "Yesterday 23:00", duration: "8m 44s", trend: "▼", health: "degraded" },
  { job_name: "Dwell Prediction Model Refresh", schedule: "0 1 * * *", last_run: "—missed—", duration: "—", trend: "—", health: "failing" },
  { job_name: "Carrier Performance Rollup", schedule: "0 5 * * 1", last_run: "Mon 05:00", duration: "3m 21s", trend: "—", health: "healthy" },
];

export const conflictCards: DemoConflictCard[] = [
  { id: "C-002", severity: "Critical", trigger_event: "SHIPMENT_PLANNED", left_agent: "Auto-Tender on Plan", left_gid: "AG-SHIP-AUTOTENDER", right_agent: "Dwell Prediction", right_gid: "AG-AI-DWELL", description: "Both agents subscribe to SHIPMENT_PLANNED. Dwell Prediction writes TENDER_HINT which Auto-Tender reads, but execution order is non-deterministic. In 23% of observed runs, Auto-Tender fires before TENDER_HINT is written, producing sub-optimal carrier selection. Race window averages 504ms under production load.", suggested_fix: "Sequence AG-AI-DWELL before AG-SHIP-AUTOTENDER using an event gate on DWELL_FORECAST availability, or gate Auto-Tender on TENDER_HINT with a bounded 500ms wait before falling back to default lane preferences." },
  { id: "C-001", severity: "Critical", trigger_event: "ORDER_RELEASED", left_agent: "Rate & Service Selection", left_gid: "AG-RATE-SERVICE", right_agent: "Credit Hold Check", right_gid: "AG-CREDIT-HOLD", description: "The rate selection path and the compliance gate can fire in either order, which risks a downstream tender attempt before credit status is settled.", suggested_fix: "Place Credit Hold Check ahead of Rate & Service Selection or add a hard dependency on the hold result before the rate step can execute." },
  { id: "C-005", severity: "Warning", trigger_event: "ORDER_RELEASED", left_agent: "Credit Hold Check", left_gid: "AG-CREDIT-HOLD", right_agent: "AI Carrier Ranking", right_gid: "AG-AI-RANK", description: "The AI ranking step can observe an order before the compliance gate settles, creating inconsistent confidence signals.", suggested_fix: "Delay ranking until the credit hold outcome is known, or isolate the read so the ranking model cannot drive execution while the hold is unresolved." },
  { id: "C-004", severity: "Warning", trigger_event: "TENDER_STATUS", left_agent: "Auto Re-Tender on Decline", left_gid: "AG-SHIP-RETENDER", right_agent: "Tender Response Handler", right_gid: "AG-TENDER-RESP", description: "The decline handling path and the response handler both react to the same tender status event, creating duplicate flows.", suggested_fix: "Introduce a single bounded response handler and have re-tender consume the handler result rather than the raw event." },
  { id: "C-003", severity: "Warning", trigger_event: "INVOICE_RECEIVED", left_agent: "Auto-Approve under Tolerance", left_gid: "AG-INV-FRTAUDIT", right_agent: "Variance Escalation", right_gid: "AG-INV-VARESC", description: "The invoice auto-approval and variance escalation branches can both consume the same invoice event, which makes downstream result ordering ambiguous.", suggested_fix: "Make the approval branch wait for the variance result, or emit one consolidated invoice decision event for both paths." },
];

export const diffFields: DemoDiffField[] = [
  { field: "trigger", left: "TENDER_DECLINED", right: "TENDER_DECLINED", change: "modified" },
  { field: "priority", left: "High", right: "Critical", change: "modified" },
  { field: "condition", left: "retry_count < 2", right: "retry_count < 3 and budget_guard", change: "modified" },
  { field: "read", left: "CARRIER_PREF", right: "CARRIER_PREF, TENDER_HINT", change: "added" },
  { field: "action", left: "Re-tender next carrier", right: "Re-tender next carrier + hold escalation", change: "modified" },
  { field: "write", left: "retry_count", right: "retry_count, hold_flag", change: "added" },
  { field: "success rate", left: "94.8%", right: "96.4%", change: "modified" },
];

export const traceSteps: DemoTraceStep[] = [
  { title: "Trigger received", detail: "evt=TENDER_DECLINED, SHIPMENT_GID=NWL.SH10293", duration: "12ms", status: "ok" },
  { title: "Load shipment context", detail: "in: SHIPMENT_GID=NWL.SH10293 → out: status=DECLINED, retry_count=1", duration: "86ms", status: "ok" },
  { title: "Evaluate guard conditions", detail: "retry_count(1) < 3 ✓, alt_carrier_exists ✓", duration: "22ms", status: "ok" },
  { title: "Select next carrier", detail: "out: CARRIER_GID=NWL.CARR.SWIFT (Swift Freight)", duration: "41ms", status: "ok" },
  { title: "Build tender payload", detail: "out: payload 2.1KB · rate=$1,842.00 · service=LTL", duration: "33ms", status: "ok" },
  { title: "POST tender — carrier API", detail: "ERROR: CARRIER_TIMEOUT after 30000ms", duration: "30.0s", status: "failed" },
];

export const auditRows: DemoAuditRow[] = [
  { timestamp: "2026-06-30 08:17", user: "m.reyes", action: "Acknowledge conflict", target: "C-005", environment: "PROD", result: "Acknowledged" },
  { timestamp: "2026-06-30 07:44", user: "system", action: "Detect conflict", target: "C-005", environment: "PROD", result: "Critical raised" },
  { timestamp: "2026-06-29 14:38", user: "system", action: "Auto-promote", target: "AG-INV-FRTAUDIT@v1.0.4", environment: "TEST→PROD", result: "Promoted" },
  { timestamp: "2026-06-29 12:18", user: "d.kim", action: "Edit conditions", target: "AG-INV-FRTAUDIT", environment: "TEST", result: "Saved" },
  { timestamp: "2026-06-29 09:42", user: "m.reyes", action: "Promote agent", target: "AG-SHIP-RETENDER@v2.1.0-draft", environment: "TEST→PROD", result: "BLOCKED" },
  { timestamp: "2026-06-29 09:38", user: "m.reyes", action: "Run regression suite", target: "AG-SHIP-RETENDER@v2.1.0-draft", environment: "TEST", result: "5 passed / 1 failed" },
  { timestamp: "2026-06-29 09:15", user: "a.okafor", action: "Edit conditions", target: "AG-SHIP-RETENDER", environment: "TEST", result: "Saved" },
  { timestamp: "2026-06-28 14:39", user: "oracle.ai", action: "Edit deploy", target: "AG-AI-DWELL@v0.9-beta", environment: "TEST", result: "Deployed" },
  { timestamp: "2026-06-28 08:50", user: "s.patel", action: "Acknowledge conflict", target: "C-001", environment: "PROD", result: "Acknowledged" },
];

export const askExamples = [
  "Why did the Auto-Tender agent fail last night?",
  "What agents trigger on SHIPMENT_PLANNED?",
  "Show me all conflicts involving AI agents",
  "Compare PROD and TEST versions of AG-SHIP-AUTOTENDER",
];
