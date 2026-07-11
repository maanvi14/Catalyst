# Architectural Decisions & Trade-offs

---

### 1. In-Memory Graph Modeling (NetworkX) vs. Database Graph Stores
- **Decision**: We use the Python `NetworkX` library in-memory rather than a graph database (such as Neo4j).
- **Reasoning**: OTM/GTM rules configurations are loaded statically during ingestion, representing a small, slow-changing network (dozens of nodes rather than millions). Running Graph database servers adds substantial infrastructure overhead (licensing, memory, connection pools). By building a NetworkX `DiGraph` in memory when `/graph` is hit, we run pathfinding and topological sorts at CPU speeds without network round-trips, storing only simple relational records in a portable SQLite database.

---

### 2. Single-Service Diff Engine
- **Decision**: Reusing the identical `/agents/{agent_id}/diff` API payload for both the Agent Workbench behavioral summary and the side-by-side Monaco code comparative view.
- **Reasoning**: Reusing this logic ensures a single point of failure and truth. Instead of executing raw line-by-line diffs in the frontend (which is prone to spacing noise in XML files), the backend endpoint normalizes the OTM configurations into structured key-value dictionaries. This computation parses XML parameters into a common schema, aggregates counts of additions/removals/modifications, and outputs a semantic English summary. Reusing this payload guarantees the workbench description matches the Monaco code display perfectly.

---

### 3. Risk-Scoring Heuristic Labels
- **Decision**: The risk scoring model utilizes a heuristic, rule-based approach rather than a trained machine learning classifier.
- **Reasoning**: We lack historic incident records or outage logs needed to train a supervised model. We therefore use heuristic scoring: a base risk score of `10`, adding `50` if the node is a Single Point of Failure (SPOF) based on NetworkX degree centrality, `30` if it has active trigger conflicts, and `10` if it is an AI agent with limited visibility. This provides deterministic risk assessments derived entirely from graph properties.

---

### 4. Groq Cloud Integration vs. Local Ollama/Gemma
- **Decision**: Ask Catalyst executes LLM calls on the Groq Cloud endpoint (`llama-3.1-8b-instant`) rather than a local Ollama server running `gemma4`.
- **Reasoning**: The platform was designed for a local-first architecture (running Ollama on `127.0.0.1:11434`). However, hardware constraints on the developer environment (such as CUDA driver incompatibilities and limited GPU memory) prevented local model inference from executing at acceptable speeds. We pivoted to Groq as a fallback, utilizing a cloud-hosted model while maintaining the keyword-based local RAG retrieval logic.

---

### 5. Explicitly Out-of-Scope Capabilities
- **Live OTM/GTM Connection**: Out of scope due to Oracle's sandbox access restrictions and security protocols.
- **Role-Based Access Control (RBAC/SSO)**: Authentication is omitted to focus on the workflow graph engine and testing sandbox core capabilities.
- **Real-Time Health WebSockets**: Push notifications for job completions are simulated synchronously on request to minimize connection state overhead on the backend.
