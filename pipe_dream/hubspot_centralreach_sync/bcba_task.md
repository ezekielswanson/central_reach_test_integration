You are Codex. Implement Step 1 ONLY (Queue Poller) for the BCBA custom object sync in Pipedream.

REFERENCE FILE (source of truth for style + patterns):
- working_pipedream_intake_poller.js  
Use it as the template for:
- Data Store lock + TTL
- Dedupe key pattern (recordId + hs_lastmodifieddate)
- shouldSync freshness guard behavior
- PHI-safe logging helpers (safeString, redactPotentialPhi, toErrorMeta/buildErrorLog)
- Return shape (queuedCount, errorCount, recordIdsToSync, errors)

IMPORTANT SCOPE
- Implement ONLY Step 1 (poll + queue). No CentralReach calls. No Step 2.
- This prompt is ONLY for the BCBA poller.
- Also create an output file named exactly: bcba_intake_poller (the final code artifact file name).

HUBSPOT OBJECT (BCBA custom object)
- Object type ID (TESTING USE): "2-55656302"
- Object type ID (PROD COMMENT OUT): "2-48354212"

PROPERTY NAMES (confirmed)
- Pipeline property internal name: "hs_pipeline"
- Stage property internal name: "hs_pipeline_stage"

PIPELINE IDs
- TESTING PIPELINE ID: "876724575"
- PROD PIPELINE ID (comment out): "855656544"

STAGES TO INCLUDE (TESTING)
Implement stage “trigger + onward” as an allowlist using operator IN:
- "1314109614"  // Cleared to be Assigned (trigger stage)
- "1314109318"  // Fully Cleared
- "1314109615"  // Hiring Complete
- "1314110003"  // Hired/Credentialing In Process
- "1314110004"  // Hired/Credentialing Complete
- "1314796081"  // Paused
- "1314109317"  // Disqualified

(Keep the PROD stage IDs as commented constants in the code for later swap, but do NOT use them during testing.)

HUBSPOT SEARCH ENDPOINT
POST https://api.hubapi.com/crm/v3/objects/{OBJECT_TYPE_ID}/search

FILTER REQUIREMENTS
Your HubSpot search body must:
- filterGroups[0].filters includes:
  1) { propertyName: "hs_pipeline", operator: "EQ", value: <TESTING_PIPELINE_ID> }
  2) { propertyName: "hs_pipeline_stage", operator: "IN", values: <STAGE_ID_LIST> }

PROPERTIES TO REQUEST (minimal + required for guards)
Request these properties from HubSpot in the search:
- "hs_object_id"
- "hs_lastmodifieddate"
- "updated_by_integration"
- "integration_last_write"
- "last_sync_hash"
- "last_sync_at"
- "last_sync_status"
- "last_sync_error"
(Do not log these raw values—PHI-safe logs only.)

FRESHNESS / LOOP-PREVENTION GUARD (must be applied before queueing)
Implement shouldSync(candidate) using:
- If candidate.properties.integration_last_write is missing => true
- Else if candidate.properties.updated_by_integration is true AND candidate.properties.integration_last_write exists:
    - If hs_lastmodifieddate <= integration_last_write => skip
    - Else allow (HubSpot changed after the last integration write)
- Else (updated_by_integration is false):
    - If hs_lastmodifieddate > integration_last_write => allow
    - Else skip

(If you want to keep it simpler: hs_lastmodifieddate > integration_last_write is the primary rule; updated_by_integration is secondary and must never cause a record to be skipped when HubSpot changes are newer.)

SORTING / LIMITS
- sorts: [{ propertyName: "hs_lastmodifieddate", direction: "DESCENDING" }]
- limit: 50 candidates per search call
- cap queued work using a prop:
  - max_records_per_run default 15

LOCKING + DEDUPE (follow the reference file)
- Lock key: "hs_cr_lock:bcba_queue"
- Lock TTL: 120 seconds
- Dedupe TTL: 1800 seconds
- Dedupe key format must include recordId and hs_lastmodifieddate:
  hs_cr:bcba_processed:${recordId}:${hs_lastmodifieddate}

QUEUEING BEHAVIOR
For each candidate:
- Must pass shouldSync(candidate)
- Must not exceed max_records_per_run
- If dedupe key exists in Data Store => skip
- Else set dedupe key with TTL and push recordId into recordIdsToSync

OUTPUT SHAPE
Return an object like:
{
  skipped: false,
  queuedCount: <int>,
  errorCount: <int>,
  recordIdsToSync: [<string>...],
  errors: [<errorMeta>...]
}
If lock exists, return:
{
  skipped: true,
  reason: "lock_exists",
  recordIdsToSync: []
}

PIPEDREAM COMPONENT REQUIREMENTS
- export default defineComponent({ name, description, version, props, async run({ steps, $ }) { ... } })
- props must include:
  - dataStore: { type: "data_store" }
  - hubspot_access_token: { type: "string", secret: true }
  - max_records_per_run: { type: "integer", default: 15 }
  - hs_object_type_id: { type: "string", default: "2-55656302" }  // test
  - hs_pipeline_id: { type: "string", default: "876724575" }      // test

PHI-SAFE LOGGING
- Do not console.log entire HubSpot records.
- Use redactPotentialPhi + safeString patterns from the reference file.
- Log only counts, ids, and timestamps.

DELIVERABLE
- Output a single complete Pipedream component file named bcba_intake_poller.
- It must be runnable immediately in Pipedream as Step 1.
- No pseudocode. No Step 2. No TODO placeholders.