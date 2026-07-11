from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone


@dataclass(frozen=True)
class DemoProcessHealth:
    job_name: str
    schedule: str
    last_run: str
    duration: str
    trend: str
    health: str


@dataclass(frozen=True)
class DemoAuditEvent:
    timestamp: str
    user: str
    action: str
    target: str
    environment: str
    result: str


@dataclass(frozen=True)
class DemoTraceStep:
    title: str
    detail: str
    duration: str
    status: str


@dataclass(frozen=True)
class DemoDiffField:
    field: str
    left: str
    right: str
    change: str


def _now_iso(offset_minutes: int = 0) -> str:
    return (datetime.now(timezone.utc) + timedelta(minutes=offset_minutes)).isoformat()


def process_health_rows() -> list[dict[str, str]]:
    return [
        {"job_name": "Nightly Tender Sweep", "schedule": "0 2 * * *", "last_run": "Today 02:00", "duration": "4m 12s", "trend": "▲", "health": "healthy"},
        {"job_name": "Invoice Tolerance Batch", "schedule": "0 */4 * * *", "last_run": "Today 04:00", "duration": "1m 38s", "trend": "—", "health": "healthy"},
        {"job_name": "Credit Hold Reconcile", "schedule": "0 */6 * * *", "last_run": "Today 06:00", "duration": "2m 05s", "trend": "▼", "health": "healthy"},
        {"job_name": "Freight Bill Audit Batch", "schedule": "0 6 * * *", "last_run": "Today 06:00", "duration": "12m 07s", "trend": "▲", "health": "healthy"},
        {"job_name": "Carrier Rank Model Retrain", "schedule": "0 3 * * 0", "last_run": "Sun 03:00", "duration": "28m 44s", "trend": "▲", "health": "degraded"},
        {"job_name": "Document Archive", "schedule": "0 23 * * *", "last_run": "Yesterday 23:00", "duration": "8m 44s", "trend": "▼", "health": "degraded"},
        {"job_name": "Dwell Prediction Model Refresh", "schedule": "0 1 * * *", "last_run": "—missed—", "duration": "—", "trend": "—", "health": "failing"},
        {"job_name": "Carrier Performance Rollup", "schedule": "0 5 * * 1", "last_run": "Mon 05:00", "duration": "3m 21s", "trend": "—", "health": "healthy"},
    ]


def audit_rows() -> list[dict[str, str]]:
    return [
        {"timestamp": "2026-06-30 08:17", "user": "m.reyes", "action": "Acknowledge conflict", "target": "C-005", "environment": "PROD", "result": "Acknowledged"},
        {"timestamp": "2026-06-30 07:44", "user": "system", "action": "Detect conflict", "target": "C-005", "environment": "PROD", "result": "Critical raised"},
        {"timestamp": "2026-06-29 14:38", "user": "system", "action": "Auto-promote", "target": "AG-INV-FRTAUDIT@v1.0.4", "environment": "TEST→PROD", "result": "Promoted"},
        {"timestamp": "2026-06-29 12:18", "user": "d.kim", "action": "Edit conditions", "target": "AG-INV-FRTAUDIT", "environment": "TEST", "result": "Saved"},
        {"timestamp": "2026-06-29 09:42", "user": "m.reyes", "action": "Promote agent", "target": "AG-SHIP-RETENDER@v2.1.0-draft", "environment": "TEST→PROD", "result": "BLOCKED"},
        {"timestamp": "2026-06-29 09:38", "user": "m.reyes", "action": "Run regression suite", "target": "AG-SHIP-RETENDER@v2.1.0-draft", "environment": "TEST", "result": "5 passed / 1 failed"},
        {"timestamp": "2026-06-29 09:15", "user": "a.okafor", "action": "Edit conditions", "target": "AG-SHIP-RETENDER", "environment": "TEST", "result": "Saved"},
        {"timestamp": "2026-06-28 14:39", "user": "oracle.ai", "action": "Edit deploy", "target": "AG-AI-DWELL@v0.9-beta", "environment": "TEST", "result": "Deployed"},
        {"timestamp": "2026-06-28 08:50", "user": "s.patel", "action": "Acknowledge conflict", "target": "C-001", "environment": "PROD", "result": "Acknowledged"},
    ]


def trace_steps() -> list[dict[str, str]]:
    return [
        {"title": "Trigger received", "detail": "evt=TENDER_DECLINED, SHIPMENT_GID=NWL.SH10293", "duration": "12ms", "status": "ok"},
        {"title": "Load shipment context", "detail": "in: SHIPMENT_GID=NWL.SH10293 → out: status=DECLINED, retry_count=1", "duration": "86ms", "status": "ok"},
        {"title": "Evaluate guard conditions", "detail": "retry_count(1) < 3 ✓, alt_carrier_exists ✓", "duration": "22ms", "status": "ok"},
        {"title": "Select next carrier", "detail": "out: CARRIER_GID=NWL.CARR.SWIFT (Swift Freight)", "duration": "41ms", "status": "ok"},
        {"title": "Build tender payload", "detail": "out: payload 2.1KB · rate=$1,842.00 · service=LTL", "duration": "33ms", "status": "ok"},
        {"title": "POST tender — carrier API", "detail": "ERROR: CARRIER_TIMEOUT after 30000ms", "duration": "30.0s", "status": "failed"},
    ]


def diff_fields() -> list[dict[str, str]]:
    return [
        {"field": "trigger", "left": "TENDER_DECLINED", "right": "TENDER_DECLINED", "change": "modified"},
        {"field": "priority", "left": "High", "right": "Critical", "change": "modified"},
        {"field": "condition", "left": "retry_count < 2", "right": "retry_count < 3 and budget_guard", "change": "modified"},
        {"field": "read", "left": "CARRIER_PREF", "right": "CARRIER_PREF, TENDER_HINT", "change": "added"},
        {"field": "action", "left": "Re-tender next carrier", "right": "Re-tender next carrier + hold escalation", "change": "modified"},
        {"field": "write", "left": "retry_count", "right": "retry_count, hold_flag", "change": "added"},
        {"field": "success rate", "left": "94.8%", "right": "96.4%", "change": "modified"},
    ]


def ask_fallback(question: str) -> dict[str, object]:
    return {
        "answer": "Cannot determine from current snapshot: Ollama is not configured in this workspace, so the grounded chat endpoint is returning a local fallback.",
        "grounded": False,
        "question": question,
        "citations": ["AG-SHIP-AUTOTENDER", "AG-AI-DWELL", "C-002"],
    }
