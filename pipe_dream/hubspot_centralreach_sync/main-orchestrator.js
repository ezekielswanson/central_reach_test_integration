import axios from "axios";

function toErrorMeta(error) {
  return {
    errorMessage: error?.response?.data?.message || error?.message || "unknown_error",
    errorCode: error?.code || error?.response?.status || "unknown",
    httpStatus: error?.response?.status || null,
  };
}

function buildErrorLog({ workflow, stage, error }) {
  return {
    workflow,
    stage,
    timestamp: new Date().toISOString(),
    ...toErrorMeta(error),
  };
}

async function triggerWorkflow(url, name, dataStore) {
  if (!url) return null;
  const cycleId = `${name}_${Date.now()}`;
  await axios.post(url, {
    trigger_source: "hubspot-centralreach-main-orchestrator",
    integration_cycle_id: cycleId,
    timestamp: new Date().toISOString(),
  });
  await dataStore.set(
    cycleId,
    {
      status: "initiated",
      workflow: name,
      started_at: new Date().toISOString(),
    },
    { ttl: 3600 }
  );
  return cycleId;
}

export default defineComponent({
  name: "HubSpot-CentralReach Main Orchestrator",
  description: "Runs every 5 minutes and triggers non-urgent workflows with lock protection.",
  version: "0.1.0",
  props: {
    dataStore: { type: "data_store" },
    intake_queue_workflow_url: { type: "string", optional: true },
    non_urgent_workflow_url: { type: "string", optional: true },
    test_mode: { type: "boolean", default: false, optional: true },
  },
  async run({ $ }) {
    const lock = await this.dataStore.get("hs_cr_integration_running");
    if (lock?.status) {
      return $.flow.exit("Integration is already running.");
    }

    await this.dataStore.set("hs_cr_integration_running", { status: true }, { ttl: 1800 });
    try {
      if (this.test_mode) {
        return $.flow.exit("Test mode enabled, no child workflow triggered.");
      }

      const triggered = [];
      const intakeCycle = await triggerWorkflow(this.intake_queue_workflow_url, "intake-queue", this.dataStore);
      if (intakeCycle) triggered.push(intakeCycle);

      const nonUrgentCycle = await triggerWorkflow(this.non_urgent_workflow_url, "non-urgent-sync", this.dataStore);
      if (nonUrgentCycle) triggered.push(nonUrgentCycle);

      return {
        status: "ok",
        triggeredCount: triggered.length,
        cycleIds: triggered,
      };
    } catch (error) {
      const errorMeta = buildErrorLog({
        workflow: "main-orchestrator",
        stage: "run",
        error,
      });
      console.error(JSON.stringify({ message: "Main orchestrator failed", ...errorMeta }));
      await this.dataStore.set(
        "hs_cr_last_error",
        errorMeta,
        { ttl: 86400 }
      );
      throw error;
    } finally {
      await this.dataStore.set("hs_cr_integration_running", { status: false });
    }
  },
});
