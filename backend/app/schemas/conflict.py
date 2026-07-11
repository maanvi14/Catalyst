from pydantic import BaseModel, ConfigDict


class ConflictAgentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    agent_gid: str
    agent_xid: str
    agent_name: str
    domain_gid: str
    source: str


class ConflictRead(BaseModel):
    conflict_id: str
    conflict_type: str
    severity: str
    trigger_event: str
    affected_agents: list[ConflictAgentRead]
    suggested_resolution: str


class ConflictDetail(ConflictRead):
    evidence_count: int