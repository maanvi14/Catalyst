import os
import json
import datetime
from fastapi import APIRouter

from app.services.demo_data import audit_rows

router = APIRouter(prefix="/audit")

AUDIT_FILE = "backend/app/database/audit_logs.json"

def write_audit_log(user: str, action: str, target: str, environment: str, result: str):
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    log_entry = {
        "timestamp": now_str,
        "user": user,
        "action": action,
        "target": target,
        "environment": environment,
        "result": result
    }
    
    logs = []
    if os.path.exists(AUDIT_FILE):
        try:
            with open(AUDIT_FILE, "r", encoding="utf-8") as f:
                logs = json.load(f)
        except Exception:
            pass
    logs.insert(0, log_entry) # Put newest at the top
    os.makedirs(os.path.dirname(AUDIT_FILE), exist_ok=True)
    with open(AUDIT_FILE, "w", encoding="utf-8") as f:
        json.dump(logs, f, indent=2)


@router.get("")
def get_audit_logs() -> list[dict[str, str]]:
    live_logs = []
    if os.path.exists(AUDIT_FILE):
        try:
            with open(AUDIT_FILE, "r", encoding="utf-8") as f:
                live_logs = json.load(f)
        except Exception:
            pass
    return live_logs + audit_rows()


@router.post("/export")
def export_audit_logs() -> dict[str, str]:
    return {"filename": "audit-export.csv", "status": "completed"}