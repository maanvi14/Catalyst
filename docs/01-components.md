# Component & Page References

---

### 1. Dashboard
- **What it does**: Displays overall platform health score, active conflict alerts, background batch job status, and a list of automation agents.
- **Endpoints**: `GET /api/v1/dashboard` (summary statistics), `GET /api/v1/health` (connector state), `GET /api/v1/processes` (batch jobs).
- **Computation**: Computes the platform health score using: `100 - (conflicts_count * 4) - (high_severity_count * 6) - (limited_ai_agents * 3)`. It groups active conflicts by their `trigger_event` to determine the "hottest trigger."
- **Live Proof**: Click "Sort: Success %" in the agents table to verify dynamic sorting. Triggering a failing job in Process Health immediately removes its alert from the dashboard.

---

### 2. Workflow Map
- **What it does**: Renders an interactive visual flowchart of automation agents, query parameters, and execution paths.
- **Endpoints**: `GET /api/v1/graph` (serializes NetworkX graph nodes, edges, and coordinates).
- **Computation**: Maps nodes into five swimlanes based on trigger event prefixes and entity types, sorting them topologically. Uses a client-side BFS traversal to compute and highlight ancestor and descendant dependency subgraphs when a node is selected.
- **Live Proof**: Select the `NWL.AUTO_TENDER_CARRIER` node; its dependencies highlight in purple (ancestors) and emerald (descendants) while unrelated nodes fade to 20% opacity.

---

### 3. Agents / Agent Workbench
- **What it does**: Provides a workspace to select an agent, edit its configuration XML in a sandbox, and run tests.
- **Endpoints**: `GET /api/v1/agents` (agent list), `GET /api/v1/agents/{id}` (agent configuration detail), `POST /api/v1/agents/{id}/tests/run` (executes sandbox tests), `POST /api/v1/agents/{id}/promote` (overwrites active configuration).
- **Computation**: The regression runner parses the sandbox draft text using string checks to validate 6 test cases. Promotion is gated, checking test success arrays and blocking deployment if any case is marked `FAIL`.
- **Live Proof**: Load `NWL.AUTO_TENDER_CARRIER`, click `Run Tests` to see TC-04 fail. Write `500ms wait` in the text editor, click `Run Tests` again to see it pass, then click `Promote to PROD`.

---

### 4. Conflicts
- **What it does**: Lists and describes execution conflicts detected between legacy automation rules and AI agents.
- **Endpoints**: `GET /api/v1/conflicts` (returns list of all conflicts), `GET /api/v1/conflicts/{id}` (returns specific conflict details).
- **Computation**: `ConflictEngine` groups legacy agents (via `AgentEvent`) and AI agents (via `AiAgent`) by their `trigger_event`. It raises conflicts for events mapped to multiple agents. The conflict ID is a SHA1 hash of the sorted agent GIDs and event.
- **Live Proof**: Expand conflict `C-002` to view the detailed collision overview and suggested sequencing resolution.

---

### 5. Version Comparison
- **What it does**: Displays side-by-side version differences of agent configurations between environments using a code editor.
- **Endpoints**: `POST /api/v1/agents/{id}/diff` (compares configurations of the selected agent between two environments).
- **Computation**: The diff service parses XML configuration definitions into flat key-value pairs (trigger, priority, conditions, reads, actions, writes, success) and compares them key-by-key to return modifications, additions, and removals.
- **Live Proof**: Select `Auto Tender Carrier`, set Left to `PROD` and Right to `TEST` to view the side-by-side Monaco comparison highlighting the added `500ms wait` condition.

---

### 6. Agent Trace
- **What it does**: Displays step-by-step logs of a specific shipment transaction to pinpoint where an agent failed.
- **Endpoints**: `GET /api/v1/traces/{run_id}` (fetches trace steps), `POST /api/v1/traces/{run_id}/rerun` (triggers step re-execution).
- **Computation**: Evaluating trace `RUN-48213` checks the database definition of `NWL.AUTO_TENDER_CARRIER`. If the definition contains the timeout fix keywords, the trace status evaluates to `SUCCESS` with 7 steps; otherwise, it fails on step 6.
- **Live Proof**: Re-run the trace before promoting the fix to watch it fail at step 6. Promote the timeout fix, rerun it, and watch the status flip to `SUCCESS`.

---

### 7. Process Health
- **What it does**: Monitors background system jobs and allows administrators to trigger them manually.
- **Endpoints**: `GET /api/v1/processes` (lists background jobs), `POST /api/v1/processes/{job_name}/trigger` (runs target job).
- **Computation**: Reads and writes job schedules, durations, trends, and status structures from a database JSON state file. Triggering a job writes a new execution timestamp and sets its health status to `healthy`.
- **Live Proof**: Click `Trigger now` on the failing `Dwell Prediction Model Refresh` job. The status immediately updates to `healthy` and the red warning alert disappears.

---

### 8. Audit Logs
- **What it does**: Records chronological administrative actions taken on the platform for compliance.
- **Endpoints**: `GET /api/v1/audit` (returns log history list), `POST /api/v1/audit/export` (downloads audit log table in CSV format).
- **Computation**: Logs are saved to `audit_logs.json`. The frontend queries the list, sorting the newest logs to the top and generating unique row keys by concatenating timestamps, targets, and iteration indexes.
- **Live Proof**: Run regression tests on the Agents workbench, navigate to the Audit Logs page, and view the newly created "Run regression tests" log entry.

---

### 9. Ask Catalyst
- **What it does**: Provides a chat interface to ask questions about OTM configurations, conflicts, or system traces.
- **Endpoints**: `POST /api/v1/ask` (processes questions and returns grounded responses).
- **Computation**: Performs a token-based search across SQLite models, active conflicts, and traces to build a context window. Groq's `llama-3.1-8b-instant` processes the context to generate a response, returning a `grounded` badge if successful.
- **Live Proof**: Ask "Which agents are involved in conflict C-002?" to receive a response citing `NWL.AUTO_TENDER_CARRIER` and `NWL.AI_RATE_OPTIMIZER`.

---

### 10. Comma List
- **What it does**: Formats lists of text values into comma-separated formats for SQL queries or database lookups.
- **Endpoints**: None (computed entirely client-side).
- **Computation**: Splits the input string using separator regexes (`/[\n,;\t]+/`), trims whitespace, filters duplicates using a unique `Set`, sorts alphabetically, and formats items with single quotes (e.g. `'VAL'`).
- **Live Proof**: Paste `NWL.CARR1, NWL.CARR2, NWL.CARR1` into the box, check `Remove duplicates`, select `SQL IN Clause`, and copy `'NWL.CARR1','NWL.CARR2'` to your clipboard.

---

### 11. Settings
- **What it does**: Displays read-only system configurations, email alert channels, SMTP settings, and server health.
- **Endpoints**: `GET /api/v1/health` (returns API health, environment mode, and service details).
- **Computation**: Queries the backend health state and overlays environment properties onto read-only configuration items.
- **Live Proof**: Confirm that the target mode matches the backend health response environment, verifying the active database config.
