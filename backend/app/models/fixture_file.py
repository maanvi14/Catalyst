from datetime import datetime

from sqlalchemy import DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class FixtureFile(Base):
    """Tracks each source CSV load so fixture ingestion is observable."""

    __tablename__ = "fixture_files"
    __table_args__ = (UniqueConstraint("file_name", name="uq_fixture_files_file_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    row_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    loaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
