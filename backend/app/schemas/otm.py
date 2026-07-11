from pydantic import BaseModel, ConfigDict


class DomainRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    domain_gid: str
    domain_xid: str
    parent_domain_gid: str | None
    description: str | None


class AgentActionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    agent_gid: str
    seq_no: int
    action_type: str
    parameters: str | None
    raw_text: str | None


class AgentEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    agent_gid: str
    event_gid: str
    event_name: str
    saved_condition_query_gid: str | None


class AiAgentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    agent_gid: str
    agent_xid: str
    domain_gid: str
    agent_name: str
    visibility: str
    trigger_event: str | None
    definition_detail: str | None


class AgentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    agent_gid: str
    agent_xid: str
    domain_gid: str
    agent_name: str
    target_object_type: str | None
    is_active: bool
    definition: str | None


class AgentDetail(AgentRead):
    actions: list[AgentActionRead]
    events: list[AgentEventRead]
    ai_profile: AiAgentRead | None


class SavedQueryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    query_gid: str
    query_xid: str
    domain_gid: str
    name: str
    target_object_type: str | None
    sql_text: str


class SequenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sequence_name: str
    domain_gid: str
    current_value: int
    max_value: int | None


class DashboardSummary(BaseModel):
    domains: int
    agents: int
    active_agents: int
    ai_agents: int
    events: int
    actions: int
    saved_queries: int
    sequences: int
    fixture_files_loaded: int
