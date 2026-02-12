According to a document from **February 2026** (CentralReach **Data Warehouse 2.0 Field Mapping v26.02**), here’s how your **Contact domain model** fields map to **DW2 table entities** and the **CentralReach UI locations**.

A couple quick clarifications (so you don’t get bitten later):

* **“Primary” vs “Secondary” payor**: DW2 includes the payor/insurance records, but the snippets available don’t show a clean “primary/secondary rank” flag—so you’ll typically treat these as **multiple insurance rows per client** and determine primary vs secondary by your business rule / ordering (or another field not shown in the excerpt).  
* **Some fields in your API domain model are *not present* (or not findable) in this DW mapping PDF** (ex: `primaryEmail`, `externalSystemId`, `clientDiagnosisCodes`, `uciNumber`, `bhpnId`). I’ve called those out explicitly.

---

## **A) Contact (Client) — Core profile fields**

| API / Domain field | DW2 table.entity.field | CentralReach UI mapping |
| ----- | ----- | ----- |
| `contact.contactId` | `dw2.Contacts.ContactId` | Contacts \> ID column |
| `contact.title` | `dw2.Contacts.Title` | Contacts \> Select contact \> Profile \> Basics \> Title |
| `contact.firstName` | `dw2.Contacts.FirstName` | Contacts \> Select contact \> Profile \> Basics \> First Name |
| `contact.middleInitial` | `dw2.Contacts.MiddleInitial` | Contacts \> Select contact \> Profile \> Basics \> MI |
| `contact.lastName` | `dw2.Contacts.LastName` | Contacts \> Select contact \> Profile \> Basics \> Last Name |
| `contact.chosenName` | `dw2.Contacts.ChosenName` | Contacts \> Clients \> Select contact \> Profile \> Basics \> Chosen/Preferred Name |
| `contact.dateOfBirth` | `dw2.Contacts.BirthDate` | Contacts \> Select contact \> Profile \> Basics \> DOB |
| `contact.guardianFirstName` | `dw2.Contacts.GuardianFirstName` | Contacts \> Clients \> Select client \> Profile \> Basics \> Parent/Guardian First Name |
| `contact.guardianLastName` | `dw2.Contacts.GuardianLastName` | Contacts \> Clients \> Select client \> Profile \> Basics \> Parent/Guardian Last Name |
| `contact.guarantorFirstName` | `dw2.Contacts.GuarantorFirstName` | Contacts \> Clients \> Select contact \> Profile \> Basics \> Guarantor First Name |
| `contact.guarantorLastName` | `dw2.Contacts.GuarantorLastName` | Contacts \> Clients \> Select contact \> Profile \> Basics \> Guarantor Last Name |
| `contact.gender` | `dw2.Contacts.Gender` | (In DW mapping excerpt) Contacts \> Select contact \> Profile \> Additional Contacts \> Gender |
| `contact.primaryEmail` | **Not found in DW mapping PDF excerpt** | (Closest in doc is **AdditionalEmail**) |
| `contact.phoneHome` | `dw2.Contacts.PhoneHome` | Contacts \> Select contact \> Profile \> Additional Contacts \> Home |
| `contact.phoneCell` | `dw2.Contacts.PhoneCell` | Contacts \> Select contact \> Profile \> Additional Contacts \> Cell |
| `contact.externalSystemId` | **Not available as a UI-mapped field**; related table exists: `dw2.ContactExternalSystem` (ExternalID is “Not visible in UI”) | Not visible in UI |
| `contact.uciNumber` | **Not found as a named field**; likely a **Custom Identifier** record | Contact \> Profile \> Settings \> Claim Settings \> Custom Identifiers (Qualifier/Value) |
| `contact.bhpnId` | **Not found as a named field**; likely a **Custom Identifier** record | Contact \> Profile \> Settings \> Claim Settings \> Custom Identifiers (Qualifier/Value) |
| `contact.clientDiagnosisCodes[]` | **Not found in DW mapping PDF excerpt** | N/A |

