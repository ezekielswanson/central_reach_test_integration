import axios from "axios";

// -------------------------
// Config
// -------------------------
const HUBSPOT_BASE_URL = "https://api.hubapi.com";
const HS_OBJECT_TYPE_ID_TEST = "2-55656309";
// const HS_OBJECT_TYPE_ID_PROD = "2-48354559"; // PROD reference
const HS_PIPELINE_ID_TEST = "851341475";
// const HS_PIPELINE_ID_PROD = "822050166"; // PROD reference

const BT_RBT_STAGE_ALLOWLIST = [
  "1223572096", // Cleared to Be Assigned (trigger)
  "1216507226", // Fully Onboarded
  "1275661880", // Hired
  "1313403933", // Assigned
  "1216507227", // Paused
  "1263175081", // Disqualified
  "1299798139", // Resigned
  "1299798140", // Terminated
];

const BT_RBT_LOCK_KEY = "hs_cr_lock:bt_rbt_queue";
const BT_RBT_LOCK_TTL_SECONDS = 120;
const BT_RBT_DEDUPE_TTL_SECONDS = 1800;
const BT_RBT_LAST_ERROR_KEY = "hs_cr_bt_rbt_queue_last_error";
const BT_RBT_LAST_ERROR_TTL_SECONDS = 86400;

function dedupeKey(recordId, hsLastModifiedDate) {
  return `hs_cr:bt_rbt_processed:${recordId}:${hsLastModifiedDate}`;
}

function shouldSync(candidate) {
  const props = candidate.properties || {};
  if (!props.integration_last_write) return true;

  const hsLast = new Date(props.hs_lastmodifieddate).getTime();
  const lastWrite = new Date(props.integration_last_write).getTime();
  return hsLast > lastWrite;
}

// -------------------------
// PHI-safe logging helpers
// -------------------------
function safeString(value, max = 800) {
  if (value == null) return null;
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return s.length > max ? `${s.slice(0, max)}...(truncated)` : s;
}

function redactPotentialPhi(str) {
  if (!str) return str;

  // Emails
  let out = str.replace(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    "[REDACTED_EMAIL]",
  );

  // US-ish phone numbers
  out = out.replace(
    /\b(\+?1[-.\s]?)?(\(?\d{3}\)?)[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    "[REDACTED_PHONE]",
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

// -------------------------
// Pipedream Component (Step 1: Poller)
// -------------------------
export default defineComponent({
  name: "HubSpot BT/RBT Queue Poller (Queue Only)",
  description:
    "Queues BT/RBT custom object records that need HS to CR sync and returns objectIdsToSync.",
  version: "1.0.0",
  props: {
    dataStore: { type: "data_store" },
    hubspot_access_token: { type: "string", secret: true },
    max_records_per_run: { type: "integer", default: 15 },
    hs_object_type_id: { type: "string", default: HS_OBJECT_TYPE_ID_TEST },
    hs_pipeline_id: { type: "string", default: HS_PIPELINE_ID_TEST },
  },

  async run() {
    // 1) Lock
    const lockExists = await this.dataStore.has(BT_RBT_LOCK_KEY);
    if (lockExists) {
      console.log(
        JSON.stringify({
          message: "BT/RBT poller skipped due to active lock",
          key: BT_RBT_LOCK_KEY,
          timestamp: new Date().toISOString(),
        }),
      );

      return {
        skipped: true,
        reason: "lock_exists",
        queuedCount: 0,
        errorCount: 0,
        objectIdsToSync: [],
        errors: [],
      };
    }

    await this.dataStore.set(
      BT_RBT_LOCK_KEY,
      { lock: "bt_rbt_queue", timestamp: new Date().toISOString() },
      { ttl: BT_RBT_LOCK_TTL_SECONDS },
    );

    try {
      // 2) HubSpot custom object search
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
                  values: BT_RBT_STAGE_ALLOWLIST,
                },
              ],
            },
          ],
          properties: ["hs_object_id", "hs_lastmodifieddate", "integration_last_write"],
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
        },
      );

      const candidates = searchResponse.data?.results || [];
      const objectIdsToSync = [];
      const errors = [];

      console.log(
        JSON.stringify({
          message: "BT/RBT poller candidates fetched",
          count: candidates.length,
          max_records_per_run: this.max_records_per_run,
          timestamp: new Date().toISOString(),
        }),
      );

      for (const candidate of candidates) {
        if (objectIdsToSync.length >= this.max_records_per_run) break;
        if (!shouldSync(candidate)) continue;

        const recordId = candidate.id || candidate.properties?.hs_object_id;
        const lastModified = candidate.properties?.hs_lastmodifieddate;
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
            { ttl: BT_RBT_DEDUPE_TTL_SECONDS },
          );

          objectIdsToSync.push(String(recordId));
        } catch (error) {
          const errorMeta = buildErrorLog({
            workflow: "bt-rbt-queue-poller",
            stage: "queue-record",
            error,
            recordId: String(recordId),
            hsLastModifiedDate: String(lastModified),
          });

          console.error(
            JSON.stringify({
              message: "Failed to queue BT/RBT record",
              ...errorMeta,
            }),
          );
          errors.push(errorMeta);
        }
      }

      console.log(
        JSON.stringify({
          message: "BT/RBT poller queue complete",
          queuedCount: objectIdsToSync.length,
          errorCount: errors.length,
          timestamp: new Date().toISOString(),
        }),
      );

      return {
        queuedCount: objectIdsToSync.length,
        errorCount: errors.length,
        objectIdsToSync,
        errors,
      };
    } catch (error) {
      const errorMeta = buildErrorLog({
        workflow: "bt-rbt-queue-poller",
        stage: "poller-run",
        error,
      });

      console.error(
        JSON.stringify({
          message: "BT/RBT queue poller failed",
          ...errorMeta,
        }),
      );

      await this.dataStore.set(BT_RBT_LAST_ERROR_KEY, errorMeta, {
        ttl: BT_RBT_LAST_ERROR_TTL_SECONDS,
      });
      throw error;
    } finally {
      await this.dataStore.delete(BT_RBT_LOCK_KEY);
    }
  },
});
