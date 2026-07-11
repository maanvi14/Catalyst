# Catalyst Live Demo Script

Follow this step-by-step walkthrough to demonstrate the system live.

---

### Step 1: Re-aligning Process Health
- **What to click**: Navigate to the **Process Health** page in the left sidebar. Locate the failing `Dwell Prediction Model Refresh` job and click the **Trigger now** button.
- **What to say out loud**: *"We begin with a failing prediction model refresh job. I am triggering the run manually; the status updates to healthy, clearing our stale prediction alerts."*
- **What appears on screen**: A browser alert confirms success, the status indicator for the job flips to **healthy**, and the red warning alert banner disappears.

---

### Step 2: Surfacing Telemetry on the Dashboard
- **What to click**: Navigate to the **Dashboard** page in the left sidebar.
- **What to say out loud**: *"Our executive dashboard dynamically computes a global platform health score, which is currently depressed due to active trigger conflicts between OTM rules and AI models in the current snapshot."*
- **What appears on screen**: The health score displays (reflecting active conflicts), and the metric cards list the counts of active legacy agents, AI agents, and conflicts.

---

### Step 3: Navigating the Workflow Map
- **What to click**: Navigate to the **Workflow Map** page. Zoom in slightly and click the `NWL.AUTO_TENDER_CARRIER` node.
- **What to say out loud**: *"The Workflow Map generates a swimlane visualization of our dependencies. Clicking our auto-tender agent reveals its upstream ancestors in purple and downstream descendants in emerald."*
- **What appears on screen**: The selected node and its direct dependency path remain bright, while all unrelated nodes and connecting lines fade to 20% opacity.

---

### Step 4: Examining Conflicts in Detail
- **What to click**: Navigate to the **Conflicts** page in the left sidebar. Click on the card for conflict **C-002** to expand it.
- **What to say out loud**: *"The conflicts list isolates overlapping rules. Here, we see that the legacy Auto Tender Carrier and the AI Rate Optimizer are both registered to trigger on shipment tenders, creating an unsequenced race condition."*
- **What appears on screen**: The conflict card expands to display the detailed collision description, affected agent GIDs, and a suggested resolution to gate one of the paths.

---

### Step 5: Fixing the Rule in the Workbench
- **What to click**: Navigate to the **Agents** page in the left sidebar. Select **Auto Tender Carrier** from the agent list, click **Run Tests**, then edit the XML text in the sandbox. Add `<condition>500ms wait</condition>` before `</agent>`. Click **Run Tests** again, then click **Promote to PROD**.
- **What to say out loud**: *"On the workbench, running our regression suite shows that the default rule fails our timeout-handling test. I will add a bounded wait condition to the sandbox draft, re-run tests to confirm they pass, and promote this to PROD."*
- **What appears on screen**: The regression tests initially show **FAIL** for TC-04. After editing and testing again, all tests display **PASS**, enabling the **Promote to PROD** button. Clicking it displays a green success confirmation banner.

---

### Step 6: Verifying Promotion (Strongest Proof Point)
- **What to click**: Navigate to the **Version Comparison** page. Select **Auto Tender Carrier** in the first dropdown, set Left to **PROD** and Right to **TEST** (or both to **PROD**).
- **What to say out loud**: *"To prove that this promotion is live, comparing the active PROD environment to our TEST environment shows zero difference, verifying that the database was updated."*
- **What appears on screen**: The summary displays **+0 additions, -0 removals, ~0 modifications** with the text: *"No configuration changes detected between left and right environments,"* and the side-by-side Monaco editors show identical JSON structures.

---

### Step 7: Tracing Execution Success
- **What to click**: Navigate to the **Agent Trace** page. Click the **Re-run** button.
- **What to say out loud**: *"Finally, re-running our failing shipment trace re-evaluates the transaction flow against the newly promoted PROD configuration, showing that our timeout handler successfully prevents the failure."*
- **What appears on screen**: The trace execution status changes from **Failed · CARRIER_TIMEOUT** to **SUCCESS**, and a seventh step (*"Successful retry & confirm"*) appears at the bottom of the timeline.
