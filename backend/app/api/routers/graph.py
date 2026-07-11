from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.graph.engine import WorkflowGraphEngine
from app.schemas.graph import GraphResponse

router = APIRouter()
engine = WorkflowGraphEngine()


@router.get("", response_model=GraphResponse)
def get_graph(session: Session = Depends(get_db)) -> GraphResponse:
    return engine.build(session)