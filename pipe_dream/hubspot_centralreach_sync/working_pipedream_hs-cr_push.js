import axios from "axios";
import { createHash } from "crypto";

// -------------------------
// Config
// -------------------------
const HUBSPOT_BASE_URL = "https://api.hubapi.com";
const CR_TOKEN_URL = "https://login.centralreach.com/connect/token";
const CR_BASE_URL = "https://partners-api.centralreach.com/enterprise/v1";

// CR Metadata: "other service location address" fieldId
const CR_OTHER_SERVICE_ADDRESS_FIELD_ID = 137697;

// Data Store keys
const CR_ACCESS_TOKEN_KEY = "cr:access_token";
const PAYLOAD_HASH_TTL_SECONDS = 60 * 60 * 24 * 30;   // 30 days
const METADATA_HASH_TTL_SECONDS = 60 * 60 * 24 * 30;  // 30 days

// -------------------------
// Retry helpers
// -------------------------
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetriableStatus(status) {
  return status === 429 || (status >= 500 && status <= 599);
}

async function withRetry(fn, options = {}) {
  const maxRetries = Number.isInteger(options.maxRetries) ? options.maxRetries : 3;
  const maxAttempts = maxRetries + 1;
  const baseDelayMs = options.baseDelayMs || 250;
  const maxDelayMs = options.maxDelayMs || 5000;
  const onRetry = options.onRetry;

  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await fn();
    } catch (err) {
      const status = err?.response?.status;
      const shouldRetry = isRetriableStatus(status);
      const isLastAttempt = attempt >= maxAttempts;
      if (!shouldRetry || isLastAttempt) throw err;

      const jitter = Math.floor(Math.random() * 150);
      const delayMs = Math.min(baseDelayMs * 2 ** (attempt - 1) + jitter, maxDelayMs);
      if (typeof onRetry === "function") onRetry({ attempt, status, delayMs });
      await sleep(delayMs);
    }
  }
  throw new Error("Retry loop exited unexpectedly.");
}

// -------------------------
// PHI-safe logs + richer error meta
// -------------------------
function safeLog(message, meta = {}) {
  console.log(JSON.stringify({ message, timestamp: new Date().toISOString(), ...meta }));
}

function safeString(value, max = 900) {
  if (value == null) return null;
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return s.length > max ? `${s.slice(0, max)}…(truncated)` : s;
}

function redactPotentialPhi(str) {
  if (!str) return str;

  // Emails
  let out = str.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]");

  // US-ish phone numbers
  out = out.replace(
    /\b(\+?1[-.\s]?)?(\(?\d{3}\)?)[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    "[REDACTED_PHONE]"
  );

  return out;
}

function toErrorMeta(error) {
  const isAxios = !!error?.isAxiosError || !!error?.response || !!error?.config;
  const axiosJson = typeof error?.toJSON === "function" ? error.toJSON() : null;

  return {
    errorName: error?.name || "Error",
    errorCode: error?.code || null,
    errorMessage: redactPotentialPhi(safeString(error?.message, 900)),
    errorStack: safeString(error?.stack, 1200),

    isAxios,
    httpStatus: error?.response?.status ?? null,
    httpStatusText: safeString(error?.response?.statusText, 120),
    axiosMethod: isAxios ? (error?.config?.method ?? null) : null,
    axiosUrl: isAxios ? safeString(error?.config?.url, 500) : null,

    axiosResponseDataSnippet: isAxios
      ? redactPotentialPhi(safeString(error?.response?.data, 700))
      : null,

    axiosToJson: axiosJson ?? null,
  };
}

// -------------------------
// Transform helpers
// -------------------------
function normalizePhone(value) {
  const digits = String(value || "").replace(/\D+/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length === 10) return digits;
  return null;
}

function cleanEmail(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || null;
}

function isValidEmail(value) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function mapGender(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "male") return "Male";
  if (normalized === "female") return "Female";
  return null;
}

/**
 * Robust DOB converter:
 * - handles ms timestamps (string/number) and date strings
 * returns ISO midnight UTC or null
 */
function toIsoMidnight(value) {
  if (value == null || value === "") return null;

  const num = Number(value);
  const date = Number.isFinite(num) ? new Date(num) : new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
}

function toCrClientPayload(payload) {
  // NOTE: OtherServiceAddress is NOT part of this payload (it's CR metadata)
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
  // Include OtherServiceAddress so hash represents full intended state
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
    otherServiceAddress: crPayload.OtherServiceAddress ?? null,
  };
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

