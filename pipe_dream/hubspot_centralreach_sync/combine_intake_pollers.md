hs_stage_allowlist_csYou are modifying Pipedream Node.js component code.

SOURCE INPUT
Use the files:

pipe_dream/hubspot_centralreach_sync/client_intake_poller.js
pipe_dream/hubspot_centralreach_sync/rt_rbt_intake_poller.js
pipe_dream/hubspot_centralreach_sync/bcba_intake_poller.js





You must preserve the exact stage allowlists and config patterns found in those sections.

SECTIONS TO USE AS SOURCE OF TRUTH
1) client_intake_poller.js  (Deals / Client flow)
2) rt_rbt_intake_poller.js  (BT/RBT custom object flow)
3) bcba_intake_poller.js    (BCBA custom object flow)

TASK
Create ONE combined poller component that replaces all three separate pollers.
This new combined poller will be the single Step 1 poller in the v1 production architecture and will feed three downstream worker steps (client worker, bcba worker, bt/rbt worker).

GOALS (COST + CORRECTNESS)
- Only enqueue records that truly need syncing (HubSpot changed since the integration last wrote to HubSpot)
- Reduce HubSpot Search payload/time by using a configurable lookback window filter
- Preserve existing lock + dedupe semantics to avoid duplicate processing
- Return three separate arrays for clean downstream logging and error isolation

HARD CONSTRAINTS
- Queue-only: NO CentralReach calls.
- Do NOT log PHI. Preserve PHI-safe logging helpers from the source pollers.
- Do NOT change the integration semantics except to combine into one component and add the lookback filter + safe timestamp parsing.
- If one poll fails, continue with the other polls and return partial results + structured errors.

==========================================================
A) COMBINED COMPONENT METADATA
==========================================================
Create a single defineComponent export default:
name: "HubSpot Combined Intake Queue Poller (Queue Only)"
description: "Polls Deals + BCBA + BT/RBT records, dedupes/queues them, and returns three queues for downstream sync steps."
version: bump appropriately

==========================================================
B) PROPS (MERGE + KEEP DEFAULTS)
==========================================================
Include:
- dataStore: data_store
- hubspot_access_token: string (secret)

Cost controls:
- lookback_minutes: integer default 15
- max_deals_per_run: integer default 15
- max_bcba_per_run: integer default 15
- max_bt_rbt_per_run: integer default 15

Per-object props using the SAME defaults that exist in each source poller:

DEALS (from client_intake_poller.js)
- hs_deal_pipeline_id: string default to the TEST pipeline id currently used in client_intake_poller.js
- keep the same constants and helper from the client poller:
  - HS_PIPELINE_ID_TEST
  - HS_PIPELINE_ID_PROD
  - HS_STAGE_ALLOWLIST_TEST
  - HS_STAGE_ALLOWLIST_PROD
  - stageAllowlistByPipeline(pipelineId)

IMPORTANT: The combined poller MUST embed BOTH the Client TEST and PROD stage allowlists exactly as they appear in the source file:

Client TEST stage allowlist:
[
  "1268817225","1268817226","1268817227","1268817228","1268817229",
  "1268817230","1268817231","1268817232","1268817233","1268817234","1268817235"
]

Client PROD stage allowlist:
[
  "1213733979","1213681739","1216864594","1266305408","1266305409",
  "1263094171","1136629068","1263175192","1278256273","1278121498",
  "closedwon","1310034488","closedlost","1136629070","1315313037"
]

BT/RBT (from rt_rbt_intake_poller.js)
- hs_bt_rbt_object_type_id: string default to HS_OBJECT_TYPE_ID_TEST in rt_rbt_intake_poller.js
- hs_bt_rbt_pipeline_id: string default to HS_PIPELINE_ID_TEST in rt_rbt_intake_poller.js
- hs_bt_rbt_stage_allowlist: string[] default to BT_RBT_STAGE_ALLOWLIST from rt_rbt_intake_poller.js (the active sandbox allowlist)
- keep PROD stage references commented exactly as they appear in the source file; do not invent new IDs.

BCBA (from bcba_intake_poller.js)
- hs_bcba_object_type_id: string default to TEST_HS_OBJECT_TYPE_ID
- hs_bcba_pipeline_id: string default to TEST_HS_PIPELINE_ID
- hs_bcba_stage_allowlist: string[] default to TEST_HS_STAGE_IDS (the active list)
- keep PROD object type id and pipeline id commented as in the source file
- BCBA PROD stage IDs are NOT available yet; do not add them.

==========================================================
C) LOCKING (ONE LOCK FOR THE WHOLE RUN)
==========================================================
Replace the three separate lock keys with ONE combined lock:
- COMBINED_LOCK_KEY = "hs_cr_lock:combined_intake_queue"
- TTL = 120 seconds

If lock exists:
return skipped:true, reason:"lock_exists", and empty arrays.

Always release lock in finally.

==========================================================
D) DEDUPE KEYS (PRESERVE PREFIXES + TTL)
==========================================================
Use these exact dedupe key formats:
- deals:  hs_cr:intake_processed:{dealId}:{hs_lastmodifieddate}
- bcba:   hs_cr:bcba_processed:{recordId}:{hs_lastmodifieddate}
- bt/rbt: hs_cr:bt_rbt_processed:{recordId}:{hs_lastmodifieddate}

