// To use any npm package, just import it
import axios from "axios";
import qs from "qs";

// --- HubSpot Functions ---

const getHubSpotContacts = async (hubspot_token) => {
    // Fetches contacts modified in the last 10 minutes that were not updated by this integration
    const tenMinutesInMs = 10 * 60 * 1000;
    const search_timestamp = Date.now() - tenMinutesInMs;

    const data = JSON.stringify({
        "filterGroups": [{
            "filters": [{
                "propertyName": "lastmodifieddate",
                "operator": "GTE",
                "value": search_timestamp
            }, {
                "propertyName": "updated_by_integration",
                "operator": "NEQ",
                "value": "true"
            }]
        }],
        "limit": 100,
        "properties": [
            "patientid", "firstname", "lastname", "gender", "date_of_birth",
            "address", "address2", "city", "state", "zip", "country", "phone",
            "mobilephone", "email", "deceaseddate", "maritalstatus",
            "referralsourceid", "referralsourceother", "guarantorfirstname",
            "guarantorlastname", "guarantordob", "department_id_lookup",
            "primaryproviderid", "language6392code", "active_departments",
            "other_patient_departments" // Added new field
        ]
    });

    const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.hubapi.com/crm/v3/objects/contacts/search',
        headers: {
            'Content-Type': 'application/json',
            'authorization': `Bearer ${hubspot_token}`
        },
        data: data
    };

    try {
        const response = await axios.request(config);
        console.log(`Found ${response.data.results.length} contacts to process.`);
        return response.data;
    } catch (e) {
        console.error("Error fetching HubSpot contacts:", e.response ? e.response.data : e.message);
        throw e;
    }
};

/**
 * Updates a HubSpot contact with the Athena patientid and/or marks it as processed.
 */
