from sqlalchemy import Boolean, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Domain(Base):
    """OTM domain ownership and hierarchy from DOMAIN.csv."""

    __tablename__ = "domains"
    __table_args__ = (UniqueConstraint("domain_gid", name="uq_domains_domain_gid"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    domain_gid: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    domain_xid: Mapped[str] = mapped_column(String(255), nullable=False)
    parent_domain_gid: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)


class Agent(Base):
    """Configured OTM automation agent from AGENT.csv."""

    __tablename__ = "agents"
    __table_args__ = (UniqueConstraint("agent_gid", name="uq_agents_agent_gid"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    agent_gid: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    agent_xid: Mapped[str] = mapped_column(String(255), nullable=False)
    domain_gid: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    agent_name: Mapped[str] = mapped_column(String(255), nullable=False)
    target_object_type: Mapped[str | None] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    definition: Mapped[str | None] = mapped_column(Text)


class AgentAction(Base):
    """Ordered action executed by an OTM agent from AGENT_ACTION.csv."""

    __tablename__ = "agent_actions"
    __table_args__ = (UniqueConstraint("agent_gid", "seq_no", name="uq_agent_actions_agent_seq"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    agent_gid: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    seq_no: Mapped[int] = mapped_column(Integer, nullable=False)
    action_type: Mapped[str] = mapped_column(String(255), nullable=False)
    parameters: Mapped[str | None] = mapped_column(Text)
    raw_text: Mapped[str | None] = mapped_column(Text)


class AgentEvent(Base):
    """Event trigger attached to an OTM agent from AGENT_EVENT.csv."""

    __tablename__ = "agent_events"
    __table_args__ = (UniqueConstraint("agent_gid", "event_gid", name="uq_agent_events_agent_event"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    agent_gid: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    event_gid: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    event_name: Mapped[str] = mapped_column(String(255), nullable=False)
    saved_condition_query_gid: Mapped[str | None] = mapped_column(String(255))


class AiAgent(Base):
    """OTM 26B AI agent metadata from AI_AGENT.csv."""

    __tablename__ = "ai_agents"
    __table_args__ = (UniqueConstraint("agent_gid", name="uq_ai_agents_agent_gid"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    agent_gid: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    agent_xid: Mapped[str] = mapped_column(String(255), nullable=False)
    domain_gid: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    agent_name: Mapped[str] = mapped_column(String(255), nullable=False)
    visibility: Mapped[str] = mapped_column(String(100), nullable=False)
    trigger_event: Mapped[str | None] = mapped_column(String(255))
    definition_detail: Mapped[str | None] = mapped_column(Text)


class RefnumQual(Base):
    """Reference number qualifier configuration from REFNUM_QUAL.csv."""

    __tablename__ = "refnum_quals"
    __table_args__ = (UniqueConstraint("qual_gid", name="uq_refnum_quals_qual_gid"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    qual_gid: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    qual_xid: Mapped[str] = mapped_column(String(255), nullable=False)
    domain_gid: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    target_object_type: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)


class SavedQuery(Base):
    """Saved condition or finder SQL definition from SAVED_QUERY.csv."""

    __tablename__ = "saved_queries"
    __table_args__ = (UniqueConstraint("query_gid", name="uq_saved_queries_query_gid"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    query_gid: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    query_xid: Mapped[str] = mapped_column(String(255), nullable=False)
    domain_gid: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    target_object_type: Mapped[str | None] = mapped_column(String(100))
    sql_text: Mapped[str] = mapped_column(Text, nullable=False)


class SequenceCounter(Base):
    """OTM sequence counter values from SEQUENCES.csv."""

    __tablename__ = "sequences"
    __table_args__ = (UniqueConstraint("sequence_name", "domain_gid", name="uq_sequences_name_domain"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sequence_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    domain_gid: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    current_value: Mapped[int] = mapped_column(Integer, nullable=False)
    max_value: Mapped[int | None] = mapped_column(Integer)
