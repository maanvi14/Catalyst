import csv
from collections.abc import Iterable
from pathlib import Path
from typing import Any, TypeVar

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Agent,
    AgentAction,
    AgentEvent,
    AiAgent,
    Domain,
    FixtureFile,
    RefnumQual,
    SavedQuery,
    SequenceCounter,
)

T = TypeVar("T")

REQUIRED_FIXTURE_FILES = {
    "AGENT.csv",
    "AGENT_ACTION.csv",
    "AGENT_EVENT.csv",
    "AI_AGENT.csv",
    "DOMAIN.csv",
    "REFNUM_QUAL.csv",
    "SAVED_QUERY.csv",
    "SEQUENCES.csv",
}


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    if stripped == "" or stripped.lower() == "null":
        return None
    return stripped


def _int(value: str | None) -> int | None:
    cleaned = _clean(value)
    return int(cleaned) if cleaned is not None else None


def _bool(value: str | None) -> bool:
    return _clean(value) in {"1", "true", "TRUE", "Y", "y", "yes", "YES"}


def _rows(path: Path) -> Iterable[dict[str, str | None]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        yield from csv.DictReader(handle)


def _upsert(session: Session, model: type[T], lookup: dict[str, Any], values: dict[str, Any]) -> T:
    instance = session.scalar(select(model).filter_by(**lookup))
    if instance is None:
        instance = model(**lookup, **values)  # type: ignore[call-arg]
        session.add(instance)
    else:
        for key, value in values.items():
            setattr(instance, key, value)
    return instance


class FixtureLoader:
    def __init__(self, fixture_dir: Path) -> None:
        self.fixture_dir = fixture_dir

    def validate(self) -> None:
        available = {path.name for path in self.fixture_dir.glob("*.csv")}
        missing = sorted(REQUIRED_FIXTURE_FILES - available)
        if missing:
            raise FileNotFoundError(f"Missing required fixture files: {', '.join(missing)}")

    def load_all(self, session: Session) -> dict[str, int]:
        self.validate()
        counts = {
            "DOMAIN.csv": self._load_domains(session),
            "AGENT.csv": self._load_agents(session),
            "AGENT_ACTION.csv": self._load_agent_actions(session),
            "AGENT_EVENT.csv": self._load_agent_events(session),
            "AI_AGENT.csv": self._load_ai_agents(session),
            "REFNUM_QUAL.csv": self._load_refnum_quals(session),
            "SAVED_QUERY.csv": self._load_saved_queries(session),
            "SEQUENCES.csv": self._load_sequences(session),
        }
        for file_name, row_count in counts.items():
            _upsert(session, FixtureFile, {"file_name": file_name}, {"row_count": row_count})
        session.commit()
        return counts

    def _load_domains(self, session: Session) -> int:
        count = 0
        for row in _rows(self.fixture_dir / "DOMAIN.csv"):
            _upsert(session, Domain, {"domain_gid": _clean(row["DOMAIN_GID"])}, {"domain_xid": _clean(row["DOMAIN_XID"]), "parent_domain_gid": _clean(row["PARENT_DOMAIN_GID"]), "description": _clean(row["DESCRIPTION"])})
            count += 1
        return count

    def _load_agents(self, session: Session) -> int:
        count = 0
        for row in _rows(self.fixture_dir / "AGENT.csv"):
            _upsert(session, Agent, {"agent_gid": _clean(row["AGENT_GID"])}, {"agent_xid": _clean(row["AGENT_XID"]), "domain_gid": _clean(row["DOMAIN_GID"]), "agent_name": _clean(row["AGENT_NAME"]), "target_object_type": _clean(row["TARGET_OBJECT_TYPE"]), "is_active": _bool(row["IS_ACTIVE"]), "definition": _clean(row["DEFINITION"])})
            count += 1
        return count

    def _load_agent_actions(self, session: Session) -> int:
        count = 0
        for row in _rows(self.fixture_dir / "AGENT_ACTION.csv"):
            _upsert(session, AgentAction, {"agent_gid": _clean(row["AGENT_GID"]), "seq_no": _int(row["SEQ_NO"])}, {"action_type": _clean(row["ACTION_TYPE"]), "parameters": _clean(row["PARAMETERS"]), "raw_text": _clean(row["RAW_TEXT"])})
            count += 1
        return count

    def _load_agent_events(self, session: Session) -> int:
        count = 0
        for row in _rows(self.fixture_dir / "AGENT_EVENT.csv"):
            _upsert(session, AgentEvent, {"agent_gid": _clean(row["AGENT_GID"]), "event_gid": _clean(row["EVENT_GID"])}, {"event_name": _clean(row["EVENT_NAME"]), "saved_condition_query_gid": _clean(row["SAVED_CONDITION_QUERY_GID"])})
            count += 1
        return count

    def _load_ai_agents(self, session: Session) -> int:
        count = 0
        for row in _rows(self.fixture_dir / "AI_AGENT.csv"):
            _upsert(session, AiAgent, {"agent_gid": _clean(row["AGENT_GID"])}, {"agent_xid": _clean(row["AGENT_XID"]), "domain_gid": _clean(row["DOMAIN_GID"]), "agent_name": _clean(row["AGENT_NAME"]), "visibility": _clean(row["VISIBILITY"]), "trigger_event": _clean(row["TRIGGER_EVENT"]), "definition_detail": _clean(row["DEFINITION_DETAIL"])})
            count += 1
        return count

    def _load_refnum_quals(self, session: Session) -> int:
        count = 0
        for row in _rows(self.fixture_dir / "REFNUM_QUAL.csv"):
            _upsert(session, RefnumQual, {"qual_gid": _clean(row["QUAL_GID"])}, {"qual_xid": _clean(row["QUAL_XID"]), "domain_gid": _clean(row["DOMAIN_GID"]), "target_object_type": _clean(row["TARGET_OBJECT_TYPE"]), "description": _clean(row["DESCRIPTION"])})
            count += 1
        return count

    def _load_saved_queries(self, session: Session) -> int:
        count = 0
        for row in _rows(self.fixture_dir / "SAVED_QUERY.csv"):
            _upsert(session, SavedQuery, {"query_gid": _clean(row["QUERY_GID"])}, {"query_xid": _clean(row["QUERY_XID"]), "domain_gid": _clean(row["DOMAIN_GID"]), "name": _clean(row["NAME"]), "target_object_type": _clean(row["TARGET_OBJECT_TYPE"]), "sql_text": _clean(row["SQL_TEXT"])})
            count += 1
        return count

    def _load_sequences(self, session: Session) -> int:
        count = 0
        for row in _rows(self.fixture_dir / "SEQUENCES.csv"):
            _upsert(session, SequenceCounter, {"sequence_name": _clean(row["SEQUENCE_NAME"]), "domain_gid": _clean(row["DOMAIN_GID"])}, {"current_value": _int(row["CURRENT_VALUE"]), "max_value": _int(row["MAX_VALUE"])})
            count += 1
        return count