const updateHubSpotContact = async (hubspot_token, hubspot_contact_id, athena_patient_id) => {
    const config = {
        method: 'patch',
        url: `https://api.hubapi.com/crm/v3/objects/contacts/${hubspot_contact_id}`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${hubspot_token}`
        },
        data: {
            properties: {
                // Only update patientid if a new one is provided
                ...(athena_patient_id && { "patientid": athena_patient_id }),
                "updated_by_integration": "true" // Mark as updated to prevent sync loops
            }
        }
    };
    try {
        await axios.request(config);
        console.log(`Successfully updated HubSpot Contact ${hubspot_contact_id}.`);
    } catch (error) {
        console.error(`Failed to update HubSpot Contact ${hubspot_contact_id}:`, error.response ? error.response.data : error.message);
        // Non-critical error, log but don't stop the workflow
    }
};


// --- Data Preparation & Helpers ---

const formatDateForAthena = (dateString) => {
    if (!dateString) return undefined;
    try {
        const date = new Date(dateString);
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = date.getUTCDate().toString().padStart(2, '0');
        const year = date.getUTCFullYear();
        return `${month}/${day}/${year}`;
    } catch (e) {
        console.warn(`Could not parse date: ${dateString}`);
        return undefined;
    }
};

const mapMaritalStatus = (status) => {
    if (!status) return undefined;
    const statusMap = {
        'Single': 'S', 'Married': 'M', 'Divorced': 'D', 'Widowed': 'W',
        'Separated': 'X', 'Partner': 'P', 'Unknown': 'U',
    };
    return statusMap[status] || 'U';
};

/**
 * Prepares HubSpot contact data for Athena API calls.
 */
const prepareForAthena = (hubspotContacts) => {
    const patientsToCreate = [];
    const patientsToUpdate = [];

    for (const contact of hubspotContacts) {
        const props = contact.properties;

        // Use a Set to automatically handle de-duplication
        const departmentIdSet = new Set();

        // 1. Process the multi-department field 'active_departments'
        if (props.active_departments && props.active_departments.trim() !== '') {
            props.active_departments.split(';').forEach(d => {
                const trimmedDept = d.trim();
                if (trimmedDept) {
                    departmentIdSet.add(trimmedDept);
                }
            });
        }

        // 2. Process the single-department field 'department_id_lookup'
        if (props.department_id_lookup && props.department_id_lookup.trim() !== '') {
            departmentIdSet.add(props.department_id_lookup.trim());
        }

        // 3. Process the new multi-department field 'other_patient_departments'
        if (props.other_patient_departments && props.other_patient_departments.trim() !== '') {
            props.other_patient_departments.split(';').forEach(d => {
                const trimmedDept = d.trim();
                if (trimmedDept) {
                    departmentIdSet.add(trimmedDept);
                }
            });
        }

        // 4. Convert the Set back to an array for processing
        const activeDepartments = [...departmentIdSet];

        // A patient must have at least one department and a date of birth to be processed.
        if (activeDepartments.length === 0 || !props.date_of_birth) {
            console.log(`Skipping contact (HubSpot ID: ${contact.id}) due to missing required fields. No valid department found. date_of_birth: ${props.date_of_birth}`);
            continue;
        }

        // Construct the base payload shared across all API calls for this contact.
        const baseAthenaPayload = {
            ...(props.firstname && { firstname: props.firstname }),
            ...(props.lastname && { lastname: props.lastname }),
            ...(props.email && { email: props.email }),
            ...(props.address && { address1: props.address }),
            ...(props.address2 && { address2: props.address2 }),
            ...(props.city && { city: props.city }),
            ...(props.state && { state: props.state }),
            ...(props.zip && { zip: props.zip }),
            ...(props.phone && { homephone: props.phone }),
            ...(props.mobilephone && { mobilephone: props.mobilephone }),
            ...(props.date_of_birth && { dob: formatDateForAthena(props.date_of_birth) }),
            ...(props.gender && { sex: props.gender.charAt(0).toUpperCase() }), // M/F
            ...(props.maritalstatus && { maritalstatus: mapMaritalStatus(props.maritalstatus) }),
            ...(props.primaryproviderid && { primaryproviderid: props.primaryproviderid }),
            ...(props.language6392code && { language6392code: props.language6392code }),
        };

        // Remove any keys that have an undefined value
        Object.keys(baseAthenaPayload).forEach(key => baseAthenaPayload[key] === undefined && delete baseAthenaPayload[key]);

        if (props.patientid) {
            // EXISTING PATIENT: Create an update/registration task for each department.
            for (const deptId of activeDepartments) {
                const updatePayload = {
                    ...baseAthenaPayload,
                    departmentid: deptId, // Use departmentid to satisfy the endpoint's requirement
                    registerpatientifnotfound: 'true'
                };
                patientsToUpdate.push({
                    patientid: props.patientid,
                    hubspotId: contact.id,
                    payload: updatePayload
                });
            }
        } else {
            // NEW PATIENT: Create one 'create' task and store remaining departments.
            const [firstDept, ...remainingDepartments] = activeDepartments;
            const createPayload = {
                ...baseAthenaPayload,
                departmentid: firstDept,
            };
            patientsToCreate.push({
                hubspotId: contact.id,
                payload: createPayload,
                remainingDepartments: remainingDepartments,
                basePayload: baseAthenaPayload, // Store base payload for subsequent updates
            });
        }
    }
    return { patientsToCreate, patientsToUpdate };
};


// --- Athena Functions ---

const getAthenaToken = async ({ client_id, client_secret, dataStore }) => {
    const tokenInfo = await dataStore.get("athena_token_info");
    const now = Date.now();

    if (tokenInfo && tokenInfo.expires_at > now + 5 * 60 * 1000) {
        return tokenInfo.access_token;
    }

    console.log("Requesting new Athena token...");
    const credentials = Buffer.from(`${client_id}:${client_secret}`).toString("base64");
    const config = {
        method: 'post',
        url: 'https://api.preview.platform.athenahealth.com/oauth2/v1/token',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`,
        },
        data: qs.stringify({ 'grant_type': 'client_credentials', 'scope': 'athena/service/Athenanet.MDP.*' })
    };

    try {
        const response = await axios.request(config);
        const { access_token, expires_in } = response.data;
        const newTokenInfo = { access_token, expires_at: now + (expires_in * 1000) };
        await dataStore.set("athena_token_info", newTokenInfo);
        return access_token;
    } catch (error) {
        console.error("Error fetching Athena token:", error.response ? error.response.data : error.message);
        throw new Error("Could not authenticate with Athena API.");
    }
};

const createPatientsInAthena = async (patientsToCreate, authToken, practiceId) => {
    const successes = [];
    const failures = [];

    for (const patient of patientsToCreate) {
        const { hubspotId, payload } = patient;
        const config = {
            method: 'post',
            url: `https://api.preview.platform.athenahealth.com/v1/${practiceId}/patients`,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: qs.stringify(payload)
        };

        try {
            const response = await axios.request(config);
            const newPatientId = response.data[0].patientid;
            console.log(`Successfully created patient. Athena ID: ${newPatientId}`);
            successes.push({ ...patient, newPatientId, submittedPayload: payload });
        } catch (error) {
            const errorDetails = error.response ? error.response.data : { message: error.message };
            console.error(`Failed to create patient for HubSpot ID ${hubspotId}:`, errorDetails);
            failures.push({ ...patient, submittedPayload: payload, error: errorDetails });
        }
    }
    return { successes, failures };
};