Dedupe TTL = 1800 seconds.

==========================================================
E) SHARED HELPERS (ADDITIONS FOR RELIABILITY + COST)
==========================================================
1) Add defensive timestamp parsing helper (use exactly this behavior):
function parseTimestamp(value) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

2) Add shouldSyncSimple for Deals and BT/RBT:
function shouldSyncSimple(candidate) {
  const props = candidate?.properties || {};
  const hsLast = parseTimestamp(props.hs_lastmodifieddate);
  const lastWrite = parseTimestamp(props.integration_last_write);

  if (!lastWrite) return true;
  if (!hsLast) return false;
  return hsLast > lastWrite;
}

3) BCBA shouldSync:
Preserve the existing BCBA shouldSync behavior from bcba_intake_poller.js (including parseBool + updated_by_integration handling). You may keep BCBA’s shouldSync unchanged, but you may reuse parseTimestamp from shared helpers.

4) PHI-safe logging helpers:
Reuse (dedupe) the existing helpers from the source pollers:
- safeString
- redactPotentialPhi
- toErrorMeta
- buildErrorLog
Keep them PHI-safe; do not add logging of raw record properties.

==========================================================
F) LOOKBACK FILTER (NEW)
==========================================================
Add a new lookback filter to EACH of the three HubSpot searches to reduce result sizes:
const sinceIso = new Date(Date.now() - this.lookback_minutes * 60 * 1000).toISOString();

Add filter:
{ propertyName: "hs_lastmodifieddate", operator: "GTE", value: sinceIso }

This must be additive, not a replacement, and must not remove pipeline/stage filters.

If HubSpot rejects this filter in practice, handle gracefully by retrying without the filter (do not fail the whole run).

==========================================================
G) SEARCH + QUEUE LOGIC (THREE SEARCHES)
==========================================================
Perform three searches sequentially in run():

1) Deals search:
POST https://api.hubapi.com/crm/v3/objects/deals/search
filters:
- pipeline EQ this.hs_deal_pipeline_id
- dealstage IN stageAllowlistByPipeline(this.hs_deal_pipeline_id)
- hs_lastmodifieddate GTE sinceIso
properties: ["hs_object_id","hs_lastmodifieddate","integration_last_write"]
sort: hs_lastmodifieddate DESC
limit: 50

Enqueue logic:
- candidateId = candidate.id OR candidate.properties.hs_object_id
- lastModified = candidate.properties.hs_lastmodifieddate
- shouldSyncSimple(candidate)
- dedupe key check
- set dedupe key in dataStore with TTL
- push to dealIdsToSync until max_deals_per_run

2) BCBA search:
POST https://api.hubapi.com/crm/v3/objects/{this.hs_bcba_object_type_id}/search
filters:
- hs_pipeline EQ this.hs_bcba_pipeline_id
- hs_pipeline_stage IN this.hs_bcba_stage_allowlist (defaults to TEST_HS_STAGE_IDS)
- hs_lastmodifieddate GTE sinceIso
properties must include at least:
["hs_object_id","hs_lastmodifieddate","updated_by_integration","integration_last_write"]
(You may keep the additional sync props already present in the BCBA poller; acceptable.)
sort: hs_lastmodifieddate DESC
limit: 50

Enqueue logic:
- use BCBA shouldSync(candidate) from the BCBA poller
- dedupe key check
- queue into bcbaRecordIdsToSync until max_bcba_per_run

3) BT/RBT search:
POST https://api.hubapi.com/crm/v3/objects/{this.hs_bt_rbt_object_type_id}/search
filters:
- hs_pipeline EQ this.hs_bt_rbt_pipeline_id
- hs_pipeline_stage IN this.hs_bt_rbt_stage_allowlist (defaults to BT_RBT_STAGE_ALLOWLIST from source file)
- hs_lastmodifieddate GTE sinceIso
properties: ["hs_object_id","hs_lastmodifieddate","integration_last_write"]
sort: hs_lastmodifieddate DESC
limit: 50

Enqueue logic:
- shouldSyncSimple(candidate)
- dedupe key check
- queue into btRbtRecordIdsToSync until max_bt_rbt_per_run

==========================================================
H) ERROR HANDLING (PARTIAL RESULTS)
==========================================================
- Collect errors per section: deals, bcba, btRbt
- If one section fails (e.g., bcba search), log a structured errorMeta with stage = "bcba-search" and continue to the next section.
- Return partial arrays + errors; do not throw unless token missing or lock cannot be managed.
- Always release combined lock key.

==========================================================
I) OUTPUT SHAPE (EXACT)
==========================================================
Return:
{
  skipped: boolean,
  reason?: string,
  queuedCounts: { deals: number, bcba: number, btRbt: number },
  errorCounts: { deals: number, bcba: number, btRbt: number },
  dealIdsToSync: string[],
  bcbaRecordIdsToSync: string[],
  btRbtRecordIdsToSync: string[],
  errors: any[]
}

==========================================================
DELIVERABLE
==========================================================
Output the FULL final combined Pipedream component code (single defineComponent).
Do NOT output the three original components.
Do NOT modify downstream worker steps in this task.
Preserve existing behavior while adding:
- lookback_minutes + hs_lastmodifieddate GTE filter
- parseTimestamp + shouldSyncSimple for Deals and BT/RBT
- keep BCBA shouldSync behavior as-is