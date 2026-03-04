You are Codex. Implement Step 2 (Worker/Push) for the BT/RBT custom object HS → CentralReach Employee sync.

You MUST preserve the core working behavior and structure of the existing implementation patterns, and only extend them to support the BT/RBT custom object + employee endpoints + metadata field update. Do not refactor for style. Do not rename working helpers unless necessary. Do not change auth/token logic except to reuse it.

REFERENCE FILES (MUST FOLLOW THESE PATTERNS EXACTLY)
1) ex - pipedream_hs-cr_push.js.md
   - Reuse the same:
     - HubSpot auth (Bearer token)
     - CentralReach auth (token from https://login.centralreach.com/connect/token + x-api-key)
     - token caching in Data Store (key "cr:access_token")
     - axios initialization patterns + headers
     - PHI-safe logging approach
     - record-by-record processing loop (continue on error)
     - summary return structure (processedCount, errorCount, processed[], errors[])
     - “shouldSync”/freshness concept and “noop/create/update” style operation naming
   - Guardrail: Do NOT change how CentralReach tokens are fetched/cached in the working version; copy and reuse the same functions.

2) cr_api_endpoints.md
   - Use CentralReach endpoints exactly:
     - POST /contacts/employee
     - PUT /contacts/employee/{ContactId}
     - PUT /contacts/employee/byExternalSystemId
     - PUT /contacts/{ContactId}/metadata/{fieldId}

HUBSPOT OBJECT / ENV
- TEST custom object type: 2-55656309 (USE)
- PROD custom object type: 2-48354559 (COMMENT OUT; keep reference)
- Step 1 outputs objectIdsToSync[] where each entry is candidate.id from HubSpot Search API (follow current pattern).
- Step 2 must fetch the BT/RBT record by ID using:
  GET /crm/v3/objects/{objectTypeId}/{objectId}?properties=...

HUBSPOT WRITEBACK + STATE PROPERTIES (ALL on BT/RBT custom object)
MUST read and update:
- updated_by_integration (checkbox boolean)
- integration_last_write (datetime)
- last_sync_hash (single-line text)
- last_sync_at (datetime)
- last_sync_status (single-line text; values: success | noop | error | blocked)
- last_sync_error (multi-line text)
Also:
- employee_id (internal name exactly: employee_id) (string) — stores CentralReach employee ContactId (numeric in CR; store as String)

MUST PRESERVE ORIGINAL FUNCTIONALITY (GUARDRAILS)
- Keep the overall structure: fetch candidates → loop → for each record:
  - fetch record
  - decide operation (noop/update/create/blocked/error)
  - call external API only when needed
  - write back status fields
- Preserve existing logging style (PHI-safe). Do not add payload dumps.
- Preserve “continue processing other records if one fails”.
- Keep timeouts/retry patterns consistent with the reference file.
- Do not change the poller’s contract; Step 2 accepts an array of IDs and returns a summary object.
- If you create new helper functions, keep them local and small; do not reorganize the whole module.

IMPORTANT TESTING SAFETY (MUST IMPLEMENT EXACTLY)
This Step 2 worker will be used for testing BEFORE a CentralReach sandbox exists.
Therefore, we MUST ensure NO employee creation (POST) occurs during testing.

Add the following props:
- ALLOW_EMPLOYEE_CREATE (boolean, default false)
- PUT_ONLY_MODE (boolean, default true)

Hard rules:
1) If PUT_ONLY_MODE=true:
   - NEVER call POST /contacts/employee under any circumstance.
   - Even if ALLOW_EMPLOYEE_CREATE=true, PUT_ONLY_MODE takes precedence and still forbids POST.
2) If PUT_ONLY_MODE=true and employee_id is blank:
   - You may attempt PUT /contacts/employee/byExternalSystemId.
   - If the response indicates not found/no match:
       - Do NOT call POST.
       - Mark the HubSpot record as:
         - last_sync_status = "blocked"
         - last_sync_error = "PUT_ONLY_MODE enabled: create disabled until sandbox. Provide an existing employee_id or disable PUT_ONLY_MODE + enable ALLOW_EMPLOYEE_CREATE."
         - last_sync_at = now
       - Do NOT update integration_last_write (so it can retry later).
3) If employee_id exists:
   - Use PUT /contacts/employee/{ContactId} only (safe update path).
4) Metadata update (fieldId 133819) is only allowed when a confirmed CR ContactId exists.
   - If employee_id is blank and PUT byExternalSystemId did not return a ContactId, skip metadata update.

CENTRALREACH PAYLOAD MAPPING (EMPLOYEE CORE FIELDS)
ONLY map the fields listed below. Do not include any other employee core fields.

Build the CentralReach employee payload with these exact mappings:
1) externalSystemId  <= String(hs_object_id) (REQUIRED)
2) firstName         <= first_name           (trim)
3) lastName          <= last_name            (trim)
4) primaryEmail      <= email                (trim; lowercase recommended)
5) addressLine1      <= street_home          (trim)
6) addressLine2      <= home_apt             (trim)
7) city              <= location_city        (trim)
8) stateProvince     <= location_home        (trim; if 2 letters uppercase, otherwise leave as-is; NO state table lookup)
9) zipPostalCode     <= postal_code          (trim)
10) phoneCell        <= employee_phone       (normalize using the same transformation helper/pattern as current state)

