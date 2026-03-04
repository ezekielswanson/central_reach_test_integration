import axios from "axios";

// -------------------------
// Config
// -------------------------
const HUBSPOT_BASE_URL = "https://api.hubapi.com";

// Testing defaults
const TEST_HS_OBJECT_TYPE_ID = "2-55656302";
const TEST_HS_PIPELINE_ID = "876724575";
const TEST_HS_STAGE_IDS = [
  "1314109614", // Cleared to be Assigned (trigger stage)
  "1314109318", // Fully Cleared
  "1314109615", // Hiring Complete
  "1314110003", // Hired/Credentialing In Process
  "1314110004", // Hired/Credentialing Complete
  "1314796081", // Paused
  "1314109317", // Disqualified
];

// Production values (commented for later swap)
// const PROD_HS_OBJECT_TYPE_ID = "2-48354212";
// const PROD_HS_PIPELINE_ID = "855656544";

const BCBA_LOCK_KEY = "hs_cr_lock:bcba_queue";
const BCBA_LOCK_TTL_SECONDS = 120;
const BCBA_DEDUPE_TTL_SECONDS = 1800;

function dedupeKey(recordId, hsLastModifiedDate) {
  return `hs_cr:bcba_processed:${recordId}:${hsLastModifiedDate}`;
}

function parseTimestamp(value) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  if (typeof value === "number") return value === 1;
  return false;
}

function shouldSync(candidate) {
  const props = candidate?.properties || {};
  const hsLast = parseTimestamp(props.hs_lastmodifieddate);
  const lastWrite = parseTimestamp(props.integration_last_write);
  const updatedByIntegration = parseBool(props.updated_by_integration);

  if (!lastWrite) return true;
  if (!hsLast) return false;

  if (updatedByIntegration) {
    if (hsLast <= lastWrite) return false;
    return true;
  }

  return hsLast > lastWrite;
}

// -------------------------
// PHI-safe logging helpers
// -------------------------
function safeString(value, max = 800) {
  if (value == null) return null;
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return s.length > max ? `${s.slice(0, max)}…(truncated)` : s;
}

function redactPotentialPhi(str) {
  if (!str) return str;

  // Emails
  let out = str.replace(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    "[REDACTED_EMAIL]"
  );

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

  const status = error?.response?.status ?? null;
  const statusText = error?.response?.statusText ?? null;

  const responseDataSnippet = isAxios
    ? redactPotentialPhi(safeString(error?.response?.data, 700))
    : null;

  return {
    errorName: error?.name ?? "Error",
    errorMessage: redactPotentialPhi(safeString(error?.message, 900)),
    errorCode: error?.code ?? null,
    isAxios,
    httpStatus: status,
    httpStatusText: safeString(statusText, 120),
    axiosMethod: isAxios ? (error?.config?.method ?? null) : null,
    axiosUrl: isAxios ? safeString(error?.config?.url, 500) : null,
    axiosResponseDataSnippet: responseDataSnippet,
    axiosToJson: axiosJson ?? null,
    errorStack: safeString(error?.stack, 1200),
  };
}

function buildErrorLog({
  workflow,
  stage,
  error,
  recordId = null,
  hsLastModifiedDate = null,
  extra = null,
}) {
  return {
    workflow,
    stage,
    recordId,
    hsLastModifiedDate,
    timestamp: new Date().toISOString(),
    ...(extra ? { extra } : {}),
    ...toErrorMeta(error),
  };
}

