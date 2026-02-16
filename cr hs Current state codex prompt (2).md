You are Codex. Build a HubSpot ↔ CentralReach MVP integration.

CONSTRAINTS  
\- NO WEBHOOKS (period). All triggers are scheduled polling.  
\- HS → CR must feel “immediate” when a Deal enters Intake Complete: target \<4–5 minutes.  
\- CentralReach create requires First Name \+ Last Name.  
\- Re-push behavior: IF the deal is edited while it remains in Intake Complete, re-sync HS → CR.  
\- HubSpot has two existing deal properties:  
  \- updated\_by\_integration (boolean)  
  \- integration\_last\_write (datetime)  
\- Repo contains API docs for HubSpot \+ CentralReach and Pipedream example workflows showing Data Store usage.

SCOPE  
A) HubSpot → CentralReach (HS → CR): IMPLEMENT FULLY (MVP)  
B) CentralReach → HubSpot (CR → HS): DO NOT IMPLEMENT (MVP). Stubs/TODO only.

SOURCE OF TRUTH FOR HS → CR  
\- Mapping CSV is authoritative:  
  /mnt/data/USE \- hubspot central reach mvp mapping sheet \- case\_client\_mapping.csv  
\- Build HS → CR payload strictly from rows with Direction \= HS → CR.  
\- Apply Transformation Rule and Conditional Flag exactly. No invented fields.

AUTHORITATIVE TRIGGER (HS → CR)  
A Deal (Case) should be processed for HS → CR ONLY when BOTH are true:  
\- pipeline \== "851341465"        // Client Pipeline internal ID  
\- dealstage \== "1268817225"      // Intake Complete (Client Pipeline) internal ID  
Use internal IDs for pipeline/stage; do not use label strings.

IDENTITY / MATCHING KEY (HS → CR) — AUTHORITATIVE  
\- When creating/updating a CentralReach client, set:  
  CentralReach.externalSystemId \= String(HubSpot Deal ID / hs\_object\_id)  
\- This is the deterministic cross-system identifier used for upsert/lookup and dedupe in CentralReach.  
\- IMPORTANT: We are NOT writing externalSystemId back into HubSpot.

