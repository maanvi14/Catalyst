import os
import json
import re
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import Agent, AiAgent
from app.conflicts.engine import ConflictEngine

TRACES_FILE = "backend/app/database/traces_history.json"


def get_all_documents(db: Session) -> list[dict]:
    docs = []

    # 1. Classic Agents
    agents = db.scalars(select(Agent)).all()
    for a in agents:
        text = (
            f"Agent GID: {a.agent_gid}. Name: {a.agent_name}. Domain: {a.domain_gid}. "
            f"Target object: {a.target_object_type}. XML Config: {a.definition or ''}"
        )
        docs.append({"id": a.agent_gid, "text": text, "metadata": {"type": "agent", "id": a.agent_gid}})

    # 2. AI Agents
    ai_agents = db.scalars(select(AiAgent)).all()
    for a in ai_agents:
        text = (
            f"AI Agent GID: {a.agent_gid}. Name: {a.agent_name}. Domain: {a.domain_gid}. "
            f"Trigger event: {a.trigger_event or ''}. Config detail: {a.definition_detail or ''}"
        )
        docs.append({"id": a.agent_gid, "text": text, "metadata": {"type": "ai_agent", "id": a.agent_gid}})

    # 3. Conflicts
    engine = ConflictEngine()
    conflicts = engine._detect(db)
    for c in conflicts:
        agent_names = " and ".join(a.agent_name for a in c.affected_agents)
        agent_gids = ", ".join(a.agent_gid for a in c.affected_agents)
        text = (
            f"Conflict ID: {c.conflict_id}. Severity: {c.severity}. Type: {c.conflict_type}. "
            f"Trigger Event: {c.trigger_event}. Affected Agents: {agent_names} ({agent_gids}). "
            f"Suggested resolution: {c.suggested_resolution}"
        )
        docs.append({"id": c.conflict_id, "text": text, "metadata": {"type": "conflict", "id": c.conflict_id}})

    # 4. Trace history
    if os.path.exists(TRACES_FILE):
        try:
            with open(TRACES_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
                for run_id, trace in history.items():
                    steps_detail = " | ".join(
                        f"{s['title']}: {s['detail']} ({s['status']})" for s in trace.get("steps", [])
                    )
                    text = (
                        f"Trace Run ID: {run_id}. Agent GID: {trace.get('agent_gid')}. "
                        f"Shipment: {trace.get('shipment_gid')}. Status: {trace.get('status')}. "
                        f"Steps: {steps_detail}"
                    )
                    docs.append({"id": run_id, "text": text, "metadata": {"type": "trace", "id": run_id}})
        except Exception:
            pass

    return docs


def retrieve_context(query: str, db: Session, top_k: int = 5) -> tuple[str, list[str]]:
    """
    Keyword-based retrieval — no LLM embeddings required.
    Scores documents by how many query tokens appear in their text.
    Groq handles the understanding step; retrieval just needs to surface relevant chunks.
    """
    docs = get_all_documents(db)
    if not docs:
        return "", []

    query_lower = query.lower()
    query_clean = re.sub(r'[^a-zA-Z0-9\s]', ' ', query_lower)
    stopwords = {
        'why', 'did', 'the', 'what', 'on', 'show', 'all', 'and', 'version', 
        'versions', 'compare', 'of', 'about', 'for', 'with', 'from', 'your', 
        'last', 'night', 'involving', 'me', 'between'
    }
    query_tokens = [w for w in query_clean.split() if (len(w) >= 3 or w == "ai") and w not in stopwords]

    scores: list[tuple[float, dict]] = []
    for doc in docs:
        text_lower = doc["text"].lower()
        score = 0
        for token in query_tokens:
            is_exact = re.search(r'\b' + re.escape(token) + r'\b', text_lower) is not None
            if len(token) < 4:
                # Short tokens must match exactly on word boundary
                if is_exact:
                    score += 5
            else:
                if token in text_lower:
                    score += 2
                    if is_exact:
                        score += 3
        # Bonus: exact phrase match
        if query_lower[:20] in text_lower:
            score += 5
        scores.append((score, doc))

    scores.sort(key=lambda x: x[0], reverse=True)
    top_docs = [item[1] for item in scores[:top_k] if item[0] > 0]

    # Always include at least some context even if no strong match
    if not top_docs:
        top_docs = [item[1] for item in scores[:top_k]]

    context_parts = []
    citations = []
    for doc in top_docs:
        context_parts.append(
            f"Source ID: {doc['id']} (Type: {doc['metadata']['type']})\nContent: {doc['text']}"
        )
        citations.append(doc["id"])

    return "\n\n---\n\n".join(context_parts), citations
