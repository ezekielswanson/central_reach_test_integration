const axios = require("axios");
const { withRetry } = require("../utils/retry");
const { info, warn } = require("../utils/logger");
const { stableHash } = require("../utils/hash");

function toClientPayload(crPayload) {
  return {
    ContactForm: crPayload.ContactForm,
    FirstName: crPayload.FirstName,
    LastName: crPayload.LastName,
    DateOfBirth: crPayload.DateOfBirth,
    Gender: crPayload.Gender,
    PrimaryEmail: crPayload.PrimaryEmail,
    PhoneCell: crPayload.PhoneCell,
    AddressLine1: crPayload.AddressLine1,
    AddressLine2: crPayload.AddressLine2,
    City: crPayload.City,
    StateProvince: crPayload.StateProvince,
    ZipPostalCode: crPayload.ZipPostalCode,
    GuardianFirstName: crPayload.GuardianFirstName,
    GuardianLastName: crPayload.GuardianLastName,
    ExternalSystemId: crPayload.ExternalSystemId,
  };
}

function toComparableShape(crPayload) {
  return {
    externalSystemId: crPayload.ExternalSystemId || null,
    firstName: crPayload.FirstName || null,
    lastName: crPayload.LastName || null,
    dateOfBirth: crPayload.DateOfBirth || null,
    gender: crPayload.Gender || null,
    primaryEmail: crPayload.PrimaryEmail || null,
    phoneCell: crPayload.PhoneCell || null,
    addressLine1: crPayload.AddressLine1 || null,
    addressLine2: crPayload.AddressLine2 || null,
    city: crPayload.City || null,
    stateProvince: crPayload.StateProvince || null,
    zipPostalCode: crPayload.ZipPostalCode || null,
    guardianFirstName: crPayload.GuardianFirstName || null,
    guardianLastName: crPayload.GuardianLastName || null,
  };
}

function normalizeExistingContact(existingContact) {
  if (!existingContact) {
    return {};
  }
  return {
    externalSystemId: existingContact.externalSystemId || null,
    firstName: existingContact.firstName || null,
    lastName: existingContact.lastName || null,
    dateOfBirth: existingContact.dateOfBirth || null,
    gender: existingContact.gender || null,
    primaryEmail: existingContact.primaryEmail || null,
    phoneCell: existingContact.phoneCell || null,
    addressLine1: existingContact.addressLine1 || null,
    addressLine2: existingContact.addressLine2 || null,
    city: existingContact.city || null,
    stateProvince: existingContact.stateProvince || null,
    zipPostalCode: existingContact.zipPostalCode || null,
    guardianFirstName: existingContact.guardianFirstName || null,
    guardianLastName: existingContact.guardianLastName || null,
  };
}

