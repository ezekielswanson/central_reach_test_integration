// Referrer Sync - Athena to HubSpot
import axios from "axios";

// Helper functions outside component (proper Pipedream pattern)
async function authenticateAthena(clientId, clientSecret, dataStore) {
	// Check for cached token
	const tokenCacheKey = `athena_token_195900`;
	let cachedToken = await dataStore.get(tokenCacheKey);


	// Validate cached token
	if (
		cachedToken &&
		cachedToken.expires_at &&
		new Date() < new Date(cachedToken.expires_at)
	) {
		console.log("✅ Using cached authentication token");
		return {
			auth_token: cachedToken.access_token,
			base_url: "https://api.preview.platform.athenahealth.com/v1",
			practice_id: "195900"
		};
	}

	// Get new token
	console.log("🔄 Requesting new authentication token...");

	try {
		const response = await axios({
			method: "POST",
			url: "https://api.preview.platform.athenahealth.com/oauth2/v1/token",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`
			},
			data: "grant_type=client_credentials&scope=athena/service/Athenanet.MDP.*"
		});

		if (response.data && response.data.access_token) {
			const token = response.data.access_token;
			const expiresIn = response.data.expires_in || 3600; // Default 1 hour
			const expiresAt = new Date(Date.now() + (expiresIn - 60) * 1000); // 1 min buffer

			// Cache the token with TTL
			await dataStore.set(
				tokenCacheKey,
				{
					access_token: token,
					expires_at: expiresAt.toISOString(),
					practice_id: "195900"
				},
				{ ttl: expiresIn - 60 }
			);

			console.log("✅ Authentication successful");

			return {
				auth_token: token,
				base_url: "https://api.preview.platform.athenahealth.com/v1",
				practice_id: "195900"
			};
		} else {
			throw new Error("No access token in response");
		}
	} catch (error) {
		throw new Error(`Athena authentication failed: ${error.message}`);
	}
}

function validateAthenaPatient(patientData) {
	const errors = [];
	const sanitized = {};


	// Address validation
	if (patientData.address1) {
		sanitized.address = patientData.address1.toString().substring(0, 200);
	}
	if (patientData.city) {
		sanitized.city = patientData.city.toString().substring(0, 50);
	}
	if (patientData.state) {
		sanitized.state = patientData.state.toString().substring(0, 2);
	}
	if (patientData.zip) {
		sanitized.zip = patientData.zip.toString().substring(0, 10);
	}

	// Phone validation
	if (patientData.phone) {
		const phone = patientData.phone.toString().replace(/\D/g, "");
		if (phone?.length >= 7) {
			if (phone?.length === 10) {
				sanitized.phone = `+1${phone}`;
			} else if (phone?.length === 11 && phone.startsWith("1")) {
				sanitized.phone = `+${phone}`;
			} else {
				sanitized.phone = phone;
			}
		}
	}

	return {
		is_valid: errors?.length === 0,
		errors: errors,
		sanitized_data: sanitized
	};
}

async function getInsurances(authToken, patient_id){
	let config = {
		method: 'get',
		maxBodyLength: Infinity,
		url: `https://api.preview.platform.athenahealth.com/v1/247701/patients/${patient_id}/insurances`,
		headers: {
			Authorization: `Bearer ${authToken}`,
			"Content-Type": "application/json"
		}
	};

	try{
		const performAction = await axios.request(config)
		return performAction.data.insurances
	}
	catch(e){
		console.log(e)
	}
}

async function prepareInsuranceHubSpot(hubspotToken, payload, patient_id){

	/*
		{
            "policynumber": "39494939343",
            "ircname": "Aetna & Aetna/US Healthcare",
            "insurancephone": "(888) 632-3862",
            "insurancepolicyholderaddress1": "7809 COVINGTON PKWY",
            "lastupdated": "08/07/2025",
            "relationshiptoinsured": "Self",
            "eligibilitylastchecked": "08/07/2025",
            "insurancepolicyholderstate": "TX",
            "insuranceid": "852014",
            "insurancepackagecity": "LEXINGTON",
            "insurancepayername": "AETNA",
            "insurancepackagepayerid": "60054",
            "eligibilityreason": "Athena",
            "insurancepackagezip": "40512-4079",
            "insurancepackageid": 711110,
            "insurancepolicyholderdob": "08/09/1985",
            "insurancepolicyholderfirstname": "ADAM",
            "insuredreferringprovider": "HERNANDEZ, ALFRED JOE, JR",
            "note": "Test update",
            "insurancepackagestate": "KY",
            "relationshiptoinsuredid": 1,
            "insuredpcp": "JOHNSON, SANDRA J",
            "insurancepolicyholderlastname": "LINSTAD",
            "insurancepolicyholderzip": "79121",
            "insurancepolicyholdercity": "AMARILLO",
            "lastupdatedby": "autoelig",
            "insuredpcpnpi": 1508969668,
            "insurancepolicyholder": "ADAM LINSTAD",
            "eligibilitystatus": "Unverified",
            "insurancepolicyholdercountryiso3166": "US",
            "confidentialitycode": "N",
            "created": "08/07/2025",
            "insurancepolicyholdersex": "M",
            "insuranceplanname": "AETNA (POS)",
            "insuranceidnumber": "3939329",
            "insuranceplandisplayname": "Aetna (POS)",
            "insurancetype": "Commercial",
            "insurancepolicyholdercountrycode": "USA",
            "insurancepackageaddress1": "PO BOX 14079",
            "insuredentitytypeid": 1,
            "sequencenumber": 1,
            "insuranceproducttype": "POS",
            "insuredreferringproviderid": 26599,
            "insuredpcpid": 25053,
            "createdby": "ndixon43",
            "ircid": 121,
            "copays": [
                {
                    "copayamount": "10",
                    "copaytype": "Office Visit"
                }
            ]
        }
     */




	let hubspot_payload = {
		"updated_by_integration": true,
		"insurancepackagezip": payload.insurancepackagezip,
		"insurancephone": payload.insurancephone,
		"insuranceid": payload.insuranceid,
		"insurancepackageid": payload.insurancepackageid,
		"state": payload.insurancepackagestate,
		"insuranceplanname": payload.ircname,
		"insurancepackageaddress1": payload.insurancepackageaddress1,
		"insurancepackagecity": payload.insurancepackagecity,
		"insurance_product_type_name": payload.insuranceproducttype ? payload.insuranceproducttype : "None Listed",
		"insurancepolicyholdersex": payload.insurancepolicyholdersex,
		"insurancepolicyholderfirstname": payload.insurancepolicyholderfirstname,
		"insurancepolicyholderlastname": payload.insurancepolicyholderlastname,
		"insurancepolicyholderdob": payload.insurancepolicyholderdob,
		"insurancepolicyholderzip": payload.insurancepolicyholderzip,
		"insurancepolicyholdercity": payload.insurancepolicyholdercity,
		"insurancepolicyholderstate": payload.insurancepolicyholderstate,
		"insurancepolicyholderaddress1": payload.insurancepolicyholderaddress1,
		"insurancepolicyholdercountrycode": payload.insurancepolicyholdercountrycode,
		"insurancepolicyholdercountryiso3166": payload.insurancepolicyholdercountryiso3166,
		"eligibilityreason": payload.eligibilityreason,
		"eligibilitystatus": payload.eligibilitystatus,
		"eligibilitylastchecked": payload.eligibilitylastchecked
	}

	if(payload.relationshiptoinsured !== "Self"){
		hubspot_payload['extra_insurance_patients'] = patient_id
	}
	else{
		hubspot_payload['patientid'] = patient_id
	}

	return {
		athenaId: payload.insurancepackageid,
		mappedData: hubspot_payload
	};

}

function athenaToHubspotReferrers(patient) {


	let guarantordob = new Date(patient.guarantordob)

	let patient_status_active = ""
	let patient_status_else = ""

	if(patient.allpatientstatuses?.length >= 1){
		for ( let x = 0; x < patient.allpatientstatuses.length; x++){
			if(patient.allpatientstatuses[x].status.toLowerCase() === "active"){
				patient_status_active += `${patient.allpatientstatuses[x].departmentid};`
			}
			else {
				patient_status_else = `${patient.allpatientstatuses[x].departmentid};`
			}
		}
	}

	return {
		// // Currently enabled - known working field
		// name:
		// patient.name,

		// Integration tracking - THIS IS THE UPSERT KEY
		patientid: patient.patientid,

		// 🔄 INTEGRATION FLAGS per your architecture:
		// athena_integration_flag: NOT SET - this flag is ONLY for marking HubSpot records that need to go TO Athena
		// updated_by_integration: "true" - tells HubSpot workflow "this update came from integration, don't set athena_integration_flag"
		updated_by_integration: "true", // Prevents HubSpot workflow from setting athena_integration_flag = true

		// TODO: Enable these as HubSpot properties are created:
		firstname: patient.firstname,
		lastname: patient.lastname,
		gender: patient.sex,
		date_of_birth: patient.dob,
		address: patient.address1,
		address2: patient.address2,
		city: patient.city,
		state: patient.state,
		zip: patient.zip,
		country: patient.countrycode,
		phone: patient.homephone,
		mobilephone: patient.mobilephone,
		email: patient.email,
		deceaseddate: patient.deceaseddate,
		maritalstatus: patient.maritalstatus,
		referralsourceid: patient.referralsourceid,
		referralsourceother: patient.referralsourceother,
		guarantorfirstname: patient.guarantorfirstname,
		guarantorlastname: patient.guarantorlastname,
		guarantordob: guarantordob.valueOf(),
		relationshiptoinsured: patient.relationshiptoinsured,
		insureddob: patient.insureddob,

		// insuranceidnumber: patient.insurances[0].insuranceidnumber,
		// insuranceplanname: patient.insurances[0].insuranceplanname,
		// insurancepackageid: patient.insurances[0].insurancepackageid,
		// insurancepackageaddress1: patient.insurances[0].insurancepackageaddress1,
		// insurancepackagecity: patient.insurances[0].insurancepackagecity,
		// insuredstate: patient.insurances[0].insuredstate,
		// insurancephone: patient.insurances[0].insurancephone,
		// eligibilitystatus: patient.insurances[0].eligibilitystatus,
		// eligibilityreason: patient.insurances[0].eligibilityreason,
		// eligibilitylastchecked: patient.insurances[0].eligibilitylastchecked,
		// eligibilitymessage: patient.insurances[0].eligibilitymessage,
		// note: patient.insurances[0].note,
		image: patient.image,
		//providergroupname: patient.balances?.length >= 1 ? patient.balances[0].providergroupname : null,
		providergroupid: patient.providergroupid,
		department_id_lookup: patient.primarydepartmentid,
		primaryproviderid: patient.primaryproviderid,
		language6392code: patient.language6392code,
		fax: patient.fax,
		specialty: patient.specialty,
		npinumber: patient.npinumber,
		active_departments: patient_status_active,
		other_patient_departments: patient_status_else
	};
}

async function getReferrals(authToken, patient_id){
	let config = {
		method: 'get',
		maxBodyLength: Infinity,
		url: `https://api.preview.platform.athenahealth.com/v1/247701/patients/${patient_id}/referralauths`,
		headers: {
			Authorization: `Bearer ${authToken}`,
			"Content-Type": "application/json"
		}
	};

	try{
		const performAction = await axios.request(config)
		return performAction.data.referralauths
	}
	catch(e){
		console.log(e)
	}
}

async function batchUpsertHubSpotInsurance(insurance, hubspotToken) {
	try {
		const inputs = insurance.map((dept) => ({
			idProperty: "insuranceid", // Property to use for upsert matching
			id: dept.mappedData.insuranceid, // The actual ID value
			properties: dept.mappedData
		}));

		console.log("🔍 DEBUG - HubSpot batch upsert request:");
		console.log(
			"📝 URL:",
			"https://api.hubapi.com/crm/v3/objects/2-47742702/batch/upsert"
		);
		console.log("📝 Input count:", inputs.length);
		console.log("📝 First input sample:", JSON.stringify(inputs[0], null, 2));

		const response = await axios({
			method: "POST",
			url: "https://api.hubapi.com/crm/v3/objects/2-47742702/batch/upsert",
			headers: {
				Authorization: `Bearer ${hubspotToken}`,
				"Content-Type": "application/json"
			},
			data: {
				inputs
			},
			timeout: 60000 // Longer timeout for batch operations
		});

		return response.data.results; // Array of created/updated objects with IDs
	} catch (error) {
		console.error("❌ HubSpot batch upsert error details:");
		console.error("📝 Status:", error.response?.status);
		console.error("📝 Status text:", error.response?.statusText);
		console.error(
			"📝 Response data:",
			JSON.stringify(error.response?.data, null, 2)
		);
		console.error("📝 Request URL:", error.config?.url);
		console.error("📝 Request method:", error.config?.method);

		throw new Error(
			`Failed to batch upsert HubSpot patient: ${error.message}${error.response?.data ? ` - ${JSON.stringify(error.response.data)}` : ""}`
		);
	}
}

async function prepareReferralHubSpot(hubspotToken, payload, patientid){

	/*
		{
			"referralauths": [
				{
					"referredtoproviderid": 144,
					"ansinamecode": "Allopathic & Osteopathic Physicians : Internal Medicine (207R00000X)",
					"visitsapproved": 5,
					"noreferralrequired": false,
					"lastmodifiedby": "ndixon43",
					"departmentid": 443,
					"referringproviderid": 13867,
					"expired": false,
					"referralauthid": 216698,
					"insuranceidnumber": "99382838",
					"visitsleft": 2,
					"startdate": "07/11/2025",
					"appointmentids": [
						"9019052"
					],
					"specialty": "Internal Medicine",
					"lastmodified": "07/11/2025",
					"referralauthunits": "VISIT",
					"referralauthnumber": "4882873722",
					"referralauthtype": "REFERRAL",
					"insurancepackagename": "BCBS-TX",
					"note": "Last updated field check",
					"ansispecialtycode": "207R00000X"
				}
			],
			"totalcount": 1
			}
     */

	const modified_date = new Date(payload.lastmodified)
	const start_date = new Date(payload.startdate)

	let hubspot_payload = {
		"updated_by_integration": "true",
		"referring_provider_id": payload.referredtoproviderid,
		"department_id": payload.departmentid,
		"expired": payload.expired,
		"last_modified_by": payload.lastmodifiedby,
		"last_modified_in_athena": modified_date.valueOf(),
		"referralauthid": payload.referralauthid,
		"referral_auth_number": payload.referralauthnumber,
		"start_date": start_date.valueOf(),
		"visits_approved": payload.visitsapproved,
		"visits_left": payload.visitsleft,
		"referral_auth_type": payload.referralauthtype,
		"specialty": payload.specialty,
		"placeholderid": payload.referredtoproviderid,
		"patient_id": patientid,
		"insuranceid": payload.insuranceidnumber
	}

	return {
		athenaId: payload.referralauthid,
		mappedData: hubspot_payload
	};

}

async function batchUpsertHubSpotReferral(patients, hubspotToken) {
	try {
		const inputs = patients.map((dept) => ({
			idProperty: "referralauthid", // Property to use for upsert matching
			id: dept.mappedData.referralauthid, // The actual ID value
			properties: dept.mappedData
		}));

		console.log("🔍 DEBUG - HubSpot batch upsert request:");
		console.log(
			"📝 URL:",
			"https://api.hubapi.com/crm/v3/objects/2-47837618/batch/upsert"
		);
		console.log("📝 Input count:", inputs.length);
		console.log("📝 First input sample:", JSON.stringify(inputs[0], null, 2));

		const response = await axios({
			method: "POST",
			url: "https://api.hubapi.com/crm/v3/objects/2-47837618/batch/upsert",
			headers: {
				Authorization: `Bearer ${hubspotToken}`,
				"Content-Type": "application/json"
			},
			data: {
				inputs
			},
			timeout: 60000 // Longer timeout for batch operations
		});

		return response.data.results; // Array of created/updated objects with IDs
	} catch (error) {
		console.error("❌ HubSpot batch upsert error details:");
		console.error("📝 Status:", error.response?.status);
		console.error("📝 Status text:", error.response?.statusText);
		console.error(
			"📝 Response data:",
			JSON.stringify(error.response?.data, null, 2)
		);
		console.error("📝 Request URL:", error.config?.url);
		console.error("📝 Request method:", error.config?.method);

		throw new Error(
			`Failed to batch upsert HubSpot patient: ${error.message}${error.response?.data ? ` - ${JSON.stringify(error.response.data)}` : ""}`
		);
	}
}

async function handleCases(authToken, hubspotToken, patientData) {

	const referral_array = []
	const insurance_array = []

	for(let x = 0; x < patientData.length; x++){
		const patient = patientData[x];

		const referral_info = await getReferrals(authToken, patient.patientid)

		for (let y = 0; y < referral_info.length; y++){
			referral_array.push(await prepareReferralHubSpot(hubspotToken, referral_info[y], patient.patientid))
		}

		const insurance_info = await getInsurances(authToken, patient.patientid)

		for(let y = 0; y < insurance_info.length; y++){
			insurance_array.push(await prepareInsuranceHubSpot(hubspotToken, insurance_info[y], patient.patientid))
		}
	}

	if(referral_array.length >= 1 ){
		await batchUpsertHubSpotReferral(referral_array, hubspotToken);
	}

	if(insurance_array.length >= 1){
		await batchUpsertHubSpotInsurance(insurance_array, hubspotToken);
	}

}

function normalizePhone(phone) {
	if (!phone) return null;

	const digits = phone.toString().replace(/\D/g, "");

	if (digits.length === 10) {
		return `+1${digits}`;
	} else if (digits.length === 11 && digits.startsWith("1")) {
		return `+${digits}`;
	} else if (digits.length >= 7) {
		// For shorter numbers, return the digits as-is
		return digits;
	}

	return null; // Only reject very short numbers
}

async function fetchAthenaPatients(authToken, baseUrl, practiceId) {
	try {
		const response = await axios({
			method: "GET",
			url: `${baseUrl}/${practiceId}/patients/changed`,
			headers: {
				Authorization: `Bearer ${authToken}`,
				"Content-Type": "application/json"
			},
			timeout: 30000
		});

		return response.data.patients || [];
	} catch (error) {
		if (error.response?.status === 404) {
			console.log(
				"ℹ️ No patients endpoint available or no referrerr found"
			);
			return [];
		}
		throw new Error(`Failed to fetch referrers: ${error.message}`);
	}
}

async function processPatient(patient, dataStore) {

	// 1. Validate referrers data
	const validationResult = validateAthenaPatient(patient);

	if (!validationResult.is_valid) {
		throw new Error(
			`Invalid patient data: ${validationResult.errors.join(", ")}`
		);
	}

	// 2. Transform referrers data for upsert
	const mappedData = athenaToHubspotReferrers(patient);


	// 3. Return processed data for batch upsert (no need to check existing mappings)
	return {
		athenaId: patient.patientid,
		mappedData: mappedData
	};
}

async function batchUpsertHubSpotPatients(patients, hubspotToken) {
	try {
		const inputs = patients.map((dept) => ({
			idProperty: "patientid", // Property to use for upsert matching
			id: dept.mappedData.patientid, // The actual ID value
			properties: dept.mappedData
		}));

		console.log("🔍 DEBUG - HubSpot batch upsert request:");
		console.log(
			"📝 URL:",
			"https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert"
		);
		console.log("📝 Input count:", inputs.length);
		console.log("📝 First input sample:", JSON.stringify(inputs[0], null, 2));

		const response = await axios({
			method: "POST",
			url: "https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert",
			headers: {
				Authorization: `Bearer ${hubspotToken}`,
				"Content-Type": "application/json"
			},
			data: {
				inputs
			},
			timeout: 60000 // Longer timeout for batch operations
		});

		return response.data.results; // Array of created/updated objects with IDs
	} catch (error) {
		console.error("❌ HubSpot batch upsert error details:");
		console.error("📝 Status:", error.response?.status);
		console.error("📝 Status text:", error.response?.statusText);
		console.error(
			"📝 Response data:",
			JSON.stringify(error.response?.data, null, 2)
		);
		console.error("📝 Request URL:", error.config?.url);
		console.error("📝 Request method:", error.config?.method);

		throw new Error(
			`Failed to batch upsert HubSpot patient: ${error.message}${error.response?.data ? ` - ${JSON.stringify(error.response.data)}` : ""}`
		);
	}
}

async function processBatch(batch, dataStore) {
	const patientsToUpsert = [];
	let errorCount = 0;

	for (const patient of batch) {
		try {
			const processedDept = await processPatient(patient, dataStore);

			patientsToUpsert.push(processedDept);
		} catch (error) {
			console.error(
				`❌ Error processing patients ${patient.patientid}:`,
				error.message
			);
			errorCount++;

			// Log error
			await dataStore.set(
				`error_${Date.now()}_${patient.patientid}`,
				{
					error_message: `Patient ${patient.patientid}: ${error.message}`,
					workflow_name: "Patient Sync - Athena to HubSpot",
					object_id: patient.patientid,
					timestamp: new Date().toISOString()
				},
				{ ttl: 86400 * 7 } // 7 days
			);
		}
	}

	console.log({ patientsToUpsert, errorCount })

	return { patientsToUpsert, errorCount };
}

async function executeBatchOperations(
	patientsToUpsert,
	hubspotToken,
	dataStore
) {
	console.log("PATIENTS:")
	console.log(patientsToUpsert)
	let processedCount = 0;
	let errorCount = 0;

	// Batch upsert all referrers
	if (patientsToUpsert?.length > 0) {
		try {
			console.log(
				`📝 Batch upserting ${patientsToUpsert?.length} patients in HubSpot`
			);
			const upsertResults = await batchUpsertHubSpotPatients(
				patientsToUpsert,
				hubspotToken
			);

			// Process results and log successful operations
			for (let j = 0; j < upsertResults.length; j++) {
				const result = upsertResults[j];
				const athenaId = patientsToUpsert[j].athenaId;

				// Log whether this was a create or update based on the result
				if (result.createdAt === result.updatedAt) {
					console.log(
						`✨ Created patient ${athenaId} in HubSpot with ID ${result.id}`
					);
				} else {
					console.log(
						`📝 Updated patient ${athenaId} in HubSpot with ID ${result.id}`
					);
				}

				processedCount++;
			}
		} catch (error) {
			console.error(`❌ Batch upsert failed:`, error.message);
			errorCount += patientsToUpsert.length;
		}
	}

	return { processedCount, errorCount };
}

async function syncPatientsBatch(
	patients,
	batchSize,
	hubspotToken,
	dataStore
) {
	let totalProcessed = 0;
	let totalErrors = 0;

	for (let i = 0; i < patients.length; i += batchSize) {
		const batch = patients.slice(i, i + batchSize);
		console.log(
			`🔄 Processing batch ${Math.floor(i / batchSize) + 1} (${batch?.length} patients)`
		);


		// Process batch for upsert
		const { patientsToUpsert, errorCount } = await processBatch(
			batch,
			dataStore
		);

		console.log("PDD:")
		console.log(patientsToUpsert)

		totalErrors += errorCount;

		// Execute batch upsert
		const { processedCount } = await executeBatchOperations(
			patientsToUpsert,
			hubspotToken,
			dataStore
		);

		console.log("GOT HERE 2")
		totalProcessed += processedCount;

		// Delay between batches to respect rate limits
		if (i + batchSize < patients?.length) {
			await new Promise((resolve) => setTimeout(resolve, 2000));
		}
	}

	return { processedCount: totalProcessed, errorCount: totalErrors };
}

async function triggerNextWorkflow(webhookUrl, cycleId) {

	console.log("ATTEMPTING POST")
	try {
		await axios({
			method: "POST",
			url: webhookUrl,
			data: {
				trigger_source: "patients-athena-to-hubspot",
				integration_cycle_id: cycleId,
				timestamp: new Date().toISOString(),
				previous_workflow: "patients-athena-to-hubspot"
			},
			timeout: 30000
		});
		console.log("✅ patients HubSpot to Athena sync workflow triggered");
	} catch (error) {
		console.error("⚠️ Failed to trigger next workflow:", error.message);
		// Don't throw - this shouldn't fail the current workflow
	}
}

export default defineComponent({
	props: {
		// Data store for state management
		dataStore: {
			type: "data_store",
			label: "Integration Data Store",
			description: "Data store for caching and state management"
		},
		// Authentication credentials
		athena_client_id: {
			type: "string",
			label: "Athena Client ID",
			description: "Athena API client ID",
			secret: true
		},
		athena_client_secret: {
			type: "string",
			label: "Athena Client Secret",
			description: "Athena API client secret",
			secret: true
		},
		athena_practice_id: {
			type: "string",
			label: "Athena Practice ID",
			description: "Athena practice ID for API calls",
			default: "195900"
		},
		hubspot_access_token: {
			type: "string",
			label: "HubSpot Access Token",
			description: "HubSpot private app access token",
			secret: true
		},
		// Configuration
		batch_size: {
			type: "integer",
			label: "Batch Size",
			description: "Number of referrers to process in each batch",
			default: 50,
			optional: true
		},
		patients_hubspot_to_athena_webhook_url: {
			type: "string",
			label: "patients HubSpot to Athena Webhook URL",
			description: "HTTP trigger URL for next workflow in chain",
			optional: true
		}
	},

	async run({ steps, $ }) {

		console.log("WEBHOOK URL?")
		console.log(this.patients_hubspot_to_athena_webhook_url)
		try {
			console.log("🔄 Starting Referrers sync - Athena to HubSpot");

			// Debug logging - let's see exactly what we have
			console.log("🔍 DEBUGGING - Full steps object:");
			console.log(JSON.stringify(steps, null, 2));

			console.log("🔍 DEBUGGING - steps type:", typeof steps);
			console.log("🔍 DEBUGGING - steps is null:", steps === null);
			console.log("🔍 DEBUGGING - steps is undefined:", steps === undefined);
			console.log(
				"🔍 DEBUGGING - steps keys:",
				steps ? Object.keys(steps) : "no keys"
			);

			if (steps) {
				console.log("🔍 DEBUGGING - steps.trigger exists:", "trigger" in steps);
				console.log("🔍 DEBUGGING - steps.trigger value:", steps.trigger);
				console.log("🔍 DEBUGGING - steps.trigger type:", typeof steps.trigger);

				if (steps.trigger) {
					console.log(
						"🔍 DEBUGGING - steps.trigger keys:",
						Object.keys(steps.trigger)
					);
					console.log(
						"🔍 DEBUGGING - steps.trigger.event exists:",
						"event" in steps.trigger
					);
					console.log(
						"🔍 DEBUGGING - steps.trigger.event value:",
						steps.trigger.event
					);

					if (steps.trigger.event) {
						console.log(
							"🔍 DEBUGGING - steps.trigger.event keys:",
							Object.keys(steps.trigger.event)
						);
						console.log(
							"🔍 DEBUGGING - steps.trigger.event.body:",
							steps.trigger.event.body
						);
						console.log(
							"🔍 DEBUGGING - steps.trigger.event.query:",
							steps.trigger.event.query
						);
					}
				}
			}

			// Safe access with detailed logging
			let triggerData = {};

			if (
				steps &&
				steps.trigger &&
				steps.trigger.event &&
				steps.trigger.event.body
			) {
				triggerData = steps.trigger.event.body;
				console.log(
					"✅ Found trigger data in body:",
					JSON.stringify(triggerData, null, 2)
				);
			} else if (
				steps &&
				steps.trigger &&
				steps.trigger.event &&
				steps.trigger.event.query
			) {
				triggerData = steps.trigger.event.query;
				console.log(
					"✅ Found trigger data in query:",
					JSON.stringify(triggerData, null, 2)
				);
			} else {
				console.log("⚠️ No trigger data found - using empty object");
				console.log("⚠️ This might be a manual test or different trigger type");
			}

			console.log(
				`📨 Triggered by: ${triggerData.trigger_source || "unknown"}`
			);
			console.log(`🆔 Cycle ID: ${triggerData.integration_cycle_id || "N/A"}`);

			// 1. Authenticate with Athena directly
			console.log("🔐 Authenticating with Athena...");
			const athenaAuth = await authenticateAthena(
				this.athena_client_id,
				this.athena_client_secret,
				this.dataStore
			);

			if (!athenaAuth || !athenaAuth.auth_token) {
				throw new Error("Failed to authenticate with Athena");
			}

			// 2. Get referrers from Athena (no changed feed - full list)
			console.log("📥 Fetching patients from Athena...");
			const patients = await fetchAthenaPatients(
				athenaAuth.auth_token,
				athenaAuth.base_url,
				this.athena_practice_id
			);

			if (!patients || patients.length === 0) {
				console.log("ℹ️ No patients found in Athena");

				const result = {
					status: "success",
					processed: 0,
					errors: 0,
					timestamp: new Date().toISOString(),
					next_workflow: this.patients_hubspot_to_athena_webhook_url
						? "patients-hubspot-to-athena"
						: null
				};
				console.log("Sending to next workflow HS -> Athena")

				if (this.patients_hubspot_to_athena_webhook_url) {
					console.log(
						"🔗 Triggering patients HubSpot to Athena sync workflow..."
					);
					await triggerNextWorkflow(
						this.patients_hubspot_to_athena_webhook_url,
						triggerData.integration_cycle_id
					);
				}

				// Export data for downstream steps following Pipedream pattern
				$.export("result", result);
				return result;
			}

			console.log(`📊 Found ${patients.length} Patients in Athena`);


			let patientid = null

			// Debug: Show sample referrers data
			if (patients.length > 0) {
				console.log("🔍 DEBUG - Sample Athena patients data:");
				console.log(JSON.stringify(patients[0], null, 2));

				// Debug: Show mapped data
				const sampleMapped = athenaToHubspotReferrers(patients[0]);
				patientid = sampleMapped.patientid
				console.log("🔍 DEBUG - Sample mapped HubSpot data:");
				console.log(JSON.stringify(sampleMapped, null, 2));
			}

			// 3. Process referrers in batches using batch APIs
			const { processedCount, errorCount } = await syncPatientsBatch(
				patients,
				this.batch_size,
				this.hubspot_access_token,
				this.dataStore
			);

			// 4. Update last sync timestamp
			await this.dataStore.set("last_sync_referrers_athena_to_hubspot", {
				timestamp: new Date().toISOString(),
				processed: processedCount,
				errors: errorCount
			});

			console.log(
				`✅ Patients sync completed: ${processedCount} processed, ${errorCount} errors`
			);

			// now sync cases

			console.log("ATTEMPTING CASES SYNC")
			await handleCases(athenaAuth.auth_token, this.hubspot_access_token, patients)
			console.log("CASES SYNC DONE")


			// 5. Trigger next workflow in chain (referrers HubSpot to Athena)
			if (this.patients_hubspot_to_athena_webhook_url) {
				console.log(
					"🔗 Triggering patients HubSpot to Athena sync workflow..."
				);
				await triggerNextWorkflow(
					this.patients_hubspot_to_athena_webhook_url,
					triggerData.integration_cycle_id
				);
			}

			const result = {
				status: "success",
				processed: processedCount,
				errors: errorCount,
				timestamp: new Date().toISOString(),
				workflow: "patients-athena-to-hubspot",
				cycle_id: triggerData.integration_cycle_id,
				next_workflow: this.patients_hubspot_to_athena_webhook_url
					? "patients-hubspot-to-athena"
					: null
			};

			console.log("Sending to next workflow HS -> Athena")

			// Export data for downstream steps following Pipedream pattern
			$.export("result", result);
			return result;
		} catch (error) {
			console.error("❌ patients sync failed:", error.message);

			// Log error directly
			await this.dataStore.set(`error_${Date.now()}`, {
				error_message: error.message,
				workflow_name: "Patients Sync - Athena to HubSpot",
				timestamp: new Date().toISOString(),
				stack: error.stack
			});

			// Export error for downstream steps
			$.export("error", {
				status: "error",
				error: error.message,
				workflow: "patients-athena-to-hubspot",
				timestamp: new Date().toISOString()
			});

			throw error;
		}
	}
});


//steps.code.$return_value.next_workflow
