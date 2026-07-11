from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FixtureFileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_name: str
    row_count: int
    loaded_at: datetime | None