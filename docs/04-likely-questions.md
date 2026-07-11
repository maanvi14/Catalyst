# Anticipated Technical Interview Questions

---

### Q1: What parts of Catalyst use Machine Learning versus LLMs or rule-based code?
- **Answer**: The regression test runner is rule-based, using string matching to validate draft XML. The RAG engine uses a rule-based token matching search to select context documents from SQLite. The generative text response uses an LLM call (`llama-3.1-8b-instant` via Groq) grounded strictly in this context, while the risk-scoring uses a heuristic model combining centrality and conflict rules rather than a trained ML classifier.

---

### Q2: How does the conflict detection algorithm work?
- **Answer**: The backend `ConflictEngine` queries legacy `AgentEvent` and `AiAgent` tables, grouping all agent identifiers by their `trigger_event`. If any trigger event maps to two or more agents, it loops through them to generate pairwise conflict records (legacy-legacy, legacy-ai, or ai-ai). The conflict ID is computed by sorting the agent GIDs, formatting a string payload with the event, and hashing it using SHA1.

---

### Q3: What happens in Oracle OTM if two agents trigger on the same event?
- **Answer**: Oracle OTM will execute both agents concurrently in separate database threads. Because the execution paths are unsequenced, this creates database locks and race conditions. For example, if both try to assign a carrier on a shipment tender event, one might overwrite the other or trigger duplicate API requests, which is why Catalyst surfaces these overlaps.

---

### Q4: How does the diff engine determine what counts as a "modification" vs an "addition" or "removal"?
- **Answer**: The diff engine normalizes XML files into a flat dictionary of 7 keys (trigger, priority, condition, read, action, write, success rate). It compares the left dictionary against the right dictionary. A key is flagged as an "addition" if it is present in the right but empty in the left, a "removal" if present in the left but empty in the right, and a "modification" if values differ between the two.

---

### Q5: Why are you rendering Monaco DiffEditor in JSON if OTM configurations are in XML?
- **Answer**: Relational seed configs are stored as raw XML strings, which contain noise (indentation differences, namespace tags, and ordering). To present a meaningful comparison, we parse the XML into flat JSON configuration dictionaries. This allows Monaco to highlight actual functional changes side-by-side without showing noise from XML formatting differences.

---

### Q6: How is the RAG context selection implemented in Ask Catalyst?
- **Answer**: We use a keyword-based TF matching system in Python (`rag.py`) rather than a heavy vector database. It cleans the query, filters out standard stopwords, and scores agent, conflict, and trace documents by searching for exact token matches. The top 5 highest-scoring documents are injected into the LLM system prompt as the grounded context.

---

### Q7: How does the execution trace re-run logic detect code changes dynamically?
- **Answer**: When you trigger a re-run on trace `RUN-48213`, the backend queries the database for the active definition of the `NWL.AUTO_TENDER_CARRIER` agent. It scans the text for timeout fix keywords (like `500ms`, `bounded`, or `retry_gate`). If found, it dynamically builds a successful 7-step trace log; if absent, it returns a failed 6-step log.

---

### Q8: Why did you implement custom SVG layouts for the Workflow Map instead of using D3 or Cytoscape?
- **Answer**: Standard graph libraries add bundle size and often struggle to render clean, readable swimlanes aligned to specific transaction events. By writing custom layout algorithms, we divide agents into grid coordinates and render them as plain SVG elements. This allows pan/zoom and Manhattan routing connections to remain responsive without external library overhead.

---

### Q9: How is the regression test suite gated on promotion, and how do you ensure safety?
- **Answer**: The frontend "Promote to PROD" action button is disabled unless the regression suite returns a passing state for all 6 test cases. When promotion is clicked, the backend re-evaluates the draft configuration. If any test case fails, the API blocks the database transaction, preventing invalid XML configurations from being promoted.

---

### Q10: What would you do differently if you had three more months to build this?
- **Answer**: I would replace the keyword-based context retriever with local embeddings and a vector store (like pgvector) to enable semantic questions. I would also write a parser to support exporting graph configurations back into OTM-compliant XML files. Finally, I would implement WebSockets to push live execution trace updates from the backend test runner.

---

### Q11: How do you handle database portability in this application?
- **Answer**: All database interactions are managed through SQLAlchemy ORM sessions. The default database is a local SQLite file (`catalyst.db`), and database migrations are managed via Alembic. Moving to a production-grade PostgreSQL database requires only updating the `DATABASE_URL` environment variable and installing the target database driver, without changing any application code.

---

### Q12: Why does the API return a list of processes from a JSON file rather than querying the OS directly?
- **Answer**: OTM background batch processes run inside Oracle's cloud infrastructure, not on the host OS executing the Catalyst server. We pre-load these operational schedules into `process_health.json` to simulate OTM's background worker loop. Triggering a job updates this state file, representing how Catalyst interacts with OTM API endpoints.