const updatePatientsInAthena = async (patientsToUpdate, authToken, practiceId) => {
    const successes = [];
    const failures = [];

    for (const patient of patientsToUpdate) {
        const { patientid, payload, hubspotId } = patient;

        // For registrations/updates of existing patients, the patientid must be in the body.
        const registrationPayload = {
            ...payload,
            patientid: patientid
        };

        const config = {
            // Use POST to the base /patients endpoint for registrations, per Athena docs.
            method: 'post',
            url: `https://api.preview.platform.athenahealth.com/v1/${practiceId}/patients`,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: qs.stringify(registrationPayload)
        };

        try {
            // A successful POST to this endpoint for an existing patient returns a 200 OK with an empty body.
            await axios.request(config);
            console.log(`Successfully updated/registered patient ID: ${patientid} for department ${payload.departmentid}`);
            successes.push({ patientid, hubspotId, submittedPayload: registrationPayload });
        } catch (error) {
            const errorDetails = error.response ? error.response.data : { message: error.message };
            console.error(`Failed to update/register patient ID: ${patientid}. Error:`, errorDetails);
            failures.push({ patientid, hubspotId, submittedPayload: registrationPayload, error: errorDetails });
        }
    }
    return { successes, failures };
};


// --- Pipedream Component ---

export default defineComponent({
    props: {
        dataStore: { type: "data_store" },
        athena_client_id: { type: "string", secret: true },
        athena_client_secret: { type: "string", secret: true },
        athena_practice_id: { type: "string", default: "195900" },
        hubspot_access_token: { type: "string", secret: true },
    },
    async run({ steps, $ }) {
        try {
            // 1. Get recently modified contacts from HubSpot
            const hubspot_data = await getHubSpotContacts(this.hubspot_access_token);
            if (!hubspot_data?.results?.length) {
                return $.flow.exit("No new or updated contacts found in HubSpot to process.");
            }

            // 2. Prepare data for Athena
            let { patientsToCreate, patientsToUpdate } = prepareForAthena(hubspot_data.results);
            console.log(`Data prepared. Patients to CREATE: ${patientsToCreate.length}, Patients to UPDATE/REGISTER: ${patientsToUpdate.length}`);

            if (patientsToCreate.length === 0 && patientsToUpdate.length === 0) {
                return $.flow.exit("No valid patient data to send to Athena.");
            }

            // 3. Get Athena API Token
            const athenaToken = await getAthenaToken({
                client_id: this.athena_client_id,
                client_secret: this.athena_client_secret,
                dataStore: this.dataStore,
            });

            const processedHubSpotIds = new Set();

            // 4. Process Creations
            let creationResults = { successes: [], failures: [] };
            if (patientsToCreate.length > 0) {
                creationResults = await createPatientsInAthena(patientsToCreate, athenaToken, this.athena_practice_id);

                // For each successful creation, update HubSpot and queue registrations for remaining departments
                for (const success of creationResults.successes) {
                    const { hubspotId, newPatientId, remainingDepartments, basePayload } = success;

                    // Write back the new Athena Patient ID to the HubSpot Contact
                    await updateHubSpotContact(this.hubspot_access_token, hubspotId, newPatientId);
                    processedHubSpotIds.add(hubspotId);

                    // If there are other departments, create update tasks for them
                    if (remainingDepartments && remainingDepartments.length > 0) {
                        console.log(`Queueing ${remainingDepartments.length} registrations for new patient ${newPatientId}`);
                        for (const deptId of remainingDepartments) {
                            const registrationPayload = {
                                ...basePayload,
                                departmentid: deptId,
                                registerpatientifnotfound: 'true'
                            };
                            patientsToUpdate.push({
                                patientid: newPatientId,
                                hubspotId: hubspotId,
                                payload: registrationPayload
                            });
                        }
                    }
                }
            }

            // 5. Process Updates (includes registrations for new and existing patients)
            let updateResults = { successes: [], failures: [] };
            if (patientsToUpdate.length > 0) {
                updateResults = await updatePatientsInAthena(patientsToUpdate, athenaToken, this.athena_practice_id);

                // Mark the HubSpot contacts as updated
                for (const success of updateResults.successes) {
                    if (!processedHubSpotIds.has(success.hubspotId)) {
                        await updateHubSpotContact(this.hubspot_access_token, success.hubspotId, null);
                        processedHubSpotIds.add(success.hubspotId);
                    }
                }
            }

            console.log("Workflow finished successfully.");
            return { creationResults, updateResults };

        } catch (error) {
            console.error("An unexpected error occurred in the workflow:", error);
            throw error;
        }
    },
})