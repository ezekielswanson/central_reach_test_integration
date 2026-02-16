async function fetchAuthorizationsFromCentralReach(crContactId) {
  void crContactId;
  throw new Error("TODO: Implement CR -> HS authorization fetch once mapping and destination object are confirmed.");
}

async function mapAuthorizationsToHubSpotProperties(authPayload) {
  void authPayload;
  throw new Error("TODO: Implement CR authorization -> HubSpot field mapping after requirements are finalized.");
}

async function upsertHubSpotAuthorizationFields(hsRecordId, mappedProps) {
  void hsRecordId;
  void mappedProps;
  throw new Error("TODO: Implement HubSpot authorization writeback once CR -> HS scope is approved.");
}

module.exports = {
  fetchAuthorizationsFromCentralReach,
  mapAuthorizationsToHubSpotProperties,
  upsertHubSpotAuthorizationFields,
};