AUTHORITATIVE ID WRITEBACK (CR → HS within the HS → CR flow)  
\- After CR upsert succeeds, write back:  
  HubSpot Deal property \`client\_id\_number\` \= CentralReach \`contactId\`  
\- This writeback must occur immediately after CR upsert, in the SAME execution.

PHASED DELIVERY  
You must output:  
1\) PLAN \+ QUESTIONS (before coding): short plan, plus clarifying questions you need answered.  
2\) Phase 1: Local Node.js “contract test” implementation (API \+ mapping \+ transformations \+ CR upsert \+ HS writeback).  
3\) Phase 2: Pipedream workflows (1-minute Intake Queue poller \+ 5-minute orchestrator for everything else).  
4\) Phase 3: Hardening changes (retry/backoff, datastore dedupe/locks, observability).  
5\) A final “How to run / deploy” checklist.

PHASE 1 — LOCAL CONTRACT TESTS (MUST INCLUDE TRANSFORMATION ENGINE)  
Implement modules:

A) parseMappingCsv(csvPath)  
\- Parse CSV into mapping rows, filter Direction \= HS → CR for MVP.

B) fetchHubSpotDealContext(dealId, mappingRows)  
\- Fetch Deal properties required by mapping.  
\- Fetch associated contact(s) only if mapping requires it.  
\- Minimize API calls.

C) transformDealContextToCrPayload(dealContext, mappingRows)  
\- For each row:  
  \- Evaluate Conditional Flag; omit if false.  
  \- Apply Transformation Rule exactly as specified in the CSV (dates, enums, phone normalization,  
    concatenation, trimming, null handling, value maps, etc.).  
\- Output:  
  \- crPayload (CentralReach schema required by create/update)  
  \- transformTrace (IDs and field keys only; NO PHI)

D) upsertCentralReachClient(dealContext, crPayload)  
UPSERT STRATEGY / IDENTITY (HS → CR) — REQUIRED  
\- externalSystemId \= String(dealContext.dealId)  // HubSpot hs\_object\_id / Deal ID  
\- Deterministic upsert:  
  1\) If HubSpot Deal already has a CR contactId stored in \`client\_id\_number\`, UPDATE that CR record by contactId.  
  2\) Else attempt to find CR client by externalSystemId (if CR supports lookup/search).  
     \- If found → UPDATE  
     \- Else → CREATE with externalSystemId set to String(dealId)  
\- Return:  
  \- crContactId (CentralReach contactId)  
  \- externalSystemId used  
  \- operation performed (create/update)

E) writeBackToHubSpot(dealId, crContactId)  
\- Patch the HubSpot Deal immediately after CR upsert:  
  \- set \`client\_id\_number\` \= crContactId  
  \- set \`updated\_by\_integration\` \= true  
  \- set \`integration\_last\_write\` \= now ISO  
\- IMPORTANT: Do NOT attempt to write externalSystemId to HubSpot.

F) contract test runner (CLI)  
\- Accept dealId list, run full pipeline.  
\- Include tests for RE-PUSH:  
  1\) Run once (create/update)  
  2\) Modify a mapped field; run again (must update CR)  
  3\) Run again without changes (should no-op if no delta)

PHASE 2 — PIPEDREAM WORKFLOWS (NO WEBHOOKS)

Workflow A: Intake Complete Queue (HS → CR near real-time push) — runs every 1 minute  
\- Trigger: Scheduler every 1 minute.

Step 1: Cheap poll (1 request) via HubSpot CRM Search  
\- Call: POST /crm/v3/objects/deals/search  
\- Filters:  
  \- pipeline EQ "851341465"  
  \- dealstage EQ "1268817225"  
\- Sort: hs\_lastmodifieddate DESC  
\- Limit: 50

Step 2: For each candidate deal, decide “needs sync” (RE-PUSH ON EDITS)  
\- If integration\_last\_write is blank/null → needs sync  
\- Else if hs\_lastmodifieddate \> integration\_last\_write → needs sync  
\- Else skip

Step 3: Dedupe with Data Store (IDs only)  
\- Key: intake\_processed:{dealId}:{hs\_lastmodifieddate}  
\- If exists → skip  
\- If not → set with TTL (10–30 min), then process

(Optional but recommended): Run lock to prevent overlapping minute-runs  
\- Key: intake\_queue\_lock (TTL \~2–3 minutes)

Step 4: Process each deal that needs sync  
\- Hydrate \-\> Transform \-\> CR upsert \-\> HS writeback

Required identity behavior (HS → CR)  
\- Set CentralReach externalSystemId \= String(hs\_object\_id) on create/update.

Required writeback (immediately after CR upsert)  
\- HubSpot Deal \`client\_id\_number\` \= CR contactId  
\- updated\_by\_integration \= true  
\- integration\_last\_write \= now ISO

Step 5: Safe logging  
\- Log IDs \+ timestamps only (dealId, hs\_lastmodifieddate, crContactId, operation).  
\- Never log PHI.

Workflow B: 5-minute orchestrator (non-urgent sync) — runs every 5 minutes  
\- Scheduler every 5 minutes.  
\- Use same patterns from repo example (orchestrator calls submodules).  
\- Use Data Store watermarks/locks as needed.

CR → HS (MVP RULE)  
\- DO NOT implement full CR → HS sync. Only stubs \+ TODO modules.  
\- Implement placeholder functions ONLY (no mapping guesses):  
  \- fetchAuthorizationsFromCentralReach(crContactId) \-\> returns normalized auth payload (TODO mapping)  
  \- mapAuthorizationsToHubSpotProperties(authPayload) \-\> TODO  
  \- upsertHubSpotAuthorizationFields(hsDealId or hsContactId, mappedProps) \-\> TODO  
\- Include a “Clarifications Needed (Gating)” section for:  
  \- authorizations fields \+ HubSpot destination object  
  \- insurance directionality \+ overwrite rules  
  \- tags/labels sync and direction

PHASE 3 — HARDENING  
\- Retry/backoff rules:  
  \- Retry on 429 and 5xx with exponential backoff and jitter.  
  \- Do not retry validation errors; return actionable summary (IDs \+ field keys only).  
\- Idempotency:  
  \- Primary: CR contactId stored on HS deal in \`client\_id\_number\`  
  \- Secondary: datastore dedupe key above  
\- Compliance:  
  \- Never log PHI.  
  \- Never store PHI in Data Stores; IDs only.

CONFIG / ENV VARS  
\- HUBSPOT\_PRIVATE\_APP\_TOKEN  
\- HUBSPOT\_BASE\_URL (default https://api.hubapi.com)  
\- HUBSPOT\_CLIENT\_PIPELINE\_ID \= "851341465"  
\- HUBSPOT\_INTAKE\_COMPLETE\_STAGE\_ID \= "1268817225"  
\- HUBSPOT\_CR\_CONTACT\_ID\_PROPERTY \= "client\_id\_number"  
\- CENTRALREACH\_BASE\_URL  
\- CENTRALREACH\_AUTH (per repo docs)  
\- MAPPING\_CSV\_PATH

CLARIFICATIONS NEEDED (ASK FIRST — DO NOT GUESS)  
1\) CentralReach externalSystemId behavior:  
   \- Is externalSystemId writable on create AND update?  
   \- Is there an endpoint to lookup/search by externalSystemId?  
   \- If lookup by externalSystemId is NOT supported, confirm fallback strategy:  
     create if no client\_id\_number exists, then rely on client\_id\_number for future updates.  
2\) Address handling:  
   \- One vs two addresses on create?  
   \- If two require separate endpoints, identify them from repo docs.  
3\) Re-push scope:  
   \- Do edits to associated Contact fields (guardian contact) also require re-push,  
     or only Deal edits?

OUTPUT FORMAT  
\- Start with Plan \+ Questions.  
\- Then Phase 1 code.  
\- Then Phase 2 Pipedream-ready code.  
\- Then Phase 3 hardening notes and deploy checklist.

\#\#Input files / repo context

central\_reach\_api\_resp\_docs/  
\- Contains CentralReach API response formats.

central\_reach\_docs/  
\- Contains CentralReach API information.

field\_mapping\_doc/  
\- Contains the authoritative field mapping and logic rules:  
  Columns in order A-K:  
  HubSpot Object  
  HubSpot Property Labels  
  HubSpot Internal Value  
  HubSpot Field Type  
  CentralReach Entity (DW2)  
  CentralReach UI Field Label  
  CentralReach Internal Value  
  CentralReach Field Type  
  Transformation Rule  
  Direction  
  Conditional Flag  
\- While reviewing, update logic-rule interpretations only if necessary to correctly implement them.

hubspot\_docs/  
\- Contains HubSpot API information.

output\_files/  
\- Contains actual API responses from:  
  \- CentralReach GET client endpoint  
  \- CentralReach CREATE client endpoint

patient\_bi\_direc\_sync/  
\- Pipedream example for orchestrator \+ Data Store usage patterns.

api\_calls.js  
\- Contains the get client and post client endpoints.  
\- When creating the client in CentralReach, you must use the form/payload structure shown there, including:  
  ContactForm: 'Public Client Intake Form'

Example create payload shape (use as structure reference, not as hardcoded values):  
const CREATE\_CLIENT\_PAYLOAD \= {  
  ContactForm: 'Public Client Intake Form',  
  FirstName: '...',  
  LastName: '...',  
  DateOfBirth: '...',  
  Gender: '...',  
  PrimaryEmail: '...',  
  PhoneCell: '...',  
  AddressLine1: '...',  
  City: '...',  
  StateProvince: '...',  
  ZipPostalCode: '...',  
  GuardianFirstName: '...',  
  GuardianLastName: '...',  
};

