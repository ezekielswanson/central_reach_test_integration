import axios from "axios";  
import { createHash } from "crypto";

// \-------------------------  
// Constants (from your sync engine file)  
// \-------------------------  
const HUBSPOT\_BASE\_URL \= "https://api.hubapi.com";  
const CR\_TOKEN\_URL \= "https://login.centralreach.com/connect/token";  
const CR\_BASE\_URL \= "https://partners-api.centralreach.com/enterprise/v1";  
const CR\_ACCESS\_TOKEN\_KEY \= "cr:access\_token";  
const PAYLOAD\_HASH\_TTL\_SECONDS \= 2592000; // 30 days

// \-------------------------  
// Helpers: retry / sleep  
// \-------------------------  
function sleep(ms) {  
  return new Promise((resolve) \=\> setTimeout(resolve, ms));  
}

function isRetriableStatus(status) {  
  return status \=== 429 || (status \>= 500 && status \<= 599);  
}

async function withRetry(fn, options \= {}) {  
  const maxRetries \= Number.isInteger(options.maxRetries) ? options.maxRetries : 3;  
  const maxAttempts \= maxRetries \+ 1;  
  const baseDelayMs \= options.baseDelayMs || 250;  
  const maxDelayMs \= options.maxDelayMs || 5000;  
  const onRetry \= options.onRetry;

  let attempt \= 0;  
  while (attempt \< maxAttempts) {  
    attempt \+= 1;  
    try {  
      return await fn();  
    } catch (err) {  
      const status \= err?.response?.status;  
      const shouldRetry \= isRetriableStatus(status);  
      const isLastAttempt \= attempt \>= maxAttempts;  
      if (\!shouldRetry || isLastAttempt) throw err;

      const jitter \= Math.floor(Math.random() \* 150);  
      const delayMs \= Math.min(baseDelayMs \* 2 \*\* (attempt \- 1\) \+ jitter, maxDelayMs);  
      if (typeof onRetry \=== "function") onRetry({ attempt, status, delayMs });  
      await sleep(delayMs);  
    }  
  }  
  throw new Error("Retry loop exited unexpectedly.");  
}

// \-------------------------  
// PHI-safe logs \+ richer error meta  
// \-------------------------  
function safeLog(message, meta \= {}) {  
  console.log(JSON.stringify({ message, timestamp: new Date().toISOString(), ...meta }));  
}

