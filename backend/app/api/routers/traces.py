import os
import json
import time
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models import Agent
from app.api.routers.otm import get_env_definition, get_base_agent_definition
from app.api.routers.audit import write_audit_log

router = APIRouter(prefix="/traces")

TRACES_FILE = "backend/app/database/traces_history.json"

def load_traces_history() -> dict:
    if not os.path.exists(TRACES_FILE):
        return {}
    try:
        with open(TRACES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def save_traces_history(history: dict):
    os.makedirs(os.path.dirname(TRACES_FILE), exist_ok=True)
    with open(TRACES_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)

def generate_trace_data(run_id: str, db: Session) -> dict:
    agent = db.query(Agent).filter(Agent.agent_gid == "NWL.AUTO_TENDER_CARRIER").first()
    prod_definition = ""
    if agent:
        prod_definition = get_env_definition(agent.agent_gid, "PROD")
        if not prod_definition:
            prod_definition = agent.definition or get_base_agent_definition(agent.agent_gid)
            
    content = (prod_definition or "").lower()
    has_timeout_fix = "500ms" in content or "bounded" in content or "timeout fallback" in content or "timeout_fallback" in content or "wait" in content or "retry_gate" in content or "timeout" in content
    
    if has_timeout_fix:
        status = "SUCCESS"
        steps = [
            {"title": "Trigger received", "detail": "evt=TENDER_DECLINED, SHIPMENT_GID=NWL.SH10293", "duration": "12ms", "status": "ok"},
            {"title": "Load shipment context", "detail": "in: SHIPMENT_GID=NWL.SH10293 → out: status=DECLINED, retry_count=1", "duration": "86ms", "status": "ok"},
            {"title": "Evaluate guard conditions", "detail": "retry_count(1) < 3 ✓, alt_carrier_exists ✓, TENDER_HINT read active", "duration": "22ms", "status": "ok"},
            {"title": "Select next carrier", "detail": "out: CARRIER_GID=NWL.CARR.SWIFT (Swift Freight)", "duration": "41ms", "status": "ok"},
            {"title": "POST tender — carrier API", "detail": "CARRIER_TIMEOUT received, attempting bounded retry fallback", "duration": "30.0s", "status": "ok"},
            {"title": "Execute bounded wait", "detail": "Waiting for 500ms Retry Gate condition before escalation", "duration": "500ms", "status": "ok"},
            {"title": "Successful retry & confirm", "detail": "Tender accepted by alternative carrier on retry", "duration": "1.2s", "status": "ok"}
        ]
    else:
        status = "Failed · CARRIER_TIMEOUT"
        steps = [
            {"title": "Trigger received", "detail": "evt=TENDER_DECLINED, SHIPMENT_GID=NWL.SH10293", "duration": "12ms", "status": "ok"},
            {"title": "Load shipment context", "detail": "in: SHIPMENT_GID=NWL.SH10293 → out: status=DECLINED, retry_count=1", "duration": "86ms", "status": "ok"},
            {"title": "Evaluate guard conditions", "detail": "retry_count(1) < 3 ✓, alt_carrier_exists ✓", "duration": "22ms", "status": "ok"},
            {"title": "Select next carrier", "detail": "out: CARRIER_GID=NWL.CARR.SWIFT (Swift Freight)", "duration": "41ms", "status": "ok"},
            {"title": "Build tender payload", "detail": "out: payload 2.1KB · rate=$1,842.00 · service=LTL", "duration": "33ms", "status": "ok"},
            {"title": "POST tender — carrier API", "detail": "ERROR: CARRIER_TIMEOUT after 30000ms", "duration": "30.0s", "status": "failed"}
        ]
        
    return {
        "run_id": run_id,
        "agent_gid": "AG-SHIP-RETENDER",
        "shipment_gid": "NWL.SH10293",
        "status": status,
        "steps": steps
    }


@router.get("/{run_id}")
def get_trace(run_id: str, db: Session = Depends(get_db)) -> dict[str, object]:
    history = load_traces_history()
    if run_id in history:
        return history[run_id]
        
    trace_data = generate_trace_data(run_id, db)
    history[run_id] = trace_data
    save_traces_history(history)
    return trace_data


@router.post("/{run_id}/rerun")
def rerun_trace(run_id: str, db: Session = Depends(get_db)) -> dict[str, object]:
    trace_data = generate_trace_data(run_id, db)
    history = load_traces_history()
    history[run_id] = trace_data
    save_traces_history(history)
    
    write_audit_log("system", "Rerun trace", f"Shipment run {run_id}", "PROD", "SUCCESS" if trace_data["status"] == "SUCCESS" else "FAILED")
    
    return {"run_id": run_id, "status": trace_data["status"], "message": f"Successfully re-executed trace {run_id}."}