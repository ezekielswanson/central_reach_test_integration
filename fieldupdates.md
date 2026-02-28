



> **Task:** Add new CentralReach Metadata field mappings and the update loop.
> **Strict Constraint:** Do NOT modify, delete, or refactor any existing logic related to Contact Creation, Address Handling, or File Uploads. Only add the new metadata fields and the loop that processes them.
> **1. Update Constants:** Add these IDs to the `CR_META_FIELDS` object.
> * `ALLERGIES: 126214`, `MALADAPTIVE_BEHAVIORS: 126207`, `COMORBID_DIAGNOSIS: 132303`, `BT_1_NAME: 131313`, `WORK_SCHEDULE_1: 132304`, `WORK_SCHEDULE_2: 138093`, `CLIENT_AVAILABILITY: 126209`, `TOTAL_ASSIGNED_HOURS: 134331`, `APPROVED_AUTH_HOURS: 132431`, `AUTH_PERIOD: 134672`, `PHYSICIAN_CREDENTIALS: 131151`, `ASD_DIAGNOSIS_DATE: 131195`, `SUPERVISING_BCBA: 131308`, `INITIAL_ASSESSMENT_BCBA: 131314`, `SEVERITY_LEVEL: 133826`, `POLICY_HOLDER_NAME: 138090`, `POLICY_HOLDER_DOB: 137667`, `CURRENT_INSURANCE: 126210`, `INSURANCE_ID: 131316`
> 
> 
> **2. Expand Data Fetching:** Add the corresponding HubSpot internal names to the `dealProperties` array to ensure they are available in the payload.



Explicit HubSpot Internal Names for Mapping Use these exact internal names when fetching data from the HubSpot Deal object:

Allergies: allergies Maladaptive Behaviors - Clinical: maladaptive_behaviors__clinical Comorbid Diagnosis - Clinical: comorbid_diagnosis__clinical Current Primary BT: current_primary_bt BT Work Schedule 1 Confirmed: bt_work_schedule_confirmed BT Work Schedule 2 Confirmed: bt_work_schedule_2_confirmed Client Set Availability Confirmed: client_availability_completed Work Schedule Hours: assigned_hours Approved Auth Hours: authorized_hours Auth Period Start Date: auth_start_date Auth Period End Date: auth_end_date Physician Name - Medicaid: physician_name NPI Number Medicaid: npi_number Physician Name - Commercial - 1: physician_name__commercial NPI Number - Commercial - 1: npi_number__commercial Most Recent ASD Diagnosis Date (Medicaid): most_recent_asd_diagnosis_date_medicaid Intake - Most Recent ASD Diagnosis 1: most_recent_asd_diagnosis_date_1 Supervising BCBA: supervising_bcba Initial Assessment BCBA: initial_assessment_bcba Policy Holder Name 1: policy_holder_name Policy Holder DOB - 1: phi__policy_holder_dob Severity Level: severity_level_clinical Insurance Type Indicators: n1_what_type_of_insurance, n2_what_type_of_insurance, n3_what_type_of_insurance, n4_what_type_of_insurance 




> **3. Add Transformation Logic:** Create the `getExtendedMetadataValues(dealProps)` helper function to handle:
> * Formatting dates to `MM/DD/YYYY`.
> * Concatenating `auth_start_date` and `auth_end_date` for the `AUTH_PERIOD` field.
> * Conditional logic for `PHYSICIAN_CREDENTIALS` (Medicaid vs. Commercial).
> * Conditional logic for `ASD_DIAGNOSIS_DATE` based on the insurance type.
> 
> 
> **4. Update Metadata Loop:** In the `upsertCrAndWriteback` function, replace the current hardcoded insurance updates with a `for...of` loop that iterates through the object returned by `getExtendedMetadataValues`.
> **Final Instruction:** Ensure all other existing functions and the overall workflow structure remain exactly as they are currently written.

---

### **Summary of Changes (Checklist)**

| Component | Change Type | Description |
| --- | --- | --- |
| **Constants** | **Addition** | Define the 17+ new [CentralReach Metadata](https://centralreach.com/resources/api/requests/#/Metadata/ContactMetadataGetRequestcontactsContactIdmetadata_Get) `fieldIds`. |
| **HubSpot Properties** | **Addition** | Include new internal names (e.g., `allergies`, `auth_start_date`) in the API request list. |
| **Logic Layer** | **New Function** | A single helper to clean, format, and apply "Medicaid vs. Commercial" logic. |
| **Update Loop** | **Refactor** | Changes the metadata section from "update field A, then field B" to "update all fields in the mapping object." |
| **Everything Else** | **NO CHANGE** | Address logic, file uploads, and contact creation remain identical. |

### **Safety Note for Pipedream**

When you deploy these changes, the `verifyContactMetadataField` logic you already have in place will act as your safety net. It will log exactly which of these new fields succeeded or failed without interrupting the primary contact creation flow.

Does this cover everything you need for the final code merge?