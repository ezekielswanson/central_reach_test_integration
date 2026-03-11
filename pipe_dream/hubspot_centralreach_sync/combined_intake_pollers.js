import axios from "axios";

// -------------------------
// Config
// -------------------------
const HUBSPOT_BASE_URL = "https://api.hubapi.com";

// Deals (Client flow)
const HS_PIPELINE_ID_TEST = "851341465";
const HS_STAGE_ALLOWLIST_TEST = [
  "1268817225",
  "1268817226",
  "1268817227",
  "1268817228",
  "1268817229",
  "1268817230",
  "1268817231",
  "1268817232",
  "1268817233",
  "1268817234",
  "1268817235",
];

const HS_PIPELINE_ID_PROD = "default"; // PROD reference
const HS_STAGE_ALLOWLIST_PROD = [
  "1213733979",
  "1213681739",
  "1216864594",
  "1266305408",
  "1266305409",
  "1263094171",
  "1136629068",
  "1263175192",
  "1278256273",
  "1278121498",
  "closedwon",
  "1310034488",
  "closedlost",
  "1136629070",
  "1315313037",
];

function stageAllowlistByPipeline(pipelineId) {
  return pipelineId === HS_PIPELINE_ID_PROD
    ? HS_STAGE_ALLOWLIST_PROD
    : HS_STAGE_ALLOWLIST_TEST;
}

// BT/RBT
const HS_OBJECT_TYPE_ID_TEST = "2-55656309";
// const HS_OBJECT_TYPE_ID_PROD = "2-48354559"; // PROD reference
const HS_BT_RBT_PIPELINE_ID_TEST = "851341475";
// const HS_PIPELINE_ID_PROD = "822050166"; // PROD reference
const BT_RBT_STAGE_ALLOWLIST = [
  // PROD references:
  // "1223572096", // Cleared to Be Assigned (trigger)
  // "1216507226", // Fully Onboarded
  // "1275661880", // Hired
  // "1313403933", // Assigned
  // "1216507227", // Paused
  // "1263175081", // Disqualified
  // "1299798139", // Resigned
  // "1299798140", // Terminated

  // Sandbox testing references (in order):
  "1268817294",
  "1268817295",
  "1268817296",
  "1268817297",
  "1268817298",
];

// BCBA UPDATE THESE AND VEIRFY
const TEST_HS_OBJECT_TYPE_ID = "2-55656302";
const TEST_HS_PIPELINE_ID = "876724575";
const TEST_HS_STAGE_IDS = [
  "1314109614",
  "1314109318",
  "1314109615",
  "1314110003",
  "1314110004",
  "1314796081",
  "1314109317",
];
// const PROD_HS_OBJECT_TYPE_ID = "2-48354212";
// const PROD_HS_PIPELINE_ID = "855656544";

const COMBINED_LOCK_KEY = "hs_cr_lock:combined_intake_queue";
const COMBINED_LOCK_TTL_SECONDS = 120;
const DEDUPE_TTL_SECONDS = 1800;

function dealDedupeKey(dealId, hsLastModifiedDate) {
  return `hs_cr:intake_processed:${dealId}:${hsLastModifiedDate}`;
}

function bcbaDedupeKey(recordId, hsLastModifiedDate) {
  return `hs_cr:bcba_processed:${recordId}:${hsLastModifiedDate}`;
}

function btRbtDedupeKey(recordId, hsLastModifiedDate) {
  return `hs_cr:bt_rbt_processed:${recordId}:${hsLastModifiedDate}`;
}

