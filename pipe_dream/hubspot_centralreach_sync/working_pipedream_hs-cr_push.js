import axios from "axios";
import { createHash } from "crypto";

// -------------------------
// Constants
// -------------------------
const HUBSPOT_BASE_URL = "https://api.hubapi.com";
const CR_TOKEN_URL = "https://login.centralreach.com/connect/token";
const CR_BASE_URL = "https://partners-api.centralreach.com/enterprise/v1";
const CR_ACCESS_TOKEN_KEY = "cr:access_token";
const PAYLOAD_HASH_TTL_SECONDS = 2592000; // 30 days

// Accepted insurances cache
const CR_ACCEPTED_INSURANCES_CACHE_KEY = "cr:accepted_insurances:v1";
const CR_ACCEPTED_INSURANCES_TTL_SECONDS = 86400; // 24h

// CR Client Metadata Field IDs (from your UI)
const CR_META_FIELDS = {
  ALLERGIES: 126214,
  MALADAPTIVE_BEHAVIORS: 126207,
  COMORBID_DIAGNOSIS: 132303,
  BT_1_NAME: 131313,
  WORK_SCHEDULE_1: 132304,
  WORK_SCHEDULE_2: 138093,
  CLIENT_AVAILABILITY: 126209,
  TOTAL_ASSIGNED_HOURS: 134331,
  APPROVED_AUTH_HOURS: 132431,
  AUTH_PERIOD: 134672,
  PHYSICIAN_CREDENTIALS: 131151,
  ASD_DIAGNOSIS_DATE: 131195,
  SUPERVISING_BCBA: 131308,
  INITIAL_ASSESSMENT_BCBA: 131314,
  SEVERITY_LEVEL: 133826,
  POLICY_HOLDER_NAME: 138090,
  POLICY_HOLDER_DOB: 137667,
  CURRENT_INSURANCE: 126210,
  INSURANCE_ID: 131316,
};

const CR_METADATA_FIELD_TYPES = Object.values(CR_META_FIELDS).reduce((acc, fieldId) => {
  acc[fieldId] = "Input";
  return acc;
}, {});

// -------------------------
// Helpers: retry / sleep
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
    axiosToJson: axiosJson ? axiosJson : null,
  };
}

// -------------------------
// DEBUG HELPERS (added)
// -------------------------
function pick(obj, keys) {
  const out = {};
  for (const k of keys) out[k] = obj?.[k] ?? null;
  return out;
}

function metaSummary(metadataFields) {
  if (!Array.isArray(metadataFields)) return [];
  return metadataFields.map((f) => ({
    fieldId: f?.fieldId ?? null,
    // show both possible shapes
    directValue: f?.value ?? null,
    nestedValue: f?.metadataDefinitionAndValue?.value ?? null,
    hasAnyValue: Boolean(f?.value ?? f?.metadataDefinitionAndValue?.value),
    valueType: typeof (f?.value ?? f?.metadataDefinitionAndValue?.value),
  }));
}

