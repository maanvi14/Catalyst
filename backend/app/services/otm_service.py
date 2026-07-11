from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Agent, AgentAction, AgentEvent, AiAgent, Domain, FixtureFile, SavedQuery, SequenceCounter
from app.schemas.otm import AgentDetail, DashboardSummary


def dashboard_summary(session: Session) -> DashboardSummary:
    return DashboardSummary(
        domains=session.scalar(select(func.count()).select_from(Domain)) or 0,
        agents=session.scalar(select(func.count()).select_from(Agent)) or 0,
        active_agents=session.scalar(select(func.count()).select_from(Agent).where(Agent.is_active.is_(True))) or 0,
        ai_agents=session.scalar(select(func.count()).select_from(AiAgent)) or 0,
        events=session.scalar(select(func.count()).select_from(AgentEvent)) or 0,
        actions=session.scalar(select(func.count()).select_from(AgentAction)) or 0,
        saved_queries=session.scalar(select(func.count()).select_from(SavedQuery)) or 0,
        sequences=session.scalar(select(func.count()).select_from(SequenceCounter)) or 0,
        fixture_files_loaded=session.scalar(select(func.count()).select_from(FixtureFile)) or 0,
    )


def get_agent_detail(session: Session, agent_id: int) -> AgentDetail:
    agent = session.get(Agent, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    actions = list(session.scalars(select(AgentAction).where(AgentAction.agent_gid == agent.agent_gid).order_by(AgentAction.seq_no)))
    events = list(session.scalars(select(AgentEvent).where(AgentEvent.agent_gid == agent.agent_gid).order_by(AgentEvent.event_gid)))
    ai_profile = session.scalar(select(AiAgent).where(AiAgent.agent_gid == agent.agent_gid))
    return AgentDetail.model_validate({**agent.__dict__, "actions": actions, "events": events, "ai_profile": ai_profile})


def get_agent_detail_by_gid(session: Session, agent_gid: str) -> AgentDetail:
    agent = session.scalar(select(Agent).where(Agent.agent_gid == agent_gid))
    if agent is None:
        ai_agent = session.scalar(select(AiAgent).where(AiAgent.agent_gid == agent_gid))
        if ai_agent is None:
            raise HTTPException(status_code=404, detail="Agent not found")
        # Map AI agent properties to AgentDetail structure
        return AgentDetail.model_validate({
            "id": ai_agent.id,
            "agent_gid": ai_agent.agent_gid,
            "agent_xid": ai_agent.agent_xid,
            "domain_gid": ai_agent.domain_gid,
            "agent_name": ai_agent.agent_name,
            "target_object_type": "SHIPMENT",
            "is_active": True,
            "definition": ai_agent.definition_detail,
            "actions": [],
            "events": [],
            "ai_profile": ai_agent
        })
    actions = list(session.scalars(select(AgentAction).where(AgentAction.agent_gid == agent.agent_gid).order_by(AgentAction.seq_no)))
    events = list(session.scalars(select(AgentEvent).where(AgentEvent.agent_gid == agent.agent_gid).order_by(AgentEvent.event_gid)))
    ai_profile = session.scalar(select(AiAgent).where(AiAgent.agent_gid == agent.agent_gid))
    return AgentDetail.model_validate({**agent.__dict__, "actions": actions, "events": events, "ai_profile": ai_profile})

