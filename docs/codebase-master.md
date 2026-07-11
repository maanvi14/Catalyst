# Catalyst — Master Codebase & Architecture Guide

This document provides a detailed, technical reference of the Catalyst system, tracing data flows and component logic from ingestion to frontend visualization.

---

## 1. Directory Structure & Architecture

```
Catalyst/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routers/       # FastAPI route endpoints
│   │   │   └── router.py      # Main API router registry
│   │   ├── conflicts/
│   │   │   └── engine.py      # OTM Rule & AI Agent Overlap Detector
│   │   ├── core/
│   │   │   └── config.py      # PydanticSettings environment setup
│   │   ├── database/
│   │   │   ├── session.py     # SQLAlchemy local database session pools
│   │   │   └── base.py        # SQLAlchemy Base model class
│   │   ├── models/            # SQLAlchemy database schemas
│   │   ├── schemas/           # Pydantic schemas (serialization & validation)
│   │   ├── services/
│   │   │   ├── fixture_loader.py # parses seed CSV files into SQLite on boot
│   │   │   ├── rag.py         # Keyword search context selection
│   │   │   └── otm_service.py # Telemetry and details retriever
│   │   └── main.py            # FastAPI lifespan, migrations, and CORS init
│   └── alembic/               # Database migration scripts
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router modular directories
│   │   ├── components/        # Sidebar, layout components, and graph nodes
│   │   ├── hooks/             # TanStack React Query queries and custom states
│   │   ├── services/          # HTTP api-client fetch wraps
│   │   ├── theme/             # KSAP dark mode design tokens
│   │   └── types/             # TypeScript API interfaces
└── fixtures/
    └── nwl-26b/               # Northwind Logistics seed CSV tables
```

---

## 2. Core Database Schema & SQLAlchemy Models

Database tables are declared in `backend/app/models/` and preloaded from OTM XML/relational seed files in `fixtures/nwl-26b/`:

- **`Domain` (`domain`)**: Matches OTM GID structures.
  - `domain_gid` (String, Primary Key)
  - `domain_name` (String)
- **`Agent` (`agent`)**: Represents legacy OTM rule configurations.
  - `id` (Integer, Primary Key)
  - `agent_gid` (String, Unique)
  - `agent_xid` (String)
  - `domain_gid` (String, ForeignKey to `domain.domain_gid`)
  - `agent_name` (String)
  - `target_object_type` (String, Nullable)
  - `is_active` (Boolean)
  - `definition` (String, Nullable XML rule definition)
- **`AiAgent` (`ai_agent`)**: Represents autonomous AI models running in OTM.
  - `id` (Integer, Primary Key)
  - `agent_gid` (String, Unique)
  - `agent_xid` (String)
  - `domain_gid` (String, ForeignKey to `domain.domain_gid`)
  - `agent_name` (String)
  - `visibility` (String, e.g. "Full", "Limited")
  - `trigger_event` (String, Nullable)
  - `definition_detail` (String, Nullable)
- **`AgentEvent` (`agent_event`)**: Links legacy agents to their event triggers.
  - `id` (Integer, Primary Key)
  - `agent_gid` (String, ForeignKey to `agent.agent_gid`)
  - `event_gid` (String)
  - `event_name` (String)
  - `saved_condition_query_gid` (String, Nullable)
- **`SavedQuery` (`saved_query`)**: Records condition queries used by legacy rule paths.
  - `id` (Integer, Primary Key)
  - `query_gid` (String, Unique)
  - `query_xid` (String)
  - `domain_gid` (String, ForeignKey to `domain.domain_gid`)
  - `name` (String)
  - `target_object_type` (String, Nullable)
  - `sql_text` (Text)
- **`SequenceCounter` (`sequence_counter`)**: Tracks active counters.
  - `id` (Integer, Primary Key)
  - `sequence_name` (String)
  - `domain_gid` (String, ForeignKey to `domain.domain_gid`)
  - `current_value` (Integer)
  - `max_value` (Integer, Nullable)
- **`FixtureFile` (`fixture_file`)**: Logs uploaded data.
  - `id` (Integer, Primary Key)
  - `file_name` (String)
  - `row_count` (Integer)
  - `loaded_at` (DateTime)

---

## 3. Backend REST API Registry (`/api/v1/*`)

Every endpoint is mapped in `backend/app/api/router.py`:

