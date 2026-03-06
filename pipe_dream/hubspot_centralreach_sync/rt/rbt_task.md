You are Codex. Implement Step 1 ONLY (Poller / Queue Builder) for the BT/RBT custom object sync in Pipedream.

REFERENCE FILE (source of truth for style + patterns):
- working_pipedream_intake_poller.js  :contentReference[oaicite:0]{index=0}
Use it as the template for:
- Data Store lock + dedupe patterns
- shouldSync freshness guard (hs_lastmodifieddate > integration_last_write)
- PHI-safe logging helpers (safeString, redactPotentialPhi, buildErrorLog)
- return shape (queuedCount, errorCount, idsToSync[], errors[])

GOAL
Create a new Pipedream component (Step 1 poller) that queues BT/RBT custom object records that need to be synced HS → CR.
This poller will be used for TESTING ONLY at first, and must be easy to later fold into a unified poller with multiple job arrays.

HUBSPOT OBJECT
- Custom object type ID (TEST): 2-55656309  (USE THIS)
- Custom object type ID (PROD): 2-48354559  (COMMENT OUT / leave as reference)
- Pipeline property internal name: hs_pipeline
- Stage property internal name: hs_pipeline_stage

PIPELINE IDs
- TEST pipeline: 851341475 (USE THIS)
- PROD pipeline: 822050166 (COMMENT OUT / leave as reference)

STAGES TO INCLUDE (trigger + onward allowlist)
Use operator IN with these stage IDs:
- 1223572096 (Cleared to Be Assigned)  // TRIGGER stage
- 1216507226 (Fully Onboarded)
- 1275661880 (Hired)
- 1313403933 (Assigned)
- 1216507227 (Paused)
- 1263175081 (Disqualified)
- 1299798139 (Resigned)
- 1299798140 (Terminated)

POLLING LOGIC
- Search HubSpot custom object records with filters:
  1) hs_pipeline EQ <TEST_PIPELINE_ID>
  2) hs_pipeline_stage IN <STAGE_ALLOWLIST>
- Request properties at minimum:
  - hs_object_id (or id), hs_lastmodifieddate, integration_last_write
  - (optional) employee_id, last_sync_status (not required for polling decision)
- Sort by hs_lastmodifieddate DESCENDING.
- Limit candidates to 50 per API call, then cap queued work with max_records_per_run (default 15).

FRESHNESS GUARD (must match the reference file behavior)
- Implement shouldSync(candidate):
  - if integration_last_write is missing => true
  - else return hs_lastmodifieddate > integration_last_write
Only enqueue records that pass shouldSync().

LOCKING + DEDUPE (copy the exact pattern from the reference poller)
- Use a single Data Store lock key specific to BT/RBT poller:
  - e.g., hs_cr_lock:bt_rbt_queue
- TTL: 120 seconds (like reference)
- Use dedupe keys with TTL 1800 seconds (30 minutes):
  - Must include recordId + hs_lastmodifieddate so that new edits re-queue:
    hs_cr:bt_rbt_processed:<recordId>:<hs_lastmodifieddate>
- For each candidate that passes shouldSync():
  - If dedupe key already exists => skip
  - Else set dedupe key with TTL and push recordId into objectIdsToSync[]

OUTPUT
Return objectIdsToSync (array of strings), queuedCount, errorCount, and errors[] metadata (PHI-safe), just like the reference file.

REQUIRED PROPS
- dataStore: data_store
- hubspot_access_token: string secret
- max_records_per_run: integer default 15
- hs_object_type_id: string default "2-55656309" (test)
- hs_pipeline_id: string default "851341475" (test)
(Keep prod ids commented in the code as constants for easy swap.)

HUBSPOT API ENDPOINT
Use HubSpot CRM Search endpoint for the custom object type:
POST https://api.hubapi.com/crm/v3/objects/<OBJECT_TYPE_ID>/search

IMPLEMENTATION NOTES
- Follow the same PHI-safe logging approach (do not log raw record properties or payloads).
- Keep code style consistent with the reference poller.
- Use axios with timeout 30000.
- Ensure the lock is always deleted in finally{}.
- If the poller fails, store a last_error object in Data Store with TTL 86400 (like reference).

DELIVERABLE
Output a single complete Pipedream component file for Step 1 that I can paste into Pipedream and run immediately.
No Step 2 code. No push logic. Only queue/poller.