Note: The DW mapping explicitly defines **AdditionalEmail** (not “Primary Email”) in Basics.

---

## **B) Address — Contact address fields (system profile)**

These fields live under the **Addresses** entity (separate table), not `dw2.Contacts`.

| API / Domain field | DW2 table.entity.field | CentralReach UI mapping |
| ----- | ----- | ----- |
| `contact.addressLine1` | `dw2.Addresses.AddressLine1` | Contacts \> Select contact \> Profile \> Basics \> Address \> Address |
| `contact.addressLine2` | `dw2.Addresses.AddressLine2` | Contacts \> Select contact \> Profile \> Basics \> Address \> Address \#2 |
| `contact.city` | `dw2.Addresses.City` | Contacts \> Select contact \> Profile \> Basics \> Address \> City |
| `contact.stateProvince` | `dw2.Addresses.StateProvince` | Contacts \> Select contact \> Profile \> Basics \> Address \> State |
| `contact.zipPostalCode` | `dw2.Addresses.ZipPostalCode` | Contacts \> Select contact \> Profile \> Basics \> Address \> Zip/Postal Code |

---

## **C) Additional Contacts — Relationship entity \+ the additional contact “person” fields**

In DW2, the “additional contact” pattern is effectively:

1. A **relationship/link row** (`dw2.ContactsAdditional`) that connects the client to an additional contact record, and  
2. The **additional contact’s details** stored on a **Contacts record** (`dw2.Contacts`) (the doc’s UI mapping for company/email/phones/gender points there).

### **C1) Relationship/link fields (AdditionalContacts)**

| API / Domain field | DW2 table.entity.field | CentralReach UI mapping |
| ----- | ----- | ----- |
| `additionalContacts[].type` | `dw2.ContactsAdditional.RelationType` | Contacts \> Select client \> Profile \> Additional Contacts \> Type (drop-down) |

### **C2) Additional contact “person” fields (stored as a Contact record)**

The DW mapping excerpt ties these to the **Additional Contacts** UI area:

| API / Domain field | DW2 table.entity.field | CentralReach UI mapping |
| ----- | ----- | ----- |
| `additionalContacts[].company` | `dw2.Contacts.Company` | Contacts \> Select contact \> Profile \> Additional Contacts \> Company |
| `additionalContacts[].email` | `dw2.Contacts.Email` | Contacts \> Select contact \> Profile \> Additional Contacts \> Email |
| `additionalContacts[].phone` | `dw2.Contacts.PhoneHome` | Contacts \> Select contact \> Profile \> Additional Contacts \> Home |
| `additionalContacts[].cell` | `dw2.Contacts.PhoneCell` | Contacts \> Select contact \> Profile \> Additional Contacts \> Cell |
| `additionalContacts[].phoneWork` | `dw2.Contacts.PhoneWork` | Contacts \> Select contact \> Profile \> Additional Contacts \> Work |
| `additionalContacts[].gender` | `dw2.Contacts.Gender` | Contacts \> Select contact \> Profile \> Additional Contacts \> Gender |

**Not found in the DW mapping excerpt for Additional Contacts UI section:**  
`additionalContacts[].firstName`, `additionalContacts[].lastName`, plus the additional contact’s address fields (`address1/address2/city/state/zip`). (They *may* exist elsewhere in the PDF, but they were not present in the extracted sections available here.)

---

## **D) Payors — Primary \+ Secondary (insurance only)**

These map to the **ContactInsuranceCompanies** entity.

