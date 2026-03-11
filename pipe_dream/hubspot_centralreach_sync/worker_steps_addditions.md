You are editing a Pipedream scheduled workflow repo. Apply the smallest possible diffs.

EDIT THESE EXACT FILE PATHS
1) Client worker (Deals → CR Client):
   pipe_dream/hubspot_centralreach_sync/working_pipedream_hs-cr_push.js

2) BT/RBT worker:
   pipe_dream/hubspot_centralreach_sync/step_2_rt/rtbt.js

3) Intake poller (combined queue poller):
   pipe_dream/hubspot_centralreach_sync/combined_intake_pollers.js
   (Do NOT rename the step; step name in Pipedream is Intake_Poller.)

GOAL (v1)
Trigger → Intake_Poller → Client Worker → BT/RBT Worker
BCBA is excluded for now, but MUST be easy to re-enable later.

CONSTRAINTS
- Keep diffs minimal.
- Do not refactor large blocks.
- Do not log PHI.
- Keep existing caches (CR token cache, accepted insurances cache) and poller datastore lock/dedupe.

========================================================
A) INTAKE POLLER: COMMENT OUT BCBA PROCESSING (DO NOT REMOVE)
========================================================
In the combined intake poller file pipe_dream/hubspot_centralreach_sync/combined_intake_pollers.js

1) COMMENT OUT (not delete) the BCBA processing section so we do NOT spend HubSpot API calls on BCBA.
   - Comment out the entire “BCBA search + queue” try/catch block.
   - Comment out any bcba-related helper calls inside run() that are only used by that block.
   - Leave bcba constants/props/helpers in place so BCBA can be re-enabled quickly later.

2) Output shape must remain stable:
   - Keep bcbaRecordIdsToSync declared as an array, but it should remain empty []
   - Keep queuedCounts.bcba = 0
   - Keep errorCounts.bcba and metricsBySection.bcba (they should remain 0 / empty metrics)

3) Confirm the poller still returns these keys:
   - dealIdsToSync
   - btRbtRecordIdsToSync
   - bcbaRecordIdsToSync (empty while BCBA block is commented out)

========================================================
B) CLIENT WORKER (Deals → CR Client)
File: pipe_dream/hubspot_centralreach_sync/working_pipedream_hs-cr_push.js
========================================================

B1) Fix Step 1 read: Intake_Poller
Replace getDealIdsToSync so it reads from the Intake_Poller step output:

function getDealIdsToSync(steps) {
  const step1 = steps?.Intake_Poller?.$return_value;
  const dealIds = step1?.dealIdsToSync;
  return Array.isArray(dealIds) ? dealIds.map(String) : [];
}

Do NOT reference HS_CR_Sync_One_Deal.

B2) Remove redundant HubSpot GET inside upsertCrAndWriteback
Currently upsertCrAndWriteback() performs a HubSpot GET to fetch client_id_number.
This is redundant because fetchDealAndContact() already hydrates the deal with client_id_number.

Surgical change:
- In the main loop (after hydration) compute:
  const existingContactId =
    hydrated.deal?.properties?.[this.hs_cr_contact_id_property] || null;

- Pass existingContactId into upsertCrAndWriteback({... existingContactId ...})

- Update upsertCrAndWriteback signature to accept existingContactId
- Delete the internal HubSpot GET (hubspot.getDeal) that only exists to read hsCrContactIdProperty
- Use the passed existingContactId variable in place of the fetched value.

B3) Use HubSpot sync properties for payload hashing (NOT Data Store payload hash)
You already have these HubSpot properties:
updated_by_integration, integration_last_write, last_sync_hash, last_sync_at, last_sync_status, last_sync_error

Surgical change:
- Stop using Data Store key hs_cr:payload_hash:{dealId} for idempotency.
- Use the deal’s HubSpot property last_sync_hash as the source of truth.

Implementation:
- Ensure hydrated deal properties include last_sync_hash, last_sync_status, last_sync_at, last_sync_error,
  updated_by_integration, integration_last_write (add these internal names to mappingProperties.deal).

- Compute:
  const incomingHash = hashPayload(toComparableShape(payload));
  const previousHash = String(hydrated.deal?.properties?.last_sync_hash || "");
  const hasSamePayloadHash = Boolean(existingContactId) && previousHash && previousHash === incomingHash;

NOOP behavior:
- If existingContactId exists AND hasSamePayloadHash:
    operation = "noop"
    Write back to HubSpot (deal):
      last_sync_status = "noop"
      last_sync_at = now
      last_sync_error = ""
    IMPORTANT: do NOT set integration_last_write or updated_by_integration on noop.

SUCCESS behavior:
- On create/update:
    Write back to HubSpot (deal):
      client_id_number = crContactId
      last_sync_hash = incomingHash
      last_sync_status = "success"
      last_sync_at = now
      last_sync_error = ""
      updated_by_integration = true
      integration_last_write = now

ERROR behavior:
- On error for a deal, best-effort writeback:
      last_sync_status = "error"
      last_sync_at = now
      last_sync_error = truncated safe message
  (Do NOT set integration_last_write on error.)

After this change:
- Remove PAYLOAD_HASH_TTL_SECONDS and any Data Store payload hash get/set logic if unused.
- Keep Data Store usage for CR token cache and accepted-insurance cache.

========================================================
C) BT/RBT WORKER
File: pipe_dream/hubspot_centralreach_sync/step_2_rt/rtbt.js
========================================================

C1) Fix Step 1 read: Intake_Poller + correct key
Replace getObjectIdsToSync with direct read from Step 1 output:

function getObjectIdsToSync(steps) {
  const step1 = steps?.Intake_Poller?.$return_value;
  const ids = step1?.btRbtRecordIdsToSync;
  return Array.isArray(ids) ? ids.map(String) : [];
}

Do NOT scan for objectIdsToSync.

C2) NOOP semantics: do not update integration_last_write / updated_by_integration on noop
In both noop branches:
- !isFreshEnough(props)
- previousHash === desiredHash

Change writeback payload to ONLY:
  last_sync_status: "noop"
  last_sync_at: now
  last_sync_error: ""

Do NOT set:
  integration_last_write
  updated_by_integration

Keep integration_last_write + updated_by_integration only on success writebacks
(create/update paths where we actually performed work and are intentionally writing integration markers).

C3) Debug defaults (safer)
Change default props:
- debug_verbose_logs: default false
- debug_full_payload_logs: default false
(Still allow enabling during testing.)

========================================================
DELIVERABLE
========================================================
Output the updated full contents of these two files:
- pipe_dream/hubspot_centralreach_sync/working_pipedream_hs-cr_push.js
- pipe_dream/hubspot_centralreach_sync/step_2_rt/rtbt.js

And output the updated Intake_Poller code block (or patch) showing the BCBA processing section commented out
(not removed), and confirming the poller still returns:
dealIdsToSync, btRbtRecordIdsToSync, bcbaRecordIdsToSync (empty for now).