| Method | Endpoint Path | Target Schema | Return Payload |
| :--- | :--- | :--- | :--- |
| **GET** | `/health` | None | `HealthResponse` (status, service name, environment) |
| **GET** | `/processes` | None | `list[ProcessJob]` (list of background job stats) |
| **POST** | `/processes/{job_name}/trigger` | None | `{status: "success", message: str}` (Triggers job run) |
| **GET** | `/dashboard` | None | `DashboardSummary` (aggregated active metrics counts) |
| **GET** | `/agents` | None | `list[AgentRead]` (legacy profiles list) |
| **GET** | `/agents/{id}` | None | `AgentDetail` (actions, events, and XML definition) |
| **POST** | `/agents/{id}/diff` | `DiffPayload` | `DiffResponse` (field diff dictionary, semantic summary) |
| **POST** | `/agents/{id}/tests/run` | `DraftPayload` | `TestResults` (regression test cases and diff outcomes) |
| **POST** | `/agents/{id}/promote` | `DraftPayload` | `PromotionResult` (gates or updates the PROD XML block) |
| **GET** | `/ai-agents` | None | `list[AiAgentRead]` (AI agent profiles list) |
| **GET** | `/conflicts` | None | `list[ConflictRead]` (surfaces rule conflicts) |
| **GET** | `/conflicts/{id}` | None | `ConflictDetail` (specific conflict parameters) |
| **GET** | `/graph` | None | `GraphResponse` (NetworkX coordinate payloads) |
| **GET** | `/traces/{run_id}` | None | `TraceResponse` (execution timeline of steps) |
| **POST** | `/traces/{run_id}/rerun` | None | `{run_id: str, status: str, message: str}` (reruns transaction step evaluation) |
| **POST** | `/ask` | `payload: dict` | `AskResponse` (RAG citations list and generative answer) |

---

## 4. Conflict Detection Engine (`app/conflicts/engine.py`)

The conflict detector identifies overlapping event mappings that cause simultaneous execution in OTM.

### Algorithmic Execution Steps
1. Queries the `AgentEvent` and `AiAgent` tables to retrieve trigger mappings.
2. Groups all agents sharing the same `trigger_event` identifier.
3. Loops through every unique `trigger_event`:
   - If two or more legacy agents trigger on the same event, it creates pairwise **legacy-legacy** conflicts.
   - If a legacy agent and an AI agent trigger on the same event, it creates a cross-cutting **legacy-ai** conflict.
   - If two or more AI agents trigger on the same event, it creates **ai-ai** conflicts.
4. Generates a deterministic **Conflict ID**:
   $$\text{digest} = \text{SHA1}(\text{conflict\_type} \mid \text{trigger\_event} \mid \text{sorted\_agent\_gids})[:12]$$
5. Computes **Severity**:
   - High if `legacy-ai` or `ai-ai` conflict, and there is more than 1 event row or multiple agents involved.
   - High if `legacy-legacy` and the event is triggered by more than 2 distinct rules.
   - Otherwise, evaluates to Medium.

---

## 5. Search Retrieval & Grounding (`app/services/rag.py`)

Ask Catalyst uses a local keyword-based TF matching algorithm.

### The RAG Search Process
1. **Document Synthesis**: Compiles a document corpus from active database records:
   - **Legacy Agents**: Name, GID, Domain, Target, and XML definition.
   - **AI Agents**: GID, Name, Domain, Trigger Event, and details.
   - **Conflicts**: ID, Severity, Type, Event, Overlapping GIDs, and suggested resolution.
   - **Trace History**: Run ID, Agent, Shipment GID, Status, and trace steps detail.
2. **Text Normalization**: Strips non-alphanumeric characters, converts to lowercase, and splits queries into search tokens.
3. **Keyword Scoring**:
   - For every document in the corpus, it calculates a matching score.
   - Tokens shorter than 4 characters must match on a word boundary (adds `+5` points).
   - Longer tokens add `+2` points for partial matches and `+3` additional points if matched on a word boundary.
   - Exact matching of the first 20 characters of the query adds a `+5` bonus.
4. **Context Injection**: The top 5 highest-scoring documents are injected into the LLM system prompt:
   ```
   Answer the user's question concisely using ONLY the provided Context below...
   Context: {retrieved_documents}
   Question: {user_query}
   ```
5. **Generative Processing**: Groq's `llama-3.1-8b-instant` processes the structured prompt to generate a concise response.

---

## 6. Sandbox Test Runner Logic (`app/api/routers/otm.py`)

The test runner simulates container-based regression checks against OTM configuration modifications. It parses sandbox draft text using string checks to evaluate 6 test cases:

- **TC-01: Decline → re-tender to next carrier**
  - *Rule*: Draft must contain `re-tender`, `assign_carrier`, or `assign-carrier`.
  - *Failure*: *"Missing carrier assignment or re-tender action in sequence."*