function parseTimestamp(value) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function shouldSyncSimple(candidate) {
  const props = candidate?.properties || {};
  const hsLast = parseTimestamp(props.hs_lastmodifieddate);
  const lastWrite = parseTimestamp(props.integration_last_write);

  if (!lastWrite) return true;
  if (!hsLast) return false;
  return hsLast > lastWrite;
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

function shouldSyncBcba(candidate) {
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
  return s.length > max ? `${s.slice(0, max)}...(truncated)` : s;
}

function redactPotentialPhi(str) {
  if (!str) return str;

  let out = str.replace(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    "[REDACTED_EMAIL]",
  );

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
  section,
  stage,
  error,
  recordId = null,
  hsLastModifiedDate = null,
  extra = null,
}) {
  return {
    workflow,
    section,
    stage,
    recordId,
    hsLastModifiedDate,
    timestamp: new Date().toISOString(),
    ...(extra ? { extra } : {}),
    ...toErrorMeta(error),
  };
}

const SEARCH_TIMEOUT_MS = 30000;
const SEARCH_LIMIT = 50;
const RETRY_MAX_ATTEMPTS = 2;
const RETRY_BASE_DELAY_MS = 250;

function extractErrorSignals(error) {
  const data = error?.response?.data || {};
  const messages = [];
  const contextKeys = [];

  if (typeof error?.message === "string") messages.push(error.message);
  if (typeof data?.message === "string") messages.push(data.message);
  if (typeof data?.category === "string") messages.push(data.category);
  if (typeof data?.subCategory === "string") messages.push(data.subCategory);

  if (Array.isArray(data?.errors)) {
    for (const err of data.errors) {
      if (typeof err?.message === "string") messages.push(err.message);
      if (typeof err?.subCategory === "string") messages.push(err.subCategory);
      if (err?.context && typeof err.context === "object") {
        contextKeys.push(...Object.keys(err.context));
      }
    }
  }

  return {
    messageBlob: messages.join(" ").toLowerCase(),
    contextKeys: contextKeys.map((k) => String(k).toLowerCase()),
  };
}

function isLikelyLookbackFilterError(error) {
  if (!error) return false;
  const status = error?.response?.status;
  if (status !== 400 && status !== 422) return false;

  const { messageBlob, contextKeys } = extractErrorSignals(error);
  if (contextKeys.includes("hs_lastmodifieddate")) return true;

  return (
    messageBlob.includes("hs_lastmodifieddate") &&
    (messageBlob.includes("invalid") ||
      messageBlob.includes("unknown") ||
      messageBlob.includes("filter") ||
      messageBlob.includes("property") ||
      messageBlob.includes("validation"))
  );
}

function isRetryableHubspotError(error) {
  const status = error?.response?.status;
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSearchPayload(payloadBase, { sinceIso, after, useLookback }) {
  const filterGroups = (payloadBase.filterGroups || []).map((group) => {
    const filters = [...(group.filters || [])];
    if (useLookback) {
      filters.push({
        propertyName: "hs_lastmodifieddate",
        operator: "GTE",
        value: sinceIso,
      });
    }
    return { ...group, filters };
  });

  return {
    ...payloadBase,
    filterGroups,
    ...(after ? { after } : {}),
  };
}

async function postSearchWithRetry({ url, payload, headers, maxAttempts = RETRY_MAX_ATTEMPTS }) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const response = await axios.post(url, payload, {
        headers,
        timeout: SEARCH_TIMEOUT_MS,
      });
      return { response, requestCount: attempt };
    } catch (error) {
      if (attempt >= maxAttempts || !isRetryableHubspotError(error)) {
        error.requestCount = attempt;
        throw error;
      }

      const jitterMs = Math.floor(Math.random() * 120);
      const backoffMs = RETRY_BASE_DELAY_MS * (2 ** (attempt - 1)) + jitterMs;
      await sleep(backoffMs);
    }
  }

  throw new Error("Unexpected retry termination");
}

