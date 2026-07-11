from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.conflict import ConflictDetail, ConflictRead
from app.conflicts.engine import ConflictEngine

from app.api.routers.audit import write_audit_log

router = APIRouter()
engine = ConflictEngine()


@router.get("", response_model=list[ConflictRead])
def list_conflicts(session: Session = Depends(get_db)) -> list[ConflictRead]:
    write_audit_log("system", "Scan conflicts", "ConflictEngine", "PROD", "SUCCESS")
    return engine.list_conflicts(session)


@router.get("/{conflict_id}", response_model=ConflictDetail)
def get_conflict(conflict_id: str, session: Session = Depends(get_db)) -> ConflictDetail:
    conflict = engine.get_conflict(session, conflict_id)
    if conflict is None:
        raise HTTPException(status_code=404, detail="Conflict not found")
    return conflict