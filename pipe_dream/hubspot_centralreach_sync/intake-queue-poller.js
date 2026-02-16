import axios from "axios";
import { fetchDealAndContact, transformToCrPayload, upsertCrAndWriteback } from "./hs-to-cr-sync";

const HUBSPOT_BASE_URL = "https://api.hubapi.com";
const PIPELINE_ID = "851341465";
const STAGE_ID = "1268817225";

function dedupeKey(dealId, hsLastModifiedDate) {
  return `intake_processed:${dealId}:${hsLastModifiedDate}`;
}

function shouldSync(candidate) {
  const props = candidate.properties || {};
  if (!props.integration_last_write) return true;
  return new Date(props.hs_lastmodifieddate).getTime() > new Date(props.integration_last_write).getTime();
}

function toErrorMeta(error) {
  return {
    errorMessage: error?.response?.data?.message || error?.message || "unknown_error",
    errorCode: error?.code || error?.response?.status || "unknown",
    httpStatus: error?.response?.status || null,
  };
}

function buildErrorLog({ workflow, stage, error, dealId = null, hsLastModifiedDate = null }) {
  return {
    workflow,
    stage,
    dealId,
    hsLastModifiedDate,
    timestamp: new Date().toISOString(),
    ...toErrorMeta(error),
  };
}

export default defineComponent({
  name: "HubSpot Intake Queue Poller",
  description: "Runs every minute and syncs Intake Complete deals from HubSpot to CentralReach.",
  version: "0.1.0",
  props: {
    dataStore: { type: "data_store" },
    hubspot_access_token: { type: "string", secret: true },
    cr_client_id: { type: "string", secret: true },
    cr_client_secret: { type: "string", secret: true },
    cr_api_key: { type: "string", secret: true },
    hs_cr_contact_id_property: { type: "string", default: "client_id_number" },
  },
  async run() {
    const lockKey = "intake_queue_lock";
    const lock = await this.dataStore.get(lockKey);
    if (lock?.status) {
      console.log("Lock already held, skipping run.");
      return { skipped: true, reason: "lock_exists" };
    }
    await this.dataStore.set(lockKey, { status: true }, { ttl: 180 });

    try {
      const searchResponse = await axios.post(
        `${HUBSPOT_BASE_URL}/crm/v3/objects/deals/search`,
        {
          filterGroups: [
            {
              filters: [
                { propertyName: "pipeline", operator: "EQ", value: PIPELINE_ID },
                { propertyName: "dealstage", operator: "EQ", value: STAGE_ID },
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
          limit: 50,
        },
        {
          headers: {
            Authorization: `Bearer ${this.hubspot_access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const candidates = searchResponse.data?.results || [];
      const processed = [];
      const errors = [];

      for (const candidate of candidates) {
        if (!shouldSync(candidate)) continue;

        const dealId = candidate.id || candidate.properties?.hs_object_id;
        const lastModified = candidate.properties?.hs_lastmodifieddate;
        const key = dedupeKey(dealId, lastModified);
        const alreadyProcessed = await this.dataStore.get(key);
        if (alreadyProcessed?.status) continue;

        try {
          await this.dataStore.set(key, { status: true }, { ttl: 1800 });
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
            ],
            contact: [],
          };

          const hydrated = await fetchDealAndContact({
            hubspotToken: this.hubspot_access_token,
            dealId,
            mappingProperties,
          });

          const payload = transformToCrPayload(hydrated);
          const result = await upsertCrAndWriteback({
            hubspotToken: this.hubspot_access_token,
            crAuth: {
              cr_client_id: this.cr_client_id,
              cr_client_secret: this.cr_client_secret,
              cr_api_key: this.cr_api_key,
            },
            dealId,
            hsCrContactIdProperty: this.hs_cr_contact_id_property,
            payload,
          });

          processed.push({
            dealId: String(dealId),
            hs_lastmodifieddate: lastModified,
            crContactId: result.crContactId,
            operation: result.operation,
          });
        } catch (error) {
          const errorMeta = buildErrorLog({
            workflow: "intake-queue-poller",
            stage: "candidate-sync",
            error,
            dealId: String(dealId),
            hsLastModifiedDate: lastModified,
          });
          console.error(JSON.stringify({ message: "Intake candidate sync failed", ...errorMeta }));
          await this.dataStore.set(`hs_cr_intake_last_error:${dealId}`, errorMeta, { ttl: 86400 });
          errors.push(errorMeta);
        }
      }

      return { processedCount: processed.length, errorCount: errors.length, processed, errors };
    } catch (error) {
      const errorMeta = buildErrorLog({
        workflow: "intake-queue-poller",
        stage: "poller-run",
        error,
      });
      console.error(
        JSON.stringify({
          message: "Intake queue poller failed",
          ...errorMeta,
        })
      );
      await this.dataStore.set("hs_cr_intake_queue_last_error", errorMeta, { ttl: 86400 });
      throw error;
    } finally {
      await this.dataStore.set(lockKey, { status: false });
    }
  },
});
