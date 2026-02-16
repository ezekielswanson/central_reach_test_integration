const { parseMappingCsv } = require("../mapping/csv-loader");
const { transformDealContextToCrPayload } = require("../mapping/transformer");
const { createHubSpotClient } = require("../clients/hubspot-client");
const { createCentralReachClient } = require("../clients/centralreach-client");
const { info, error } = require("../utils/logger");

function createHsToCrSync(config) {
  const mappingRows = parseMappingCsv(config.mappingCsvPath);
  const hubspot = createHubSpotClient(config.hubspot);
  const centralReach = createCentralReachClient(config.centralReach);

  function isIntakeComplete(dealContext) {
    return (
      String(dealContext.dealProperties.pipeline) === String(config.hubspot.pipelineId) &&
      String(dealContext.dealProperties.dealstage) === String(config.hubspot.intakeCompleteStageId)
    );
  }

  async function processDeal(dealId) {
    try {
      const dealContext = await hubspot.fetchDealContext(dealId, mappingRows);
      if (!isIntakeComplete(dealContext)) {
        return {
          dealId: String(dealId),
          status: "skipped",
          reason: "deal is not in Intake Complete stage",
        };
      }

      const { crPayload, transformTrace } = transformDealContextToCrPayload(dealContext, mappingRows);
      const upsert = await centralReach.upsertCentralReachClient(dealContext, crPayload);

      if (upsert.operation !== "noop") {
        await hubspot.writeBackToHubSpot(dealId, upsert.crContactId);
      }

      info("HubSpot -> CentralReach processed", {
        dealId: String(dealId),
        crContactId: upsert.crContactId,
        operation: upsert.operation,
        transformFields: transformTrace.map((entry) => entry.targetField),
      });

      return {
        dealId: String(dealId),
        crContactId: upsert.crContactId,
        operation: upsert.operation,
        transformTrace,
      };
    } catch (err) {
      error("HubSpot -> CentralReach processDeal failed", {
        dealId: String(dealId),
        message: err?.message || "unknown_error",
        code: err?.code || err?.response?.status || null,
      });
      throw err;
    }
  }

  async function processIntakeQueue({ limit = 50, onProcessed } = {}) {
    const candidates = await hubspot.searchIntakeCompleteDeals(limit);
    const results = [];

    for (const candidate of candidates) {
      if (!hubspot.needsSyncByModifiedDate(candidate)) {
        continue;
      }
      const dealId = candidate.id || candidate.properties?.hs_object_id;
      const result = await processDeal(dealId);
      results.push(result);
      if (typeof onProcessed === "function") {
        onProcessed(result, candidate);
      }
    }

    return results;
  }

  return {
    processDeal,
    processIntakeQueue,
  };
}

module.exports = {
  createHsToCrSync,
};
