
You are implementing the BCBA Worker step ONLY (no poller edits). Follow the worker architecture/patterns from:
pipe_dream/hubspot_centralreach_sync/step_2_rt/rtbt.js

EDIT THIS EXACT FILE PATH
pipe_dream/hubspot_centralreach_sync/bcba_step_2_workflow.js

SCOPE / CONSTRAINTS
- Do NOT modify the Intake_Poller step code.
- Apply the same worker patterns used in rtbt.js ONLY to BCBA:
  retries, token cache, PHI-safe logs, stable hashing, freshness gate, blocked-create guardrails,
  employee upsert order (ContactId → byExternalSystemId → optional create),
  label sync algorithm (preserve unmanaged labels, replace managed labels; POST only if changed).
- Keep diffs minimal.

========================================================
A) STEP 1 INPUT (MUST MATCH CURRENT POLLER OUTPUT EXACTLY)
========================================================
Step 1 name: Intake_Poller
BCBA queue key: bcbaRecordIdsToSync

Implement EXACTLY:

function getBcbaRecordIdsToSync(steps) {
  const step1 = steps?.Intake_Poller?.$return_value;
  const ids = step1?.bcbaRecordIdsToSync;
  return Array.isArray(ids) ? ids.map(String) : [];
}

========================================================
B) HUBSPOT HYDRATION (KEEP THIS EXACT HS_PROPERTIES LIST)
========================================================
Define and use this exact HS_PROPERTIES array when fetching BCBA objects:

const HS_PROPERTIES = [
  "hs_object_id",
  "employee_id",
  "hs_lastmodifieddate",
  "updated_by_integration",
  "integration_last_write",
  "last_sync_hash",
  "last_sync_at",
  "last_sync_status",
  "last_sync_error",
  "bcba_name",
  "date_of_birth",
  "email",
  "work_email",
  "address",
  "home_apt",
  "city_work",
  "home_state",
  "employee_phone",
  "medicaid_id__ny",
  "medicaid_id__nj",
  "medicaid_id__co",
];

IMPORTANT:
- employee_id stores the CentralReach Employee ContactId.

========================================================
C) GATING + IDEMPOTENCY (MATCH UPDATED BEST PRACTICE)
========================================================
1) Freshness gate:
- If integration_last_write missing -> eligible
- If hs_lastmodifieddate missing/invalid -> skip safely
- Else eligible only if hs_lastmodifieddate > integration_last_write

If NOT eligible -> NOOP writeback:
- last_sync_status="noop"
- last_sync_at=now
- last_sync_error=""
DO NOT set integration_last_write or updated_by_integration on noop.

2) Hash idempotency:
- Build outbound CR employee payload for BCBA
- Compute desiredHash via stable stringify + sha256 (same approach as rtbt.js)
- Compare to previousHash = properties.last_sync_hash
If equal -> NOOP writeback (same rules above)
Only call CentralReach when desiredHash differs.

========================================================
D) CENTRALREACH UPSERT STRATEGY (EMPLOYEE MANAGEMENT)
========================================================
Use the same upsert sequence as rtbt.js.

externalSystemId:
- externalSystemId = String(properties.hs_object_id || objectId)

Upsert order:
1) If employee_id exists:
   - GET /contacts/employee/{ContactId} (recommended)
   - Preserve existing externalSystemId + primaryEmail if CR already has them (same pattern as rtbt.js)
   - PUT /contacts/employee/{ContactId}

2) Else:
   - PUT /contacts/employee/byExternalSystemId
   - If found -> capture returned contactId and treat as update
   - If not found:
       - Respect PUT_ONLY_MODE (default true): if true, do not create; write last_sync_status="blocked"
       - Respect ALLOW_EMPLOYEE_CREATE (default false): only if PUT_ONLY_MODE=false AND ALLOW_EMPLOYEE_CREATE=true, allow POST
       - If allowed: POST /contacts/employee with ContactForm configurable by prop (BCBA form name)

