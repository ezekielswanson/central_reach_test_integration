import axios from "axios";

// -------------------------
// Config
// -------------------------
const HUBSPOT_BASE_URL = "https://api.hubapi.com";
const HS_PIPELINE_ID_TEST = "851341465";
const HS_STAGE_ALLOWLIST_TEST = [
  // Sandbox testing references (in order):
  "1268817225", // Intake Complete
  "1268817226", // Initial Assessment
  "1268817227", // IA - in Process
  "1268817228", // IA - Paused Assessment Approval
  "1268817229", // IA - Paused Auth Approval
  "1268817230", // Initial Assessment Complete
  "1268817231", // Assign Staff for Ongoing
  "1268817232", // Service Ready
  "1268817233", // Closed Won
  "1268817234", // Closed Lost
  "1268817235", // Disqualified
];

const HS_PIPELINE_ID_PROD = "default"; // PROD reference
const HS_STAGE_ALLOWLIST_PROD = [
  // PROD references (in order):
  "1213733979", // Intake Complete
  "1213681739", // Initial Assessment
  "1216864594", // IA - in Process
  "1266305408", // IA - Paused Assessment Approval
  "1266305409", // IA - Paused Auth Approval
  "1263094171", // Initial Assessment Complete
  "1136629068", // Assign Staff for Ongoing
  "1263175192", // Service Ready - Need Confirmed Start Date
  "1278256273", // Service Ready - Has Confirmed Start Date
  "1278121498", // First Three Days
  "closedwon", // Closed Won
  "1310034488", // Ongoing
  "closedlost", // Closed Lost
  "1136629070", // Disqualified
  "1315313037", // Discharged
];

const INTAKE_LOCK_KEY = "hs_cr_lock:intake_queue";
const INTAKE_LOCK_TTL_SECONDS = 120;     // 2 minutes (was 300)
const INTAKE_DEDUPE_TTL_SECONDS = 1800;  // 30 minutes (keep)
const INTAKE_LAST_ERROR_KEY = "hs_cr_intake_queue_last_error";
const INTAKE_LAST_ERROR_TTL_SECONDS = 86400;

function dedupeKey(dealId, hsLastModifiedDate) {
  return `hs_cr:intake_processed:${dealId}:${hsLastModifiedDate}`;
}

function stageAllowlistByPipeline(pipelineId) {
  return pipelineId === HS_PIPELINE_ID_PROD
    ? HS_STAGE_ALLOWLIST_PROD
    : HS_STAGE_ALLOWLIST_TEST;
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

function buildErrorLog({ workflow, stage, error, dealId = null, hsLastModifiedDate = null, extra = null }) {
  return {
    workflow,
    stage,
    dealId,
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
  name: "HubSpot Intake Queue Poller (Queue Only)",
  description:
    "Queues intake-pipeline deals in configured stages that need sync and returns dealIdsToSync for Step 2.",
  version: "0.3.0",
  props: {
    dataStore: { type: "data_store" },

    // You can pass env-var expressions into these fields (e.g. {{process.env.HUBSPOT_PRIVATE_APP_TOKEN}})
    hubspot_access_token: { type: "string", secret: true },

    // Best-practice: cap work per run so runtime is predictable
    max_deals_per_run: { type: "integer", default: 15 },
    hs_pipeline_id: { type: "string", default: HS_PIPELINE_ID_TEST },

    // Keep this here for later; Step 2 will use it
    hs_cr_contact_id_property: { type: "string", default: "client_id_number" },
  },

  async run() {
    // 1) Lock
    const lockExists = await this.dataStore.has(INTAKE_LOCK_KEY);
    if (lockExists) {
      console.log(
        JSON.stringify({
          message: "Intake poller skipped due to active lock",
          key: INTAKE_LOCK_KEY,
          timestamp: new Date().toISOString(),
        })
      );
      return {
        skipped: true,
        reason: "lock_exists",
        queuedCount: 0,
        errorCount: 0,
        dealIdsToSync: [],
        errors: [],
      };
    }

    await this.dataStore.set(
      INTAKE_LOCK_KEY,
      { lock: "intake_queue", timestamp: new Date().toISOString() },
      { ttl: INTAKE_LOCK_TTL_SECONDS }
    );

    try {
      // 2) HubSpot search
      const searchUrl = `${HUBSPOT_BASE_URL}/crm/v3/objects/deals/search`;
      const stageAllowlist = stageAllowlistByPipeline(this.hs_pipeline_id);

      const searchResponse = await axios.post(
        searchUrl,
        {
          filterGroups: [
            {
              filters: [
                { propertyName: "pipeline", operator: "EQ", value: this.hs_pipeline_id },
                { propertyName: "dealstage", operator: "IN", values: stageAllowlist },
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
        }
      );

      const candidates = searchResponse.data?.results || [];
      const dealIdsToSync = [];
      const errors = [];

      console.log(
        JSON.stringify({
          message: "Intake poller candidates fetched",
          count: candidates.length,
          max_deals_per_run: this.max_deals_per_run,
          timestamp: new Date().toISOString(),
        })
      );

      for (const candidate of candidates) {
        if (dealIdsToSync.length >= this.max_deals_per_run) break;
        if (!shouldSync(candidate)) continue;

        const dealId = candidate.id || candidate.properties?.hs_object_id;
        const lastModified = candidate.properties?.hs_lastmodifieddate;

        if (!dealId || !lastModified) continue;

        const dKey = dedupeKey(dealId, lastModified);
        const alreadyProcessed = await this.dataStore.has(dKey);
        if (alreadyProcessed) continue;

        try {
          // Dedupe key created here => this “queues” the work for Step 2
          await this.dataStore.set(
            dKey,
            {
              dealId: String(dealId),
              hs_lastmodifieddate: String(lastModified),
              queued_at: new Date().toISOString(),
            },
            { ttl: INTAKE_DEDUPE_TTL_SECONDS }
          );

          dealIdsToSync.push(String(dealId));
        } catch (error) {
          const errorMeta = buildErrorLog({
            workflow: "intake-queue-poller",
            stage: "queue-deal",
            error,
            dealId: String(dealId),
            hsLastModifiedDate: String(lastModified),
          });

          console.error(JSON.stringify({ message: "Failed to queue deal", ...errorMeta }));
          errors.push(errorMeta);
        }
      }

      console.log(
        JSON.stringify({
          message: "Intake poller queue complete",
          queuedCount: dealIdsToSync.length,
          errorCount: errors.length,
          timestamp: new Date().toISOString(),
        })
      );

      return {
        queuedCount: dealIdsToSync.length,
        errorCount: errors.length,
        dealIdsToSync,
        errors,
      };
    } catch (error) {
      const errorMeta = buildErrorLog({
        workflow: "intake-queue-poller",
        stage: "poller-run",
        error,
      });

      console.error(JSON.stringify({ message: "Intake queue poller failed", ...errorMeta }));
      await this.dataStore.set(INTAKE_LAST_ERROR_KEY, errorMeta, {
        ttl: INTAKE_LAST_ERROR_TTL_SECONDS,
      });

      throw error;
    } finally {
      await this.dataStore.delete(INTAKE_LOCK_KEY);
    }
  },
});