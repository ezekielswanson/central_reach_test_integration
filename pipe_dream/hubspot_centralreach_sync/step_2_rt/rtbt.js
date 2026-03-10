import axios from "axios";
import { createHash } from "crypto";

const HUBSPOT_BASE_URL = "https://api.hubapi.com";
const CR_TOKEN_URL = "https://login.centralreach.com/connect/token";
const CR_BASE_URL = "https://partners-api.centralreach.com/enterprise/v1";
const CR_ACCESS_TOKEN_KEY = "cr:access_token";
const WORK_ADDRESS_FIELD_ID = 133819;
const HS_OBJECT_TYPE_ID_TEST = "2-55656309";
// const HS_OBJECT_TYPE_ID_PROD = "2-48354559"; // PROD reference

const HS_PROPERTIES = [
  "hs_object_id",
  "employee_id",
  "hs_lastmodifieddate",
  "updated_by_integration",
  "integration_last_write",
  "last_sync_hash",
  "last_sync_at",
  "last_sync_status",
  "last_sync_error",
  "bt_name",
  "date_of_birth",
  "email",
  "street_home",
  "home_apt",
  "location_city",
  "location_home",
  "postal_code",
  "postal_code_home",
  "employee_phone",
  "bt_rbt_type",
  "street_address__work_",
  "city__work_",
  "state__work_",
  "postal_code__work_",
];

const CR_EMPLOYEE_LABELS = {
  ALL_EMPLOYEES: 1052618,
  BT_NY: 1052630,
  RBT_NY: 1052631,
  CLINICAL: 1052643,
  NY_EMPLOYEE: 1107685,
  CO_EMPLOYEE: 1107687,
  RBT_CO: 1107692,
};

const MANAGED_EMPLOYEE_STATE_LABEL_IDS = new Set([
  CR_EMPLOYEE_LABELS.BT_NY,
  CR_EMPLOYEE_LABELS.RBT_NY,
  CR_EMPLOYEE_LABELS.CLINICAL,
  CR_EMPLOYEE_LABELS.NY_EMPLOYEE,
  CR_EMPLOYEE_LABELS.CO_EMPLOYEE,
  CR_EMPLOYEE_LABELS.RBT_CO,
]);

const BLOCKED_CREATE_MESSAGE =
  "PUT_ONLY_MODE enabled: create disabled until sandbox. Provide an existing employee_id or disable PUT_ONLY_MODE + enable ALLOW_EMPLOYEE_CREATE.";

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

function safeLog(message, meta = {}) {
  console.log(JSON.stringify({ message, timestamp: new Date().toISOString(), ...meta }));
}

function safeString(value, max = 900) {
  if (value == null) return null;
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return s.length > max ? `${s.slice(0, max)}...(truncated)` : s;
}

function redactPotentialPhi(str) {
  if (!str) return str;
  let out = str.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]");
  out = out.replace(/\b(\+?1[-.\s]?)?(\(?\d{3}\)?)[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[REDACTED_PHONE]");
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
    axiosResponseDataSnippet: isAxios ? redactPotentialPhi(safeString(error?.response?.data, 700)) : null,
    axiosToJson: axiosJson || null,
  };
}

function trimOrNull(value) {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

function cleanEmail(value) {
  const s = String(value ?? "").trim().toLowerCase();
  return s || null;
}

function normalizeStateProvince(value) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  return /^[A-Za-z]{2}$/.test(s) ? s.toUpperCase() : null;
}

function normalizePhone(value) {
  const digits = String(value ?? "").replace(/\D+/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(-10);
  if (digits.length === 10) return digits;
  return digits;
}

function normalizeDateOfBirth(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const yyyyMmDd = /^(\d{4})-(\d{2})-(\d{2})$/;
  if (yyyyMmDd.test(raw)) return raw;

  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return null;

  const iso = parsed.toISOString();
  return iso.slice(0, 10);
}

function normalizeBtRbtType(value) {
  const s = String(value ?? "").trim().toUpperCase();
  if (s === "BT" || s === "RBT") return s;
  return null;
}

function normalizeStateForEmployeeLabels(value) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase();

  const upper = s.replace(/\./g, "").replace(/\s+/g, " ").toUpperCase();
  if (upper === "NEW YORK") return "NY";
  if (upper === "COLORADO") return "CO";
  return null;
}

