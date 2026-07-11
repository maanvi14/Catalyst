from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from hashlib import sha1

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Agent, AgentEvent, AiAgent
from app.schemas.conflict import ConflictAgentRead, ConflictDetail, ConflictRead


@dataclass(frozen=True)
class ConflictRecord:
    conflict_id: str
    conflict_type: str
    severity: str
    trigger_event: str
    affected_agents: tuple[ConflictAgentRead, ...]
    suggested_resolution: str
    evidence_count: int


class ConflictEngine:
    def list_conflicts(self, session: Session) -> list[ConflictRead]:
        return [self._to_read(record) for record in self._detect(session)]

    def get_conflict(self, session: Session, conflict_id: str) -> ConflictDetail | None:
        for record in self._detect(session):
            if record.conflict_id == conflict_id:
                return ConflictDetail(**record.__dict__)
        return None

    def _detect(self, session: Session) -> list[ConflictRecord]:
        legacy_agents = {agent.agent_gid: agent for agent in session.scalars(select(Agent))}
        ai_agents = {agent.agent_gid: agent for agent in session.scalars(select(AiAgent))}

        legacy_events: dict[str, dict[str, ConflictAgentRead]] = defaultdict(dict)
        legacy_event_rows: dict[str, int] = defaultdict(int)
        for event in session.scalars(select(AgentEvent)):
            legacy_agent = legacy_agents.get(event.agent_gid)
            if legacy_agent is None:
                continue
            trigger_event = event.event_name.strip()
            legacy_events[trigger_event][legacy_agent.agent_gid] = ConflictAgentRead(
                    agent_gid=legacy_agent.agent_gid,
                    agent_xid=legacy_agent.agent_xid,
                    agent_name=legacy_agent.agent_name,
                    domain_gid=legacy_agent.domain_gid,
                    source="legacy",
                )
            legacy_event_rows[trigger_event] += 1

        ai_events: dict[str, dict[str, ConflictAgentRead]] = defaultdict(dict)
        for ai_agent in ai_agents.values():
            if not ai_agent.trigger_event:
                continue
            trigger_event = ai_agent.trigger_event.strip()
            ai_events[trigger_event][ai_agent.agent_gid] = ConflictAgentRead(
                    agent_gid=ai_agent.agent_gid,
                    agent_xid=ai_agent.agent_xid,
                    agent_name=ai_agent.agent_name,
                    domain_gid=ai_agent.domain_gid,
                    source="ai",
                )

        records: list[ConflictRecord] = []
        for trigger_event in sorted(set(legacy_events) | set(ai_events)):
            legacy_group = list(legacy_events.get(trigger_event, {}).values())
            ai_group = list(ai_events.get(trigger_event, {}).values())
            if len(legacy_group) >= 2:
                records.extend(self._build_pairwise_conflicts(trigger_event, "legacy-legacy", legacy_group, legacy_event_rows[trigger_event]))
            if legacy_group and ai_group:
                records.extend(self._build_cross_conflicts(trigger_event, legacy_group, ai_group, legacy_event_rows[trigger_event]))
            if len(ai_group) >= 2:
                records.extend(self._build_pairwise_conflicts(trigger_event, "ai-ai", ai_group, len(ai_group)))

        records.sort(key=lambda record: (record.trigger_event, record.conflict_type, record.conflict_id))
        return records

    def _build_pairwise_conflicts(
        self,
        trigger_event: str,
        conflict_type: str,
        agents: list[ConflictAgentRead],
        evidence_count: int,
    ) -> list[ConflictRecord]:
        records: list[ConflictRecord] = []
        for left_index in range(len(agents) - 1):
            for right_index in range(left_index + 1, len(agents)):
                left_agent = agents[left_index]
                right_agent = agents[right_index]
                record = self._make_record(
                    trigger_event=trigger_event,
                    conflict_type=conflict_type,
                    affected_agents=(left_agent, right_agent),
                    evidence_count=evidence_count,
                )
                records.append(record)
        return records

    def _build_cross_conflicts(
        self,
        trigger_event: str,
        legacy_group: list[ConflictAgentRead],
        ai_group: list[ConflictAgentRead],
        evidence_count: int,
    ) -> list[ConflictRecord]:
        records: list[ConflictRecord] = []
        for legacy_agent in legacy_group:
            for ai_agent in ai_group:
                records.append(
                    self._make_record(
                        trigger_event=trigger_event,
                        conflict_type="legacy-ai",
                        affected_agents=(legacy_agent, ai_agent),
                        evidence_count=evidence_count,
                    )
                )
        return records

    def _make_record(
        self,
        *,
        trigger_event: str,
        conflict_type: str,
        affected_agents: tuple[ConflictAgentRead, ConflictAgentRead],
        evidence_count: int,
    ) -> ConflictRecord:
        conflict_id = self._conflict_id(trigger_event, conflict_type, affected_agents)
        severity = self._severity(conflict_type, len(affected_agents), evidence_count)
        suggested_resolution = self._suggest_resolution(conflict_type, trigger_event, affected_agents)
        return ConflictRecord(
            conflict_id=conflict_id,
            conflict_type=conflict_type,
            severity=severity,
            trigger_event=trigger_event,
            affected_agents=affected_agents,
            suggested_resolution=suggested_resolution,
            evidence_count=evidence_count,
        )

    def _conflict_id(
        self,
        trigger_event: str,
        conflict_type: str,
        affected_agents: tuple[ConflictAgentRead, ConflictAgentRead],
    ) -> str:
        canonical_agents = sorted(agent.agent_gid for agent in affected_agents)
        payload = "|".join([conflict_type, trigger_event, *canonical_agents])
        digest = sha1(payload.encode("utf-8")).hexdigest()[:12]
        return f"conflict-{digest}"

    def _severity(self, conflict_type: str, agent_count: int, evidence_count: int) -> str:
        if conflict_type != "legacy-legacy":
            return "high" if evidence_count > 1 or agent_count >= 2 else "medium"
        if evidence_count > 2:
            return "high"
        return "medium"

    def _suggest_resolution(
        self,
        conflict_type: str,
        trigger_event: str,
        affected_agents: tuple[ConflictAgentRead, ConflictAgentRead],
    ) -> str:
        agent_names = " and ".join(agent.agent_name for agent in affected_agents)
        if conflict_type == "legacy-legacy":
            return f"Split or sequence the legacy agents {agent_names} on {trigger_event} to avoid simultaneous execution."
        if conflict_type == "legacy-ai":
            return f"Choose whether {agent_names} should own {trigger_event}, or gate one path with an additional condition."
        return f"Resolve the overlapping AI trigger on {trigger_event} by consolidating {agent_names} or adding priority logic."

    def _to_read(self, record: ConflictRecord) -> ConflictRead:
        return ConflictRead(
            conflict_id=record.conflict_id,
            conflict_type=record.conflict_type,
            severity=record.severity,
            trigger_event=record.trigger_event,
            affected_agents=list(record.affected_agents),
            suggested_resolution=record.suggested_resolution,
        )

