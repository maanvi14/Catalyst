"""
Hybrid Scoring Retrieval Service
-----------------------------
This service implements a hybrid search retriever that combines lexical keyword scoring 
and semantic vector search to improve context retrieval for the RAG pipeline.

Key Concepts:
1. Lexical (Keyword) Scorer: Uses token-overlap matching and exact phrase bonuses. 
   Excellent for precise match identifiers (e.g. agent GIDs like 'NWL.AUTO_TENDER_CARRIER').
2. Semantic (Vector) Scorer: Uses SentenceTransformer ('all-MiniLM-L6-v2') embeddings 
   stored in a persistent local ChromaDB collection. Captures contextual and conceptual relevance.
3. Score Merging: Both keyword scores and semantic similarity scores (derived from cosine distance) 
   are normalized to a [0, 1] range using min-max scaling. They are then linearly combined:
   final_score = 0.5 * keyword_norm + 0.5 * semantic_norm.
4. Robust Fallback: Wrapped in error handling so that if ChromaDB or sentence-transformers fail 
   to load (e.g. due to Render free tier memory limits), it logs a warning and falls back to pure 
   lexical scoring without breaking the endpoint.
"""
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
    Hybrid retrieval combining keyword-based overlap and semantic search.
    Scores are normalized to [0, 1] and merged equally:
    final_score = 0.5 * keyword_norm + 0.5 * semantic_norm
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

    # 1. Run the existing keyword scorer (exactly as-is)
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

    # 2. Run semantic search if enabled in config
    enable_semantic = False
    try:
        from app.core.config import settings
        enable_semantic = settings.enable_semantic_rag
    except Exception:
        pass

    semantic_scores = {}
    if enable_semantic:
        try:
            from app.services.embeddings import semantic_search
            # Retrieve semantic similarity scores for all documents to normalize them properly
            results = semantic_search(query, top_k=len(docs))
            semantic_scores = {doc_id: sim_score for doc_id, sim_score in results}
        except Exception as e:
            import logging
            logging.warning(f"Semantic search failed, falling back to keyword scoring: {e}")
            enable_semantic = False

    # 3. Merge scores by normalizing them to 0-1
    final_scores: list[tuple[float, dict]] = []
    if enable_semantic and semantic_scores:
        # Min-max normalization for keyword scores
        keyword_raw_vals = [s[0] for s in scores]
        min_keyword = min(keyword_raw_vals) if keyword_raw_vals else 0.0
        max_keyword = max(keyword_raw_vals) if keyword_raw_vals else 0.0
        keyword_range = max_keyword - min_keyword

        # Min-max normalization for semantic scores
        sem_raw_vals = [semantic_scores.get(doc["id"], 0.0) for doc in docs]
        min_semantic = min(sem_raw_vals) if sem_raw_vals else 0.0
        max_semantic = max(sem_raw_vals) if sem_raw_vals else 0.0
        semantic_range = max_semantic - min_semantic

        for score, doc in scores:
            doc_id = doc["id"]
            
            # Normalize keyword score to 0-1
            if keyword_range > 0:
                keyword_norm = (score - min_keyword) / keyword_range
            else:
                keyword_norm = 0.0
                
            # Normalize semantic score to 0-1
            sem_score = semantic_scores.get(doc_id, 0.0)
            if semantic_range > 0:
                semantic_norm = (sem_score - min_semantic) / semantic_range
            else:
                semantic_norm = 0.0
                
            final_score = 0.5 * keyword_norm + 0.5 * semantic_norm
            final_scores.append((final_score, doc))
    else:
        # Fall back to pure keyword scores (if semantic search is disabled or failed)
        final_scores = scores

    final_scores.sort(key=lambda x: x[0], reverse=True)
    top_docs = [item[1] for item in final_scores[:top_k] if item[0] > 0]

    # Always include at least some context even if no strong match
    if not top_docs:
        top_docs = [item[1] for item in final_scores[:top_k]]

    context_parts = []
    citations = []
    for doc in top_docs:
        context_parts.append(
            f"Source ID: {doc['id']} (Type: {doc['metadata']['type']})\nContent: {doc['text']}"
        )
        citations.append(doc["id"])

    return "\n\n---\n\n".join(context_parts), citations
