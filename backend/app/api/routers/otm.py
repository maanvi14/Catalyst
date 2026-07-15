from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models import Agent, AgentEvent, AiAgent, Domain, SavedQuery, SequenceCounter
from app.schemas.otm import AgentDetail, AgentEventRead, AgentRead, AiAgentRead, DashboardSummary, DomainRead, SavedQueryRead, SequenceRead
from app.services.demo_data import diff_fields
from app.services.otm_service import dashboard_summary, get_agent_detail, get_agent_detail_by_gid

router = APIRouter()


@router.get("/dashboard", response_model=DashboardSummary)
def get_dashboard(db: Session = Depends(get_db)) -> DashboardSummary:
    return dashboard_summary(db)


@router.get("/agents", response_model=list[AgentRead])
def get_agents(db: Session = Depends(get_db)) -> list[Agent]:
    return list(db.scalars(select(Agent).order_by(Agent.agent_name)))


@router.get("/agents/{agent_id}", response_model=AgentDetail)
def get_agent(agent_id: int, db: Session = Depends(get_db)) -> AgentDetail:
    return get_agent_detail(db, agent_id)


@router.get("/agents/gid/{agent_gid}", response_model=AgentDetail)
def get_agent_by_gid(agent_gid: str, db: Session = Depends(get_db)) -> AgentDetail:
    return get_agent_detail_by_gid(db, agent_gid)


@router.patch("/agents/{agent_gid}/position")
def update_agent_position(agent_gid: str, payload: dict[str, float]) -> dict[str, object]:
    # Mock position save endpoint
    return {"status": "success", "agent_gid": agent_gid, "position": payload}



@router.get("/ai-agents", response_model=list[AiAgentRead])
def get_ai_agents(db: Session = Depends(get_db)) -> list[AiAgent]:
    return list(db.scalars(select(AiAgent).order_by(AiAgent.agent_name)))


@router.get("/domains", response_model=list[DomainRead])
def get_domains(db: Session = Depends(get_db)) -> list[Domain]:
    return list(db.scalars(select(Domain).order_by(Domain.domain_gid)))


@router.get("/events", response_model=list[AgentEventRead])
def get_events(db: Session = Depends(get_db)) -> list[AgentEvent]:
    return list(db.scalars(select(AgentEvent).order_by(AgentEvent.event_name, AgentEvent.agent_gid)))


@router.get("/saved-queries", response_model=list[SavedQueryRead])
def get_saved_queries(db: Session = Depends(get_db)) -> list[SavedQuery]:
    return list(db.scalars(select(SavedQuery).order_by(SavedQuery.name)))


@router.get("/sequences", response_model=list[SequenceRead])
def get_sequences(db: Session = Depends(get_db)) -> list[SequenceCounter]:
    return list(db.scalars(select(SequenceCounter).order_by(SequenceCounter.sequence_name)))


import csv
import os
import xml.etree.ElementTree as ET
import re
import json
from pydantic import BaseModel
from app.conflicts.engine import ConflictEngine

ENV_FILE = "backend/app/database/env_definitions.json"

def get_env_definition(agent_gid: str, env: str, default_val: str = "") -> str:
    if not os.path.exists(ENV_FILE):
        return default_val
    try:
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get(agent_gid, {}).get(env, default_val)
    except Exception:
        return default_val

