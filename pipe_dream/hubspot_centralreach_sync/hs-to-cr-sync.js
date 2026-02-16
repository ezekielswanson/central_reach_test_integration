import axios from "axios";

const HUBSPOT_BASE_URL = "https://api.hubapi.com";
const CR_TOKEN_URL = "https://login.centralreach.com/connect/token";
const CR_BASE_URL = "https://partners-api.centralreach.com/enterprise/v1";

function safeLog(message, meta = {}) {
  console.log(JSON.stringify({ message, timestamp: new Date().toISOString(), ...meta }));
}

function toErrorMeta(error) {
  return {
    errorMessage: error?.response?.data?.message || error?.message || "unknown_error",
    errorCode: error?.code || error?.response?.status || "unknown",
    httpStatus: error?.response?.status || null,
  };
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D+/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  if (digits.length === 10) {
    return digits;
  }
  return null;
}

function cleanEmail(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || null;
}

function toCrClientPayload(payload) {
  return {
    ContactForm: payload.ContactForm,
    FirstName: payload.FirstName,
    LastName: payload.LastName,
    DateOfBirth: payload.DateOfBirth,
    Gender: payload.Gender,
    PrimaryEmail: payload.PrimaryEmail,
    PhoneCell: payload.PhoneCell,
    AddressLine1: payload.AddressLine1,
    AddressLine2: payload.AddressLine2,
    City: payload.City,
    StateProvince: payload.StateProvince,
    ZipPostalCode: payload.ZipPostalCode,
    GuardianFirstName: payload.GuardianFirstName,
    GuardianLastName: payload.GuardianLastName,
    ExternalSystemId: payload.ExternalSystemId,
  };
}

function isValidEmail(value) {
  if (!value) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function mapGender(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "male") return "Male";
  if (normalized === "female") return "Female";
  return null;
}

function toIsoMidnight(value) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
  }
  return null;
}

export async function getCrToken(auth) {
  const response = await axios.post(
    auth.cr_token_url || CR_TOKEN_URL,
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: auth.cr_client_id,
      client_secret: auth.cr_client_secret,
      scope: "cr-api",
    }).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return response.data.access_token;
}

export async function fetchDealAndContact({ hubspotToken, dealId, mappingProperties }) {
  const dealResponse = await axios.get(`${HUBSPOT_BASE_URL}/crm/v3/objects/deals/${dealId}`, {
    headers: { Authorization: `Bearer ${hubspotToken}` },
    params: {
      properties: mappingProperties.deal.join(","),
    },
  });

  const deal = dealResponse.data;
  // Deal-only mapping contract: do not hydrate associated contacts.
  return { deal, contact: null };
}

export function transformToCrPayload({ deal, contact }) {
  void contact;
  const dealProps = deal.properties || {};
  const cleanedDealEmail = cleanEmail(dealProps.email);

  const payload = {
    ContactForm: "Public Client Intake Form",
    ExternalSystemId: String(deal.id || dealProps.hs_object_id),
    FirstName: dealProps.phi_first_name__cloned_,
    LastName: dealProps.phi_last_name,
    DateOfBirth: toIsoMidnight(dealProps.phi_date_of_birth),
    Gender: mapGender(dealProps.phi_gender),
    // Per mapping decision, use deal-level email/phone as authoritative source.
    PrimaryEmail: isValidEmail(cleanedDealEmail) ? cleanedDealEmail : null,
    PhoneCell: normalizePhone(dealProps.phone),
    AddressLine1:
      dealProps.if_services_will_be_in_more_than_one_location__list_the_other_addres || dealProps.street_address,
    AddressLine2: dealProps.home_apt,
    City: dealProps.location_city,
    StateProvince: dealProps.location_central_reach || dealProps.location,
    ZipPostalCode: dealProps.postal_code,
    GuardianFirstName: dealProps.guardian_first_name,
    GuardianLastName: dealProps.guardian_last_name,
  };

  if (!payload.FirstName || !payload.LastName) {
    const missingRequired = [];
    if (!payload.FirstName) missingRequired.push("phi_first_name__cloned_");
    if (!payload.LastName) missingRequired.push("phi_last_name");
    throw new Error(`Missing required Deal field(s): ${missingRequired.join(", ")}`);
  }
  return payload;
}

export async function upsertCrAndWriteback({
  hubspotToken,
  crAuth,
  dealId,
  hsCrContactIdProperty = "client_id_number",
  payload,
}) {
  try {
    const token = await getCrToken(crAuth);
    const headers = {
      "x-api-key": crAuth.cr_api_key,
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };

    const hsDealResponse = await axios.get(`${HUBSPOT_BASE_URL}/crm/v3/objects/deals/${dealId}`, {
      headers: { Authorization: `Bearer ${hubspotToken}` },
      params: { properties: hsCrContactIdProperty },
    });
    const existingContactId = hsDealResponse.data?.properties?.[hsCrContactIdProperty];

    let operation = "create";
    let crContactId = null;

    if (existingContactId) {
      await axios.put(
        `${CR_BASE_URL}/contacts/client/${existingContactId}`,
        toCrClientPayload(payload),
        { headers }
      );
      operation = "update";
      crContactId = String(existingContactId);
    } else {
      let existingByExternal = null;
      try {
        const lookup = await axios.get(`${CR_BASE_URL}/contacts/client/byExternalSystemId`, {
          headers,
          params: { externalSystemId: payload.ExternalSystemId },
        });
        existingByExternal = lookup.data?.contact || lookup.data;
      } catch (err) {
        if (err.response?.status !== 404) throw err;
      }

      if (existingByExternal?.contactId) {
        await axios.put(
          `${CR_BASE_URL}/contacts/client/${existingByExternal.contactId}`,
          toCrClientPayload(payload),
          { headers }
        );
        operation = "update";
        crContactId = String(existingByExternal.contactId);
      } else {
        const created = await axios.post(
          `${CR_BASE_URL}/contacts/client`,
          toCrClientPayload(payload),
          { headers }
        );
        crContactId = String(created.data?.contact?.contactId || created.data?.contactId || created.data?.id);
        operation = "create";
      }
    }

    await axios.patch(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/deals/${dealId}`,
      {
        properties: {
          [hsCrContactIdProperty]: String(crContactId),
          updated_by_integration: true,
          integration_last_write: new Date().toISOString(),
        },
      },
      { headers: { Authorization: `Bearer ${hubspotToken}` } }
    );

    safeLog("HS->CR sync complete", { dealId: String(dealId), crContactId, operation });
    return { crContactId, operation };
  } catch (error) {
    safeLog("HS->CR sync failed", { dealId: String(dealId), ...toErrorMeta(error) });
    throw error;
  }
}
