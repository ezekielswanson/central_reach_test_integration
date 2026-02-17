// Main Integration Scheduler - Revised for Correct Control Flow
import axios from "axios";

// Helper function remains the same
async function testConnectivity(
    hubspotToken,
    athenaClientId,
    athenaClientSecret
) {
    console.log("🔍 Testing API connectivity...");
    try {
        await axios({
            method: "GET",
            url: "https://api.hubapi.com/crm/v3/owners",
            headers: { Authorization: `Bearer ${hubspotToken}` },
            params: { limit: 1 },
            timeout: 10000
        });
        console.log("✅ HubSpot connectivity confirmed");
    } catch (error) {
        throw new Error(`HubSpot connectivity failed: ${error.message}`);
    }
    try {
        const tokenResponse = await axios({
            method: "POST",
            url: "https://api.preview.platform.athenahealth.com/oauth2/v1/token",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${btoa(`${athenaClientId}:${athenaClientSecret}`)}`
            },
            data: "grant_type=client_credentials&scope=athena/service/Athenanet.MDP.*",
            timeout: 10000
        });
        if (tokenResponse.data && tokenResponse.data.access_token) {
            console.log("✅ Athena connectivity confirmed");
        } else {
            throw new Error("No access token received");
        }
    } catch (error) {
        throw new Error(`Athena connectivity failed: ${error.message}`);
    }
}

// Helper function to trigger a workflow
async function triggerWorkflow(url, name, practiceId, dataStore) {
    if (!url) {
        console.log(`⏩ Skipping ${name} workflow (no URL provided).`);
        return;
    }

    console.log(`🔗 Triggering ${name} workflow...`);
    const cycleId = `cycle_${name.toLowerCase()}_${Date.now()}`;
    await axios({
        method: "POST",
        url: url,
        data: {
            trigger_source: "main-scheduler",
            timestamp: new Date().toISOString(),
            integration_cycle_id: cycleId,
            practice_id: practiceId
        },
        timeout: 30000
    });

    console.log(`✅ ${name} workflow triggered`);

    await dataStore.set(
        cycleId,
        {
            started_at: new Date().toISOString(),
            status: "initiated",
            workflow: `${name}-sync`
        },
        { ttl: 3600 }
    );
}


export default defineComponent({
    // Props remain the same
    name: "StrideCare HubSpot-Athena Integration Scheduler",
    description: "Main 5-minute scheduler that manages integration workflow chain",
    version: "0.4.0", // Updated version
    props: {
        dataStore: { type: "data_store" },
        departments_athena_to_hubspot_url: { type: "string", optional: true },
        referrers_athena_to_hubspot_url: { type: "string", optional: true },
        patients_athena_to_hubspot_url: { type: "string", optional: true },
        appointments_athena_to_hubspot_url: { type: "string", optional: true },
        cases_athena_to_hubspot_url: { type: "string", optional: true },
        providers_athena_to_hubspot_url: { type: "string", optional: true },
        hubspot_access_token: { type: "string", secret: true },
        athena_client_id: { type: "string", secret: true },
        athena_client_secret: { type: "string", secret: true },
        athena_practice_id: { type: "string", default: "195900" },
        test_mode: { type: "boolean", default: false, optional: true }
    },

    async run({ steps, $ }) {
        console.log("🕐 Starting 5-minute integration cycle");

        try {
            // Check if integration is already running
            const integrationRunning = await this.dataStore.get("integration_running");
            if (integrationRunning && integrationRunning.status) {
                const message = "⚠️ Integration already running, skipping this cycle.";
                console.log(message);
                return $.flow.exit(message); // Exit cleanly with a reason
            }

            // Set integration running flag
            await this.dataStore.set("integration_running", { status: true }, { ttl: 1800 });
            console.log("🚀 Integration cycle started");

            // Test connectivity before starting
            await testConnectivity(
                this.hubspot_access_token,
                this.athena_client_id,
                this.athena_client_secret
            );

            // Handle test mode
            if (this.test_mode) {
                console.log("🧪 Test mode enabled - skipping workflow chain");
                await this.dataStore.set("integration_running", { status: false });
                return $.flow.exit("Test mode successful. Connectivity verified.");
            }

            // Sequentially trigger all defined workflows
            await triggerWorkflow(this.departments_athena_to_hubspot_url, "Departments", this.athena_practice_id, this.dataStore);
            await triggerWorkflow(this.referrers_athena_to_hubspot_url, "Referrers", this.athena_practice_id, this.dataStore);
            await triggerWorkflow(this.patients_athena_to_hubspot_url, "Patients", this.athena_practice_id, this.dataStore);
            await triggerWorkflow(this.providers_athena_to_hubspot_url, "Providers", this.athena_practice_id, this.dataStore);
            await triggerWorkflow(this.cases_athena_to_hubspot_url, "Cases", this.athena_practice_id, this.dataStore);
            await triggerWorkflow(this.appointments_athena_to_hubspot_url, "Appointments", this.athena_practice_id, this.dataStore);

            // Once all workflows are successfully triggered, clear the running flag
            console.log("🏁 All workflows triggered successfully. Marking integration as complete.");
            await this.dataStore.set("integration_running", { status: false });

            // Exit the workflow with a success message
            return $.flow.exit("✅ Main scheduler finished triggering all workflows.");

        } catch (error) {
            console.error("❌ Integration scheduler error:", error.message);

            // Ensure the running flag is cleared on error
            await this.dataStore.set("integration_running", { status: false });

            // Log the error details
            await this.dataStore.set("last_error", {
                error: error.message,
                timestamp: new Date().toISOString(),
                workflow: "main-scheduler",
                stack: error.stack
            }, { ttl: 86400 });

            // Let the workflow fail and surface the error in Pipedream logs
            throw error;
        }
    }
});
