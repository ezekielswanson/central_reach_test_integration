const path = require("path");

const DEFAULTS = {
  HUBSPOT_BASE_URL: "https://api.hubapi.com",
  HUBSPOT_CLIENT_PIPELINE_ID: "851341465",
  HUBSPOT_INTAKE_COMPLETE_STAGE_ID: "1268817225",
  HUBSPOT_CR_CONTACT_ID_PROPERTY: "client_id_number",
  CENTRALREACH_BASE_URL: "https://partners-api.centralreach.com/enterprise/v1",
  CR_TOKEN_URL: "https://login.centralreach.com/connect/token",
  MAPPING_CSV_PATH: path.join(
    __dirname,
    "..",
    "field_mapping_doc",
    "USE - hubspot central reach mvp mapping sheet - case_client_mapping (1).csv"
  ),
};

function env(name) {
  if (process.env[name]) {
    return process.env[name];
  }
  return DEFAULTS[name];
}

function requiredEnv(name) {
  const value = env(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function loadConfig() {
  return {
    hubspot: {
      token: requiredEnv("HUBSPOT_PRIVATE_APP_TOKEN"),
      baseUrl: env("HUBSPOT_BASE_URL"),
      pipelineId: env("HUBSPOT_CLIENT_PIPELINE_ID"),
      intakeCompleteStageId: env("HUBSPOT_INTAKE_COMPLETE_STAGE_ID"),
      crContactIdProperty: env("HUBSPOT_CR_CONTACT_ID_PROPERTY"),
    },
    centralReach: {
      baseUrl: env("CENTRALREACH_BASE_URL"),
      tokenUrl: env("CR_TOKEN_URL"),
      clientId: requiredEnv("CR_CLIENT_ID"),
      clientSecret: requiredEnv("CR_CLIENT_SECRET"),
      apiKey: requiredEnv("CR_API_KEY"),
    },
    mappingCsvPath: env("MAPPING_CSV_PATH"),
  };
}

module.exports = {
  loadConfig,
};
