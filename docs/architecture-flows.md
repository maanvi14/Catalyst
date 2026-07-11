# Catalyst Backend Architecture Flows

This document outlines the high-level data flow and processing pipeline for each of the three core modules. These summaries are designed to be concise, architectural, and ready to explain in a technical interview context.

---

### Workflow Map
1. **Ingestion**: The system parses the raw OTM relational seeds (`AGENT.csv`, `AGENT_ACTION.csv`, `AGENT_EVENT.csv`, and `AI_AGENT.csv`) on startup into a unified database schema.
2. **Graph Build**: When requested, the backend constructs a NetworkX `DiGraph` representation in memory, using agents as nodes and execution sequence/trigger flows as directed edges to resolve ancestry, descendants, and path-finding.
3. **Conflict Detection**: During the graph construction, agents are grouped by their `trigger_event`. Any event mapped to two or more agents is marked as a trigger conflict (cross-cutting AI/legacy overlaps), sharing a single engine logic with the dashboard, conflicts list, and map.
4. **Serving & Rendering**: The graph is serialized and served via `GET /api/v1/graph`. The frontend React Flow component consumes the JSON payload, dynamically layouts nodes into swimlanes, and handles all highlight path/impact states entirely client-side using pre-calculated ancestor/descendant sets.

---

### Agent Workbench (Agents Page)
1. **Details Querying**: The workbench lists profiles via `GET /api/v1/agents` and fetches detailed configurations (the XML/JSON layout of actions, events, and AI metadata) via `GET /api/v1/agents/{id}`.
2. **Sandbox Isolation**: Modifications made in the Draft Sandbox are held strictly in client-side state, preventing unsaved configurations from affecting the active graph or SQLite database.
3. **Rule Evaluation**: Clicking "Run Tests" triggers a `POST /api/v1/agents/{id}/tests/run` request with the draft payload. The backend executes a rule-based evaluation suite (`TC-01` to `TC-06`) on the draft text to check parameters, error retry sequences, and budget boundaries.
4. **Gated Promotion**: If any test fails, promotion is blocked. Once all tests return a passing state, `POST /api/v1/agents/{id}/promote` becomes accessible, overwriting the active definition in the database and triggering a reload.

---

### Version Comparison
1. **Shared Endpoint**: Reuses the main `POST /api/v1/agents/{id}/diff` comparative service, allowing both the standalone comparison view and the Agents Workbench behavioral diff inspector to leverage the exact same diff engine.
2. **Structural Diffing**: The endpoint fetches the original seed version (PROD) from CSV fixtures and the sandbox draft version (TEST) from the database, parses their XML into a unified schema, and performs a key-value dictionary diff rather than a plain text line comparison.
3. **Template & Lookup**: The resulting differences drive the exact addition/removal/modification counts and are formatted into a plain-English semantic summary. It also queries active database conflicts to dynamically overlay a warning banner if any modifications match open overlap criteria.
4. **Monaco Rendering**: The frontend loads Monaco's `DiffEditor` in read-only mode with the `json` language schema, rendering the reconstructed PROD and TEST configuration objects side-by-side with complete syntax highlighting.
