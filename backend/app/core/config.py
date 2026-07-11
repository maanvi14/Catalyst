from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Catalyst API"
    app_env: str = "development"
    api_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./catalyst.db"
    cors_origins: str = Field(default="http://localhost:3000,http://localhost:3001")
    fixture_dir: str = "fixtures/nwl-26b"
    auto_load_fixtures: bool = True
    groq_api_key: str = Field(default="")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def fixture_path(self) -> Path:
        return (Path(__file__).resolve().parents[3] / self.fixture_dir).resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