========================================================
E) BCBA FIELD MAPPING (OUTBOUND EMPLOYEE PAYLOAD)
========================================================
Map fields from HS_PROPERTIES into a CentralReach employee payload:
- Parse bcba_name into firstName/lastName (copy split logic from rtbt.js)
- primaryEmail: prefer work_email, fallback to email (lowercase/trim)
- addressLine1 = address
- addressLine2 = home_apt
- city = city_work
- stateProvince = normalize home_state to 2-letter when possible (same helper style as rtbt.js)
- phoneCell = normalize employee_phone
- dateOfBirth = normalize date_of_birth
- If no zip field exists in HS_PROPERTIES, omit zip safely.

========================================================
F) LABEL SYNC LOGIC (MUST FOLLOW RTBT ALGORITHM + THESE BCBA REQUIREMENTS)
========================================================
Implement label sync using the same algorithm as rtbt.js:
- GET existing labels
- Compute required labels
- Preserve unrelated labels
- Replace only managed BCBA/state labels
- POST only if desired set differs

Use these exact label IDs from the provided labels JSON:
- ALL_EMPLOYEES = 1052618
- BCBA = 1052629
- NY_EMPLOYEE = 1107685
- CO_EMPLOYEE = 1107687

Clinical label:
- Use the same CLINICAL constant from rtbt.js IF it exists there.
- If rtbt.js does not define a Clinical label ID, leave a TODO without guessing.

State evaluation:
- Determine state from HS using home_state
- Normalize like rtbt.js normalizeStateForEmployeeLabels:
  - "NY"/"New York" => NY
  - "CO"/"Colorado" => CO
  - otherwise null

BCBA required labels:
If NY:
- All Employees (1052618)
- BCBA (1052629)
- Clinical (use rtbt.js CLINICAL id if available)
- NY Employee (1107685)

If CO:
- All Employees (1052618)
- BCBA (1052629)
- Clinical (use rtbt.js CLINICAL id if available)
- CO Employee (1107687)

Managed set (for replacement logic):
- MANAGED_BCBA_LABEL_IDS should include:
  - BCBA (1052629)
  - NY_EMPLOYEE (1107685)
  - CO_EMPLOYEE (1107687)
  - CLINICAL (if defined)
Do NOT include ALL_EMPLOYEES in managed set removal; ALL_EMPLOYEES is always required.

Algorithm:
- existingLabelIds = GET labels
- existingUnmanaged = existingLabelIds excluding MANAGED_BCBA_LABEL_IDS
- desiredLabelIds = existingUnmanaged + requiredLabelIdsForState
- If sets equal -> noop label update
- Else POST updated label set (same payload + fallback pattern as rtbt.js)

========================================================
G) WRITEBACK RULES
========================================================
On success:
Write back to HubSpot BCBA object:
- employee_id = contactId (if resolved)
- last_sync_hash = desiredHash
- last_sync_status = "success"
- last_sync_at = now
- last_sync_error = ""
- updated_by_integration = true
- integration_last_write = now

On blocked:
- last_sync_status="blocked"
- last_sync_at=now
- last_sync_error=reason
DO NOT set integration_last_write.

On error:
- last_sync_status="error"
- last_sync_at=now
- last_sync_error=truncated safe error
DO NOT set integration_last_write.

========================================================
H) DEBUG DEFAULTS
========================================================
Include debug flags like rtbt.js but default false:
- debug_verbose_logs default false
- debug_full_payload_logs default false

========================================================
DELIVERABLE
========================================================
Output the complete updated contents of:
pipe_dream/hubspot_centralreach_sync/bcba_step_2_workflow.js

Must read from steps.Intake_Poller.$return_value.bcbaRecordIdsToSync
Must implement gating + hash idempotency + CR upsert + label sync rules above + correct writebacks.
```

If you paste the **Clinical label ID** (or confirm the rtbt.js constant you want reused), I can update the prompt one last time so Codex doesn’t leave a TODO.
