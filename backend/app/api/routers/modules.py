from fastapi import APIRouter

from app.schemas.module import ModuleSummary
from app.services.module_registry import get_module_registry

router = APIRouter()


@router.get("", response_model=list[ModuleSummary])
def list_modules() -> list[ModuleSummary]:
    return get_module_registry()