function requiredEmployeeLabelIds({ btRbtType, stateCode }) {
  const labels = [CR_EMPLOYEE_LABELS.ALL_EMPLOYEES];

  if (stateCode === "NY") {
    labels.push(
      CR_EMPLOYEE_LABELS.BT_NY,
      CR_EMPLOYEE_LABELS.CLINICAL,
      CR_EMPLOYEE_LABELS.NY_EMPLOYEE
    );
    if (btRbtType === "RBT") labels.push(CR_EMPLOYEE_LABELS.RBT_NY);
    return labels;
  }

  if (stateCode === "CO" && btRbtType === "BT") {
    labels.push(
      CR_EMPLOYEE_LABELS.CLINICAL,
      CR_EMPLOYEE_LABELS.CO_EMPLOYEE,
      CR_EMPLOYEE_LABELS.RBT_CO
    );
  }

  return labels;
}

function extractLabelIdsFromResponse(data) {
  const labels = Array.isArray(data?.labels) ? data.labels : [];
  return labels
    .map((label) => Number(label?.labelId ?? label?.id ?? label))
    .filter((id) => Number.isFinite(id));
}

function mergeUniqueNumericIds(values) {
  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
    )
  );
}

function sameNumericIdSet(left, right) {
  const a = mergeUniqueNumericIds(left).sort((x, y) => x - y);
  const b = mergeUniqueNumericIds(right).sort((x, y) => x - y);
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

async function getContactLabelIds({ headers, contactId, requestWithRetry, objectId }) {
  const normalizedContactId = String(contactId);
  logCrOutboundRequest({
    operation: "cr.labels.list",
    objectId,
    contactId: normalizedContactId,
    method: "GET",
    url: `${CR_BASE_URL}/contacts/${normalizedContactId}/labels`,
    payload: null,
  });

  const response = await requestWithRetry(
    async () =>
      axios.get(`${CR_BASE_URL}/contacts/${normalizedContactId}/labels`, {
        headers,
        timeout: 30000,
      }),
    "cr.labels.list",
    { objectId: String(objectId), contactId: normalizedContactId }
  );

  return extractLabelIdsFromResponse(response?.data);
}

async function postContactLabels({ headers, contactId, labelIds, requestWithRetry, objectId }) {
  const normalizedContactId = String(contactId);
  const normalizedLabelIds = mergeUniqueNumericIds(labelIds);
  if (!normalizedLabelIds.length) return { operation: "skip_empty" };

  const primaryBody = { labels: normalizedLabelIds.map((labelId) => ({ labelId })) };
  logCrOutboundRequest({
    operation: "cr.labels.update",
    objectId,
    contactId: normalizedContactId,
    method: "POST",
    url: `${CR_BASE_URL}/contacts/${normalizedContactId}/labels`,
    payload: primaryBody,
  });

  try {
    await requestWithRetry(
      async () =>
        axios.post(`${CR_BASE_URL}/contacts/${normalizedContactId}/labels`, primaryBody, {
          headers,
          timeout: 30000,
        }),
      "cr.labels.update",
      { objectId: String(objectId), contactId: normalizedContactId, labelCount: normalizedLabelIds.length }
    );
    return { operation: "updated", bodyShape: "labels[]" };
  } catch (error) {
    if (error?.response?.status !== 400) throw error;

    const fallbackBody = { labelIds: normalizedLabelIds };
    safeLog("rtbt_labels_body_fallback", {
      objectId: String(objectId),
      contactId: normalizedContactId,
      fromBodyShape: "labels[]",
      toBodyShape: "labelIds[]",
    });
    logCrOutboundRequest({
      operation: "cr.labels.update.fallback",
      objectId,
      contactId: normalizedContactId,
      method: "POST",
      url: `${CR_BASE_URL}/contacts/${normalizedContactId}/labels`,
      payload: fallbackBody,
    });

    await requestWithRetry(
      async () =>
        axios.post(`${CR_BASE_URL}/contacts/${normalizedContactId}/labels`, fallbackBody, {
          headers,
          timeout: 30000,
        }),
      "cr.labels.update.fallback",
      { objectId: String(objectId), contactId: normalizedContactId, labelCount: normalizedLabelIds.length }
    );
    return { operation: "updated", bodyShape: "labelIds[]" };
  }
}

async function syncEmployeeLabels({
  headers,
  contactId,
  btRbtType,
  stateCode,
  requestWithRetry,
  objectId,
}) {
  const requiredLabelIds = requiredEmployeeLabelIds({ btRbtType, stateCode });
  const existingLabelIds = await getContactLabelIds({
    headers,
    contactId,
    requestWithRetry,
    objectId,
  });
  // Keep unrelated labels, but replace managed NY/CO/role labels from current HS truth.
  const existingUnmanaged = existingLabelIds.filter(
    (id) => !MANAGED_EMPLOYEE_STATE_LABEL_IDS.has(Number(id))
  );
  const desiredLabelIds = mergeUniqueNumericIds([...existingUnmanaged, ...requiredLabelIds]);

  if (sameNumericIdSet(existingLabelIds, desiredLabelIds)) {
    return {
      operation: "noop",
      btRbtType,
      stateCode,
      requiredCount: requiredLabelIds.length,
      existingCount: existingLabelIds.length,
      desiredCount: desiredLabelIds.length,
    };
  }

  const postResult = await postContactLabels({
    headers,
    contactId,
    labelIds: desiredLabelIds,
    requestWithRetry,
    objectId,
  });

  return {
    operation: postResult.operation,
    bodyShape: postResult.bodyShape || null,
    btRbtType,
    stateCode,
    requiredCount: requiredLabelIds.length,
    existingCount: existingLabelIds.length,
    desiredCount: desiredLabelIds.length,
  };
}

function splitBtName(value) {
  const full = String(value ?? "").trim();
  if (!full) return { firstName: null, lastName: null };
  const parts = full.split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: null, lastName: null };
  return {
    firstName: parts[0] || null,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

function buildWorkAddress(props) {
  const street = trimOrNull(props?.street_address__work_);
  const city = trimOrNull(props?.city__work_);
  const state = trimOrNull(props?.state__work_);
  const zip = trimOrNull(props?.postal_code__work_);

  const line1 = [street, city].filter(Boolean).join(", ");
  const line2 = [state, zip].filter(Boolean).join(" ");
  return [line1, line2].filter(Boolean).join(", ");
}

function buildEmployeePayload({ objectId, properties }) {
  const { firstName, lastName } = splitBtName(properties?.bt_name);
  return {
    externalSystemId: String(properties?.hs_object_id || objectId),
    firstName,
    lastName,
    dateOfBirth: normalizeDateOfBirth(properties?.date_of_birth),
    primaryEmail: cleanEmail(properties?.email),
    addressLine1: trimOrNull(properties?.street_home),
    addressLine2: trimOrNull(properties?.home_apt),
    city: trimOrNull(properties?.location_city),
    stateProvince: normalizeStateProvince(properties?.location_home),
    zipPostalCode: trimOrNull(properties?.postal_code_home),
    phoneCell: normalizePhone(properties?.employee_phone),
  };
}

function pruneUndefined(value) {
  if (Array.isArray(value)) return value.map((v) => pruneUndefined(v));
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) {
      const next = pruneUndefined(value[key]);
      if (next !== undefined) out[key] = next;
    }
    return out;
  }
  return value;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

function hashPayload(value) {
  return createHash("sha256").update(stableStringify(pruneUndefined(value))).digest("hex");
}

function isFreshEnough(properties) {
  const integrationLastWrite = properties?.integration_last_write;
  if (!integrationLastWrite) return true;
  const hsLast = new Date(properties?.hs_lastmodifieddate).getTime();
  const lastWrite = new Date(integrationLastWrite).getTime();
  if (!Number.isFinite(hsLast) || !Number.isFinite(lastWrite)) return true;
  return hsLast > lastWrite;
}

function truncateSafeErrorMessage(error) {
  const msg = toErrorMeta(error)?.errorMessage || "unknown_error";
  return String(msg).slice(0, 500);
}

function getObjectIdsToSync(steps) {
  const stepEntries = Object.values(steps || {});
  for (const entry of stepEntries) {
    const candidate = entry?.$return_value;
    if (Array.isArray(candidate?.objectIdsToSync)) {
      return candidate.objectIdsToSync.map((v) => String(v));
    }
  }
  return [];
}

function normalizeExistingEmployeeId(value) {
  const s = String(value ?? "").trim();
  return s || null;
}

function extractCrContactId(data) {
  const candidates = [
    data?.contactId,
    data?.id,
    data?.contact?.contactId,
    data?.contact?.id,
    data?.employee?.contactId,
    data?.employee?.id,
    data?.result?.contactId,
    data?.result?.id,
    data?.importEmployeeReturn?.contactId,
    data?.importEmployeeReturn?.id,
  ];
  for (const candidate of candidates) {
    if (candidate != null && String(candidate).trim() !== "") return String(candidate);
  }
  return null;
}

function responseLooksNotFound(data) {
  const text = [
    data?.message,
    data?.responseStatus?.message,
    ...(Array.isArray(data?.responseStatus?.errors)
      ? data.responseStatus.errors.map((e) => `${e?.message ?? ""} ${e?.errorCode ?? ""}`)
      : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /not\s*found|no\s*match|unable\s*to\s*find/.test(text);
}

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
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      ),
    {
      onRetry: ({ attempt, status, delayMs }) =>
        safeLog("Retrying CR token request", { attempt, status: status || null, delayMs }),
    },
  );

  const token = response.data?.access_token;
  const expiresIn = Number(response.data?.expires_in || 3600);
  const expiresAt = Date.now() + expiresIn * 1000;

  if (dataStore && token) {
    await dataStore.set(CR_ACCESS_TOKEN_KEY, { token, expiresAt }, { ttl: Math.max(expiresIn - 60, 60) });
  }

  return token;
}