| API / Domain field | DW2 table.entity.field | CentralReach UI mapping |
| ----- | ----- | ----- |
| `primaryPayors[].coverageStartDate` / `secondaryPayors[].coverageStartDate` | `dw2.ContactInsuranceCompanies.CoverageStartDate` | Contacts \> Clients \> Select client \> Profile \> Payors \> Add New \> Insurance \> Insurance tab \> Coverage From |
| `primaryPayors[].coverageEndDate` / `secondaryPayors[].coverageEndDate` | `dw2.ContactInsuranceCompanies.CoverageEndDate` | Contacts \> Clients \> Select client \> Profile \> Payors \> Add New \> Insurance \> Insurance tab \> Coverage To |
| `*.coPayAmount` | `dw2.ContactInsuranceCompanies.CopayAmount` | Insurance tab \> Patient Responsibility Amount |
| `*.coPayType` | `dw2.ContactInsuranceCompanies.CopayAmountType` | Insurance tab \> Patient Responsibility Amount drop-down ($ / %) |
| `*.coPayFrequency` | `dw2.ContactInsuranceCompanies.CopayFrequency` | Insurance tab \> Patient Responsibility Amount (Per visit) |
| `*.insuranceContactPhone` | `dw2.ContactInsuranceCompanies.ContactPhone` | Insurance tab \> Insurance Contact Phone |
| `*.insuranceContactPerson` | `dw2.ContactInsuranceCompanies.ContactName` | Insurance tab \> Insurance Contact Person |
| `*.groupNumber` | `dw2.ContactInsuranceCompanies.GroupNumber` | Subscriber tab \> Group Number |
| `*.groupName` | `dw2.ContactInsuranceCompanies.GroupName` | Subscriber tab \> Policy/Group/FECA Number |
| `*.subscriberFirstName` | `dw2.ContactInsuranceCompanies.FirstName` | Subscriber tab \> First Name |
| `*.subscriberLastName` | `dw2.ContactInsuranceCompanies.LastName` | Subscriber tab \> Last Name |
| `*.subscriberGender` | `dw2.ContactInsuranceCompanies.Gender` | Subscriber tab \> Gender |
| `*.subscriberBirthDate` | `dw2.ContactInsuranceCompanies.BirthDateDay/Month/Year` | Subscriber tab \> Birthday fields |
| `*.subscriberAddress` | `dw2.ContactInsuranceCompanies.AddressLine1` | Subscriber tab \> Address |
| `*.subscriberAddressLine2` | `dw2.ContactInsuranceCompanies.AddressLine2` | Subscriber tab \> Address 2 |
| `*.subscriberCity` | `dw2.ContactInsuranceCompanies.City` | Subscriber tab \> City |
| `*.subscriberState` | `dw2.ContactInsuranceCompanies.StateProvince` | Subscriber tab \> State |
| `*.subscriberZip` | `dw2.ContactInsuranceCompanies.ZipPostalCode` | Subscriber tab \> Zip |
| `*.relationType` | `dw2.ContactInsuranceCompanies.PatientRelationType` *(patient-to-subscriber relationship)* | Patient tab \> Relationship to Subscriber |

**Not found in the DW mapping excerpt for payors:**  
`insuranceCompanyName`, `planName`, `planId/subscriberId` as named fields in your JSON (though the DW table clearly has insurance/plan IDs and a PlanNickname field).

---

## **E) “External system” \+ “Custom identifiers” (often where org-specific IDs land)**

If you need to store things like `uciNumber` / `bhpnId`, the DW mapping explicitly documents **Custom Identifiers** (Qualifier \+ Value) under Contact \> Claim Settings.

| API / Domain field | DW2 table.entity.field | CentralReach UI mapping |
| ----- | ----- | ----- |
| `uciNumber` (likely) | `dw2.ContactIdentifiers.Value` (with a specific `Qualifier`) | Contact \> Profile \> Settings \> Claim Settings \> Custom Identifiers \> Value |
| `bhpnId` (likely) | `dw2.ContactIdentifiers.Value` (with a specific `Qualifier`) | Contact \> Profile \> Settings \> Claim Settings \> Custom Identifiers \> Value |
| `externalSystemId` (conceptually) | `dw2.ContactExternalSystem.ExternalID` | Not visible in UI |

---

If you want, paste the **exact CentralReach API/domain model entity names** you’re using for:

* Contact (Client)  
* Payor (Insurance)  
* AdditionalContact  
  …and I’ll align the “Domain Model Entity” column to your naming (e.g., `Contact`, `ContactPayor`, `ContactAdditionalContact`) while keeping the DW2 \+ UI mappings intact.