- **TC-02: Decline ×3 → escalate to planner**
  - *Rule*: Draft must contain `retry_count` and (`escalat`, `notification`, or `send_notification`).
  - *Failure*: *"Condition must validate retry_count and trigger planner escalation."*
- **TC-03: No alternate carrier available**
  - *Rule*: Draft must contain `carrier_pref` or `carrier`.
  - *Failure*: *"No carrier preference list or fallback defined."*
- **TC-04: Carrier timeout during re-tender (The Critical Target)**
  - *Rule*: Draft must contain `500ms`, `bounded`, `timeout fallback`, `timeout_fallback`, `wait`, `retry_gate`, or `timeout`.
  - *Failure*: *"Timeout error is not caught or retried; fails immediately."*
- **TC-05: Spot rate exceeds threshold**
  - *Rule*: Draft must contain `budget_guard`, `threshold`, `rate`, or `budget`.
  - *Failure*: *"Missing rate ceiling or budget guard validation."*
- **TC-06: Late decline after confirm**
  - *Rule*: Draft content must be non-empty.
  - *Failure*: *"Empty draft content."*

---

## 7. Frontend Swimlane Layout & Path Highlights (`workflow-map/page.tsx`)

The Workflow Map uses custom canvas layout and path-highlighting logic on top of React Flow.

### Swimlane Coordinate Grid Layout
To organize complex dependency graphs, `getLayoutedElements` executes an adaptive column grid layout:
- Nodes are grouped into 5 vertical swimlane columns based on trigger prefixes and entity types:
  - Column 0: **Shipment Execution** (Triggers: `SHIPMENT` or `ORDER_RELEASE`)
  - Column 1: **Invoice & Finance** (Triggers: `INVOICE`)
  - Column 2: **GTM** (Triggers: `GTM`)
  - Column 3: **AI & Recovery** (Entity Type: `oracle_ai_agent`)
  - Column 4: **Unclassified** (Fallback)
- Nodes in each swimlane are sorted topologically using predetermined event order lists (e.g. `ORDER_RELEASE - CREATED` $\rightarrow$ `SHIPMENT - CREATED` $\rightarrow$ `INVOICE - APPROVED`).
- Depending on the node density inside a lane, the grid dynamically calculates coordinates:
  - If a swimlane contains $\le 6$ nodes, it formats items into **2 columns**.
  - If a swimlane contains $> 6$ nodes, it formats items into **3 columns** to save vertical space.

### Client-Side BFS Dependency Traversal
When a node is selected, React Flow highlights upstream and downstream dependency chains:
- **Upstream (Ancestors)**: Runs a Breadth-First Search (BFS) backward along incoming edges. Node borders highlight in purple.
- **Downstream (Descendants)**: Runs a forward BFS along outgoing edges. Node borders highlight in emerald.
- **Connecting Paths**: If two nodes are selected, the map executes a bidirectional BFS to find the shortest connecting path, highlighting the active route in gold.

---

## 8. Monaco Editor Diff Comparisons (`version-comparison/page.tsx`)

The comparative version editor displays structural differences side-by-side:
- **Reconstruction**: The page selects an agent, requests `/agents/{id}/diff`, and receives key-value difference fields.
- **JSON Generation**: To provide clean syntax highlighting, the client loops through these fields to construct two virtual JSON strings:
  - `originalJson`: Formatted key-value pairs representing the **PROD** environment.
  - `modifiedJson`: Formatted key-value pairs representing the **TEST** or **DEV** sandbox environments.
- **Monaco Rendering**: The JSON strings are loaded into `@monaco-editor/react`'s `<DiffEditor>` component in side-by-side read-only mode, highlighting modifications, additions, and removals without formatting noise.

---

## 9. Run, Lint & Developer Instructions

To maintain the environment, execute the following commands in the workspace root:

### 1. Database Setup & Migrations
```powershell
cd backend
# Run database migrations using Alembic
.\.venv312\Scripts\python.exe -m alembic upgrade head
```

### 2. Start the Backend API Server
```powershell
cd backend
# Run the FastAPI server in hot-reload mode on port 8000
.\.venv312\Scripts\python.exe -m uvicorn app.main:app --port 8000 --reload
```

### 3. Start the Frontend Development Server
```powershell
cd frontend
# Launch Next.js dev server on port 5173
npm run dev
```

### 4. Verify Types & Formatting
```powershell
cd frontend
# Run TypeScript compilation compiler checks
npm run typecheck

# Run ESLint validation
npm run lint
```