function createCentralReachClient(config) {
  const tokenClient = axios.create({
    timeout: 30000,
  });
  const apiClient = axios.create({
    baseURL: config.baseUrl,
    timeout: 30000,
  });
  let authCache = null;

  async function getAccessToken() {
    if (authCache && authCache.expiresAt > Date.now() + 60000) {
      return authCache.token;
    }
    const response = await tokenClient.post(
      config.tokenUrl,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: "cr-api",
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const token = response.data.access_token;
    const expiresIn = Number(response.data.expires_in || 3600);
    authCache = {
      token,
      expiresAt: Date.now() + expiresIn * 1000,
    };
    return token;
  }

  async function requestWithRetry(fn, meta) {
    return withRetry(fn, {
      onRetry: ({ attempt, status, delayMs }) =>
        warn("Retrying CentralReach API call", { ...meta, attempt, status, delayMs }),
    });
  }

  async function authHeaders() {
    const token = await getAccessToken();
    return {
      "x-api-key": config.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  async function getClientByContactId(contactId) {
    const response = await requestWithRetry(
      async () =>
        apiClient.get(`/contacts/client/${contactId}`, {
          headers: await authHeaders(),
        }),
      { contactId, operation: "getClientByContactId" }
    );
    return response.data?.contact || response.data;
  }

  async function getClientByExternalSystemId(externalSystemId) {
    try {
      const response = await requestWithRetry(
        async () =>
          apiClient.get("/contacts/client/byExternalSystemId", {
            headers: await authHeaders(),
            params: { externalSystemId },
          }),
        { externalSystemId, operation: "getClientByExternalSystemId" }
      );
      return response.data?.contact || response.data;
    } catch (err) {
      if (err?.response?.status === 404) {
        return null;
      }
      throw err;
    }
  }

  async function updateByContactId(contactId, crPayload) {
    const body = toClientPayload(crPayload);
    const response = await requestWithRetry(
      async () =>
        apiClient.put(`/contacts/client/${contactId}`, body, {
          headers: await authHeaders(),
        }),
      { contactId, operation: "updateByContactId" }
    );
    return response.data;
  }

  async function updateByExternalSystemId(externalSystemId, crPayload) {
    const body = toClientPayload(crPayload);
    const response = await requestWithRetry(
      async () =>
        apiClient.put("/contacts/client/byExternalSystemId", body, {
          headers: await authHeaders(),
          params: { externalSystemId },
        }),
      { externalSystemId, operation: "updateByExternalSystemId" }
    );
    return response.data;
  }

  async function createClient(crPayload) {
    const body = toClientPayload(crPayload);

    const response = await requestWithRetry(
      async () =>
        apiClient.post("/contacts/client", body, {
          headers: await authHeaders(),
        }),
      { operation: "createClient" }
    );
    return response.data;
  }

  async function getClientPayors(contactId) {
    const response = await requestWithRetry(
      async () =>
        apiClient.get(`/contacts/clients/${contactId}/payors`, {
          headers: await authHeaders(),
        }),
      { contactId, operation: "getClientPayors" }
    );
    return response.data;
  }

  async function getClientPayorById(contactId, payorId) {
    const response = await requestWithRetry(
      async () =>
        apiClient.get(`/contacts/clients/${contactId}/payors/${payorId}`, {
          headers: await authHeaders(),
        }),
      { contactId, payorId, operation: "getClientPayorById" }
    );
    return response.data;
  }

  async function getClientAuthorizations(contactId) {
    const response = await requestWithRetry(
      async () =>
        apiClient.get(`/contacts/clients/${contactId}/authorizations`, {
          headers: await authHeaders(),
        }),
      { contactId, operation: "getClientAuthorizations" }
    );
    return response.data;
  }

  async function getAcceptedInsurances() {
    const response = await requestWithRetry(
      async () =>
        apiClient.get("/payors/accepted-insurances", {
          headers: await authHeaders(),
        }),
      { operation: "getAcceptedInsurances" }
    );
    return response.data;
  }

  async function getContactMetadata(contactId) {
    const response = await requestWithRetry(
      async () =>
        apiClient.get(`/contacts/${contactId}/metadata`, {
          headers: await authHeaders(),
        }),
      { contactId, operation: "getContactMetadata" }
    );
    return response.data;
  }

  async function upsertCentralReachClient(dealContext, crPayload) {
    const externalSystemId = String(dealContext.dealId);
    const targetPayload = { ...crPayload, ExternalSystemId: externalSystemId };
    const existingContactId = dealContext.dealProperties?.client_id_number;

    if (existingContactId) {
      const existing = await getClientByContactId(existingContactId);
      const incomingHash = stableHash(toComparableShape(targetPayload));
      const currentHash = stableHash(normalizeExistingContact(existing));
      if (incomingHash === currentHash) {
        return {
          crContactId: String(existingContactId),
          externalSystemId,
          operation: "noop",
        };
      }

      await updateByContactId(existingContactId, targetPayload);
      return {
        crContactId: String(existingContactId),
        externalSystemId,
        operation: "update",
      };
    }

    const existingByExternal = await getClientByExternalSystemId(externalSystemId);
    if (existingByExternal?.contactId) {
      const existingHash = stableHash(normalizeExistingContact(existingByExternal));
      const incomingHash = stableHash(toComparableShape(targetPayload));
      if (existingHash === incomingHash) {
        return {
          crContactId: String(existingByExternal.contactId),
          externalSystemId,
          operation: "noop",
        };
      }
      try {
        await updateByExternalSystemId(externalSystemId, targetPayload);
      } catch (err) {
        // Fallback keeps delivery resilient if tenant update-by-external behavior differs.
        warn("Update by externalSystemId failed, falling back to contactId update", {
          externalSystemId,
          fallbackContactId: String(existingByExternal.contactId),
          status: err?.response?.status || null,
          code: err?.code || null,
        });
        await updateByContactId(existingByExternal.contactId, targetPayload);
      }
      return {
        crContactId: String(existingByExternal.contactId),
        externalSystemId,
        operation: "update",
      };
    }

    const created = await createClient(targetPayload);
    const crContactId = String(created?.contact?.contactId || created?.contactId || created?.id);
    if (!crContactId) {
      throw new Error("CentralReach create succeeded but did not return contactId.");
    }
    info("Created CentralReach client", { dealId: dealContext.dealId, crContactId, externalSystemId });
    return {
      crContactId,
      externalSystemId,
      operation: "create",
    };
  }

  return {
    upsertCentralReachClient,
    getClientByExternalSystemId,
    getClientByContactId,
    getClientPayors,
    getClientPayorById,
    getClientAuthorizations,
    getAcceptedInsurances,
    getContactMetadata,
  };
}

module.exports = {
  createCentralReachClient,
};
