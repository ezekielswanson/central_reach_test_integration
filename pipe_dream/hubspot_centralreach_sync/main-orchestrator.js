function toErrorMeta(error) {
  return {
    errorCode: error?.code || "unknown",
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

const NON_URGENT_LOCK_KEY = "hs_cr_lock:non_urgent";
const NON_URGENT_LOCK_TTL_SECONDS = 600;
const NON_URGENT_WATERMARK_KEY = "hs_cr:last_nonurgent_run_at";

export default defineComponent({
  name: "HubSpot-CentralReach Non-Urgent Poller",
  description: "Scheduled 5-minute non-urgent poller with lock and watermark.",
  version: "0.2.0",
  props: {
    dataStore: { type: "data_store" },
    test_mode: { type: "boolean", default: false, optional: true },
  },
  async run({ $ }) {
    const lock = await this.dataStore.get(NON_URGENT_LOCK_KEY);
    if (lock) {
      return $.flow.exit("Non-urgent poller already running.");
    }

    await this.dataStore.set(
      NON_URGENT_LOCK_KEY,
      { lock: "non_urgent", timestamp: new Date().toISOString() },
      { ttl: NON_URGENT_LOCK_TTL_SECONDS }
    );
    try {
      if (this.test_mode) {
        console.log(JSON.stringify({ message: "Non-urgent test mode run", timestamp: new Date().toISOString() }));
        await this.dataStore.set(NON_URGENT_WATERMARK_KEY, new Date().toISOString());
        return $.flow.exit("Test mode enabled.");
      }

      console.log(JSON.stringify({ message: "Non-urgent cycle started", timestamp: new Date().toISOString() }));
      // Placeholder for future non-urgent CR->HS authorization sync work.
      console.log(JSON.stringify({ message: "Non-urgent cycle ended", timestamp: new Date().toISOString() }));
      await this.dataStore.set(NON_URGENT_WATERMARK_KEY, new Date().toISOString());

      return {
        status: "ok",
        runner: "non-urgent-poller",
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
      await this.dataStore.delete(NON_URGENT_LOCK_KEY);
    }
  },
});