async function fetchHubspotObject({ hubspotToken, objectTypeId, objectId, requestWithRetry }) {
  const response = await requestWithRetry(
    async () =>
      axios.get(`${HUBSPOT_BASE_URL}/crm/v3/objects/${objectTypeId}/${objectId}`, {
        headers: { Authorization: `Bearer ${hubspotToken}`, Accept: "application/json" },
        params: { properties: HS_PROPERTIES.join(",") },
        timeout: 30000,
      }),
    "hubspot.getObject",
    { objectId: String(objectId), objectTypeId: String(objectTypeId) },
  );
  return response.data;
}

async function writebackHubspot({ hubspotToken, objectTypeId, objectId, properties, requestWithRetry }) {
  await requestWithRetry(
    async () =>
      axios.patch(
        `${HUBSPOT_BASE_URL}/crm/v3/objects/${objectTypeId}/${objectId}`,
        { properties },
        {
          headers: { Authorization: `Bearer ${hubspotToken}`, Accept: "application/json" },
          timeout: 30000,
        },
      ),
    "hubspot.writeBack",
    { objectId: String(objectId), objectTypeId: String(objectTypeId), propertyKeys: Object.keys(properties) },
  );
}

function metadataPutBody(value) {
  return { inputValue: String(value).trim() };
}