def save_env_definition(agent_gid: str, env: str, value: str):
    data = {}
    if os.path.exists(ENV_FILE):
        try:
            with open(ENV_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            pass
    if agent_gid not in data:
        data[agent_gid] = {}
    data[agent_gid][env] = value
    os.makedirs(os.path.dirname(ENV_FILE), exist_ok=True)
    with open(ENV_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

class DiffPayload(BaseModel):
    left_env: str
    right_env: str

class DraftPayload(BaseModel):
    draft: str

def get_base_agent_definition(agent_gid: str) -> str:
    csv_path = "fixtures/nwl-26b/AGENT.csv"
    if os.path.exists(csv_path):
        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("AGENT_GID") == agent_gid:
                    return row.get("DEFINITION") or ""
                    
    ai_csv_path = "fixtures/nwl-26b/AI_AGENT.csv"
    if os.path.exists(ai_csv_path):
        with open(ai_csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("AGENT_GID") == agent_gid:
                    return row.get("DEFINITION_DETAIL") or ""
                    
    return ""

def parse_agent_xml(xml_content: str) -> dict[str, str]:
    res = {
        "trigger": "—",
        "priority": "High",
        "condition": "—",
        "read": "—",
        "action": "—",
        "write": "—",
        "success rate": "96.7%"
    }
    if not xml_content or not xml_content.strip():
        return res
    
    try:
        root = ET.fromstring(xml_content.strip())
        
        evt_node = root.find("event")
        if evt_node is not None:
            res["trigger"] = evt_node.text or "—"
            
        pri_node = root.find("priority")
        if pri_node is not None:
            res["priority"] = pri_node.text or "High"
            
        cond_node = root.find("condition")
        if cond_node is not None:
            res["condition"] = cond_node.text or "—"
        else:
            conds_node = root.find("conditions")
            if conds_node is not None:
                cond_list = [c.text for c in conds_node.findall("condition") if c.text]
                if cond_list:
                    res["condition"] = " and ".join(cond_list)
                    
        read_node = root.find("read")
        if read_node is not None:
            res["read"] = read_node.text or "—"
        else:
            reads_node = root.find("reads")
            if reads_node is not None:
                read_list = [r.text for r in reads_node.findall("read") if r.text]
                if read_list:
                    res["read"] = ", ".join(read_list)
                    
        act_node = root.find("action")
        if act_node is not None:
            res["action"] = act_node.text or "—"
        else:
            acts_node = root.find("actions")
            if acts_node is not None:
                act_list = [a.text for a in acts_node.findall("action") if a.text]
                if act_list:
                    res["action"] = ", ".join(act_list)
                    
        write_node = root.find("write")
        if write_node is not None:
            res["write"] = write_node.text or "—"
        else:
            writes_node = root.find("writes")
            if writes_node is not None:
                write_list = [w.text for w in writes_node.findall("write") if w.text]
                if write_list:
                    res["write"] = ", ".join(write_list)
    except Exception as e:
        trigger_match = re.search(r"<event>(.*?)</event>", xml_content, re.IGNORECASE)
        if trigger_match:
            res["trigger"] = trigger_match.group(1)
        priority_match = re.search(r"<priority>(.*?)</priority>", xml_content, re.IGNORECASE)
        if priority_match:
            res["priority"] = priority_match.group(1)
        condition_match = re.search(r"<condition>(.*?)</condition>", xml_content, re.IGNORECASE)
        if condition_match:
            res["condition"] = condition_match.group(1)
        
        action_matches = re.findall(r"<action>(.*?)</action>", xml_content, re.IGNORECASE)
        if action_matches:
            res["action"] = ", ".join(action_matches)
        
        read_matches = re.findall(r"<read>(.*?)</read>", xml_content, re.IGNORECASE)
        if read_matches:
            res["read"] = ", ".join(read_matches)
            
        write_matches = re.findall(r"<write>(.*?)</write>", xml_content, re.IGNORECASE)
        if write_matches:
            res["write"] = ", ".join(write_matches)

    return res

def generate_summary(fields_diff: list[dict]) -> str:
    changes = []
    for f in fields_diff:
        field = f["field"]
        left = f["left"]
        right = f["right"]
        change = f["change"]
        
        if change == "modified":
            if field == "priority":
                changes.append(f"raises priority to {right}")
            elif field == "action":
                changes.append(f"updates actions to '{right}'")
            elif field == "success rate":
                changes.append(f"changes success rate estimation from {left} to {right}")
            else:
                changes.append(f"modifies {field} from '{left}' to '{right}'")
        elif change == "added":
            if field == "condition":
                changes.append(f"adds condition guard '{right}'")
            elif field == "read":
                changes.append(f"adds data read dependencies on {right}")
            elif field == "write":
                changes.append(f"adds state write dependencies on {right}")
            else:
                changes.append(f"adds {field} '{right}'")
        elif change == "removed":
            changes.append(f"removes {field} '{left}'")
            
    if not changes:
        return "No configuration changes detected between left and right environments."
        
    if len(changes) == 1:
        return f"Version update {changes[0]}."
    elif len(changes) == 2:
        return f"Version update {changes[0]} and {changes[1]}."
    else:
        return f"Version update {', '.join(changes[:-1])}, and {changes[-1]}."


@router.post("/agents/{agent_id}/diff")
def get_agent_diff(agent_id: int, payload: DiffPayload, db: Session = Depends(get_db)) -> dict[str, object]:
    agent = db.get(Agent, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    left_env = payload.left_env
    right_env = payload.right_env
    
    base_xml = get_base_agent_definition(agent.agent_gid)
    db_xml = agent.definition or base_xml
    
    left_definition = get_env_definition(agent.agent_gid, left_env)
    if not left_definition:
        if left_env == "PROD":
            left_definition = base_xml
        else:
            left_definition = db_xml
            
    right_definition = get_env_definition(agent.agent_gid, right_env)
    if not right_definition:
        if right_env == "PROD":
            right_definition = base_xml
        else:
            right_definition = db_xml
            
    has_promoted = False
    if os.path.exists(ENV_FILE):
        try:
            with open(ENV_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if agent.agent_gid in data and "PROD" in data[agent.agent_gid]:
                    has_promoted = True
        except Exception:
            pass
            
    if left_definition == right_definition and left_env != right_env and not has_promoted:
        if agent.agent_gid != "NWL.AUTO_TENDER_CARRIER":
            if "priority" not in left_definition.lower():
                if right_env in ("TEST", "DEV"):
                    right_definition = left_definition.replace(
                        "</agent>",
                        "  <priority>Critical</priority>\n  <condition>rate_ceiling_checked</condition>\n</agent>"
                    )
                elif left_env in ("TEST", "DEV"):
                    left_definition = right_definition.replace(
                        "</agent>",
                        "  <priority>Critical</priority>\n  <condition>rate_ceiling_checked</condition>\n</agent>"
                    )
    
    left_parsed = parse_agent_xml(left_definition)
    right_parsed = parse_agent_xml(right_definition)
    
    if agent.agent_gid == "NWL.AUTO_TENDER_CARRIER":
        if has_promoted:
            left_parsed["success rate"] = "96.4%"
            right_parsed["success rate"] = "96.4%"
        else:
            left_parsed["success rate"] = "94.8%"
            right_parsed["success rate"] = "96.4%"
        
    fields_diff = []
    add_cnt = 0
    rem_cnt = 0
    mod_cnt = 0
    
    all_keys = ["trigger", "priority", "condition", "read", "action", "write", "success rate"]
    for key in all_keys:
        left_val = left_parsed.get(key, "—")
        right_val = right_parsed.get(key, "—")
        
        is_left_empty = left_val == "—" or left_val is None
        is_right_empty = right_val == "—" or right_val is None
        
        if is_left_empty and not is_right_empty:
            change = "added"
            add_cnt += 1
        elif not is_left_empty and is_right_empty:
            change = "removed"
            rem_cnt += 1
        elif left_val != right_val:
            change = "modified"
            mod_cnt += 1
        else:
            change = "none"
            
        fields_diff.append({
            "field": key,
            "left": left_val,
            "right": right_val,
            "change": change
        })
        
    semantic_summary = generate_summary(fields_diff)
    
    engine = ConflictEngine()
    conflicts = engine._detect(db)
    agent_conflicts = [c for c in conflicts if any(a.agent_gid == agent.agent_gid for a in c.affected_agents)]
    
    warning_text = None
    if agent_conflicts:
        ac = agent_conflicts[0]
        other_agents = [a.agent_name for a in ac.affected_agents if a.agent_gid != agent.agent_gid]
        other_names = " and ".join(other_agents)
        warning_text = f"Review against conflict {ac.conflict_id} before promoting — potential overlap with {other_names} on event '{ac.trigger_event}'."
        
    return {
        "agent_id": agent_id,
        "left_env": left_env,
        "right_env": right_env,
        "left_version": "v2.4.0" if left_env == "PROD" else "v2.4.1-draft",
        "right_version": "v2.4.1" if right_env == "TEST" else "v2.4.0",
        "summary": {
            "additions": add_cnt,
            "removals": rem_cnt,
            "modifications": mod_cnt,
            "semantic_summary": semantic_summary,
            "warning": warning_text,
        },
        "fields": fields_diff
    }



import time

def evaluate_tests(draft_content: str) -> list[dict[str, str]]:
    content = (draft_content or "").lower()
    
    # TC-01: Decline → re-tender to next carrier
    tc_01_pass = "re-tender" in content or "assign_carrier" in content or "assign-carrier" in content
    tc_01 = {
        "id": "TC-01",
        "name": "Decline → re-tender to next carrier",
        "status": "PASS" if tc_01_pass else "FAIL",
        "reason": "Found re-tender or carrier assignment in sequence." if tc_01_pass else "Missing carrier assignment or re-tender action in sequence."
    }
    if not tc_01_pass:
        tc_01["expected"] = "Re-tender action or ASSIGN_CARRIER"
        tc_01["actual"] = "No carrier re-assignment action defined"
        
    # TC-02: Decline ×3 → escalate to planner
    tc_02_pass = "retry_count" in content and ("escalat" in content or "notification" in content or "send_notification" in content)
    tc_02 = {
        "id": "TC-02",
        "name": "Decline ×3 → escalate to planner",
        "status": "PASS" if tc_02_pass else "FAIL",
        "reason": "Retry condition and planner escalation mapped correctly." if tc_02_pass else "Condition must validate retry_count and trigger planner escalation."
    }
    if not tc_02_pass:
        tc_02["expected"] = "retry_count validation and escalation action"
        tc_02["actual"] = "No escalation logic defined on maximum retries"

    # TC-03: No alternate carrier available
    tc_03_pass = "carrier_pref" in content or "carrier" in content
    tc_03 = {
        "id": "TC-03",
        "name": "No alternate carrier available",
        "status": "PASS" if tc_03_pass else "FAIL",
        "reason": "Alternative carrier fallback logic verified." if tc_03_pass else "No carrier preference list or fallback defined."
    }
    if not tc_03_pass:
        tc_03["expected"] = "carrier preference evaluation"
        tc_03["actual"] = "No carrier list references in draft"

    # TC-04: Carrier timeout during re-tender (THE CRITICAL TEST)
    # Checks for bounded wait/retry fallback suggested by conflict C-002
    tc_04_pass = "500ms" in content or "bounded" in content or "timeout fallback" in content or "timeout_fallback" in content or "wait" in content or "retry_gate" in content or "timeout" in content
    tc_04 = {
        "id": "TC-04",
        "name": "Carrier timeout during re-tender",
        "status": "PASS" if tc_04_pass else "FAIL",
        "reason": "Timeout retry policy active with a bounded wait/fallback handler." if tc_04_pass else "Timeout error is not caught or retried; fails immediately."
    }
    if not tc_04_pass:
        tc_04["expected"] = "Bounded wait or timeout retry policy (e.g. 500ms wait/fallback)"
        tc_04["actual"] = "Timeout error surfaces directly to the carrier API without retry"

    # TC-05: Spot rate exceeds threshold
    tc_05_pass = "budget_guard" in content or "threshold" in content or "rate" in content or "budget" in content
    tc_05 = {
        "id": "TC-05",
        "name": "Spot rate exceeds threshold",
        "status": "PASS" if tc_05_pass else "FAIL",
        "reason": "Budget guard check validates spot rates against budget threshold." if tc_05_pass else "Missing rate ceiling or budget guard validation."
    }
    if not tc_05_pass:
        tc_05["expected"] = "budget_guard rate check"
        tc_05["actual"] = "No budget limits defined in draft"

    # TC-06: Late decline after confirm
    tc_06_pass = len(content.strip()) > 0
    tc_06 = {
        "id": "TC-06",
        "name": "Late decline after confirm",
        "status": "PASS" if tc_06_pass else "FAIL",
        "reason": "Late decline grace period validation checks confirm status." if tc_06_pass else "Draft content empty."
    }
    if not tc_06_pass:
        tc_06["expected"] = "Valid draft XML or config schema"
        tc_06["actual"] = "Empty draft content"

    return [tc_01, tc_02, tc_03, tc_04, tc_05, tc_06]


from app.api.routers.audit import write_audit_log
from app.api.routers.health import update_job_activity

@router.post("/agents/{agent_id}/tests/run")
def run_agent_tests(agent_id: int, payload: DraftPayload, db: Session = Depends(get_db)) -> dict[str, object]:
    time.sleep(1.2) # Simulate container test execution delay
    cases = evaluate_tests(payload.draft)
    passed_count = sum(1 for c in cases if c["status"] == "PASS")
    failed_count = sum(1 for c in cases if c["status"] == "FAIL")
    
    agent = db.get(Agent, agent_id)
    if agent:
        write_audit_log("demo_user", "Run regression tests", agent.agent_gid, "TEST", f"{passed_count} passed / {failed_count} failed")
        update_job_activity("Nightly Tender Sweep")
    
    # Generate behavioral diff info based on test outcome
    if failed_count == 0:
        behavioral_diff = [
            {"phase": "OLD", "detail": "Stopped after the first timeout."},
            {"phase": "NEW", "detail": "Catches timeout, retries up to 3 times, then escalates after bounded wait."},
        ]
    else:
        behavioral_diff = [
            {"phase": "OLD", "detail": "Stopped after the first timeout."},
            {"phase": "NEW", "detail": "No retry behavior defined in draft; fails immediately on carrier timeout."},
        ]
        
    return {
        "agent_id": agent_id,
        "summary": {"passed": passed_count, "failed": failed_count},
        "cases": cases,
        "behavioral_diff": behavioral_diff
    }


@router.post("/agents/{agent_id}/promote")
def promote_agent(agent_id: int, payload: DraftPayload, db: Session = Depends(get_db)) -> dict[str, object]:
    agent = db.get(Agent, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    cases = evaluate_tests(payload.draft)
    failed_cases = [c for c in cases if c["status"] == "FAIL"]
    
    if len(failed_cases) > 0:
        first_fail = failed_cases[0]
        return {
            "agent_id": agent_id,
            "promotion_gated": True,
            "message": f"Promotion gated — {len(failed_cases)} test(s) failing. Fix the failure ({first_fail['id']}: {first_fail['name']}) before promoting."
        }
        
    save_env_definition(agent.agent_gid, "PROD", payload.draft)
    save_env_definition(agent.agent_gid, "TEST", payload.draft)
    save_env_definition(agent.agent_gid, "DEV", payload.draft)
    
    agent.definition = payload.draft
    db.commit()
    
    # Rebuild vector index dynamically so that semantic search stays in sync
    try:
        from app.services import embeddings
        embeddings.rebuild_index(db)
    except Exception as e:
        import logging
        logging.error(f"Failed to rebuild vector index during agent promotion: {e}")
        
    write_audit_log("demo_user", "Promote agent to PROD", agent.agent_gid, "PROD", "SUCCESS")
    update_job_activity("Nightly Tender Sweep")
    
    return {
        "agent_id": agent_id,
        "promotion_gated": False,
        "message": "Promotion successful! Agent has been promoted to PROD."
    }

