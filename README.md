# central_reach_test_integration

HubSpot to CentralReach MVP integration sandbox.

## Implemented Structure
- `docs/codex_prompt_revised.md`: cleaned prompt for future runs.
- `src/`: local contract-test implementation.
  - `src/mapping/csv-loader.js`
  - `src/mapping/transformer.js`
  - `src/clients/hubspot-client.js`
  - `src/clients/centralreach-client.js`
  - `src/sync/hs-to-cr-sync.js`
  - `src/cli/contract-test-runner.js`
  - `src/stubs/cr-to-hs.js` (MVP stubs only)
- `pipe_dream/hubspot_centralreach_sync/`: scheduler workflows and shared sync module.

## Quick Start
1. Add required env vars to `.env` (see `docs/run_deploy_checklist.md`).
2. Install dependencies:
   - `npm install`
3. Run contract test:
   - `npm run contract:test -- --dealIds=<dealId>`
4. Re-push/no-op test:
   - `npm run contract:test -- --dealIds=<dealId> --runs=3`

## Pipedream
Deploy:
- `pipe_dream/hubspot_centralreach_sync/intake-queue-poller.js` (1-minute queue)
- `pipe_dream/hubspot_centralreach_sync/main-orchestrator.js` (5-minute orchestrator)

## Notes
- No webhooks are used.
- CR -> HS is intentionally stubbed for MVP.
