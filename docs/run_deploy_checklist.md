# HubSpot <-> CentralReach MVP Run and Deploy Checklist

## 1) Environment Setup
- Add a local `.env` with:
  - `HUBSPOT_PRIVATE_APP_TOKEN`
  - `HUBSPOT_BASE_URL=https://api.hubapi.com`
  - `HUBSPOT_CLIENT_PIPELINE_ID=851341465`
  - `HUBSPOT_INTAKE_COMPLETE_STAGE_ID=1268817225`
  - `HUBSPOT_CR_CONTACT_ID_PROPERTY=client_id_number`
  - `CENTRALREACH_BASE_URL=https://partners-api.centralreach.com/enterprise/v1`
  - `CR_TOKEN_URL=https://login.centralreach.com/connect/token`
  - `CR_CLIENT_ID`
  - `CR_CLIENT_SECRET`
  - `CR_API_KEY`
  - `MAPPING_CSV_PATH=field_mapping_doc/USE - hubspot central reach mvp mapping sheet - case_client_mapping (1).csv`

## 2) HubSpot Readiness
- Confirm the target deal pipeline/stage IDs are correct in the portal:
  - pipeline: `851341465`
  - stage: `1268817225`
- Confirm deal properties exist:
  - `client_id_number`
  - `updated_by_integration`
  - `integration_last_write`
- Confirm private app scopes include at least:
  - `crm.objects.deals.read`
  - `crm.objects.deals.write`
  - `crm.objects.contacts.read`

## 3) CentralReach Readiness
- Confirm API credentials are valid (`CR_CLIENT_ID`, `CR_CLIENT_SECRET`, `CR_API_KEY`).
- Confirm `contacts/client` create endpoint is enabled for the API user.
- Confirm update permissions for:
  - `PUT /contacts/client/{contactId}`
  - optional `PUT /contacts/client/byExternalSystemId`
- Confirm external-system lookup support:
  - `GET /contacts/client/byExternalSystemId`

## 4) Local Contract Test Execution
- Install deps: `npm install`
- Run one pass:
  - `npm run contract:test -- --dealIds=<dealId>`
- Run re-push/no-op scenario:
  - `npm run contract:test -- --dealIds=<dealId> --runs=3`
- Validate outcomes:
  - run 1: `create` or `update`
  - run 2 after mapped edit: `update`
  - run 3 no changes: `noop`

## 5) Pipedream Deployment
- Deploy files in `pipe_dream/hubspot_centralreach_sync/`:
  - `intake-queue-poller.js` (every 1 minute)
  - `main-orchestrator.js` (every 5 minutes)
  - `hs-to-cr-sync.js` (shared module)
- Configure component props and secrets:
  - HubSpot token
  - CR client id/secret/api key
  - Data Store
- Ensure lock and dedupe keys are visible in Data Store:
  - `intake_queue_lock`
  - `intake_processed:{dealId}:{hs_lastmodifieddate}`
  - `hs_cr_integration_running`

## 6) Hardening Verification
- Retry/backoff active for 429 and 5xx in `src/utils/retry.js`.
- Validation errors are not retried and should surface actionable field-key summaries.
- Logs contain only IDs, operations, timestamps, and field keys.
- No PHI in Data Store entries.

## 7) Acceptance Criteria
- Only Intake Complete deals are processed (`pipeline` + `dealstage` IDs).
- Upsert identity precedence is enforced:
  - `client_id_number` first, then `externalSystemId`, then create.
- `externalSystemId` is set in CentralReach but never written to HubSpot.
- HubSpot writeback runs immediately after successful create/update.
- Re-push and no-op behavior matches the contract scenario.

## 8) CR -> HS Stub Scope (MVP)
- `src/stubs/cr-to-hs.js` intentionally contains TODO stubs only.
- Before enabling CR -> HS implementation, finalize:
  - authorization destination object in HubSpot
  - insurance overwrite rules
  - tags/labels sync direction.