PHONE TRANSFORM RULES (phoneCell)
- Use the same normalization behavior as in ex - pipedream_hs-cr_push.js.md (current-state).
- If no helper exists, implement deterministic normalization:
  - Strip all non-digits
  - If 11 digits starting with 1 => "+1" + last 10 digits
  - If 10 digits => "+1" + digits
  - Else keep digits-only string (do not throw)

CENTRALREACH METADATA UPDATE (FIELDID 133819: Work address)
This is a CR Contact Metadata field:
- fieldId: 133819
- fieldName: "Work address"

You MUST update this metadata field after you have a CR ContactId.

Source HubSpot fields (BT/RBT custom object):
- street_address__work_
- city__work_
- state__work_
- postal_code__work_

Transformation:
Concatenate into a single string:
  "[Street], [City], [State] [Zip]"
Rules:
- Trim each part
- Skip empty parts
- Avoid trailing commas/spaces
- If all parts are empty => do NOT call metadata update (treat as no-op for metadata)

Endpoint:
- PUT /contacts/{ContactId}/metadata/133819
Send the request body per cr_api_endpoints.md for ContactMetadataPutRequest.

IMPORTANT: The Work address metadata value MUST be included in the idempotency hash input so changing the work address triggers a sync even if employee core fields did not change.

FRESHNESS GUARD (REQUIRED)
- Fetch hs_lastmodifieddate and integration_last_write from the BT/RBT record.
- If integration_last_write missing => eligible
- Else require hs_lastmodifieddate > integration_last_write
- If not eligible => NOOP:
  - last_sync_status="noop"
  - last_sync_at=now
  - last_sync_error="" (clear)
  - integration_last_write=now
  - updated_by_integration=true

IDEMPOTENCY GUARD (REQUIRED)
Compute a single stable SHA-256 hash over the FINAL desired CR state consisting of:
- The employee core payload object (as built above)
- PLUS the computed work_address_concat string (or "" consistently)

Hash rules:
- Build deterministic object:
  {
    employee: <employeeCorePayload>,
    workAddress: <work_address_concat_or_empty_string>
  }
- Recursively sort keys, preserve array order, remove undefined, stable JSON.stringify, sha256 hex.
Compare to HubSpot last_sync_hash:
- If equal => NOOP (do not call CR):
  - last_sync_status="noop"
  - last_sync_at=now
  - last_sync_error="" (clear)
  - integration_last_write=now
  - updated_by_integration=true

SYNC EXECUTION ORDER
For each BT/RBT record that passes freshness + hash checks:
1) Upsert employee core fields using endpoint logic:
   - If employee_id exists => PUT /contacts/employee/{ContactId}
   - Else => PUT /contacts/employee/byExternalSystemId (include externalSystemId in body)
   - If not found and PUT_ONLY_MODE=true => blocked (no POST)
   - If not found and PUT_ONLY_MODE=false and ALLOW_EMPLOYEE_CREATE=true => POST /contacts/employee
   - If not found and PUT_ONLY_MODE=false and ALLOW_EMPLOYEE_CREATE=false => blocked (no POST)
2) Obtain/confirm CR ContactId:
   - If PUT by contactId => contactId is employee_id
   - If PUT byExternalSystemId returns contactId => use it; write back employee_id
   - If POST returns contactId => use it; write back employee_id
3) If work_address_concat is non-empty AND contactId is confirmed:
   - PUT /contacts/{ContactId}/metadata/133819

SUCCESS WRITEBACK (REQUIRED)
On successful completion (employee upsert + metadata update if applicable):
- If contactId is known, write employee_id = String(contactId)
- Always write:
  - last_sync_hash = new_hash
  - last_sync_status = "success"
  - last_sync_error = "" (clear)
  - last_sync_at = now
  - integration_last_write = now
  - updated_by_integration = true

ERROR HANDLING (REQUIRED)
- Continue processing other records if one fails.
- On error for a record:
  - last_sync_status="error"
  - last_sync_error=<safe truncated message>
  - last_sync_at=now
  - Do NOT update integration_last_write
  - Do NOT log PHI (no raw payload dumps, no full record properties)

HUBSPOT PROPERTIES TO REQUEST (MUST BE EXACT)
When GETting the BT/RBT record, request ONLY:
- hs_object_id
- employee_id
- hs_lastmodifieddate
- updated_by_integration
- integration_last_write
- last_sync_hash
- last_sync_at
- last_sync_status
- last_sync_error
- first_name
- last_name
- email
- street_home
- home_apt
- location_city
- location_home
- postal_code
- employee_phone
- street_address__work_
- city__work_
- state__work_
- postal_code__work_

PIPEDREAM COMPONENT REQUIREMENTS
- Produce a complete executable Pipedream component (Node.js) for Step 2.
- Props must include:
  - dataStore (data_store)
  - hubspot_access_token (secret)
  - cr_client_id (secret)
  - cr_client_secret (secret)
  - cr_api_key (secret)
  - hubspot_object_type_id (default "2-55656309")
  - max_records_per_run (default 15)
  - ALLOW_EMPLOYEE_CREATE (default false)
  - PUT_ONLY_MODE (default true)
- Implement CR token caching in Data Store (key "cr:access_token") as current state does.
- Use PHI-safe logging consistent with current state.
- Return summary:
  - processedCount, successCount, noopCount, blockedCount, errorCount
  - processed array with { objectId, operation, employee_id?, externalSystemId? }
  - errors array (PHI-safe)

DELIVERABLE
- Output ONLY the full Step 2 component code.
- No Step 1 code.
- No additional commentary.