import os
import json
import datetime
from fastapi import APIRouter, Depends, HTTPException

from app.core.config import settings
from app.services.demo_data import process_health_rows
from app.schemas.health import HealthResponse
from app.api.routers.audit import write_audit_log

router = APIRouter()

HEALTH_FILE = "backend/app/database/process_health.json"

def load_jobs() -> list[dict]:
    if not os.path.exists(HEALTH_FILE):
        jobs = process_health_rows()
        save_jobs(jobs)
        return jobs
    try:
        with open(HEALTH_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return process_health_rows()

def save_jobs(jobs: list[dict]):
    os.makedirs(os.path.dirname(HEALTH_FILE), exist_ok=True)
    with open(HEALTH_FILE, "w", encoding="utf-8") as f:
        json.dump(jobs, f, indent=2)

def update_job_activity(job_name: str, health: str = "healthy"):
    try:
        jobs = load_jobs()
        for job in jobs:
            if job["job_name"].lower() == job_name.lower():
                job["last_run"] = datetime.datetime.now().strftime("Today %H:%M")
                job["duration"] = "1m 05s"
                job["health"] = health
                job["trend"] = "▲"
                break
        save_jobs(jobs)
    except Exception:
        pass


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok", service=settings.app_name, environment=settings.app_env)


@router.get("/processes")
def process_health() -> list[dict]:
    return load_jobs()


@router.post("/processes/{job_name}/trigger")
def trigger_process_job(job_name: str) -> dict:
    jobs = load_jobs()
    found = False
    for job in jobs:
        if job["job_name"].lower() == job_name.lower():
            job["last_run"] = datetime.datetime.now().strftime("Today %H:%M")
            job["duration"] = "2m 14s"
            job["health"] = "healthy"
            job["trend"] = "▲"
            found = True
            break
            
    if not found:
        raise HTTPException(status_code=404, detail=f"Job '{job_name}' not found")
        
    save_jobs(jobs)
    write_audit_log("system", "Trigger batch run", job_name, "PROD", "SUCCESS")
    
    return {"status": "success", "message": f"Successfully triggered job {job_name}"}

