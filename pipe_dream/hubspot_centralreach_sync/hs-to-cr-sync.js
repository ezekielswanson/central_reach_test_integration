import axios from "axios";
import { createHash } from "crypto";

const HUBSPOT_BASE_URL = "https://api.hubapi.com";
const CR_TOKEN_URL = "https://login.centralreach.com/connect/token";
const CR_BASE_URL = "https://partners-api.centralreach.com/enterprise/v1";
const CR_ACCESS_TOKEN_KEY = "cr:access_token";
const PAYLOAD_HASH_TTL_SECONDS = 2592000;

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
      if (!shouldRetry || isLastAttempt) {
        throw err;
      }
      const jitter = Math.floor(Math.random() * 150);
      const delayMs = Math.min(baseDelayMs * 2 ** (attempt - 1) + jitter, maxDelayMs);
      if (typeof onRetry === "function") {
        onRetry({ attempt, status, delayMs });
      }
      await sleep(delayMs);
    }
  }
  throw new Error("Retry loop exited unexpectedly.");
}

function safeLog(message, meta = {}) {
  console.log(JSON.stringify({ message, timestamp: new Date().toISOString(), ...meta }));
}

function toErrorMeta(error) {
  return {
    errorCode: error?.code || "unknown",
    httpStatus: error?.response?.status || null,
    errorName: error?.name || "Error",
  };
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D+/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  if (digits.length === 10) {
    return digits;
  }
  return null;
}

function cleanEmail(value) {
  const normalized = String(value || "").trim().toLowerCase();
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
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function hashPayload(payload) {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function isValidEmail(value) {
  if (!value) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function mapGender(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "male") return "Male";
  if (normalized === "female") return "Female";
  return null;
}

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
  if (missingFieldKeys.length > 0) {
    throw buildValidationError(dealId, missingFieldKeys);
  }
}

function toIsoMidnight(value) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
  }
  return null;
}

export async function getCrToken(auth, dataStore) {
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
      {
        token,
        expiresAt,
      },
      { ttl: Math.max(expiresIn - 60, 60) }
    );
  }

  return token;
}

export async function fetchDealAndContact({ hubspotToken, dealId, mappingProperties }) {
  const dealResponse = await axios.get(`${HUBSPOT_BASE_URL}/crm/v3/objects/deals/${dealId}`, {
    headers: { Authorization: `Bearer ${hubspotToken}` },
    params: {
      properties: mappingProperties.deal.join(","),
    },
  });

  const deal = dealResponse.data;
  // Deal-only mapping contract: do not hydrate associated contacts.
  return { deal, contact: null };
}

export function transformToCrPayload({ deal, contact }) {
  void contact;
  const dealProps = deal.properties || {};
  const cleanedDealEmail = cleanEmail(dealProps.email);

  const payload = {
    ContactForm: "Public Client Intake Form",
    ExternalSystemId: String(deal.id || dealProps.hs_object_id),
    FirstName: dealProps.phi_first_name__cloned_,
    LastName: dealProps.phi_last_name,
    DateOfBirth: toIsoMidnight(dealProps.phi_date_of_birth),
    Gender: mapGender(dealProps.phi_gender),
    // Per mapping decision, use deal-level email/phone as authoritative source.
    PrimaryEmail: isValidEmail(cleanedDealEmail) ? cleanedDealEmail : null,
    PhoneCell: normalizePhone(dealProps.phone),
    AddressLine1:
      dealProps.if_services_will_be_in_more_than_one_location__list_the_other_addres || dealProps.street_address,
    AddressLine2: dealProps.home_apt,
    City: dealProps.location_city,
    StateProvince: dealProps.location_central_reach || dealProps.location,
    ZipPostalCode: dealProps.postal_code,
    GuardianFirstName: dealProps.guardian_first_name,
    GuardianLastName: dealProps.guardian_last_name,
  };

  return payload;
}

export async function upsertCrAndWriteback({
  hubspotToken,
  crAuth,
  dataStore,
  dealId,
  hsCrContactIdProperty = "client_id_number",
  payload,
}) {
  try {
    const requestWithRetry = async (fn, operation, meta = {}) =>
      withRetry(fn, {
        onRetry: ({ attempt, status, delayMs }) =>
          safeLog("Retrying API call", {
            operation,
            attempt,
            status: status || null,
            delayMs,
            ...meta,
          }),
      });

    const token = await getCrToken(crAuth, dataStore);
    const headers = {
      "x-api-key": crAuth.cr_api_key,
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };

    const hsDealResponse = await requestWithRetry(
      async () =>
        axios.get(`${HUBSPOT_BASE_URL}/crm/v3/objects/deals/${dealId}`, {
          headers: { Authorization: `Bearer ${hubspotToken}` },
          params: { properties: hsCrContactIdProperty },
        }),
      "hubspot.getDeal",
      { dealId: String(dealId) }
    );
    const existingContactId = hsDealResponse.data?.properties?.[hsCrContactIdProperty];
    const incomingHash = hashPayload(toComparableShape(payload));
    const payloadHashKey = `hs_cr:payload_hash:${String(dealId)}`;
    const previousHashRecord = dataStore ? await dataStore.get(payloadHashKey) : null;
    const hasSamePayloadHash = Boolean(existingContactId) && previousHashRecord?.hash === incomingHash;

    let operation = "create";
    let crContactId = null;

    if (existingContactId) {
      crContactId = String(existingContactId);
      if (hasSamePayloadHash) {
        operation = "noop";
      } else {
        await requestWithRetry(
          async () =>
            axios.put(
              `${CR_BASE_URL}/contacts/client/${existingContactId}`,
              toCrClientPayload(payload),
              { headers }
            ),
          "cr.updateByContactId",
          { dealId: String(dealId), contactId: String(existingContactId) }
        );
        operation = "update";
      }
    } else {
      validateRequiredCreateFields(payload, dealId);
      if (hasSamePayloadHash) {
        operation = "noop";
      } else {
        const created = await requestWithRetry(
          async () =>
            axios.post(`${CR_BASE_URL}/contacts/client`, toCrClientPayload(payload), { headers }),
          "cr.createClient",
          { dealId: String(dealId), externalSystemId: payload.ExternalSystemId }
        );
        crContactId = String(created.data?.contact?.contactId || created.data?.contactId || created.data?.id);
        operation = "create";
      }
    }

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
            { headers: { Authorization: `Bearer ${hubspotToken}` } }
          ),
        "hubspot.writeBack",
        { dealId: String(dealId), operation }
      );
    }

    if (dataStore && (operation === "create" || operation === "update")) {
      await dataStore.set(
        payloadHashKey,
        {
          dealId: String(dealId),
          hash: incomingHash,
          timestamp: new Date().toISOString(),
        },
        { ttl: PAYLOAD_HASH_TTL_SECONDS }
      );
    }

    safeLog("HS->CR sync complete", {
      dealId: String(dealId),
      crContactId: crContactId ? String(crContactId) : null,
      operation,
    });
    return { crContactId: crContactId ? String(crContactId) : null, operation };
  } catch (error) {
    const structured = error?.details || null;
    safeLog("HS->CR sync failed", { dealId: String(dealId), ...toErrorMeta(error), structured });
    throw error;
  }
}
