from fastapi import APIRouter

from app.api.routers import ask, audit, conflicts, fixtures, graph, health, modules, otm, traces

api_router = APIRouter()
api_router.include_router(ask.router, tags=["ask"])
api_router.include_router(audit.router, tags=["audit"])
api_router.include_router(conflicts.router, prefix="/conflicts", tags=["conflicts"])
api_router.include_router(fixtures.router, prefix="/fixtures", tags=["fixtures"])
api_router.include_router(graph.router, prefix="/graph", tags=["graph"])
api_router.include_router(health.router, tags=["health"])
api_router.include_router(modules.router, prefix="/modules", tags=["modules"])
api_router.include_router(otm.router, tags=["otm"])
api_router.include_router(traces.router, tags=["traces"])
