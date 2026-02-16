You are Codex. Build a HubSpot <-> CentralReach MVP integration.

## Non-Negotiable Constraints
- No webhooks. All triggers must be scheduler-based polling.
- HubSpot -> CentralReach near real-time behavior for Intake Complete deals: target <5 minutes.
- CentralReach create/update payload must include `FirstName` and `LastName`.
- Re-push is required while the deal remains in Intake Complete when mapped source values change.
- Never log PHI; logs must contain IDs, field keys, operation, and timestamps only.
- Existing HubSpot deal properties:
  - `updated_by_integration` (boolean)
  - `integration_last_write` (datetime)

## MVP Scope
- Implement fully: HubSpot -> CentralReach.
- Do not implement full CentralReach -> HubSpot sync in MVP; add stubs and TODOs only.

## Authoritative Trigger (HubSpot -> CentralReach)
Process only when both are true:
- `pipeline == "851341465"`
- `dealstage == "1268817225"`
Use internal IDs, not labels.

## Source of Truth For Mapping
- Authoritative CSV in repo:
  - `field_mapping_doc/USE - hubspot central reach mvp mapping sheet - case_client_mapping (1).csv`
- Build payload only from rows with `Direction = HS -> CR`.
- Apply `Transformation Rule` and `Conditional Flag` exactly when present.
- Do not invent additional mapped business fields.

## Canonical Identity + Upsert Rules
- Canonical cross-system identity for HubSpot -> CentralReach:
  - `externalSystemId = String(hs_object_id)` (HubSpot Deal ID).
- Never write `externalSystemId` back into HubSpot.

Upsert precedence:
1. If HubSpot deal has `client_id_number`, update CentralReach by `contactId`.
2. Else lookup CentralReach by `externalSystemId`:
   - if found: update
   - if not found: create with `externalSystemId = String(hs_object_id)`

## Canonical Writeback Rules
Immediately after successful CentralReach create/update, in same execution:
- Set HubSpot deal `client_id_number = crContactId`
- Set `updated_by_integration = true`
- Set `integration_last_write = now (ISO-8601 UTC)`

## Re-Push + No-Op Semantics
- Candidate selection for queue processing:
  - if `integration_last_write` is empty -> sync
  - else if `hs_lastmodifieddate > integration_last_write` -> sync
  - else skip
- Before update/create, perform payload delta check when target record exists:
  - if no material mapped field changes -> no-op
  - if changes exist -> perform update

## Required Delivery
1. Plan + open clarifications.
2. Phase 1 local Node contract implementation:
   - mapping parser
   - HubSpot context fetcher
   - transformation engine
   - CentralReach upsert logic
   - HubSpot writeback
   - CLI contract runner (including re-push/no-op checks)
3. Phase 2 Pipedream workflows:
   - 1-minute Intake Complete queue poller
   - 5-minute orchestrator for non-urgent work
4. Phase 3 hardening:
   - retry/backoff with jitter for 429/5xx
   - idempotency guards (HubSpot + Data Store)
   - observability and safe logging
5. Final run/deploy checklist.

## Required Environment Variables
- `HUBSPOT_PRIVATE_APP_TOKEN`
- `HUBSPOT_BASE_URL` (default: `https://api.hubapi.com`)
- `HUBSPOT_CLIENT_PIPELINE_ID` (default: `"851341465"`)
- `HUBSPOT_INTAKE_COMPLETE_STAGE_ID` (default: `"1268817225"`)
- `HUBSPOT_CR_CONTACT_ID_PROPERTY` (default: `"client_id_number"`)
- `CENTRALREACH_BASE_URL` (default: `https://partners-api.centralreach.com/enterprise/v1`)
- `CR_TOKEN_URL` (default: `https://login.centralreach.com/connect/token`)
- `CR_CLIENT_ID`
- `CR_CLIENT_SECRET`
- `CR_API_KEY`
- `MAPPING_CSV_PATH`

## Gating Clarifications (Do Not Guess)
1. Is `externalSystemId` writable on both create and update in this tenant?
2. Confirm lookup behavior for `GET /contacts/client/byExternalSystemId` and expected query parameter shape.
3. Address behavior:
   - one vs two addresses on create
   - separate endpoint requirement for secondary/service address.
4. Re-push scope:
   - include associated contact field edits or deal-only edits?
5. CR -> HS future scope:
   - target object for authorization data
   - overwrite rules for insurance fields
   - tags/labels sync direction.
