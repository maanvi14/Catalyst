import json
import os
import urllib.request
import urllib.error
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.rag import retrieve_context
from app.api.routers.audit import write_audit_log

from app.core.config import settings

router = APIRouter(prefix="/ask")

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"


def _call_groq(prompt: str) -> str:
    """Call the Groq API. Reads GROQ_API_KEY from framework config — never from source."""
    api_key = settings.groq_api_key or os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY environment variable is not set")

    req_body = {
        "model": GROQ_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.0,
        "max_tokens": 512,
    }
    req = urllib.request.Request(
        GROQ_API_URL,
        data=json.dumps(req_body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30.0) as response:
        res_data = json.loads(response.read().decode("utf-8"))
        return res_data["choices"][0]["message"]["content"]


@router.post("")
def ask_catalog(payload: dict[str, str], db: Session = Depends(get_db)) -> dict[str, object]:
    question = payload.get("question", "")

    # 1. Retrieve context & citations from keyword RAG engine
    context, citations = retrieve_context(question, db)

    # 2. Build a concise, grounded prompt
    prompt = f"""You are Catalyst AI, an expert assistant for Oracle OTM (Transportation Management) and GTM (Global Trade Management) agent configurations.

Answer the user's question concisely and precisely using ONLY the provided Context below. 
Reference specific IDs, GIDs, event names, and values from the context in your answer.
Do not invent information not present in the context.

Context:
{context}

Question: {question}
Answer:"""

    try:
        answer = _call_groq(prompt)
        write_audit_log("demo_user", "Query LLM (Ask Catalyst)", question[:40], "PROD", "SUCCESS")
        return {
            "answer": answer,
            "grounded": True,
            "question": question,
            "citations": citations,
        }
    except urllib.error.HTTPError as e:
        body = e.fp.read().decode("utf-8") if e.fp else str(e)
        write_audit_log("demo_user", "Ask Catalyst [Groq Error]", question[:40], "PROD", "ERROR")
        return {
            "answer": f"Groq API returned an error ({e.code}). Check that GROQ_API_KEY is valid and the service is reachable.",
            "grounded": False,
            "question": question,
            "citations": citations,
        }
    except Exception as e:
        write_audit_log("demo_user", "Ask Catalyst [Error]", question[:40], "PROD", "ERROR")
        return {
            "answer": f"Unable to reach Groq API: {e}. Verify GROQ_API_KEY is set in backend/.env.",
            "grounded": False,
            "question": question,
            "citations": citations,
        }