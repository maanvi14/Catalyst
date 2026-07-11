from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models import FixtureFile
from app.schemas.fixture import FixtureFileRead

router = APIRouter()


@router.get("/uploads", response_model=list[FixtureFileRead])
def list_fixture_uploads(session: Session = Depends(get_db)) -> list[FixtureFile]:
    return list(session.scalars(select(FixtureFile).order_by(FixtureFile.loaded_at.desc(), FixtureFile.file_name)))