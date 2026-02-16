function digitsOnly(value) {
  return String(value || "").replace(/\D+/g, "");
}

function toIsoMidnight(value) {
  if (!value) {
    return null;
  }
  const asDate = new Date(value);
  if (!Number.isNaN(asDate.getTime())) {
    const yyyy = asDate.getUTCFullYear();
    const mm = String(asDate.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(asDate.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
  }

  const match = String(value).match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) {
    return null;
  }
  const [, month, day, year] = match;
  return `${year}-${month}-${day}T00:00:00.000Z`;
}

function normalizeGender(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) {
    return null;
  }
  if (value === "male") {
    return "Male";
  }
  if (value === "female") {
    return "Female";
  }
  return null;
}

function normalizePhone(raw) {
  const digits = digitsOnly(raw);
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  if (digits.length === 10) {
    return digits;
  }
  return null;
}

function cleanEmail(raw) {
  const normalized = String(raw || "").trim().toLowerCase();
  return normalized || null;
}

function isValidEmail(raw) {
  if (!raw) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
}

function evaluateConditionalFlag(flag, context) {
  const normalized = String(flag || "").trim();
  if (!normalized) {
    return true;
  }
  if (normalized === "ADDR_WRITE_SYSTEM_IF_NO_OTHER_ADDRESS") {
    const primary = context.dealProperties.street_address;
    const alternate = context.dealProperties.if_services_will_be_in_more_than_one_location__list_the_other_addres;
    return !(primary && alternate);
  }
  return true;
}

function getFieldValue(rawKey, dealContext) {
  const key = String(rawKey || "").trim();
  if (!key) {
    return null;
  }
  if (dealContext.dealProperties[key] !== undefined) {
    return dealContext.dealProperties[key];
  }
  return null;
}

function firstDefined(values) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") {
      return value;
    }
  }
  return null;
}

function setIfValue(target, key, value) {
  if (value !== null && value !== undefined && value !== "") {
    target[key] = value;
    return true;
  }
  return false;
}

function mapRowToPayload(row, dealContext, payload, trace) {
  const source = row.hubspot_internal_value;
  const rule = row.transformation_rule;
  const rowId = row.rowNumber;
  const addTrace = (fieldKey) => {
    trace.push({
      rowNumber: rowId,
      sourceKey: source,
      targetField: fieldKey,
    });
  };

  if (source === "hs_object_id") {
    if (setIfValue(payload, "ExternalSystemId", String(dealContext.dealId))) {
      addTrace("ExternalSystemId");
    }
    return;
  }

  if (source === "phi_date_of_birth") {
    const dob = toIsoMidnight(getFieldValue(source, dealContext));
    if (setIfValue(payload, "DateOfBirth", dob)) {
      addTrace("DateOfBirth");
    }
    return;
  }

  if (source === "phi_gender") {
    const gender = normalizeGender(getFieldValue(source, dealContext));
    if (setIfValue(payload, "Gender", gender)) {
      addTrace("Gender");
    }
    return;
  }

  if (String(source).includes("firsname + lastname") || String(rule).includes("concat(firstname, lastname)")) {
    const firstName = dealContext.dealProperties.phi_first_name__cloned_;
    const lastName = dealContext.dealProperties.phi_last_name;
    if (setIfValue(payload, "FirstName", firstName)) {
      addTrace("FirstName");
    }
    if (setIfValue(payload, "LastName", lastName)) {
      addTrace("LastName");
    }
    return;
  }

  if (String(source).includes("guardian_first_name + guardian_last_name")) {
    const guardianFirstName = dealContext.dealProperties.guardian_first_name;
    const guardianLastName = dealContext.dealProperties.guardian_last_name;
    if (setIfValue(payload, "GuardianFirstName", guardianFirstName)) {
      addTrace("GuardianFirstName");
    }
    if (setIfValue(payload, "GuardianLastName", guardianLastName)) {
      addTrace("GuardianLastName");
    }
    return;
  }

  if (source === "email") {
    // Align with Pipedream mapping: use deal-level email as authoritative source.
    const email = cleanEmail(dealContext.dealProperties.email);
    if (isValidEmail(email) && setIfValue(payload, "PrimaryEmail", email)) {
      addTrace("PrimaryEmail");
    }
    return;
  }

  if (source === "phone") {
    // Align with Pipedream mapping: use deal-level phone as authoritative source.
    const phone = normalizePhone(dealContext.dealProperties.phone);
    if (setIfValue(payload, "PhoneCell", phone)) {
      addTrace("PhoneCell");
    }
    return;
  }

  const sourceValue = getFieldValue(source, dealContext);
  const fallbackMap = {
    if_services_will_be_in_more_than_one_location__list_the_other_addres: "AddressLine1",
    street_address: "AddressLine1",
    home_apt: "AddressLine2",
    location_city: "City",
    location_central_reach: "StateProvince",
    location: "StateProvince",
    postal_code: "ZipPostalCode",
  };
  const targetField = fallbackMap[source];
  if (targetField && setIfValue(payload, targetField, sourceValue)) {
    addTrace(targetField);
  }
}

function transformDealContextToCrPayload(dealContext, mappingRows) {
  const payload = {
    ContactForm: "Public Client Intake Form",
  };
  const transformTrace = [];

  for (const row of mappingRows) {
    if (!evaluateConditionalFlag(row.conditional_flag, dealContext)) {
      continue;
    }
    mapRowToPayload(row, dealContext, payload, transformTrace);
  }

  const missingRequired = [];
  if (!payload.FirstName) {
    missingRequired.push("phi_first_name__cloned_");
  }
  if (!payload.LastName) {
    missingRequired.push("phi_last_name");
  }
  if (missingRequired.length > 0) {
    throw new Error(
      `CentralReach requires FirstName and LastName. Missing required Deal field(s): ${missingRequired.join(", ")}.`
    );
  }

  return {
    crPayload: payload,
    transformTrace,
  };
}

module.exports = {
  transformDealContextToCrPayload,
  normalizePhone,
  normalizeGender,
  toIsoMidnight,
};