function logCrOutboundRequest({ operation, objectId, method, url, payload, contactId = null, fieldId = null }) {
  safeLog("rtbt_cr_outbound_request", {
    operation,
    objectId: String(objectId),
    ...(contactId ? { contactId: String(contactId) } : {}),
    ...(fieldId ? { fieldId } : {}),
    method,
    url,
    payload,
  });
}

function readCrExternalSystemId(data) {
  const candidates = [
    data?.externalSystemId,
    data?.ExternalSystemId,
    data?.employee?.externalSystemId,
    data?.employee?.ExternalSystemId,
    data?.contact?.externalSystemId,
    data?.contact?.ExternalSystemId,
    data?.result?.externalSystemId,
    data?.result?.ExternalSystemId,
  ];
  for (const v of candidates) {
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

function readCrPrimaryEmail(data) {
  const candidates = [
    data?.primaryEmail,
    data?.PrimaryEmail,
    data?.employee?.primaryEmail,
    data?.employee?.PrimaryEmail,
    data?.contact?.primaryEmail,
    data?.contact?.PrimaryEmail,
    data?.result?.primaryEmail,
    data?.result?.PrimaryEmail,
  ];
  for (const v of candidates) {
    if (v != null && String(v).trim() !== "") return String(v).trim().toLowerCase();
  }
  return null;
}

async function fetchCrEmployeeByContactId({ headers, contactId, requestWithRetry, objectId }) {
  const response = await requestWithRetry(
    async () =>
      axios.get(`${CR_BASE_URL}/contacts/employee/${contactId}`, {
        headers,
        timeout: 30000,
      }),
    "cr.employee.getByContactId",
    { objectId: String(objectId), contactId: String(contactId) },
  );

  return response?.data || {};
}

function buildContactIdSafePayload(basePayload, existingCrEmployee) {
  const payload = { ...basePayload };
  const existingExternalSystemId = readCrExternalSystemId(existingCrEmployee);
  const existingPrimaryEmail = readCrPrimaryEmail(existingCrEmployee);

  if (existingExternalSystemId) payload.externalSystemId = existingExternalSystemId;
  if (existingPrimaryEmail) payload.primaryEmail = existingPrimaryEmail;

  return {
    payload,
    preservedExternalSystemId: Boolean(existingExternalSystemId),
    preservedPrimaryEmail: Boolean(existingPrimaryEmail),
  };
}

async function putEmployeeByContactId({ headers, contactId, employeePayload, requestWithRetry, objectId }) {
  logCrOutboundRequest({
    operation: "cr.employee.updateByContactId",
    objectId,
    contactId,
    method: "PUT",
    url: `${CR_BASE_URL}/contacts/employee/${contactId}`,
    payload: employeePayload,
  });
  await requestWithRetry(
    async () =>
      axios.put(`${CR_BASE_URL}/contacts/employee/${contactId}`, employeePayload, {
        headers,
        timeout: 30000,
      }),
    "cr.employee.updateByContactId",
    { objectId: String(objectId), contactId: String(contactId) },
  );
  return { operation: "update", contactId: String(contactId) };
}

async function putEmployeeByExternalId({ headers, employeePayload, requestWithRetry, objectId }) {
  try {
    logCrOutboundRequest({
      operation: "cr.employee.updateByExternalSystemId",
      objectId,
      method: "PUT",
      url: `${CR_BASE_URL}/contacts/employee/byExternalSystemId`,
      payload: employeePayload,
    });
    const response = await requestWithRetry(
      async () =>
        axios.put(`${CR_BASE_URL}/contacts/employee/byExternalSystemId`, employeePayload, {
          headers,
          timeout: 30000,
        }),
      "cr.employee.updateByExternalSystemId",
      { objectId: String(objectId), externalSystemId: employeePayload.externalSystemId },
    );

    const contactId = extractCrContactId(response?.data);
    if (!contactId && responseLooksNotFound(response?.data)) {
      return { found: false, contactId: null };
    }
    if (!contactId) {
      const err = new Error("missing_contact_id_from_byExternalSystemId_response");
      err.response = { data: response?.data };
      throw err;
    }
    return { found: true, contactId };
  } catch (error) {
    if (error?.response?.status === 404) {
      return { found: false, contactId: null };
    }
    throw error;
  }
}

async function createEmployee({ headers, employeePayload, requestWithRetry, objectId }) {
  const createPayload = {
    ...employeePayload,
    ContactForm: "Behavior Technician NY",
  };
  logCrOutboundRequest({
    operation: "cr.employee.create",
    objectId,
    method: "POST",
    url: `${CR_BASE_URL}/contacts/employee`,
    payload: createPayload,
  });
  const response = await requestWithRetry(
    async () =>
      axios.post(`${CR_BASE_URL}/contacts/employee`, createPayload, {
        headers,
        timeout: 30000,
      }),
    "cr.employee.create",
    { objectId: String(objectId), externalSystemId: employeePayload.externalSystemId },
  );

  const contactId = extractCrContactId(response?.data);
  return { operation: "create", contactId };
}

async function putWorkAddressMetadata({ headers, contactId, workAddress, requestWithRetry, objectId }) {
  if (!workAddress) return;
  logCrOutboundRequest({
    operation: "cr.metadata.updateField",
    objectId,
    contactId,
    fieldId: WORK_ADDRESS_FIELD_ID,
    method: "PUT",
    url: `${CR_BASE_URL}/contacts/${contactId}/metadata/${WORK_ADDRESS_FIELD_ID}`,
    payload: metadataPutBody(workAddress),
  });
  await requestWithRetry(
    async () =>
      axios.put(`${CR_BASE_URL}/contacts/${contactId}/metadata/${WORK_ADDRESS_FIELD_ID}`, metadataPutBody(workAddress), {
        headers,
        timeout: 30000,
      }),
    "cr.metadata.updateField",
    { objectId: String(objectId), contactId: String(contactId), fieldId: WORK_ADDRESS_FIELD_ID },
  );
}

async function processOneRecord({
  objectId,
  objectTypeId,
  hubspotToken,
  headers,
  requestWithRetry,
  allowEmployeeCreate,
  putOnlyMode,
}) {
  const hsRecord = await fetchHubspotObject({
    hubspotToken,
    objectTypeId,
    objectId,
    requestWithRetry,
  });
  const props = hsRecord?.properties || {};
  const now = new Date().toISOString();

  const employeePayload = buildEmployeePayload({ objectId, properties: props });
  const btRbtType = normalizeBtRbtType(props?.bt_rbt_type);
  const stateCodeForLabels = normalizeStateForEmployeeLabels(
    props?.location_home || employeePayload?.stateProvince
  );
  let contactId = normalizeExistingEmployeeId(props?.employee_id);
  let contactIdPayload = null;

  if (contactId) {
    const existingCrEmployee = await fetchCrEmployeeByContactId({
      headers,
      contactId,
      requestWithRetry,
      objectId,
    });
    const safePayload = buildContactIdSafePayload(employeePayload, existingCrEmployee);
    contactIdPayload = safePayload.payload;

    safeLog("rtbt_contactid_identifier_preserve", {
      objectId: String(objectId),
      contactId: String(contactId),
      preservedExternalSystemId: safePayload.preservedExternalSystemId,
      preservedPrimaryEmail: safePayload.preservedPrimaryEmail,
    });
  }

  const workAddress = buildWorkAddress(props);
  const desiredHash = hashPayload({
    employee: contactIdPayload || employeePayload,
    workAddress: workAddress || "",
  });
  safeLog("rtbt_payload_selected_for_cr", {
    objectId: String(objectId),
    hasContactId: Boolean(contactId),
    selectedPayload: contactIdPayload || employeePayload,
    desiredHash,
  });
  const previousHash = String(props?.last_sync_hash || "");

  const baseProcessed = {
    objectId: String(objectId),
    externalSystemId: employeePayload.externalSystemId,
  };

  if (!isFreshEnough(props)) {
    await writebackHubspot({
      hubspotToken,
      objectTypeId,
      objectId,
      requestWithRetry,
      properties: {
        last_sync_status: "noop",
        last_sync_at: now,
        last_sync_error: "",
        integration_last_write: now,
        updated_by_integration: true,
      },
    });
    return { ...baseProcessed, operation: "noop", employee_id: normalizeExistingEmployeeId(props?.employee_id) };
  }

  if (previousHash && previousHash === desiredHash) {
    await writebackHubspot({
      hubspotToken,
      objectTypeId,
      objectId,
      requestWithRetry,
      properties: {
        last_sync_status: "noop",
        last_sync_at: now,
        last_sync_error: "",
        integration_last_write: now,
        updated_by_integration: true,
      },
    });
    return { ...baseProcessed, operation: "noop", employee_id: normalizeExistingEmployeeId(props?.employee_id) };
  }

  let operation = "update";

  if (contactId) {
    const byIdResult = await putEmployeeByContactId({
      headers,
      contactId,
      employeePayload: contactIdPayload || employeePayload,
      requestWithRetry,
      objectId,
    });
    operation = byIdResult.operation;
  } else {
    const byExternalResult = await putEmployeeByExternalId({
      headers,
      employeePayload,
      requestWithRetry,
      objectId,
    });

    if (byExternalResult.found) {
      operation = "update";
      contactId = byExternalResult.contactId || null;
    } else {
      if (putOnlyMode) {
        await writebackHubspot({
          hubspotToken,
          objectTypeId,
          objectId,
          requestWithRetry,
          properties: {
            last_sync_status: "blocked",
            last_sync_error: BLOCKED_CREATE_MESSAGE,
            last_sync_at: now,
          },
        });
        return { ...baseProcessed, operation: "blocked" };
      }

      if (!allowEmployeeCreate) {
        await writebackHubspot({
          hubspotToken,
          objectTypeId,
          objectId,
          requestWithRetry,
          properties: {
            last_sync_status: "blocked",
            last_sync_error:
              "ALLOW_EMPLOYEE_CREATE is false: create disabled. Enable ALLOW_EMPLOYEE_CREATE or provide an existing employee_id.",
            last_sync_at: now,
          },
        });
        return { ...baseProcessed, operation: "blocked" };
      }

      const createResult = await createEmployee({
        headers,
        employeePayload,
        requestWithRetry,
        objectId,
      });
      operation = createResult.operation;
      contactId = createResult.contactId;
    }
  }

  if (contactId && workAddress) {
    await putWorkAddressMetadata({
      headers,
      contactId,
      workAddress,
      requestWithRetry,
      objectId,
    });
  }

  if (contactId) {
    try {
      const labelSyncResult = await syncEmployeeLabels({
        headers,
        contactId,
        btRbtType,
        stateCode: stateCodeForLabels,
        requestWithRetry,
        objectId,
      });

      safeLog("rtbt_label_sync_complete", {
        objectId: String(objectId),
        contactId: String(contactId),
        ...labelSyncResult,
      });
    } catch (error) {
      safeLog("rtbt_label_sync_failed", {
        objectId: String(objectId),
        contactId: String(contactId),
        ...toErrorMeta(error),
      });
    }
  }

  const successProps = {
    last_sync_hash: desiredHash,
    last_sync_status: "success",
    last_sync_error: "",
    last_sync_at: now,
    integration_last_write: now,
    updated_by_integration: true,
  };
  if (contactId) successProps.employee_id = String(contactId);

  await writebackHubspot({
    hubspotToken,
    objectTypeId,
    objectId,
    requestWithRetry,
    properties: successProps,
  });

  return {
    ...baseProcessed,
    operation,
    ...(contactId ? { employee_id: String(contactId) } : {}),
  };
}

export default defineComponent({
  name: "HS->CR Employee Push (Step 2 RT/BT)",
  description: "Processes BT/RBT custom object IDs from Step 1 and syncs to CentralReach employees.",
  version: "1.0.0",
  props: {
    dataStore: { type: "data_store" },
    hubspot_access_token: { type: "string", secret: true },
    cr_client_id: { type: "string", secret: true },
    cr_client_secret: { type: "string", secret: true },
    cr_api_key: { type: "string", secret: true },
    hubspot_object_type_id: { type: "string", default: HS_OBJECT_TYPE_ID_TEST },
    max_records_per_run: { type: "integer", default: 15 },
    ALLOW_EMPLOYEE_CREATE: { type: "boolean", default: false },
    PUT_ONLY_MODE: { type: "boolean", default: true },
  },

  async run({ steps }) {
    const objectIdsAll = getObjectIdsToSync(steps);
    const objectIds = objectIdsAll.slice(0, this.max_records_per_run);

    safeLog("rtbt_step2_starting", {
      totalQueued: objectIdsAll.length,
      processingNow: objectIds.length,
      hubspotObjectTypeId: this.hubspot_object_type_id,
      allowEmployeeCreate: Boolean(this.ALLOW_EMPLOYEE_CREATE),
      putOnlyMode: Boolean(this.PUT_ONLY_MODE),
    });

    if (!objectIds.length) {
      return {
        processedCount: 0,
        successCount: 0,
        noopCount: 0,
        blockedCount: 0,
        errorCount: 0,
        processed: [],
        errors: [],
      };
    }

    const crAuth = {
      cr_client_id: this.cr_client_id,
      cr_client_secret: this.cr_client_secret,
      cr_api_key: this.cr_api_key,
      cr_token_url: CR_TOKEN_URL,
    };

    const token = await getCrToken(crAuth, this.dataStore);
    const headers = {
      "x-api-key": crAuth.cr_api_key,
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };

    const requestWithRetry = async (fn, operation, meta = {}) =>
      withRetry(fn, {
        onRetry: ({ attempt, status, delayMs }) =>
          safeLog("Retrying API call", { operation, attempt, status: status || null, delayMs, ...meta }),
      });

    const processed = [];
    const errors = [];
    let successCount = 0;
    let noopCount = 0;
    let blockedCount = 0;
    let errorCount = 0;

    for (const objectId of objectIds) {
      try {
        const result = await processOneRecord({
          objectId,
          objectTypeId: this.hubspot_object_type_id,
          hubspotToken: this.hubspot_access_token,
          headers,
          requestWithRetry,
          allowEmployeeCreate: Boolean(this.ALLOW_EMPLOYEE_CREATE),
          putOnlyMode: Boolean(this.PUT_ONLY_MODE),
        });

        processed.push(result);
        if (result.operation === "success" || result.operation === "create" || result.operation === "update") {
          successCount += 1;
        } else if (result.operation === "noop") {
          noopCount += 1;
        } else if (result.operation === "blocked") {
          blockedCount += 1;
        }
      } catch (error) {
        errorCount += 1;
        const safeMessage = truncateSafeErrorMessage(error);
        const meta = toErrorMeta(error);

        errors.push({
          objectId: String(objectId),
          errorMessage: safeMessage,
          httpStatus: meta.httpStatus,
          errorCode: meta.errorCode,
        });

        processed.push({
          objectId: String(objectId),
          operation: "error",
        });

        safeLog("rtbt_step2_record_failed", {
          objectId: String(objectId),
          ...meta,
        });

        try {
          await writebackHubspot({
            hubspotToken: this.hubspot_access_token,
            objectTypeId: this.hubspot_object_type_id,
            objectId,
            requestWithRetry,
            properties: {
              last_sync_status: "error",
              last_sync_error: safeMessage,
              last_sync_at: new Date().toISOString(),
            },
          });
        } catch (writebackErr) {
          safeLog("rtbt_step2_error_writeback_failed", {
            objectId: String(objectId),
            ...toErrorMeta(writebackErr),
          });
        }
      }
    }

    safeLog("rtbt_step2_complete", {
      processedCount: processed.length,
      successCount,
      noopCount,
      blockedCount,
      errorCount,
    });

    return {
      processedCount: processed.length,
      successCount,
      noopCount,
      blockedCount,
      errorCount,
      processed,
      errors,
    };
  },
});
