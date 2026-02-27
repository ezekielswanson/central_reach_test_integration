const { parseMappingCsv } = require("../mapping/csv-loader");
const { transformDealContextToCrPayload } = require("../mapping/transformer");
const { createHubSpotClient } = require("../clients/hubspot-client");
const { createCentralReachClient } = require("../clients/centralreach-client");
const { info, error } = require("../utils/logger");

function pickFirst(source, keys) {
  if (!source || typeof source !== "object") return null;
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
      return source[key];
    }
  }
  return null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function extractPayorList(raw) {
  if (Array.isArray(raw)) return raw;

  const directCollections = [
    raw?.resource,
    raw?.payors,
    raw?.contactPayors,
    raw?.items,
    raw?.data,
  ];
  for (const collection of directCollections) {
    if (Array.isArray(collection)) return collection;
  }

  const contact = raw?.contact || {};
  const primary = asArray(contact.primaryPayors).map((payor) => ({
    ...payor,
    sourceRole: "primary",
  }));
  const secondary = asArray(contact.secondaryPayors).map((payor) => ({
    ...payor,
    sourceRole: "secondary",
  }));
  return [...primary, ...secondary];
}

function extractAuthorizationList(raw) {
  if (Array.isArray(raw)) return raw;
  const collections = [raw?.resource, raw?.authorizations, raw?.items, raw?.data];
  for (const collection of collections) {
    if (Array.isArray(collection)) return collection;
  }
  return [];
}

function extractAcceptedInsuranceCompanies(raw) {
  if (Array.isArray(raw)) return raw;
  const collections = [raw?.acceptedInsurances, raw?.resource, raw?.items, raw?.data];
  for (const collection of collections) {
    if (Array.isArray(collection)) return collection;
  }
  return [];
}

