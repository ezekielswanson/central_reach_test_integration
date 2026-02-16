const axios = require("axios");
const { withRetry } = require("../utils/retry");
const { info, warn } = require("../utils/logger");
const { collectDealProperties } = require("../mapping/csv-loader");

function createHubSpotClient(config) {
  const client = axios.create({
    baseURL: config.baseUrl,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });

  async function requestWithRetry(fn, meta) {
    return withRetry(fn, {
      onRetry: ({ attempt, status, delayMs }) =>
        warn("Retrying HubSpot API call", { ...meta, attempt, status, delayMs }),
    });
  }

  async function fetchDeal(dealId, properties) {
    const response = await requestWithRetry(
      () =>
        client.get(`/crm/v3/objects/deals/${dealId}`, {
          params: {
            properties: properties.join(","),
          },
        }),
      { dealId, operation: "fetchDeal" }
    );
    return response.data;
  }

  async function fetchDealContext(dealId, mappingRows) {
    const dealProperties = collectDealProperties(mappingRows);
    const deal = await fetchDeal(dealId, dealProperties);
    const dealProps = deal.properties || {};

    return {
      dealId: String(deal.id || dealId),
      dealProperties: dealProps,
      contactId: null,
      contactProperties: null,
    };
  }

  async function writeBackToHubSpot(dealId, crContactId) {
    const nowIso = new Date().toISOString();
    const properties = {
      [config.crContactIdProperty]: String(crContactId),
      updated_by_integration: true,
      integration_last_write: nowIso,
    };
    await requestWithRetry(
      () =>
        client.patch(`/crm/v3/objects/deals/${dealId}`, {
          properties,
        }),
      { dealId, operation: "writeBackToHubSpot" }
    );
    info("Wrote sync metadata to HubSpot deal", {
      dealId,
      crContactId: String(crContactId),
      integration_last_write: nowIso,
    });
  }

  async function searchIntakeCompleteDeals(limit = 50) {
    const body = {
      filterGroups: [
        {
          filters: [
            { propertyName: "pipeline", operator: "EQ", value: config.pipelineId },
            { propertyName: "dealstage", operator: "EQ", value: config.intakeCompleteStageId },
          ],
        },
      ],
      properties: [
        "hs_object_id",
        "hs_lastmodifieddate",
        "integration_last_write",
        "pipeline",
        "dealstage",
      ],
      sorts: [{ propertyName: "hs_lastmodifieddate", direction: "DESCENDING" }],
      limit,
    };

    const response = await requestWithRetry(
      () => client.post("/crm/v3/objects/deals/search", body),
      { operation: "searchIntakeCompleteDeals" }
    );

    return response.data?.results || [];
  }

  function needsSyncByModifiedDate(deal) {
    const hsLastModified = deal.properties?.hs_lastmodifieddate;
    const lastWrite = deal.properties?.integration_last_write;
    if (!lastWrite) {
      return true;
    }
    return new Date(hsLastModified).getTime() > new Date(lastWrite).getTime();
  }

  return {
    fetchDealContext,
    writeBackToHubSpot,
    searchIntakeCompleteDeals,
    needsSyncByModifiedDate,
  };
}

module.exports = {
  createHubSpotClient,
};