function hashPayload(payload) {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

// -------------------------
// Validation
// -------------------------
function buildValidationError(dealId, missingFieldKeys) {
  const err = new Error("missing_required_fields");
  err.name = "PayloadValidationError";
  err.details = { dealId: String(dealId), missingFieldKeys };
  return err;
}

function validateRequiredCreateFields(payload, dealId) {
  const missingFieldKeys = [];
  if (!payload?.FirstName) missingFieldKeys.push("FirstName");
  if (!payload?.LastName) missingFieldKeys.push("LastName");
  if (!payload?.DateOfBirth) missingFieldKeys.push("DateOfBirth"); // required by CR in your runs

  if (missingFieldKeys.length > 0) throw buildValidationError(dealId, missingFieldKeys);
}

// -------------------------
// CentralReach auth (token cache in Data Store)
// -------------------------
async function getCrToken(auth, dataStore) {
  if (dataStore) {
    const cached = await dataStore.get(CR_ACCESS_TOKEN_KEY);
    const nowMs = Date.now();
    if (cached?.token && Number(cached?.expiresAt) - nowMs > 60000) {
      return cached.token;
    }
  }

  const response = await withRetry(
    async () =>
      axios.post(
        auth.cr_token_url || CR_TOKEN_URL,
        new URLSearchParams({
          grant_type: "client_credentials",
          client_id: auth.cr_client_id,
          client_secret: auth.cr_client_secret,
          scope: "cr-api",
        }).toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      ),
    {
      onRetry: ({ attempt, status, delayMs }) =>
        safeLog("Retrying CR token request", { attempt, status: status || null, delayMs }),
    }
  );

  const token = response.data?.access_token;
  const expiresIn = Number(response.data?.expires_in || 3600);
  const expiresAt = Date.now() + expiresIn * 1000;

  if (dataStore && token) {
    await dataStore.set(
      CR_ACCESS_TOKEN_KEY,
      { token, expiresAt },
      { ttl: Math.max(expiresIn - 60, 60) }
    );
  }

  return token;
}

// -------------------------
// CR Metadata write (fieldId: 137697) using textAreaValue
// -------------------------
async function updateCrOtherServiceAddressMetadata({
  headers,
  crContactId,
  value,
  dealIdForLogs,
}) {
  const url = `${CR_BASE_URL}/contacts/${crContactId}/metadata/${CR_OTHER_SERVICE_ADDRESS_FIELD_ID}`;

  // REQUIRED SHAPE (per your note):
  // value key is textAreaValue
  const body = { textAreaValue: value };

  await withRetry(
    async () =>
      axios.put(url, body, {
        headers,
        timeout: 30000,
      }),
    {
      onRetry: ({ attempt, status, delayMs }) =>
        safeLog("Retrying CR metadata update", {
          attempt,
          status: status || null,
          delayMs,
          dealId: String(dealIdForLogs),
          crContactId: String(crContactId),
          fieldId: CR_OTHER_SERVICE_ADDRESS_FIELD_ID,
        }),
    }
  );

  safeLog("CR metadata updated", {
    dealId: String(dealIdForLogs),
    crContactId: String(crContactId),
    fieldId: CR_OTHER_SERVICE_ADDRESS_FIELD_ID,
    valueWasBlank: !value,
  });
}

// -------------------------
// HubSpot hydration (deal-only)
// -------------------------
async function fetchDealAndContact({ hubspotToken, dealId, mappingProperties }) {
  const dealResponse = await axios.get(`${HUBSPOT_BASE_URL}/crm/v3/objects/deals/${dealId}`, {
    headers: { Authorization: `Bearer ${hubspotToken}`, Accept: "application/json" },
    params: { properties: mappingProperties.deal.join(",") },
    timeout: 30000,
  });

  const deal = dealResponse.data;
  return { deal, contact: null };
}

/**
 * Business rule:
 * - Treat free-text field as "overflow/exception" service location address.
 * - If blank -> clear CR metadata field (textAreaValue = "")
 * - If non-blank -> write it
 */
function buildOtherServiceAddressValue(dealProps) {
  // UPDATED: correct HubSpot internal name
  const raw =
    dealProps?.if_services_will_be_in_more_than_one_location__list_the_other_address;

  return String(raw || "").trim(); // empty => clear
}

function transformToCrPayload({ deal, contact }) {
  void contact;

  const dealProps = deal.properties || {};
  const cleanedDealEmail = cleanEmail(dealProps.email);

  const otherServiceAddress = buildOtherServiceAddressValue(dealProps);

  return {
    ContactForm: "Public Client Intake Form",
    ExternalSystemId: String(deal.id || dealProps.hs_object_id),

    FirstName: dealProps.phi_first_name__cloned_,
    LastName: dealProps.phi_last_name,
    DateOfBirth: toIsoMidnight(dealProps.phi_date_of_birth),
    Gender: mapGender(dealProps.phi_gender),

    PrimaryEmail: isValidEmail(cleanedDealEmail) ? cleanedDealEmail : null,
    PhoneCell: normalizePhone(dealProps.phone),

    // IMPORTANT: main/home address goes here
    AddressLine1: dealProps.street_address,
    AddressLine2: dealProps.home_apt,
    City: dealProps.location_city,
    StateProvince: dealProps.location_central_reach || dealProps.location,
    ZipPostalCode: dealProps.postal_code,

    GuardianFirstName: dealProps.guardian_first_name,
    GuardianLastName: dealProps.guardian_last_name,

    // Not part of create payload; used for metadata update:
    OtherServiceAddress: otherServiceAddress,
  };
}

// -------------------------
// Upsert + writeback + metadata update
// -------------------------
async function upsertCrAndWriteback({
  hubspotToken,
  crAuth,
  dataStore,
  dealId,
  hsCrContactIdProperty = "client_id_number",
  payload,
}) {
  const requestWithRetry = async (fn, operation, meta = {}) =>
    withRetry(fn, {
      onRetry: ({ attempt, status, delayMs }) =>
        safeLog("Retrying API call", { operation, attempt, status: status || null, delayMs, ...meta }),
    });

  const token = await getCrToken(crAuth, dataStore);

  const headers = {
    "x-api-key": crAuth.cr_api_key,
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  // 1) Get existing CR contactId from HubSpot
  const hsDealResponse = await requestWithRetry(
    async () =>
      axios.get(`${HUBSPOT_BASE_URL}/crm/v3/objects/deals/${dealId}`, {
        headers: { Authorization: `Bearer ${hubspotToken}`, Accept: "application/json" },
        params: { properties: hsCrContactIdProperty },
        timeout: 30000,
      }),
    "hubspot.getDeal",
    { dealId: String(dealId) }
  );

  const existingContactId = hsDealResponse.data?.properties?.[hsCrContactIdProperty];

  // 2) Payload no-op detection (includes otherServiceAddress in hash)
  const incomingHash = hashPayload(toComparableShape(payload));
  const payloadHashKey = `hs_cr:payload_hash:${String(dealId)}`;
  const previousHashRecord = dataStore ? await dataStore.get(payloadHashKey) : null;
  const hasSamePayloadHash = Boolean(existingContactId) && previousHashRecord?.hash === incomingHash;

  let operation = "create";
  let crContactId = null;

  // 3) Upsert
  if (existingContactId) {
    crContactId = String(existingContactId);

    if (hasSamePayloadHash) {
      operation = "noop";
    } else {
      await requestWithRetry(
        async () =>
          axios.put(`${CR_BASE_URL}/contacts/client/${existingContactId}`, toCrClientPayload(payload), {
            headers,
            timeout: 30000,
          }),
        "cr.updateByContactId",
        { dealId: String(dealId), contactId: String(existingContactId) }
      );
      operation = "update";
    }
  } else {
    validateRequiredCreateFields(payload, dealId);

    const created = await requestWithRetry(
      async () =>
        axios.post(`${CR_BASE_URL}/contacts/client`, toCrClientPayload(payload), {
          headers,
          timeout: 30000,
        }),
      "cr.createClient",
      { dealId: String(dealId), externalSystemId: payload.ExternalSystemId }
    );

    crContactId = String(created.data?.contact?.contactId || created.data?.contactId || created.data?.id);
    operation = "create";
  }

  // 4) Metadata update (fieldId 137697) using textAreaValue
  const otherServiceValue = String(payload.OtherServiceAddress || "").trim();
  const metadataHash = createHash("sha256").update(otherServiceValue).digest("hex");
  const metadataHashKey = `hs_cr:metadata_hash:${String(dealId)}:${CR_OTHER_SERVICE_ADDRESS_FIELD_ID}`;
  const prevMetadataHashRecord = dataStore ? await dataStore.get(metadataHashKey) : null;
  const metadataChanged = prevMetadataHashRecord?.hash !== metadataHash;

  if (crContactId && (operation === "create" || operation === "update" || metadataChanged)) {
    try {
      // empty string clears the field
      await updateCrOtherServiceAddressMetadata({
        headers,
        crContactId,
        value: otherServiceValue,
        dealIdForLogs: dealId,
      });

      if (dataStore) {
        await dataStore.set(
          metadataHashKey,
          { dealId: String(dealId), hash: metadataHash, timestamp: new Date().toISOString() },
          { ttl: METADATA_HASH_TTL_SECONDS }
        );
      }
    } catch (error) {
      const meta = toErrorMeta(error);
      safeLog("CR metadata update failed (non-fatal)", {
        dealId: String(dealId),
        crContactId: String(crContactId),
        fieldId: CR_OTHER_SERVICE_ADDRESS_FIELD_ID,
        ...meta,
      });
      // Non-fatal: main client create/update succeeded
    }
  }

  // 5) Writeback only on create/update
  if (operation !== "noop") {
    await requestWithRetry(
      async () =>
        axios.patch(
          `${HUBSPOT_BASE_URL}/crm/v3/objects/deals/${dealId}`,
          {
            properties: {
              [hsCrContactIdProperty]: String(crContactId),
              updated_by_integration: true,
              integration_last_write: new Date().toISOString(),
            },
          },
          { headers: { Authorization: `Bearer ${hubspotToken}`, Accept: "application/json" }, timeout: 30000 }
        ),
      "hubspot.writeBack",
      { dealId: String(dealId), operation }
    );
  }

  // 6) Save payload hash only on create/update
  if (dataStore && (operation === "create" || operation === "update")) {
    await dataStore.set(
      payloadHashKey,
      { dealId: String(dealId), hash: incomingHash, timestamp: new Date().toISOString() },
      { ttl: PAYLOAD_HASH_TTL_SECONDS }
    );
  }

  safeLog("HS->CR sync complete", {
    dealId: String(dealId),
    crContactId: crContactId ? String(crContactId) : null,
    operation,
    wroteMetadata137697: !!crContactId,
    otherServiceAddressBlank: !otherServiceValue,
  });

  return { crContactId: crContactId ? String(crContactId) : null, operation };
}

// -------------------------
// Step 2 runner: loop through dealIds from Step 1
// -------------------------
function getDealIdsToSync(steps) {
  const step1 = steps?.HS_CR_Sync_One_Deal?.$return_value;
  const dealIds = step1?.dealIdsToSync;
  return Array.isArray(dealIds) ? dealIds.map(String) : [];
}

export default defineComponent({
  name: "HS->CR Push (Step 2)",
  description: "Processes queued dealIds from Step 1 and runs HS->CR sync per deal. Continues on error.",
  version: "0.3.0",
  props: {
    dataStore: { type: "data_store" },
    hubspot_access_token: { type: "string", secret: true },
    cr_client_id: { type: "string", secret: true },
    cr_client_secret: { type: "string", secret: true },
    cr_api_key: { type: "string", secret: true },
    hs_cr_contact_id_property: { type: "string", default: "client_id_number" },
    max_deals_per_run: { type: "integer", default: 15 },
  },

  async run({ steps, $ }) {
    const dealIdsAll = getDealIdsToSync(steps);
    const dealIds = dealIdsAll.slice(0, this.max_deals_per_run);

    safeLog("hs_to_cr_push starting", { totalQueued: dealIdsAll.length, processingNow: dealIds.length });

    if (dealIds.length === 0) {
      return { processedCount: 0, errorCount: 0, processed: [], errors: [] };
    }

    const processed = [];
    const errors = [];

    // Deal-only mapping properties
    const mappingProperties = {
      deal: [
        "hs_object_id",
        "pipeline",
        "dealstage",
        "client_id_number",
        "phi_date_of_birth",
        "phi_gender",
        "phi_first_name__cloned_",
        "phi_last_name",
        "guardian_first_name",
        "guardian_last_name",
        "phone",
        "email",

        // UPDATED: correct internal name
        "if_services_will_be_in_more_than_one_location__list_the_other_address",

        "street_address",
        "home_apt",
        "location_city",
        "location",
        "location_central_reach",
        "postal_code",
      ],
      contact: [],
    };

    const crAuth = {
      cr_client_id: this.cr_client_id,
      cr_client_secret: this.cr_client_secret,
      cr_api_key: this.cr_api_key,
      cr_token_url: CR_TOKEN_URL,
    };

    for (const dealId of dealIds) {
      try {
        const hydrated = await fetchDealAndContact({
          hubspotToken: this.hubspot_access_token,
          dealId,
          mappingProperties,
        });

        const payload = transformToCrPayload(hydrated);

        const result = await upsertCrAndWriteback({
          hubspotToken: this.hubspot_access_token,
          crAuth,
          dataStore: this.dataStore,
          dealId,
          hsCrContactIdProperty: this.hs_cr_contact_id_property,
          payload,
        });

        processed.push({
          dealId: String(dealId),
          operation: result.operation,
          crContactId: result.crContactId,
        });
      } catch (error) {
        const meta = toErrorMeta(error);
        safeLog("hs_to_cr_push deal failed", { dealId: String(dealId), ...meta });
        errors.push({ dealId: String(dealId), ...meta });

        await this.dataStore.set(
          `hs_cr_push_last_error:${dealId}`,
          { dealId: String(dealId), ...meta },
          { ttl: 86400 }
        );
      }
    }

    safeLog("hs_to_cr_push complete", { processedCount: processed.length, errorCount: errors.length });

    return {
      processedCount: processed.length,
      errorCount: errors.length,
      processed,
      errors,
    };
  },
});