function safeString(value, max \= 900\) {  
  if (value \== null) return null;  
  const s \= typeof value \=== "string" ? value : JSON.stringify(value);  
  return s.length \> max ? \`${s.slice(0, max)}…(truncated)\` : s;  
}

function redactPotentialPhi(str) {  
  if (\!str) return str;

  // Emails  
  let out \= str.replace(/\[A-Z0-9.\_%+-\]+@\[A-Z0-9.-\]+\\.\[A-Z\]{2,}/gi, "\[REDACTED\_EMAIL\]");

  // US-ish phone numbers  
  out \= out.replace(  
    /\\b(\\+?1\[-.\\s\]?)?(\\(?\\d{3}\\)?)\[-.\\s\]?\\d{3}\[-.\\s\]?\\d{4}\\b/g,  
    "\[REDACTED\_PHONE\]"  
  );

  return out;  
}

function toErrorMeta(error) {  
  const isAxios \= \!\!error?.isAxiosError || \!\!error?.response || \!\!error?.config;  
  const axiosJson \= typeof error?.toJSON \=== "function" ? error.toJSON() : null;

  return {  
    errorName: error?.name || "Error",  
    errorCode: error?.code || null,  
    errorMessage: redactPotentialPhi(safeString(error?.message, 900)),  
    errorStack: safeString(error?.stack, 1200),

    isAxios,  
    httpStatus: error?.response?.status ?? null,  
    httpStatusText: safeString(error?.response?.statusText, 120),  
    axiosMethod: isAxios ? (error?.config?.method ?? null) : null,  
    axiosUrl: isAxios ? safeString(error?.config?.url, 500\) : null,

    // response data could contain PHI \-\> truncate \+ redact  
    axiosResponseDataSnippet: isAxios ? redactPotentialPhi(safeString(error?.response?.data, 700)) : null,

    axiosToJson: axiosJson ? axiosJson : null,  
  };  
}

// \-------------------------  
// Transform helpers (from your sync engine file)  
// \-------------------------  
function normalizePhone(value) {  
  const digits \= String(value || "").replace(/\\D+/g, "");  
  if (digits.length \=== 11 && digits.startsWith("1")) return digits.slice(1);  
  if (digits.length \=== 10\) return digits;  
  return null;  
}

function cleanEmail(value) {  
  const normalized \= String(value || "").trim().toLowerCase();  
  return normalized || null;  
}

function toCrClientPayload(payload) {  
  return {  
    ContactForm: payload.ContactForm,  
    FirstName: payload.FirstName,  
    LastName: payload.LastName,  
    DateOfBirth: payload.DateOfBirth,  
    Gender: payload.Gender,  
    PrimaryEmail: payload.PrimaryEmail,  
    PhoneCell: payload.PhoneCell,  
    AddressLine1: payload.AddressLine1,  
    AddressLine2: payload.AddressLine2,  
    City: payload.City,  
    StateProvince: payload.StateProvince,  
    ZipPostalCode: payload.ZipPostalCode,  
    GuardianFirstName: payload.GuardianFirstName,  
    GuardianLastName: payload.GuardianLastName,  
    ExternalSystemId: payload.ExternalSystemId,  
  };  
}

function toComparableShape(crPayload) {  
  return {  
    externalSystemId: crPayload.ExternalSystemId || null,  
    firstName: crPayload.FirstName || null,  
    lastName: crPayload.LastName || null,  
    dateOfBirth: crPayload.DateOfBirth || null,  
    gender: crPayload.Gender || null,  
    primaryEmail: crPayload.PrimaryEmail || null,  
    phoneCell: crPayload.PhoneCell || null,  
    addressLine1: crPayload.AddressLine1 || null,  
    addressLine2: crPayload.AddressLine2 || null,  
    city: crPayload.City || null,  
    stateProvince: crPayload.StateProvince || null,  
    zipPostalCode: crPayload.ZipPostalCode || null,  
    guardianFirstName: crPayload.GuardianFirstName || null,  
    guardianLastName: crPayload.GuardianLastName || null,  
  };  
}

function stableStringify(value) {  
  if (value \=== null || typeof value \!== "object") return JSON.stringify(value);  
  if (Array.isArray(value)) return \`\[${value.map((item) \=\> stableStringify(item)).join(",")}\]\`;  
  const keys \= Object.keys(value).sort();  
  return \`{${keys.map((k) \=\> \`${JSON.stringify(k)}:${stableStringify(value\[k\])}\`).join(",")}}\`;  
}

function hashPayload(payload) {  
  return createHash("sha256").update(stableStringify(payload)).digest("hex");  
}

function isValidEmail(value) {  
  if (\!value) return false;  
  return /^\[^\\s@\]+@\[^\\s@\]+\\.\[^\\s@\]+$/.test(value);  
}

function mapGender(value) {  
  const normalized \= String(value || "").toLowerCase();  
  if (normalized \=== "male") return "Male";  
  if (normalized \=== "female") return "Female";  
  return null;  
}

function buildValidationError(dealId, missingFieldKeys) {  
  const err \= new Error("missing\_required\_fields");  
  err.name \= "PayloadValidationError";  
  err.details \= { dealId: String(dealId), missingFieldKeys };  
  return err;  
}

function validateRequiredCreateFields(payload, dealId) {  
  const missingFieldKeys \= \[\];  
  if (\!payload?.FirstName) missingFieldKeys.push("FirstName");  
  if (\!payload?.LastName) missingFieldKeys.push("LastName");  
  if (missingFieldKeys.length \> 0\) throw buildValidationError(dealId, missingFieldKeys);  
}

function toIsoMidnight(value) {  
  if (\!value) return null;  
  const date \= new Date(value);  
  if (\!Number.isNaN(date.getTime())) {  
    const yyyy \= date.getUTCFullYear();  
    const mm \= String(date.getUTCMonth() \+ 1).padStart(2, "0");  
    const dd \= String(date.getUTCDate()).padStart(2, "0");  
    return \`${yyyy}-${mm}-${dd}T00:00:00.000Z\`;  
  }  
  return null;  
}

/\*\*  
 \* HubSpot "date" properties often come as ms timestamps (string) or parseable strings.  
 \* Convert to ISO string for CentralReach.  
 \*/  
function hsDateToIsoOrNull(value) {  
  if (value \=== undefined || value \=== null || String(value).trim() \=== "") return null;

  const n \= Number(value);  
  if (Number.isFinite(n) && n \> 0\) {  
    const d \= new Date(n);  
    return Number.isNaN(d.getTime()) ? null : d.toISOString();  
  }

  const d \= new Date(value);  
  return Number.isNaN(d.getTime()) ? null : d.toISOString();  
}

// \-------------------------  
// Insurance logic (HubSpot Deal \-\> CentralReach Payor)  
// \-------------------------  
function clampInsuranceCount(raw) {  
  const n \= Number(raw);  
  if (\!Number.isFinite(n)) return 0;  
  if (n \< 0\) return 0;  
  return Math.min(n, 4);  
}

function getInsuranceSummaryInternalNameByCount(count) {  
  // user-defined mapping  
  if (count \=== 1\) return "number\_of\_insurances\_1";  
  if (count \=== 2\) return "number\_of\_insurances\_2";  
  if (count \=== 3\) return "number\_of\_insurances\_3";  
  if (count \=== 4\) return "number\_of\_insurances\_4";  
  return null;  
}

/\*\*  
 \* Builds the CR payor payload for PRIMARY only (per your current locked logic).  
 \* \- Summary field selected by count drives notes/nickname.  
 \* \- coverageFrom/to mapped from primary insurance dates.  
 \*/  
function buildPrimaryPayorPayloadFromDeal(dealProps) {  
  const count \= clampInsuranceCount(dealProps.number\_of\_insurance\_s\_);  
  const summaryField \= getInsuranceSummaryInternalNameByCount(count);  
  const summaryValue \= summaryField ? dealProps\[summaryField\] : null;

  // We need a companyName to create/update a payor record.  
  // If your payer name is inside the summary, you can optionally parse it later.  
  // For now, we allow "Other" to supply companyName via phi\_insurance.  
  const companyName \= dealProps.phi\_insurance || (summaryValue ? String(summaryValue) : null);

  return {  
    // CR uses payorNickName / payorNickname variants across responses; in POST/PUT payload,  
    // your environment has accepted payorNickName.  
    payorNickName: summaryValue ? String(summaryValue).slice(0, 120\) : "Primary Insurance",  
    notes: summaryValue ? String(summaryValue) : null,  
    insurance: {  
      companyName: companyName ? String(companyName).slice(0, 200\) : null,  
      // planName can be refined later; keep consistent for now.  
      planName: companyName ? String(companyName).slice(0, 200\) : null,

      // Mapped dates \+ transformations (per your instruction)  
      coverageFrom: hsDateToIsoOrNull(dealProps.primary\_insurance\_\_effective\_date),  
      coverageTo: hsDateToIsoOrNull(dealProps.primary\_insurance\_\_renewal\_date),

      // Optional fields: keep null until you define HubSpot properties for them  
      copayType: null,  
      copayAmount: null,  
      copayFrequency: null,  
      status: 1, // "Current insurance" assumption; adjust if you add status field  
      insuranceContactPhone: null,  
      insuranceContactPerson: null,  
      groupNumber: null,  
      groupName: null,

      // Subscriber / Patient objects are required for full UI population.  
      // You told me those will come from the Deal, but they aren't in the current deal-insurance CSV set.  
      // Leave null for now, then we can wire them once you add deal properties.  
      subscriberInfo: null,  
      patientInfo: null,  
    },  
  };  
}

async function listClientPayors({ headers, contactId, requestWithRetry }) {  
  const res \= await requestWithRetry(  
    async () \=\>  
      axios.get(\`${CR\_BASE\_URL}/contacts/clients/${contactId}/payors\`, {  
        headers,  
        timeout: 30000,  
      }),  
    "cr.payors.list",  
    { contactId: String(contactId) }  
  );  
  // depending on response shape  
  return res.data?.payors || res.data?.clientPayors?.payors || \[\];  
}

function findPrimaryPayor(existingPayors) {  
  // Common: list returns payorType \= "PrimaryInsurance"  
  const byTypeString \= existingPayors.find((p) \=\> String(p?.payorType) \=== "PrimaryInsurance");  
  if (byTypeString) return byTypeString;

  // Fallback: some environments may return numeric types  
  const byTypeNum \= existingPayors.find((p) \=\> Number(p?.payorType) \=== 1);  
  if (byTypeNum) return byTypeNum;

  return null;  
}

async function upsertPrimaryPayor({ headers, contactId, dealProps, requestWithRetry }) {  
  const payload \= buildPrimaryPayorPayloadFromDeal(dealProps);

  // If we still don't have a companyName, we can't create a meaningful payor record  
  if (\!payload?.insurance?.companyName) {  
    safeLog("Skipping payor upsert: missing insurance.companyName", { contactId: String(contactId) });  
    return { payorOperation: "skip\_missing\_companyName", payorId: null };  
  }

  const existingPayors \= await listClientPayors({ headers, contactId, requestWithRetry });  
  const primary \= findPrimaryPayor(existingPayors);

  if (\!primary?.payorId) {  
    const created \= await requestWithRetry(  
      async () \=\>  
        axios.post(\`${CR\_BASE\_URL}/contacts/clients/${contactId}/payors\`, payload, {  
          headers,  
          timeout: 30000,  
        }),  
      "cr.payors.create",  
      { contactId: String(contactId) }  
    );

    const payorId \=  
      created.data?.payorId ||  
      created.data?.id ||  
      created.data?.selectedPayorDetail?.payorId ||  
      null;

    return { payorOperation: "create", payorId: payorId ? String(payorId) : null };  
  }

  await requestWithRetry(  
    async () \=\>  
      axios.put(\`${CR\_BASE\_URL}/contacts/clients/${contactId}/payors/${primary.payorId}\`, payload, {  
        headers,  
        timeout: 30000,  
      }),  
    "cr.payors.update",  
    { contactId: String(contactId), payorId: String(primary.payorId) }  
  );

  return { payorOperation: "update", payorId: String(primary.payorId) };  
}

// \-------------------------  
// CentralReach auth (token cache in Data Store)  
// \-------------------------  
async function getCrToken(auth, dataStore) {  
  if (dataStore) {  
    const cached \= await dataStore.get(CR\_ACCESS\_TOKEN\_KEY);  
    const nowMs \= Date.now();  
    if (cached?.token && Number(cached?.expiresAt) \- nowMs \> 60000\) {  
      return cached.token;  
    }  
  }

  const response \= await withRetry(  
    async () \=\>  
      axios.post(  
        auth.cr\_token\_url || CR\_TOKEN\_URL,  
        new URLSearchParams({  
          grant\_type: "client\_credentials",  
          client\_id: auth.cr\_client\_id,  
          client\_secret: auth.cr\_client\_secret,  
          scope: "cr-api",  
        }).toString(),  
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }  
      ),  
    {  
      onRetry: ({ attempt, status, delayMs }) \=\>  
        safeLog("Retrying CR token request", { attempt, status: status || null, delayMs }),  
    }  
  );

  const token \= response.data?.access\_token;  
  const expiresIn \= Number(response.data?.expires\_in || 3600);  
  const expiresAt \= Date.now() \+ expiresIn \* 1000;

  if (dataStore && token) {  
    await dataStore.set(  
      CR\_ACCESS\_TOKEN\_KEY,  
      { token, expiresAt },  
      { ttl: Math.max(expiresIn \- 60, 60\) }  
    );  
  }

  return token;  
}

// \-------------------------  
// HubSpot hydration (deal-only)  
// \-------------------------  
async function fetchDealAndContact({ hubspotToken, dealId, mappingProperties }) {  
  const dealResponse \= await axios.get(\`${HUBSPOT\_BASE\_URL}/crm/v3/objects/deals/${dealId}\`, {  
    headers: { Authorization: \`Bearer ${hubspotToken}\`, Accept: "application/json" },  
    params: { properties: mappingProperties.deal.join(",") },  
    timeout: 30000,  
  });

  const deal \= dealResponse.data;  
  return { deal, contact: null };  
}

function transformToCrPayload({ deal, contact }) {  
  void contact;  
  const dealProps \= deal.properties || {};  
  const cleanedDealEmail \= cleanEmail(dealProps.email);

  return {  
    ContactForm: "Public Client Intake Form",  
    ExternalSystemId: String(deal.id || dealProps.hs\_object\_id),  
    FirstName: dealProps.phi\_first\_name\_\_cloned\_,  
    LastName: dealProps.phi\_last\_name,  
    DateOfBirth: toIsoMidnight(dealProps.phi\_date\_of\_birth),  
    Gender: mapGender(dealProps.phi\_gender),  
    PrimaryEmail: isValidEmail(cleanedDealEmail) ? cleanedDealEmail : null,  
    PhoneCell: normalizePhone(dealProps.phone),  
    AddressLine1:  
      dealProps.if\_services\_will\_be\_in\_more\_than\_one\_location\_\_list\_the\_other\_addres ||  
      dealProps.street\_address,  
    AddressLine2: dealProps.home\_apt,  
    City: dealProps.location\_city,  
    StateProvince: dealProps.location\_central\_reach || dealProps.location,  
    ZipPostalCode: dealProps.postal\_code,  
    GuardianFirstName: dealProps.guardian\_first\_name,  
    GuardianLastName: dealProps.guardian\_last\_name,  
  };  
}

// \-------------------------  
// Upsert \+ writeback  
// \-------------------------  
async function upsertCrAndWriteback({  
  hubspotToken,  
  crAuth,  
  dataStore,  
  dealId,  
  hsCrContactIdProperty \= "client\_id\_number",  
  payload,  
}) {  
  const requestWithRetry \= async (fn, operation, meta \= {}) \=\>  
    withRetry(fn, {  
      onRetry: ({ attempt, status, delayMs }) \=\>  
        safeLog("Retrying API call", { operation, attempt, status: status || null, delayMs, ...meta }),  
    });

  const token \= await getCrToken(crAuth, dataStore);

  const headers \= {  
    "x-api-key": crAuth.cr\_api\_key,  
    "Content-Type": "application/json",  
    Accept: "application/json",  
    Authorization: \`Bearer ${token}\`,  
  };

  const hsDealResponse \= await requestWithRetry(  
    async () \=\>  
      axios.get(\`${HUBSPOT\_BASE\_URL}/crm/v3/objects/deals/${dealId}\`, {  
        headers: { Authorization: \`Bearer ${hubspotToken}\`, Accept: "application/json" },  
        params: { properties: hsCrContactIdProperty },  
        timeout: 30000,  
      }),  
    "hubspot.getDeal",  
    { dealId: String(dealId) }  
  );

  const existingContactId \= hsDealResponse.data?.properties?.\[hsCrContactIdProperty\];

  const incomingHash \= hashPayload(toComparableShape(payload));  
  const payloadHashKey \= \`hs\_cr:payload\_hash:${String(dealId)}\`;  
  const previousHashRecord \= dataStore ? await dataStore.get(payloadHashKey) : null;  
  const hasSamePayloadHash \= Boolean(existingContactId) && previousHashRecord?.hash \=== incomingHash;

  let operation \= "create";  
  let crContactId \= null;

  if (existingContactId) {  
    crContactId \= String(existingContactId);

    if (hasSamePayloadHash) {  
      operation \= "noop";  
    } else {  
      await requestWithRetry(  
        async () \=\>  
          axios.put(\`${CR\_BASE\_URL}/contacts/client/${existingContactId}\`, toCrClientPayload(payload), {  
            headers,  
            timeout: 30000,  
          }),  
        "cr.updateByContactId",  
        { dealId: String(dealId), contactId: String(existingContactId) }  
      );  
      operation \= "update";  
    }  
  } else {  
    validateRequiredCreateFields(payload, dealId);

    const created \= await requestWithRetry(  
      async () \=\>  
        axios.post(\`${CR\_BASE\_URL}/contacts/client\`, toCrClientPayload(payload), {  
          headers,  
          timeout: 30000,  
        }),  
      "cr.createClient",  
      { dealId: String(dealId), externalSystemId: payload.ExternalSystemId }  
    );

    crContactId \= String(created.data?.contact?.contactId || created.data?.contactId || created.data?.id);  
    operation \= "create";  
  }

  // Writeback only on create/update  
  if (operation \!== "noop") {  
    await requestWithRetry(  
      async () \=\>  
        axios.patch(  
          \`${HUBSPOT\_BASE\_URL}/crm/v3/objects/deals/${dealId}\`,  
          {  
            properties: {  
              \[hsCrContactIdProperty\]: String(crContactId),  
              updated\_by\_integration: true,  
              integration\_last\_write: new Date().toISOString(),  
            },  
          },  
          { headers: { Authorization: \`Bearer ${hubspotToken}\`, Accept: "application/json" }, timeout: 30000 }  
        ),  
      "hubspot.writeBack",  
      { dealId: String(dealId), operation }  
    );  
  }

  // Save payload hash only on create/update  
  if (dataStore && (operation \=== "create" || operation \=== "update")) {  
    await dataStore.set(  
      payloadHashKey,  
      { dealId: String(dealId), hash: incomingHash, timestamp: new Date().toISOString() },  
      { ttl: PAYLOAD\_HASH\_TTL\_SECONDS }  
    );  
  }

  safeLog("HS-\>CR sync complete", {  
    dealId: String(dealId),  
    crContactId: crContactId ? String(crContactId) : null,  
    operation,  
  });

  return { crContactId: crContactId ? String(crContactId) : null, operation };  
}

// \-------------------------  
// Step 2 runner: loop through dealIds from Step 1  
// \-------------------------  
function getDealIdsToSync(steps) {  
  // Update this if your Step 1 name differs in Pipedream  
  const step1 \= steps?.HS\_CR\_Sync\_One\_Deal?.$return\_value;  
  const dealIds \= step1?.dealIdsToSync;

  return Array.isArray(dealIds) ? dealIds.map(String) : \[\];  
}

export default defineComponent({  
  name: "HS-\>CR Push (Step 2)",  
  description: "Processes queued dealIds from Step 1 and runs HS-\>CR sync per deal. Continues on error.",  
  version: "0.2.0",  
  props: {  
    dataStore: { type: "data\_store" },  
    hubspot\_access\_token: { type: "string", secret: true },  
    cr\_client\_id: { type: "string", secret: true },  
    cr\_client\_secret: { type: "string", secret: true },  
    cr\_api\_key: { type: "string", secret: true },  
    hs\_cr\_contact\_id\_property: { type: "string", default: "client\_id\_number" },

    // Best practice: cap per-run work (keeps runtime predictable)  
    max\_deals\_per\_run: { type: "integer", default: 15 },  
  },

  async run({ steps, $ }) {  
    void $;

    const dealIdsAll \= getDealIdsToSync(steps);  
    const dealIds \= dealIdsAll.slice(0, this.max\_deals\_per\_run);

    safeLog("hs\_to\_cr\_push starting", { totalQueued: dealIdsAll.length, processingNow: dealIds.length });

    if (dealIds.length \=== 0\) {  
      return { processedCount: 0, errorCount: 0, processed: \[\], errors: \[\] };  
    }

    const processed \= \[\];  
    const errors \= \[\];

    // Mapping properties needed for the deal-only contract  
    const mappingProperties \= {  
      deal: \[  
        "hs\_object\_id",  
        "pipeline",  
        "dealstage",  
        "client\_id\_number",  
        "phi\_date\_of\_birth",  
        "phi\_gender",  
        "phi\_first\_name\_\_cloned\_",  
        "phi\_last\_name",  
        "guardian\_first\_name",  
        "guardian\_last\_name",  
        "phone",  
        "email",  
        "if\_services\_will\_be\_in\_more\_than\_one\_location\_\_list\_the\_other\_addres",  
        "street\_address",  
        "home\_apt",  
        "location\_city",  
        "location",  
        "location\_central\_reach",  
        "postal\_code",

        // \-------------------------  
        // Insurance properties (HubSpot internal names)  
        // \-------------------------  
        "number\_of\_insurance\_s\_", // insurance count  
        "number\_of\_insurances\_1",  
        "number\_of\_insurances\_2",  
        "number\_of\_insurances\_3",  
        "number\_of\_insurances\_4",  
        "phi\_insurance", // Insurance (OTHER)

        // Coverage date mapping (primary)  
        "primary\_insurance\_\_effective\_date",  
        "primary\_insurance\_\_renewal\_date",  
      \],  
      contact: \[\],  
    };

    const crAuth \= {  
      cr\_client\_id: this.cr\_client\_id,  
      cr\_client\_secret: this.cr\_client\_secret,  
      cr\_api\_key: this.cr\_api\_key,  
      cr\_token\_url: CR\_TOKEN\_URL,  
    };

    for (const dealId of dealIds) {  
      try {  
        const hydrated \= await fetchDealAndContact({  
          hubspotToken: this.hubspot\_access\_token,  
          dealId,  
          mappingProperties,  
        });

        const payload \= transformToCrPayload(hydrated);

        // 1\) Upsert client \+ writeback  
        const result \= await upsertCrAndWriteback({  
          hubspotToken: this.hubspot\_access\_token,  
          crAuth,  
          dataStore: this.dataStore,  
          dealId,  
          hsCrContactIdProperty: this.hs\_cr\_contact\_id\_property,  
          payload,  
        });

        // 2\) Upsert PRIMARY payor (insurance) based on locked logic  
        // NOTE: Do this even when client op is "noop" so insurance can still sync.  
        let payorOperation \= "skip\_no\_crContactId";  
        let payorId \= null;

        if (result.crContactId) {  
          const requestWithRetry \= async (fn, operation, meta \= {}) \=\>  
            withRetry(fn, {  
              onRetry: ({ attempt, status, delayMs }) \=\>  
                safeLog("Retrying API call", { operation, attempt, status: status || null, delayMs, ...meta }),  
            });

          const token \= await getCrToken(crAuth, this.dataStore);  
          const headers \= {  
            "x-api-key": crAuth.cr\_api\_key,  
            "Content-Type": "application/json",  
            Accept: "application/json",  
            Authorization: \`Bearer ${token}\`,  
          };

          const dealProps \= hydrated.deal?.properties || {};  
          const payorResult \= await upsertPrimaryPayor({  
            headers,  
            contactId: result.crContactId,  
            dealProps,  
            requestWithRetry,  
          });

          payorOperation \= payorResult.payorOperation;  
          payorId \= payorResult.payorId;  
        }

        processed.push({  
          dealId: String(dealId),  
          operation: result.operation,  
          crContactId: result.crContactId,  
          payorOperation,  
          payorId,  
        });  
      } catch (error) {  
        const meta \= toErrorMeta(error);  
        // PHI-safe: IDs only  
        safeLog("hs\_to\_cr\_push deal failed", { dealId: String(dealId), ...meta });  
        errors.push({ dealId: String(dealId), ...meta });

        // Continue on error (best practice)  
        await this.dataStore.set(  
          \`hs\_cr\_push\_last\_error:${dealId}\`,  
          { dealId: String(dealId), ...meta },  
          { ttl: 86400 }  
        );  
      }  
    }

    safeLog("hs\_to\_cr\_push complete", { processedCount: processed.length, errorCount: errors.length });

    return {  
      processedCount: processed.length,  
      errorCount: errors.length,  
      processed,  
      errors,  
    };  
  },  
});  