function normalizeForMatch(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function flattenAcceptedInsurancePlans(raw) {
  return extractAcceptedInsuranceCompanies(raw).flatMap((company) => {
    const plans = asArray(company?.plans || company?.insurancePlans);
    return plans.map((plan) => ({
      companyId: pickFirst(company, ["companyId", "id", "payorId"]),
      companyName: pickFirst(company, ["companyName", "name"]),
      planId: pickFirst(plan, ["planId", "insurancePlanId", "id"]),
      planName: pickFirst(plan, ["planName", "name"]),
      insurancePlanId: pickFirst(plan, ["insurancePlanId", "planId", "id"]),
    }));
  });
}

function resolveAcceptedInsuranceIdsForPayor(payor, acceptedInsurancesRaw) {
  if (!payor) {
    return {
      resolvedCompanyId: null,
      resolvedPlanId: null,
      matchType: "no_payor",
      warnings: ["no_payor_selected"],
    };
  }

  const insurance = payor?.insurance || {};
  const payorCompanyName =
    pickFirst(insurance, ["companyName", "insuranceCompanyName"]) ||
    pickFirst(payor, ["companyName", "insuranceCompanyName", "payorName"]);
  const payorPlanName =
    pickFirst(insurance, ["planName", "insurancePlanName", "planNickname"]) ||
    pickFirst(payor, ["planName", "insurancePlanName", "planNickname"]);
  const plans = flattenAcceptedInsurancePlans(acceptedInsurancesRaw);

  const targetCompany = normalizeForMatch(payorCompanyName);
  const targetPlan = normalizeForMatch(payorPlanName);
  const matchedPlans = plans.filter(
    (plan) =>
      normalizeForMatch(plan.companyName) === targetCompany &&
      normalizeForMatch(plan.planName) === targetPlan
  );

  if (matchedPlans.length === 1) {
    return {
      payorCompanyName,
      payorPlanName,
      resolvedCompanyId: matchedPlans[0].companyId || null,
      resolvedPlanId: matchedPlans[0].planId || matchedPlans[0].insurancePlanId || null,
      matchType: "exact_company_and_plan",
      warnings: [],
    };
  }

  if (matchedPlans.length > 1) {
    return {
      payorCompanyName,
      payorPlanName,
      resolvedCompanyId: matchedPlans[0].companyId || null,
      resolvedPlanId: matchedPlans[0].planId || matchedPlans[0].insurancePlanId || null,
      matchType: "ambiguous_multiple_matches",
      warnings: ["multiple_accepted_insurance_matches_found"],
    };
  }

  const companyOnlyMatches = plans.filter(
    (plan) => normalizeForMatch(plan.companyName) === targetCompany
  );
  if (companyOnlyMatches.length === 1) {
    return {
      payorCompanyName,
      payorPlanName,
      resolvedCompanyId: companyOnlyMatches[0].companyId || null,
      resolvedPlanId: companyOnlyMatches[0].planId || companyOnlyMatches[0].insurancePlanId || null,
      matchType: "company_only_single_plan",
      warnings: ["plan_name_not_exactly_matched"],
    };
  }

  return {
    payorCompanyName,
    payorPlanName,
    resolvedCompanyId: null,
    resolvedPlanId: null,
    matchType: "no_match",
    warnings: ["no_accepted_insurance_match_found"],
  };
}

function toPayorId(payor) {
  return String(
    pickFirst(payor, ["payorId", "id", "resourceId", "contactPayorId", "insuranceId"]) || ""
  );
}

function isInsurancePayor(payor) {
  const payorType = String(
    pickFirst(payor, ["payorType", "type", "paymentType", "kind", "category"]) || ""
  ).toLowerCase();
  return !payorType || payorType.includes("insurance");
}

function isActivePayor(payor) {
  if (typeof payor?.isActive === "boolean") return payor.isActive;
  if (typeof payor?.archived === "boolean") return !payor.archived;
  const status = String(pickFirst(payor, ["status", "state"]) || "").toLowerCase();
  if (!status) return true;
  if (status.includes("current") || status.includes("active")) return true;
  if (status.includes("past") || status.includes("inactive") || status.includes("archived")) return false;
  return true;
}

function selectPayorForScreens(payors, options = {}) {
  const requestedPayorId = options.payorId ? String(options.payorId) : null;
  if (requestedPayorId) {
    const matched = payors.find((payor) => toPayorId(payor) === requestedPayorId);
    if (matched) {
      return { payor: matched, selectionReason: "requested_payor_id" };
    }
  }

  const insurancePayors = payors.filter(isInsurancePayor);
  const activeInsurancePayors = insurancePayors.filter(isActivePayor);
  const activePool = activeInsurancePayors.length > 0 ? activeInsurancePayors : insurancePayors;
  const rankedPool = activePool.length > 0 ? activePool : payors;
  if (rankedPool.length === 0) {
    return { payor: null, selectionReason: "no_payors_found" };
  }

  const primary =
    rankedPool.find((payor) => String(payor?.sourceRole || "").toLowerCase() === "primary") ||
    rankedPool.find((payor) =>
      String(pickFirst(payor, ["payorResponsibility", "responsibility"]) || "")
        .toLowerCase()
        .includes("primary")
    );

  if (primary) {
    return { payor: primary, selectionReason: "primary_or_first_active_insurance" };
  }

  return { payor: rankedPool[0], selectionReason: "first_available_insurance" };
}

function emptySlots() {
  return {
    overview: {},
    insurance: {},
    subscriber: {},
    patient: {},
  };
}

function buildInsuranceScreenSlots(payor) {
  if (!payor) return emptySlots();

  const insurance = payor?.insurance || {};
  const subscriber = insurance?.subscriberInfo || {};
  const patient = insurance?.patientInfo || {};

  const insuredId = pickFirst(subscriber, ["subscriberId", "insuredId"]) ||
    pickFirst(payor, ["subscriberId", "insuredId", "insuranceIdNumber", "policyNumber"]);

  const payorTypeRaw = pickFirst(payor, ["payorType", "type", "paymentType"]);
  const payorType = Number(payorTypeRaw) === 1 ? "PrimaryInsurance" : payorTypeRaw;
  return {
    overview: {
      payorType,
      nickname: pickFirst(payor, ["payorNickName", "payorNickname", "planNickname", "nickname"]),
      notes: pickFirst(payor, ["notes", "note"]),
      linkedFile: pickFirst(payor, ["fileName", "fileLink", "linkedFile"]),
    },
    insurance: {
      payor: pickFirst(insurance, ["companyName", "insuranceCompanyName"]) ||
        pickFirst(payor, ["insuranceCompanyName", "payorName", "insuranceName", "companyName"]),
      plan: pickFirst(insurance, ["planName", "planNickname"]) ||
        pickFirst(payor, ["planName", "insurancePlanName", "planNickname"]),
      payorResponsibility: pickFirst(payor, ["payorResponsibility", "responsibility", "payorType"]),
      coPayType: pickFirst(insurance, ["coPayType", "copayType", "copayAmountType"]) ||
        pickFirst(payor, ["coPayType", "copayType", "copayAmountType"]),
      coPayAmount: pickFirst(insurance, ["coPayAmount", "copayAmount"]) ||
        pickFirst(payor, ["coPayAmount", "copayAmount"]),
      coPayFrequency: pickFirst(insurance, ["coPayFrequency", "copayFrequency"]) ||
        pickFirst(payor, ["coPayFrequency", "copayFrequency"]),
      coverageStartDate: pickFirst(insurance, ["coverageStartDate", "coverageFrom"]) ||
        pickFirst(payor, ["coverageStartDate", "coverageFrom"]),
      coverageEndDate: pickFirst(insurance, ["coverageEndDate", "coverageTo"]) ||
        pickFirst(payor, ["coverageEndDate", "coverageTo"]),
      insuranceContactPhone: pickFirst(insurance, ["insuranceContactPhone", "contactPhone", "insurancePhone"]) ||
        pickFirst(payor, ["insuranceContactPhone", "contactPhone", "insurancePhone"]),
      insuranceContactPerson: pickFirst(insurance, ["insuranceContactPerson", "contactName"]) ||
        pickFirst(payor, ["insuranceContactPerson", "contactName"]),
      status: Number(insurance?.status) === 2 || !isActivePayor(payor) ? "past_insurance" : "current_insurance",
    },
    subscriber: {
      firstName: pickFirst(subscriber, ["firstName", "subscriberFirstName"]) ||
        pickFirst(payor, ["subscriberFirstName", "firstName"]),
      middleInitial: pickFirst(subscriber, ["middleInitial", "subscriberMiddleInitial"]) ||
        pickFirst(payor, ["subscriberMiddleInitial", "middleInitial"]),
      lastName: pickFirst(subscriber, ["lastName", "subscriberLastName"]) ||
        pickFirst(payor, ["subscriberLastName", "lastName"]),
      birthDate: pickFirst(subscriber, ["birthDate", "subscriberBirthDate"]) ||
        pickFirst(payor, ["subscriberBirthDate", "birthDate"]),
      gender: pickFirst(subscriber, ["gender", "subscriberGender"]) ||
        pickFirst(payor, ["subscriberGender", "gender"]),
      ssn: pickFirst(subscriber, ["ssn", "subscriberSsn"]) || pickFirst(payor, ["subscriberSsn", "ssn"]),
      policyNumber: pickFirst(payor, ["policyNumber", "groupNumber"]) || pickFirst(subscriber, ["subscriberId"]),
      groupName: pickFirst(insurance, ["groupName"]) || pickFirst(payor, ["groupName"]),
      insuredId,
      address: pickFirst(subscriber, ["address", "subscriberAddress"]) ||
        pickFirst(payor, ["subscriberAddress", "addressLine1"]),
      addressLine2: pickFirst(subscriber, ["addressLine2", "subscriberAddressLine2"]) ||
        pickFirst(payor, ["subscriberAddressLine2", "addressLine2"]),
      city: pickFirst(subscriber, ["city", "subscriberCity"]) || pickFirst(payor, ["subscriberCity", "city"]),
      state: pickFirst(subscriber, ["state", "subscriberState"]) ||
        pickFirst(payor, ["subscriberState", "stateProvince"]),
      zip: pickFirst(subscriber, ["zip", "subscriberZip"]) || pickFirst(payor, ["subscriberZip", "zipPostalCode"]),
    },
    patient: {
      firstName: pickFirst(patient, ["firstName", "patientFirstName"]) ||
        pickFirst(payor, ["patientFirstName", "clientFirstName"]),
      middleInitial: pickFirst(patient, ["middleInitial", "patientMiddleInitial"]) ||
        pickFirst(payor, ["patientMiddleInitial", "clientMiddleInitial"]),
      lastName: pickFirst(patient, ["lastName", "patientLastName"]) ||
        pickFirst(payor, ["patientLastName", "clientLastName"]),
      relationType: pickFirst(patient, ["relationType", "relationshipToSubscriber"]) ||
        pickFirst(payor, ["relationType", "patientRelationType", "relationshipToSubscriber"]),
      insuredId: pickFirst(patient, ["subscriberId", "insuredId", "patientInsuredId"]) ||
        pickFirst(payor, ["patientInsuredId", "insuredId", "subscriberId"]),
      gender: pickFirst(patient, ["gender", "patientGender"]) || pickFirst(payor, ["patientGender", "clientGender"]),
      birthDate: pickFirst(patient, ["birthDate", "patientBirthDate"]) ||
        pickFirst(payor, ["patientBirthDate", "clientBirthDate"]),
      address: pickFirst(patient, ["address", "patientAddress"]) ||
        pickFirst(payor, ["patientAddress", "subscriberAddress", "addressLine1"]),
      addressLine2: pickFirst(patient, ["addressLine2", "patientAddressLine2"]) ||
        pickFirst(payor, ["patientAddressLine2", "subscriberAddressLine2", "addressLine2"]),
      city: pickFirst(patient, ["city", "patientCity"]) || pickFirst(payor, ["patientCity", "subscriberCity", "city"]),
      state: pickFirst(patient, ["state", "patientState"]) ||
        pickFirst(payor, ["patientState", "subscriberState", "stateProvince"]),
      zip: pickFirst(patient, ["zip", "patientZip"]) || pickFirst(payor, ["patientZip", "subscriberZip", "zipPostalCode"]),
    },
  };
}

function normalizeAuthorizations(authorizationsRaw) {
  return extractAuthorizationList(authorizationsRaw).map((authorization) => {
    const globalSettings =
      authorization?.globalAuthorizationlSettings || authorization?.globalAuthorizationSettings || {};
    return {
      authorizationId: pickFirst(authorization, ["resourceId", "authorizationId", "id"]),
      authorizationNumber: pickFirst(authorization, [
        "authorizationNumber",
        "authNumber",
        "referenceIdentification",
      ]),
      name: pickFirst(authorization, ["name", "description"]),
      startDate: pickFirst(globalSettings, ["authStartDate", "startDate"]),
      endDate: pickFirst(globalSettings, ["authEndDate", "endDate"]),
      frequency: pickFirst(globalSettings, ["authFrequency", "acceptedFrequency"]),
      status: pickFirst(authorization, ["status", "result"]),
      payorId: pickFirst(globalSettings, ["globalPayorId"]),
      limits: {
        authUnits: pickFirst(globalSettings, ["authUnits", "authTotalUnits"]),
        authHours: pickFirst(globalSettings, ["authHours", "authTotalHours"]),
        authVisits: pickFirst(globalSettings, ["authVisits", "authTotalVisits"]),
        authAmount: pickFirst(globalSettings, ["authAmount", "authTotalAmount"]),
      },
    };
  });
}

function createHsToCrSync(config) {
  const mappingRows = parseMappingCsv(config.mappingCsvPath);
  const hubspot = createHubSpotClient(config.hubspot);
  const centralReach = createCentralReachClient(config.centralReach);

  function isIntakeComplete(dealContext) {
    return (
      String(dealContext.dealProperties.pipeline) === String(config.hubspot.pipelineId) &&
      String(dealContext.dealProperties.dealstage) === String(config.hubspot.intakeCompleteStageId)
    );
  }

  async function processDeal(dealId) {
    try {
      const dealContext = await hubspot.fetchDealContext(dealId, mappingRows);
      if (!isIntakeComplete(dealContext)) {
        return {
          dealId: String(dealId),
          status: "skipped",
          reason: "deal is not in Intake Complete stage",
        };
      }

      const { crPayload, transformTrace } = transformDealContextToCrPayload(dealContext, mappingRows);
      const upsert = await centralReach.upsertCentralReachClient(dealContext, crPayload);

      if (upsert.operation !== "noop") {
        await hubspot.writeBackToHubSpot(dealId, upsert.crContactId);
      }

      info("HubSpot -> CentralReach processed", {
        dealId: String(dealId),
        crContactId: upsert.crContactId,
        operation: upsert.operation,
        transformFields: transformTrace.map((entry) => entry.targetField),
      });

      return {
        dealId: String(dealId),
        crContactId: upsert.crContactId,
        operation: upsert.operation,
        transformTrace,
      };
    } catch (err) {
      error("HubSpot -> CentralReach processDeal failed", {
        dealId: String(dealId),
        message: err?.message || "unknown_error",
        code: err?.code || err?.response?.status || null,
      });
      throw err;
    }
  }

  async function processIntakeQueue({ limit = 50, onProcessed } = {}) {
    const candidates = await hubspot.searchIntakeCompleteDeals(limit);
    const results = [];

    for (const candidate of candidates) {
      if (!hubspot.needsSyncByModifiedDate(candidate)) {
        continue;
      }
      const dealId = candidate.id || candidate.properties?.hs_object_id;
      const result = await processDeal(dealId);
      results.push(result);
      if (typeof onProcessed === "function") {
        onProcessed(result, candidate);
      }
    }

    return results;
  }

  async function getClientInsuranceAndAuthorizations(contactId, options = {}) {
    const normalizedContactId = String(contactId || "").trim();
    if (!normalizedContactId) {
      throw new Error("contactId is required to retrieve insurance and authorizations.");
    }

    const [clientPayors, clientAuthorizations, acceptedInsurances] = await Promise.all([
      centralReach.getClientPayors(normalizedContactId),
      centralReach.getClientAuthorizations(normalizedContactId),
      centralReach.getAcceptedInsurances(),
    ]);

    const payors = extractPayorList(clientPayors);
    const selection = selectPayorForScreens(payors, options);
    const selectedPayor = selection.payor;
    const selectedPayorId = selectedPayor ? toPayorId(selectedPayor) : null;

    let selectedPayorDetail = null;
    if (selectedPayorId) {
      try {
        selectedPayorDetail = await centralReach.getClientPayorById(normalizedContactId, selectedPayorId);
      } catch (err) {
        info("Unable to fetch payor detail, using list payload only", {
          contactId: normalizedContactId,
          payorId: selectedPayorId,
          status: err?.response?.status || null,
          code: err?.code || null,
        });
      }
    }

    const detailCandidate =
      selectedPayorDetail?.resource ||
      selectedPayorDetail?.payor ||
      selectedPayorDetail?.contactPayor ||
      selectedPayorDetail;
    const normalizedSlots = buildInsuranceScreenSlots(
      detailCandidate && typeof detailCandidate === "object" ? { ...selectedPayor, ...detailCandidate } : selectedPayor
    );
    const selectedPayorForResolution =
      detailCandidate && typeof detailCandidate === "object"
        ? { ...selectedPayor, ...detailCandidate }
        : selectedPayor;
    const acceptedInsuranceResolution = resolveAcceptedInsuranceIdsForPayor(
      selectedPayorForResolution,
      acceptedInsurances
    );

    return {
      raw: {
        clientPayors,
        clientAuthorizations,
        selectedPayorDetail,
        acceptedInsurances,
      },
      normalized: {
        payorMeta: {
          selectedPayorId: selectedPayorId || null,
          isActive: selectedPayor ? isActivePayor(selectedPayor) : null,
          selectionReason: selection.selectionReason,
        },
        slots: normalizedSlots,
        authorizations: normalizeAuthorizations(clientAuthorizations),
        acceptedInsuranceIds: acceptedInsuranceResolution,
      },
    };
  }

  return {
    processDeal,
    processIntakeQueue,
    getClientInsuranceAndAuthorizations,
  };
}

module.exports = {
  createHsToCrSync,
};