async function searchWithLookbackFallback({
  url,
  payloadBase,
  headers,
  sinceIso,
  after,
  useLookback,
  onLookbackRejected,
}) {
  let requestCount = 0;
  const payload = buildSearchPayload(payloadBase, {
    sinceIso,
    after,
    useLookback,
  });

  try {
    const result = await postSearchWithRetry({ url, payload, headers });
    return {
      response: result.response,
      requestCount: result.requestCount,
      lookbackRejected: false,
      useLookbackNext: useLookback,
    };
  } catch (error) {
    requestCount += error?.requestCount || 1;

    if (!useLookback || !isLikelyLookbackFilterError(error)) {
      error.requestCount = requestCount;
      throw error;
    }

    if (typeof onLookbackRejected === "function") {
      onLookbackRejected(error);
    }

    const fallbackPayload = buildSearchPayload(payloadBase, {
      sinceIso,
      after,
      useLookback: false,
    });
    const fallbackResult = await postSearchWithRetry({
      url,
      payload: fallbackPayload,
      headers,
    });

    return {
      response: fallbackResult.response,
      requestCount: requestCount + fallbackResult.requestCount,
      lookbackRejected: true,
      useLookbackNext: false,
    };
  }
}

export default defineComponent({
  name: "HubSpot Combined Intake Queue Poller (Queue Only)",
  description:
    "Polls Deals + BCBA + BT/RBT records, dedupes/queues them, and returns three queues for downstream sync steps.",
  version: "1.0.0",
  props: {
    dataStore: { type: "data_store" },
    hubspot_access_token: { type: "string", secret: true },
    lookback_minutes: { type: "integer", default: 15 },
    max_search_requests_per_section: { type: "integer", default: 1 },
    max_deals_per_run: { type: "integer", default: 15 },
    max_bcba_per_run: { type: "integer", default: 15 },
    max_bt_rbt_per_run: { type: "integer", default: 15 },

    hs_deal_pipeline_id: { type: "string", default: HS_PIPELINE_ID_TEST },

    hs_bt_rbt_object_type_id: { type: "string", default: HS_OBJECT_TYPE_ID_TEST },
    hs_bt_rbt_pipeline_id: { type: "string", default: HS_BT_RBT_PIPELINE_ID_TEST },
    hs_bt_rbt_stage_allowlist: { type: "string[]", default: BT_RBT_STAGE_ALLOWLIST },

    hs_bcba_object_type_id: { type: "string", default: TEST_HS_OBJECT_TYPE_ID },
    hs_bcba_pipeline_id: { type: "string", default: TEST_HS_PIPELINE_ID },
    hs_bcba_stage_allowlist: { type: "string[]", default: TEST_HS_STAGE_IDS },
  },

  async run() {
    const dealIdsToSync = [];
    const bcbaRecordIdsToSync = [];
    const btRbtRecordIdsToSync = [];
    const errors = [];
    const errorCounts = { deals: 0, bcba: 0, btRbt: 0 };
    const metricsBySection = {
      deals: { requests: 0, fetched: 0, skippedSync: 0, skippedDedupe: 0, queued: 0, errors: 0 },
      bcba: { requests: 0, fetched: 0, skippedSync: 0, skippedDedupe: 0, queued: 0, errors: 0 },
      btRbt: { requests: 0, fetched: 0, skippedSync: 0, skippedDedupe: 0, queued: 0, errors: 0 },
    };

    if (!this.hubspot_access_token) {
      throw new Error("Missing required hubspot_access_token");
    }

    const lockPayload = {
      lock: "combined_intake_queue",
      timestamp: new Date().toISOString(),
    };

    let lockExists = false;
    try {
      lockExists = await this.dataStore.has(COMBINED_LOCK_KEY);
    } catch (error) {
      throw new Error(
        `Failed to check combined lock ${COMBINED_LOCK_KEY}: ${safeString(error?.message, 300)}`,
      );
    }

    if (lockExists) {
      return {
        skipped: true,
        reason: "lock_exists",
        queuedCounts: { deals: 0, bcba: 0, btRbt: 0 },
        errorCounts,
        dealIdsToSync,
        bcbaRecordIdsToSync,
        btRbtRecordIdsToSync,
        errors,
      };
    }

    try {
      try {
        await this.dataStore.set(COMBINED_LOCK_KEY, lockPayload, {
          ttl: COMBINED_LOCK_TTL_SECONDS,
        });
      } catch (error) {
        throw new Error(
          `Failed to set combined lock ${COMBINED_LOCK_KEY}: ${safeString(error?.message, 300)}`,
        );
      }

      const sinceIso = new Date(
        Date.now() - this.lookback_minutes * 60 * 1000,
      ).toISOString();

      const headers = {
        Authorization: `Bearer ${this.hubspot_access_token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      const maxRequestsPerSection = Math.max(
        1,
        Number(this.max_search_requests_per_section) || 1,
      );

      const reportSectionError = ({ section, stage, error, recordId, hsLastModifiedDate, extra }) => {
        const errorMeta = buildErrorLog({
          workflow: "combined-intake-queue-poller",
          section,
          stage,
          error,
          recordId: recordId ?? null,
          hsLastModifiedDate: hsLastModifiedDate ?? null,
          extra: extra ?? null,
        });
        errors.push(errorMeta);
        errorCounts[section] += 1;
        metricsBySection[section].errors += 1;
      };

      const processSection = async ({
        section,
        searchUrl,
        payloadBase,
        shouldSync,
        buildDedupeKeyFn,
        targetIds,
        maxPerRun,
        queuedFieldName,
      }) => {
        let after = null;
        let useLookback = true;
        const metrics = metricsBySection[section];

        while (
          targetIds.length < maxPerRun &&
          metrics.requests < maxRequestsPerSection
        ) {
          const searchResult = await searchWithLookbackFallback({
            url: searchUrl,
            payloadBase,
            headers,
            sinceIso,
            after,
            useLookback,
            onLookbackRejected: (error) => {
              reportSectionError({
                section,
                stage: `${section}-search-lookback-rejected`,
                error,
                extra: { lookback_minutes: this.lookback_minutes },
              });
            },
          });

          metrics.requests += searchResult.requestCount;
          useLookback = searchResult.useLookbackNext;

          const candidates = searchResult.response?.data?.results || [];
          metrics.fetched += candidates.length;

          for (const candidate of candidates) {
            if (targetIds.length >= maxPerRun) break;

            if (!shouldSync(candidate)) {
              metrics.skippedSync += 1;
              continue;
            }

            const recordId = candidate?.id || candidate?.properties?.hs_object_id;
            const hsLastModifiedDate = candidate?.properties?.hs_lastmodifieddate;
            if (!recordId || !hsLastModifiedDate) {
              metrics.skippedSync += 1;
              continue;
            }

            const dKey = buildDedupeKeyFn(recordId, hsLastModifiedDate);
            const alreadyProcessed = await this.dataStore.has(dKey);
            if (alreadyProcessed) {
              metrics.skippedDedupe += 1;
              continue;
            }

            try {
              await this.dataStore.set(
                dKey,
                {
                  [queuedFieldName]: String(recordId),
                  hs_lastmodifieddate: String(hsLastModifiedDate),
                  queued_at: new Date().toISOString(),
                },
                { ttl: DEDUPE_TTL_SECONDS },
              );
              targetIds.push(String(recordId));
              metrics.queued += 1;
            } catch (error) {
              reportSectionError({
                section,
                stage: `${section}-queue`,
                error,
                recordId: String(recordId),
                hsLastModifiedDate: String(hsLastModifiedDate),
              });
            }
          }

          after = searchResult.response?.data?.paging?.next?.after || null;
          if (!after) break;
        }
      };

      // Deals search + queue
      try {
        const stageAllowlist = stageAllowlistByPipeline(this.hs_deal_pipeline_id);
        const dealsSearchUrl = `${HUBSPOT_BASE_URL}/crm/v3/objects/deals/search`;
        const dealsPayload = {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "pipeline",
                  operator: "EQ",
                  value: this.hs_deal_pipeline_id,
                },
                {
                  propertyName: "dealstage",
                  operator: "IN",
                  values: stageAllowlist,
                },
              ],
            },
          ],
          properties: ["hs_object_id", "hs_lastmodifieddate", "integration_last_write"],
          sorts: [{ propertyName: "hs_lastmodifieddate", direction: "DESCENDING" }],
          limit: SEARCH_LIMIT,
        };

        await processSection({
          section: "deals",
          searchUrl: dealsSearchUrl,
          payloadBase: dealsPayload,
          shouldSync: shouldSyncSimple,
          buildDedupeKeyFn: dealDedupeKey,
          targetIds: dealIdsToSync,
          maxPerRun: this.max_deals_per_run,
          queuedFieldName: "dealId",
        });
      } catch (error) {
        reportSectionError({
          section: "deals",
          stage: "deals-search",
          error,
        });
      }
      console.log(JSON.stringify({ message: "Combined poller section metrics", section: "deals", ...metricsBySection.deals }));

      // BCBA search + queue
      // Temporarily disabled in v1 worker rollout to avoid BCBA HubSpot API calls.
      /*
      try {
        const bcbaSearchUrl = `${HUBSPOT_BASE_URL}/crm/v3/objects/${this.hs_bcba_object_type_id}/search`;
        const bcbaPayload = {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "hs_pipeline",
                  operator: "EQ",
                  value: this.hs_bcba_pipeline_id,
                },
                {
                  propertyName: "hs_pipeline_stage",
                  operator: "IN",
                  values: this.hs_bcba_stage_allowlist,
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
          limit: SEARCH_LIMIT,
        };

        await processSection({
          section: "bcba",
          searchUrl: bcbaSearchUrl,
          payloadBase: bcbaPayload,
          shouldSync: shouldSyncBcba,
          buildDedupeKeyFn: bcbaDedupeKey,
          targetIds: bcbaRecordIdsToSync,
          maxPerRun: this.max_bcba_per_run,
          queuedFieldName: "recordId",
        });
      } catch (error) {
        reportSectionError({
          section: "bcba",
          stage: "bcba-search",
          error,
        });
      }
      */
      console.log(JSON.stringify({ message: "Combined poller section metrics", section: "bcba", ...metricsBySection.bcba }));

      // BT/RBT search + queue
      try {
        const btRbtSearchUrl = `${HUBSPOT_BASE_URL}/crm/v3/objects/${this.hs_bt_rbt_object_type_id}/search`;
        const btRbtPayload = {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "hs_pipeline",
                  operator: "EQ",
                  value: this.hs_bt_rbt_pipeline_id,
                },
                {
                  propertyName: "hs_pipeline_stage",
                  operator: "IN",
                  values: this.hs_bt_rbt_stage_allowlist,
                },
              ],
            },
          ],
          properties: ["hs_object_id", "hs_lastmodifieddate", "integration_last_write"],
          sorts: [{ propertyName: "hs_lastmodifieddate", direction: "DESCENDING" }],
          limit: SEARCH_LIMIT,
        };

        await processSection({
          section: "btRbt",
          searchUrl: btRbtSearchUrl,
          payloadBase: btRbtPayload,
          shouldSync: shouldSyncSimple,
          buildDedupeKeyFn: btRbtDedupeKey,
          targetIds: btRbtRecordIdsToSync,
          maxPerRun: this.max_bt_rbt_per_run,
          queuedFieldName: "recordId",
        });
      } catch (error) {
        reportSectionError({
          section: "btRbt",
          stage: "btRbt-search",
          error,
        });
      }
      console.log(JSON.stringify({ message: "Combined poller section metrics", section: "btRbt", ...metricsBySection.btRbt }));

      return {
        skipped: false,
        queuedCounts: {
          deals: dealIdsToSync.length,
          bcba: bcbaRecordIdsToSync.length,
          btRbt: btRbtRecordIdsToSync.length,
        },
        errorCounts,
        dealIdsToSync,
        bcbaRecordIdsToSync,
        btRbtRecordIdsToSync,
        errors,
      };
    } finally {
      try {
        await this.dataStore.delete(COMBINED_LOCK_KEY);
      } catch (error) {
        throw new Error(
          `Failed to release combined lock ${COMBINED_LOCK_KEY}: ${safeString(error?.message, 300)}`,
        );
      }
    }
  },
});