export default defineComponent({
  name: "HubSpot BCBA Queue Poller (Queue Only)",
  description:
    "Finds BCBA records in configured stages that need sync, writes dedupe keys to Data Store, and returns recordIdsToSync for downstream processing.",
  version: "0.1.0",
  props: {
    dataStore: { type: "data_store" },
    hubspot_access_token: { type: "string", secret: true },
    max_records_per_run: { type: "integer", default: 15 },
    hs_object_type_id: { type: "string", default: TEST_HS_OBJECT_TYPE_ID },
    hs_pipeline_id: { type: "string", default: TEST_HS_PIPELINE_ID },
  },

  async run({ steps, $ }) {
    const lockExists = await this.dataStore.has(BCBA_LOCK_KEY);
    if (lockExists) {
      console.log(
        JSON.stringify({
          message: "BCBA poller skipped due to active lock",
          key: BCBA_LOCK_KEY,
          timestamp: new Date().toISOString(),
        })
      );
      return {
        skipped: true,
        reason: "lock_exists",
        recordIdsToSync: [],
      };
    }

    await this.dataStore.set(
      BCBA_LOCK_KEY,
      { lock: "bcba_queue", timestamp: new Date().toISOString() },
      { ttl: BCBA_LOCK_TTL_SECONDS }
    );

    try {
      const searchUrl = `${HUBSPOT_BASE_URL}/crm/v3/objects/${this.hs_object_type_id}/search`;
      const searchResponse = await axios.post(
        searchUrl,
        {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "hs_pipeline",
                  operator: "EQ",
                  value: this.hs_pipeline_id,
                },
                {
                  propertyName: "hs_pipeline_stage",
                  operator: "IN",
                  values: TEST_HS_STAGE_IDS,
                },
              ],
            },
          ],
          properties: [
            "hs_object_id",
            "hs_lastmodifieddate",
            "updated_by_integration",
            "integration_last_write",
            "last_sync_hash",
            "last_sync_at",
            "last_sync_status",
            "last_sync_error",
          ],
          sorts: [{ propertyName: "hs_lastmodifieddate", direction: "DESCENDING" }],
          limit: 50,
        },
        {
          headers: {
            Authorization: `Bearer ${this.hubspot_access_token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 30000,
        }
      );

      const candidates = searchResponse.data?.results || [];
      const recordIdsToSync = [];
      const errors = [];

      console.log(
        JSON.stringify({
          message: "BCBA poller candidates fetched",
          count: candidates.length,
          max_records_per_run: this.max_records_per_run,
          timestamp: new Date().toISOString(),
        })
      );

      for (const candidate of candidates) {
        if (recordIdsToSync.length >= this.max_records_per_run) break;
        if (!shouldSync(candidate)) continue;

        const recordId = candidate?.id || candidate?.properties?.hs_object_id;
        const lastModified = candidate?.properties?.hs_lastmodifieddate;
        if (!recordId || !lastModified) continue;

        const dKey = dedupeKey(recordId, lastModified);
        const alreadyProcessed = await this.dataStore.has(dKey);
        if (alreadyProcessed) continue;

        try {
          await this.dataStore.set(
            dKey,
            {
              recordId: String(recordId),
              hs_lastmodifieddate: String(lastModified),
              queued_at: new Date().toISOString(),
            },
            { ttl: BCBA_DEDUPE_TTL_SECONDS }
          );
          recordIdsToSync.push(String(recordId));
        } catch (error) {
          const errorMeta = buildErrorLog({
            workflow: "bcba-queue-poller",
            stage: "queue-record",
            error,
            recordId: String(recordId),
            hsLastModifiedDate: String(lastModified),
          });
          console.error(
            JSON.stringify({ message: "Failed to queue BCBA record", ...errorMeta })
          );
          errors.push(errorMeta);
        }
      }

      console.log(
        JSON.stringify({
          message: "BCBA poller queue complete",
          queuedCount: recordIdsToSync.length,
          errorCount: errors.length,
          timestamp: new Date().toISOString(),
        })
      );

      return {
        skipped: false,
        queuedCount: recordIdsToSync.length,
        errorCount: errors.length,
        recordIdsToSync,
        errors,
      };
    } catch (error) {
      const errorMeta = buildErrorLog({
        workflow: "bcba-queue-poller",
        stage: "poller-run",
        error,
      });
      console.error(JSON.stringify({ message: "BCBA queue poller failed", ...errorMeta }));
      await this.dataStore.set("hs_cr_bcba_queue_last_error", errorMeta, { ttl: 86400 });
      throw error;
    } finally {
      await this.dataStore.delete(BCBA_LOCK_KEY);
    }
  },
});