// IMPORTANT: keep this PHI-safe. No name/email/address.
function hsToCrDebugSnapshot({ dealId, dealProps }) {
  const hsKeys = [
    "insurance_primary",
    "insurance_1__other__summary",
    "insurance_id_1",
    "insurance_id_2",
    "insurance_id_3",
    "insurance_id_4",
    "number_of_insurance_s_",
  ];

  safeLog("DEBUG_HS_TO_CR_SNAPSHOT", {
    dealId: String(dealId),
    hubspot_inputs: pick(dealProps, hsKeys),
  });
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

/**
 * Client payload mapper (NO metadataFields in payload anymore)
 */
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
    // NOTE: metadata is NOT part of client hash anymore (since we set it via dedicated endpoint)
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
  if (missingFieldKeys.length > 0) throw buildValidationError(dealId, missingFieldKeys);
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

/**
 * HubSpot date props: may be ms timestamps or parseable strings.
 */
function hsDateToIsoOrNull(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;

  const n = Number(value);
  if (Number.isFinite(n) && n > 0) {
    const d = new Date(n);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// -------------------------
// METADATA: compute + PUT endpoint update (added)
// -------------------------
function getCurrentInsuranceMetaValue(dealProps) {
  const primary = dealProps.insurance_primary ? String(dealProps.insurance_primary).trim() : null;
  const otherSummary = dealProps.insurance_1__other__summary
    ? String(dealProps.insurance_1__other__summary).trim()
    : null;

  if (primary && primary.toLowerCase() === "other") {
    return otherSummary || "Other";
  }

  return primary || otherSummary || null;
}

function getInsuranceIdForMetaField(dealProps, slotIndex) {
  const slotField = `insurance_id_${slotIndex}`;
  const v = dealProps[slotField];
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function toMetadataDate(value) {
  const iso = hsDateToIsoOrNull(value);
  if (!iso) return null;

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const yyyy = String(d.getUTCFullYear());
  return `${mm}/${dd}/${yyyy}`;
}

function toTrimmedOrNull(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s || null;
}

function joinMetadataParts(parts) {
  const clean = parts.map((p) => toTrimmedOrNull(p)).filter(Boolean);
  return clean.length ? clean.join(", ") : null;
}

function getPhysicianCredentialsByInsuranceType(dealProps) {
  const insuranceType = toTrimmedOrNull(dealProps.n1_what_type_of_insurance)?.toLowerCase();

  if (insuranceType === "medicaid ffs") {
    return joinMetadataParts([dealProps.physician_name, dealProps.npi_number]);
  }

  if (insuranceType === "commercial enrolled" || insuranceType === "commercial oon") {
    return joinMetadataParts([dealProps.physician_name__commercial, dealProps.npi_number__commercial]);
  }

  return null;
}

function getAsdDiagnosisDateByInsuranceType(dealProps) {
  const insuranceType = toTrimmedOrNull(dealProps.n1_what_type_of_insurance)?.toLowerCase();

  if (insuranceType === "medicaid ffs") {
    return toMetadataDate(dealProps.most_recent_asd_diagnosis_date_medicaid);
  }

  if (insuranceType === "commercial enrolled" || insuranceType === "commercial oon") {
    return toMetadataDate(dealProps.most_recent_asd_diagnosis_date_1);
  }

  return null;
}

function getAuthPeriodValue(dealProps) {
  const start = toMetadataDate(dealProps.auth_start_date);
  const end = toMetadataDate(dealProps.auth_end_date);

  if (start && end) return `${start} - ${end}`;
  return start || end || null;
}

function getExtendedMetadataValues(dealProps) {
  return {
    [CR_META_FIELDS.ALLERGIES]: toTrimmedOrNull(dealProps.allergies),
    [CR_META_FIELDS.MALADAPTIVE_BEHAVIORS]: toTrimmedOrNull(dealProps.maladaptive_behaviors__clinical),
    [CR_META_FIELDS.COMORBID_DIAGNOSIS]: toTrimmedOrNull(dealProps.comorbid_diagnosis__clinical),
    [CR_META_FIELDS.BT_1_NAME]: toTrimmedOrNull(dealProps.current_primary_bt),
    [CR_META_FIELDS.WORK_SCHEDULE_1]: toTrimmedOrNull(dealProps.bt_work_schedule_confirmed),
    [CR_META_FIELDS.WORK_SCHEDULE_2]: toTrimmedOrNull(dealProps.bt_work_schedule_2_confirmed),
    [CR_META_FIELDS.CLIENT_AVAILABILITY]: toTrimmedOrNull(dealProps.client_availability_completed),
    [CR_META_FIELDS.TOTAL_ASSIGNED_HOURS]: toTrimmedOrNull(dealProps.assigned_hours),
    [CR_META_FIELDS.APPROVED_AUTH_HOURS]: toTrimmedOrNull(dealProps.authorized_hours),
    [CR_META_FIELDS.AUTH_PERIOD]: getAuthPeriodValue(dealProps),
    [CR_META_FIELDS.PHYSICIAN_CREDENTIALS]: getPhysicianCredentialsByInsuranceType(dealProps),
    [CR_META_FIELDS.ASD_DIAGNOSIS_DATE]: getAsdDiagnosisDateByInsuranceType(dealProps),
    [CR_META_FIELDS.SUPERVISING_BCBA]: toTrimmedOrNull(dealProps.supervising_bcba),
    [CR_META_FIELDS.INITIAL_ASSESSMENT_BCBA]: toTrimmedOrNull(dealProps.initial_assessment_bcba),
    [CR_META_FIELDS.SEVERITY_LEVEL]: toTrimmedOrNull(dealProps.severity_level_clinical),
    [CR_META_FIELDS.POLICY_HOLDER_NAME]: toTrimmedOrNull(dealProps.policy_holder_name),
    [CR_META_FIELDS.POLICY_HOLDER_DOB]: toMetadataDate(dealProps.phi__policy_holder_dob),
    [CR_META_FIELDS.CURRENT_INSURANCE]: getCurrentInsuranceMetaValue(dealProps),
    [CR_META_FIELDS.INSURANCE_ID]: getInsuranceIdForMetaField(dealProps, 1),
  };
}

function getMetadataPutBody(fieldId, value) {
  const normalizedFieldId = Number(fieldId);
  const normalizedValue = String(value).trim();
  const fieldType = CR_METADATA_FIELD_TYPES[normalizedFieldId] || "Input";

  if (fieldType === "TextArea") {
    return { textAreaValue: normalizedValue };
  }

  // Default to Input for known/unknown text-like metadata fields.
  return { inputValue: normalizedValue };
}

function summarizeCrResponse(data) {
  const responseStatus = data?.responseStatus || null;
  return {
    responseResult: data?.result ?? null,
    responseStatus: responseStatus
      ? {
          errorCode: responseStatus?.errorCode ?? null,
          message: responseStatus?.message ?? null,
          errors: Array.isArray(responseStatus?.errors)
            ? responseStatus.errors.map((e) => ({
                errorCode: e?.errorCode ?? null,
                fieldName: e?.fieldName ?? null,
                message: e?.message ?? null,
              }))
            : [],
        }
      : null,
  };
}

function getMetadataValuePreview(metadataField) {
  const md = metadataField?.metadataDefinitionAndValue || {};
  const value =
    md?.inputValue ??
    md?.textAreaValue ??
    md?.singleSelect ??
    md?.legacyValue ??
    metadataField?.value ??
    null;

  return value == null ? null : String(value).slice(0, 60);
}

async function updateContactMetadataField({ headers, contactId, fieldId, value, requestWithRetry }) {
  const normalizedContactId = String(contactId);
  const normalizedFieldId = Number(fieldId);

  if (value === undefined || value === null || String(value).trim() === "") {
    safeLog("META_PUT_SKIP_EMPTY", { contactId: normalizedContactId, fieldId: normalizedFieldId });
    return { fieldId: normalizedFieldId, operation: "skip_empty" };
  }

  const body = getMetadataPutBody(normalizedFieldId, value);

  safeLog("META_PUT_REQUEST", {
    contactId: normalizedContactId,
    fieldId: normalizedFieldId,
    valuePreview: String(value).slice(0, 60),
    bodyKeys: Object.keys(body),
    route: "/contacts/{ContactId}/metadata/{FieldId}",
  });

  let res;
  let routeUsed = "contacts";
  try {
    res = await requestWithRetry(
      async () =>
        axios.put(`${CR_BASE_URL}/contacts/${normalizedContactId}/metadata/${normalizedFieldId}`, body, {
          headers,
          timeout: 30000,
        }),
      "cr.metadata.updateField",
      { contactId: normalizedContactId, fieldId: normalizedFieldId }
    );
  } catch (e) {
    if (e?.response?.status !== 404) throw e;

    safeLog("META_PUT_ROUTE_FALLBACK", {
      contactId: normalizedContactId,
      fieldId: normalizedFieldId,
      fromRoute: "/contacts/{ContactId}/metadata/{FieldId}",
      toRoute: "/contacts/client/{ContactId}/metadata/{FieldId}",
    });

    routeUsed = "contacts/client";
    res = await requestWithRetry(
      async () =>
        axios.put(`${CR_BASE_URL}/contacts/client/${normalizedContactId}/metadata/${normalizedFieldId}`, body, {
          headers,
          timeout: 30000,
        }),
      "cr.metadata.updateField.clientRoute",
      { contactId: normalizedContactId, fieldId: normalizedFieldId }
    );
  }

  const returnedField = Array.isArray(res?.data?.metadataFields)
    ? res.data.metadataFields.find((f) => Number(f?.fieldId) === normalizedFieldId) || null
    : null;

  safeLog("META_PUT_RESPONSE", {
    contactId: normalizedContactId,
    fieldId: normalizedFieldId,
    httpStatus: res?.status ?? null,
    routeUsed,
    returnedValuePreview: getMetadataValuePreview(returnedField),
    ...summarizeCrResponse(res?.data),
  });

  return { fieldId: normalizedFieldId, operation: "updated", routeUsed };
}

async function verifyContactMetadataField({ headers, contactId, fieldId, requestWithRetry }) {
  const normalizedContactId = String(contactId);
  const normalizedFieldId = Number(fieldId);

  try {
    let res;
    let routeUsed = "contacts";
    try {
      res = await requestWithRetry(
        async () =>
          axios.get(`${CR_BASE_URL}/contacts/${normalizedContactId}/metadata`, {
            headers,
            timeout: 30000,
          }),
        "cr.metadata.list",
        { contactId: normalizedContactId, fieldId: normalizedFieldId }
      );
    } catch (e) {
      if (e?.response?.status !== 404) throw e;

      safeLog("META_VERIFY_ROUTE_FALLBACK", {
        contactId: normalizedContactId,
        fieldId: normalizedFieldId,
        fromRoute: "/contacts/{ContactId}/metadata",
        toRoute: "/contacts/client/{ContactId}/metadata",
      });

      routeUsed = "contacts/client";
      res = await requestWithRetry(
        async () =>
          axios.get(`${CR_BASE_URL}/contacts/client/${normalizedContactId}/metadata`, {
            headers,
            timeout: 30000,
          }),
        "cr.metadata.list.clientRoute",
        { contactId: normalizedContactId, fieldId: normalizedFieldId }
      );
    }

    const metadataFields = Array.isArray(res?.data?.metadataFields) ? res.data.metadataFields : [];
    const match = metadataFields.find((f) => Number(f?.fieldId) === normalizedFieldId) || null;
    const md = match?.metadataDefinitionAndValue || null;
    const valuePreview = getMetadataValuePreview(match);

    safeLog("META_VERIFY_RESULT", {
      contactId: normalizedContactId,
      fieldId: normalizedFieldId,
      httpStatus: res?.status ?? null,
      routeUsed,
      returnedMetaCount: metadataFields.length,
      found: Boolean(match),
      isFilledIn: match?.isFilledIn ?? null,
      metadataType: md?.type ?? null,
      valuePreview,
      ...summarizeCrResponse(res?.data),
    });

    return { fieldId: normalizedFieldId, verified: Boolean(match), valuePreview, routeUsed };
  } catch (e) {
    safeLog("META_VERIFY_FAILED", {
      contactId: normalizedContactId,
      fieldId: normalizedFieldId,
      ...toErrorMeta(e),
    });
    return { fieldId: normalizedFieldId, verified: false, valuePreview: null };
  }
}

// -------------------------
// CR Accepted Insurances lookup (CompanyId + PlanId)
// -------------------------
function normalizeNameForMatch(str) {
  return String(str || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

async function getAcceptedInsurances({ headers, requestWithRetry, dataStore }) {
  if (dataStore) {
    const cached = await dataStore.get(CR_ACCEPTED_INSURANCES_CACHE_KEY);
    if (cached?.items && Array.isArray(cached.items) && cached.items.length) {
      return cached.items;
    }
  }

  const res = await requestWithRetry(
    async () =>
      axios.get(`${CR_BASE_URL}/payors/accepted-insurances`, {
        headers,
        timeout: 30000,
      }),
    "cr.payors.acceptedInsurances.list"
  );

  const items =
    res.data?.acceptedInsurances ||
    res.data?.insurances ||
    res.data?.payors ||
    res.data?.result?.acceptedInsurances ||
    res.data ||
    [];

  const list = Array.isArray(items) ? items : [];

  if (dataStore) {
    await dataStore.set(
      CR_ACCEPTED_INSURANCES_CACHE_KEY,
      { items: list, cachedAt: new Date().toISOString() },
      { ttl: CR_ACCEPTED_INSURANCES_TTL_SECONDS }
    );
  }

  return list;
}

function resolveCompanyIdFromAcceptedInsurances(acceptedInsurances, companyName) {
  const target = normalizeNameForMatch(companyName);
  if (!target) return null;

  const candidates = acceptedInsurances
    .map((x) => ({
      raw: x,
      id: x?.companyId ?? x?.id ?? x?.payorCompanyId ?? x?.insuranceCompanyId ?? null,
      name: x?.companyName ?? x?.name ?? x?.payorName ?? x?.insuranceCompanyName ?? null,
    }))
    .filter((c) => c.id && c.name);

  const exact = candidates.find((c) => normalizeNameForMatch(c.name) === target);
  if (exact) return String(exact.id);

  const contains = candidates.find((c) => normalizeNameForMatch(c.name).includes(target));
  if (contains) return String(contains.id);

  return null;
}

/**
 * Extract possible plan list from an accepted-insurance item.
 * We keep this resilient because CR shapes vary between models.
 */
function extractPlansFromAcceptedInsuranceItem(item) {
  if (!item || typeof item !== "object") return [];

  const possibleLists = [
    item?.plans,
    item?.insurancePlans,
    item?.acceptedPlans,
    item?.planOptions,
    item?.planList,
    item?.clearingHouseInfo?.plans,
    item?.clearingHouseInfo?.insurancePlans,
  ].filter(Boolean);

  const first = possibleLists.find((x) => Array.isArray(x));
  if (!first) return [];

  return first
    .map((p) => {
      const planId =
        p?.planId ??
        p?.insurancePlanId ??
        p?.clientPayorPlanId ??
        p?.ClientPayorPlanId ??
        p?.id ??
        null;

      const planName = p?.planName ?? p?.name ?? p?.insurancePlanName ?? p?.displayName ?? null;

      return {
        planId: planId != null ? String(planId) : null,
        planName: planName != null ? String(planName) : null,
        raw: p,
      };
    })
    .filter((p) => p.planId);
}

/**
 * Resolve planId for the selected company and (optional) planName.
 */
function resolvePlanIdFromAcceptedInsurances(acceptedInsurances, companyName, planName, logFn) {
  const companyTarget = normalizeNameForMatch(companyName);
  if (!companyTarget) return { planId: null, resolvedPlanName: null, reason: "missing_companyName" };

  const companyItem =
    acceptedInsurances.find((x) => normalizeNameForMatch(x?.companyName ?? x?.name ?? "") === companyTarget) ||
    acceptedInsurances.find((x) =>
      normalizeNameForMatch(x?.companyName ?? x?.name ?? "").includes(companyTarget)
    ) ||
    null;

  if (!companyItem) {
    return { planId: null, resolvedPlanName: null, reason: "company_not_found" };
  }

  const plans = extractPlansFromAcceptedInsuranceItem(companyItem);
  if (!plans.length) {
    return { planId: null, resolvedPlanName: null, reason: "no_plans_on_company" };
  }

  const planTarget = normalizeNameForMatch(planName);
  if (planTarget) {
    const exact = plans.find((p) => normalizeNameForMatch(p.planName) === planTarget);
    if (exact) return { planId: exact.planId, resolvedPlanName: exact.planName, reason: "exact_match" };

    const contains = plans.find((p) => normalizeNameForMatch(p.planName).includes(planTarget));
    if (contains) return { planId: contains.planId, resolvedPlanName: contains.planName, reason: "contains_match" };
  }

  if (plans.length === 1) {
    return { planId: plans[0].planId, resolvedPlanName: plans[0].planName, reason: "single_plan_fallback" };
  }

  if (typeof logFn === "function") {
    logFn("Multiple plans found; falling back to first plan.", {
      companyName,
      inputPlanName: planName || null,
      fallbackPlanId: plans[0].planId,
      fallbackPlanName: plans[0].planName || null,
      planCount: plans.length,
    });
  }

  return { planId: plans[0].planId, resolvedPlanName: plans[0].planName, reason: "first_plan_fallback" };
}

// -------------------------
// Insurance helpers
// -------------------------
function clampInsuranceCount(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  return Math.min(n, 4);
}

function getInsuranceSummaryInternalNameByCount(count) {
  if (count === 1) return "number_of_insurances_1";
  if (count === 2) return "number_of_insurances_2";
  if (count === 3) return "number_of_insurances_3";
  if (count === 4) return "number_of_insurances_4";
  return null;
}

function normalizeResponsibilityInternalValue(v) {
  const n = Number(v);
  if (n === 1 || n === 2 || n === 3) return n;
  return null;
}

/**
 * CR expects numeric payorType (1/2/3) in create/update payload.
 */
function payorTypeNumberFromSlotIndex(slotIndex) {
  if (slotIndex === 1) return 1;
  if (slotIndex === 2) return 2;
  if (slotIndex === 3) return 3;
  return null;
}

function normalizePayorTypeToNumber(value) {
  if (value == null) return null;
  const n = Number(value);
  if (n === 1 || n === 2 || n === 3) return n;

  const s = String(value);
  if (s === "PrimaryInsurance") return 1;
  if (s === "SecondaryInsurance") return 2;
  if (s === "TertiaryInsurance") return 3;

  return null;
}

function guardianFullNameOrNull(dealProps) {
  const first = (dealProps.guardian_first_name || "").trim();
  const last = (dealProps.guardian_last_name || "").trim();
  const full = `${first} ${last}`.trim();
  return full ? full : null;
}

function buildSharedAddressFromDeal(dealProps) {
  return {
    address:
      dealProps.if_services_will_be_in_more_than_one_location__list_the_other_addres ||
      dealProps.street_address ||
      null,
    addressLine2: dealProps.home_apt || null,
    city: dealProps.location_city || null,
    state: dealProps.location_central_reach || dealProps.location || null,
    zip: dealProps.postal_code || null,
  };
}

function pickSubscriberIdForSlot(dealProps, slotIndex) {
  const slotField = `insurance_id_${slotIndex}`;
  const slotVal = dealProps[slotField];
  if (slotVal != null && String(slotVal).trim() !== "") return String(slotVal);

  for (const f of ["insurance_id_1", "insurance_id_2", "insurance_id_3", "insurance_id_4"]) {
    const v = dealProps[f];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return null;
}

function buildSubscriberInfo(dealProps, slotIndex) {
  const addr = buildSharedAddressFromDeal(dealProps);
  return {
    firstName: dealProps.guardian_first_name || null,
    lastName: dealProps.guardian_last_name || null,
    subscriberId: pickSubscriberIdForSlot(dealProps, slotIndex),
    address: addr.address,
    addressLine2: addr.addressLine2,
    city: addr.city,
    state: addr.state,
    zip: addr.zip,
  };
}

function buildPatientInfo(dealProps) {
  const addr = buildSharedAddressFromDeal(dealProps);
  return {
    relationType: "Child",
    firstName: dealProps.phi_first_name__cloned_ || null,
    lastName: dealProps.phi_last_name || null,
    birthDate: hsDateToIsoOrNull(dealProps.phi_date_of_birth),
    gender: mapGender(dealProps.phi_gender),
    address: addr.address,
    addressLine2: addr.addressLine2,
    city: addr.city,
    state: addr.state,
    zip: addr.zip,
  };
}

function getCompanyNameForSlot(dealProps, slotIndex, summaryValue) {
  if (slotIndex === 1) {
    return dealProps.insurance_primary || dealProps.phi_insurance || (summaryValue ? String(summaryValue) : null);
  }
  const slotField = `insurance_${slotIndex}`;
  return dealProps[slotField] || (summaryValue ? String(summaryValue) : null) || null;
}

function getResponsibilityForSlot(dealProps, slotIndex) {
  const primary = normalizeResponsibilityInternalValue(dealProps.payor_responsibility);
  const alt = normalizeResponsibilityInternalValue(dealProps[`payor_responsibility_${slotIndex}`]);

  if (slotIndex === 1 && primary) return primary;
  if (alt) return alt;

  if (slotIndex === 1) return 1;
  if (slotIndex === 2) return 2;
  if (slotIndex === 3) return 3;
  return null;
}

// -------------------------
// Payor payload builder
// -------------------------
function buildPayorPayloadForSlot(dealProps, slotIndex) {
  const count = clampInsuranceCount(dealProps.number_of_insurance_s_);
  if (slotIndex > count) return null;

  const summaryField = getInsuranceSummaryInternalNameByCount(count);
  const summaryValue = summaryField ? dealProps[summaryField] : null;

  const companyName = getCompanyNameForSlot(dealProps, slotIndex, summaryValue);
  const payorType = payorTypeNumberFromSlotIndex(slotIndex);
  const payorResponsibility = getResponsibilityForSlot(dealProps, slotIndex);

  const payorNickName = guardianFullNameOrNull(dealProps) || `Payor ${slotIndex}`;

  return {
    payorType,
    payorNickName: String(payorNickName).slice(0, 120),
    notes: null,

    insurance: {
      companyId: null,
      planId: null,

      companyName: companyName ? String(companyName).slice(0, 200) : null,
      planName: companyName ? String(companyName).slice(0, 200) : null,

      coverageFrom: hsDateToIsoOrNull(dealProps.primary_insurance__effective_date),
      coverageTo: hsDateToIsoOrNull(dealProps.primary_insurance__renewal_date),

      copayType: null,
      copayAmount: null,
      copayFrequency: null,

      status: 1,
      payorResponsibility,

      insuranceContactPhone: null,
      insuranceContactPerson: null,
      groupNumber: null,
      groupName: null,

      subscriberInfo: buildSubscriberInfo(dealProps, slotIndex),
      patientInfo: buildPatientInfo(dealProps),
    },
  };
}

// -------------------------
// CentralReach payor upsert (multi-slot)
// -------------------------
async function listClientPayors({ headers, contactId, requestWithRetry }) {
  const res = await requestWithRetry(
    async () =>
      axios.get(`${CR_BASE_URL}/contacts/clients/${contactId}/payors`, {
        headers,
        timeout: 30000,
      }),
    "cr.payors.list",
    { contactId: String(contactId) }
  );
  return res.data?.payors || res.data?.clientPayors?.payors || [];
}

function findPayorByTypeNumber(existingPayors, payorTypeNumber) {
  const want = Number(payorTypeNumber);
  if (![1, 2, 3].includes(want)) return null;
  return existingPayors.find((p) => normalizePayorTypeToNumber(p?.payorType) === want) || null;
}

async function upsertPayorByType({ headers, contactId, dealProps, slotIndex, requestWithRetry, dataStore }) {
  const payload = buildPayorPayloadForSlot(dealProps, slotIndex);
  if (!payload) {
    return { payorOperation: "skip_no_payload", payorId: null, payorType: null, slotIndex };
  }

  if (!payload?.insurance?.companyName) {
    safeLog("Skipping payor upsert: missing insurance.companyName", {
      contactId: String(contactId),
      slotIndex,
    });
    return {
      payorOperation: "skip_missing_companyName",
      payorId: null,
      payorType: payload.payorType,
      slotIndex,
    };
  }

  // Required location fields (per your instruction)
  const sub = payload?.insurance?.subscriberInfo || {};
  const pat = payload?.insurance?.patientInfo || {};
  const missing = [];
  if (!sub.address) missing.push("subscriberInfo.address");
  if (!sub.city) missing.push("subscriberInfo.city");
  if (!sub.state) missing.push("subscriberInfo.state");
  if (!sub.zip) missing.push("subscriberInfo.zip");
  if (!pat.address) missing.push("patientInfo.address");
  if (!pat.city) missing.push("patientInfo.city");
  if (!pat.state) missing.push("patientInfo.state");
  if (!pat.zip) missing.push("patientInfo.zip");
  if (missing.length > 0) {
    const err = new Error("missing_required_payor_location_fields");
    err.name = "PayorPayloadValidationError";
    err.details = { contactId: String(contactId), slotIndex, missing };
    throw err;
  }

  const accepted = await getAcceptedInsurances({ headers, requestWithRetry, dataStore });

  const companyId = resolveCompanyIdFromAcceptedInsurances(accepted, payload.insurance.companyName);
  payload.insurance.companyId = companyId ? String(companyId) : null;

  if (!payload?.insurance?.companyId) {
    safeLog("Skipping payor upsert: missing insurance.companyId (not found in accepted-insurances)", {
      contactId: String(contactId),
      slotIndex,
      companyName: payload?.insurance?.companyName || null,
      payorType: payload?.payorType || null,
    });
    return {
      payorOperation: "skip_missing_companyId",
      payorId: null,
      payorType: payload.payorType,
      slotIndex,
      companyName: payload?.insurance?.companyName || null,
    };
  }

  const planResolution = resolvePlanIdFromAcceptedInsurances(
    accepted,
    payload.insurance.companyName,
    payload.insurance.planName,
    (msg, meta) => safeLog(msg, { contactId: String(contactId), slotIndex, ...meta })
  );

  payload.insurance.planId = planResolution.planId ? String(planResolution.planId) : null;

  if (planResolution.resolvedPlanName) {
    payload.insurance.planName = String(planResolution.resolvedPlanName).slice(0, 200);
  }

  if (!payload?.insurance?.planId) {
    safeLog("Skipping payor upsert: missing insurance.planId (PlanId required for this payor type)", {
      contactId: String(contactId),
      slotIndex,
      companyName: payload?.insurance?.companyName || null,
      planName: payload?.insurance?.planName || null,
      resolutionReason: planResolution.reason,
    });

    return {
      payorOperation: "skip_missing_planId",
      payorId: null,
      payorType: payload.payorType,
      slotIndex,
      companyName: payload?.insurance?.companyName || null,
      planName: payload?.insurance?.planName || null,
      resolutionReason: planResolution.reason,
    };
  }

  const existingPayors = await listClientPayors({ headers, contactId, requestWithRetry });
  const existing = findPayorByTypeNumber(existingPayors, payload.payorType);

  if (!existing?.payorId) {
    const created = await requestWithRetry(
      async () =>
        axios.post(`${CR_BASE_URL}/contacts/clients/${contactId}/payors`, payload, {
          headers,
          timeout: 30000,
        }),
      "cr.payors.create",
      { contactId: String(contactId), payorType: payload.payorType, slotIndex }
    );

    const payorId = created.data?.payorId || created.data?.id || created.data?.selectedPayorDetail?.payorId || null;

    return {
      payorOperation: "create",
      payorId: payorId ? String(payorId) : null,
      payorType: payload.payorType,
      slotIndex,
      planId: payload?.insurance?.planId || null,
      companyId: payload?.insurance?.companyId || null,
    };
  }

  await requestWithRetry(
    async () =>
      axios.put(`${CR_BASE_URL}/contacts/clients/${contactId}/payors/${existing.payorId}`, payload, {
        headers,
        timeout: 30000,
      }),
    "cr.payors.update",
    { contactId: String(contactId), payorId: String(existing.payorId), payorType: payload.payorType, slotIndex }
  );

  return {
    payorOperation: "update",
    payorId: String(existing.payorId),
    payorType: payload.payorType,
    slotIndex,
    planId: payload?.insurance?.planId || null,
    companyId: payload?.insurance?.companyId || null,
  };
}

async function upsertMultiPayors({ headers, contactId, dealProps, requestWithRetry, dataStore }) {
  const count = clampInsuranceCount(dealProps.number_of_insurance_s_);
  const results = [];
  for (let slotIndex = 1; slotIndex <= Math.min(count, 3); slotIndex += 1) {
    results.push(
      await upsertPayorByType({
        headers,
        contactId,
        dealProps,
        slotIndex,
        requestWithRetry,
        dataStore,
      })
    );
  }
  return results;
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

function transformToCrPayload({ deal, contact }) {
  void contact;
  const dealProps = deal.properties || {};
  const cleanedDealEmail = cleanEmail(dealProps.email);

  return {
    ContactForm: "Public Client Intake Form",
    ExternalSystemId: String(deal.id || dealProps.hs_object_id),

    FirstName: dealProps.phi_first_name__cloned_,
    LastName: dealProps.phi_last_name,
    DateOfBirth: toIsoMidnight(dealProps.phi_date_of_birth),
    Gender: mapGender(dealProps.phi_gender),
    PrimaryEmail: isValidEmail(cleanedDealEmail) ? cleanedDealEmail : null,
    PhoneCell: normalizePhone(dealProps.phone),

    AddressLine1:
      dealProps.if_services_will_be_in_more_than_one_location__list_the_other_addres ||
      dealProps.street_address,
    AddressLine2: dealProps.home_apt,
    City: dealProps.location_city,
    StateProvince: dealProps.location_central_reach || dealProps.location,
    ZipPostalCode: dealProps.postal_code,

    GuardianFirstName: dealProps.guardian_first_name,
    GuardianLastName: dealProps.guardian_last_name,
  };
}

// -------------------------
// Upsert client + writeback (does NOT block payor create)
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

  const incomingHash = hashPayload(toComparableShape(payload));
  const payloadHashKey = `hs_cr:payload_hash:${String(dealId)}`;
  const previousHashRecord = dataStore ? await dataStore.get(payloadHashKey) : null;
  const hasSamePayloadHash = Boolean(existingContactId) && previousHashRecord?.hash === incomingHash;

  safeLog("DEBUG_HASH_CHECK", {
    dealId: String(dealId),
    existingContactId: existingContactId ? String(existingContactId) : null,
    hasSamePayloadHash,
    incomingHash,
    previousHash: previousHashRecord?.hash || null,
  });

  let operation = "create";
  let crContactId = null;

  if (existingContactId) {
    crContactId = String(existingContactId);

    if (hasSamePayloadHash) {
      operation = "noop";
    } else {
      const body = toCrClientPayload(payload);
      safeLog("DEBUG_CR_CLIENT_UPDATE_BODY", {
        dealId: String(dealId),
        contactId: String(existingContactId),
        bodyKeys: Object.keys(body),
      });

      await requestWithRetry(
        async () =>
          axios.put(`${CR_BASE_URL}/contacts/client/${existingContactId}`, body, {
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

    const body = toCrClientPayload(payload);
    safeLog("DEBUG_CR_CLIENT_CREATE_BODY", {
      dealId: String(dealId),
      bodyKeys: Object.keys(body),
    });

    const created = await requestWithRetry(
      async () =>
        axios.post(`${CR_BASE_URL}/contacts/client`, body, {
          headers,
          timeout: 30000,
        }),
      "cr.createClient",
      { dealId: String(dealId), externalSystemId: payload.ExternalSystemId }
    );

    crContactId = String(created.data?.contact?.contactId || created.data?.contactId || created.data?.id);
    operation = "create";

    safeLog("DEBUG_CR_CLIENT_CREATE_RESPONSE", {
      dealId: String(dealId),
      httpStatus: created?.status ?? null,
      returnedContactId: crContactId,
      responseKeys: created?.data ? Object.keys(created.data) : null,
    });
  }

  // ---- NEW: UPDATE METADATA VIA DEDICATED ENDPOINT ----
  try {
    const hsDealMeta = await requestWithRetry(
      async () =>
        axios.get(`${HUBSPOT_BASE_URL}/crm/v3/objects/deals/${dealId}`, {
          headers: { Authorization: `Bearer ${hubspotToken}`, Accept: "application/json" },
          params: {
            properties: [
              "allergies",
              "maladaptive_behaviors__clinical",
              "comorbid_diagnosis__clinical",
              "current_primary_bt",
              "bt_work_schedule_confirmed",
              "bt_work_schedule_2_confirmed",
              "client_availability_completed",
              "assigned_hours",
              "authorized_hours",
              "auth_start_date",
              "auth_end_date",
              "physician_name",
              "npi_number",
              "physician_name__commercial",
              "npi_number__commercial",
              "most_recent_asd_diagnosis_date_medicaid",
              "most_recent_asd_diagnosis_date_1",
              "supervising_bcba",
              "initial_assessment_bcba",
              "policy_holder_name",
              "phi__policy_holder_dob",
              "severity_level_clinical",
              "n1_what_type_of_insurance",
              "n2_what_type_of_insurance",
              "n3_what_type_of_insurance",
              "n4_what_type_of_insurance",
              "insurance_primary",
              "insurance_1__other__summary",
              "insurance_id_1",
              "insurance_id_2",
              "insurance_id_3",
              "insurance_id_4",
            ].join(","),
          },
          timeout: 30000,
        }),
      "hubspot.getDealForMetadata",
      { dealId: String(dealId) }
    );

    const dealPropsMeta = hsDealMeta?.data?.properties || {};
    const metadataValues = getExtendedMetadataValues(dealPropsMeta);

    const metaResults = [];
    for (const [fieldId, value] of Object.entries(metadataValues)) {
      const normalizedFieldId = Number(fieldId);
      const putResult = await updateContactMetadataField({
        headers,
        contactId: crContactId,
        fieldId: normalizedFieldId,
        value,
        requestWithRetry,
      });

      if (putResult.operation === "updated") {
        putResult.verification = await verifyContactMetadataField({
          headers,
          contactId: crContactId,
          fieldId: normalizedFieldId,
          requestWithRetry,
        });
      }

      metaResults.push(putResult);
    }

    safeLog("META_PUT_COMPLETE", {
      dealId: String(dealId),
      crContactId: String(crContactId),
      results: metaResults,
    });
  } catch (e) {
    safeLog("META_PUT_FAILED", { dealId: String(dealId), crContactId: String(crContactId), ...toErrorMeta(e) });
  }

  // Writeback only on create/update
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
          {
            headers: { Authorization: `Bearer ${hubspotToken}`, Accept: "application/json" },
            timeout: 30000,
          }
        ),
      "hubspot.writeBack",
      { dealId: String(dealId), operation }
    );
  }

  // Save payload hash only on create/update
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
  });

  return { crContactId: crContactId ? String(crContactId) : null, operation };
}

// -------------------------
// Step 2 runner
// -------------------------
function getDealIdsToSync(steps) {
  const step1 = steps?.HS_CR_Sync_One_Deal?.$return_value;
  const dealIds = step1?.dealIdsToSync;
  return Array.isArray(dealIds) ? dealIds.map(String) : [];
}

export default defineComponent({
  name: "HS->CR Push (Step 2)",
  description: "Processes queued dealIds from Step 1 and runs HS->CR sync per deal. Continues on error.",
  version: "0.6.0+metadata-put",
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
    void $;

    const dealIdsAll = getDealIdsToSync(steps);
    const dealIds = dealIdsAll.slice(0, this.max_deals_per_run);

    safeLog("hs_to_cr_push starting", { totalQueued: dealIdsAll.length, processingNow: dealIds.length });

    if (dealIds.length === 0) {
      return { processedCount: 0, errorCount: 0, processed: [], errors: [] };
    }

    const processed = [];
    const errors = [];

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
        "if_services_will_be_in_more_than_one_location__list_the_other_addres",
        "street_address",
        "home_apt",
        "location_city",
        "location",
        "location_central_reach",
        "postal_code",

        // Insurance meta
        "number_of_insurance_s_",
        "number_of_insurances_1",
        "number_of_insurances_2",
        "number_of_insurances_3",
        "number_of_insurances_4",

        // Company names per slot
        "insurance_primary",
        "insurance_2",
        "insurance_3",
        "insurance_4",
        "phi_insurance",

        // "Other" summary
        "insurance_1__other__summary",

        // Coverage (using primary dates for now)
        "primary_insurance__effective_date",
        "primary_insurance__renewal_date",

        // Responsibility
        "payor_responsibility",

        // Subscriber IDs
        "insurance_id_1",
        "insurance_id_2",
        "insurance_id_3",
        "insurance_id_4",
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

        // PHI-safe snapshot of HS insurance inputs
        hsToCrDebugSnapshot({
          dealId,
          dealProps: hydrated.deal?.properties || {},
        });

        const payload = transformToCrPayload(hydrated);

        // 1) Upsert client + writeback + metadata PUT
        const result = await upsertCrAndWriteback({
          hubspotToken: this.hubspot_access_token,
          crAuth,
          dataStore: this.dataStore,
          dealId,
          hsCrContactIdProperty: this.hs_cr_contact_id_property,
          payload,
        });

        // 2) Upsert payors using result.crContactId directly
        let payorOperations = [];
        if (result.crContactId) {
          const requestWithRetry = async (fn, operation, meta = {}) =>
            withRetry(fn, {
              onRetry: ({ attempt, status, delayMs }) =>
                safeLog("Retrying API call", { operation, attempt, status: status || null, delayMs, ...meta }),
            });

          const token = await getCrToken(crAuth, this.dataStore);
          const headers = {
            "x-api-key": crAuth.cr_api_key,
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          };

          const dealProps = hydrated.deal?.properties || {};
          payorOperations = await upsertMultiPayors({
            headers,
            contactId: result.crContactId,
            dealProps,
            requestWithRetry,
            dataStore: this.dataStore,
          });
        }

        processed.push({
          dealId: String(dealId),
          operation: result.operation,
          crContactId: result.crContactId,
          payorOperations,
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