from contextlib import asynccontextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import settings
from app.database.session import SessionLocal
from app.middleware.cors import configure_cors
from app.services.fixture_loader import FixtureLoader


def run_migrations() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    alembic_cfg = Config(str(backend_root / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(backend_root / "alembic"))
    command.upgrade(alembic_cfg, "head")


@asynccontextmanager
async def lifespan(app: FastAPI):
    run_migrations()
    if settings.auto_load_fixtures:
        with SessionLocal() as session:
            FixtureLoader(settings.fixture_path).load_all(session)
    yield


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
    configure_cors(app)
    app.include_router(api_router)
    if settings.api_prefix:
        app.include_router(api_router, prefix=settings.api_prefix)
    return app


app = create_app()
