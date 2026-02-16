\> ## Documentation Index
> Fetch the complete documentation index at: https://developers.hubspot.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

---
id: 1784e96e-b149-4272-b37d-bd0a0d9cb0e6
---

# CRM search

> The CRM search endpoints make getting data more efficient by allowing developers to filter, sort, and search across any CRM object type.

Use the CRM search endpoints to filter, sort, and search objects, records, and engagements across your CRM. For example, use the endpoints to get a list of contacts in your account, or a list of all open deals. To use these endpoints from an app, a CRM scope is required. Refer to this \[list of available scopes\](/apps/developer-platform/build-apps/authentication/scopes) to learn which granular CRM scopes can be used to accomplish your goal.

## Make a search request

To search your CRM, make a \`POST\` request to the object's search endpoint. CRM search endpoints are constructed using the following format: \`/crm/v3/objects/{object}/search\`. In the request body, you'll include \[filters\](#filter-search-results) to narrow your search by CRM property values. For example, the code snippet below would retrieve a list of all contacts that have a specific company email address.

\`\`\`json  theme={null}
{
  "filterGroups": \[
    {
      "filters": \[
        {
          "propertyName": "email",
          "operator": "CONTAINS\_TOKEN",
          "value": "\*@hubspot.com"
        }
      \]
    }
  \]
}
\`\`\`

Each object that you search will include a set of \[default properties\](#objects) that gets returned. For contacts, a search will return \`createdate\`, \`email\`, \`firstname\`, \`hs\_object\_id\`, \`lastmodifieddate\`, and \`lastname\`. For example, the above request would return the following response:

\`\`\`json  theme={null}
{
  "total": 2,
  "results": \[
    {
      "id": "100451",
      "properties": {
        "createdate": "2024-01-17T19:55:04.281Z",
        "email": "testperson@hubspot.com",
        "firstname": "Test",
        "hs\_object\_id": "100451",
        "lastmodifieddate": "2024-09-11T13:27:39.356Z",
        "lastname": "Person"
      },
      "createdAt": "2024-01-17T19:55:04.281Z",
      "updatedAt": "2024-09-11T13:27:39.356Z",
      "archived": false
    },
    {
      "id": "57156923994",
      "properties": {
        "createdate": "2024-09-11T18:21:50.012Z",
        "email": "emailmaria@hubspot.com",
        "firstname": "Maria",
        "hs\_object\_id": "57156923994",
        "lastmodifieddate": "2024-10-21T21:36:02.961Z",
        "lastname": "Johnson (Sample Contact)"
      },
      "createdAt": "2024-09-11T18:21:50.012Z",
      "updatedAt": "2024-10-21T21:36:02.961Z",
      "archived": false
    }
  \]
}
\`\`\`

To return a specific set of properties, include a \`properties\` array in the request body. For example:

\`\`\`json  theme={null}
{
  "filterGroups": \[
    {
      "filters": \[
        {
          "propertyName": "annualrevenue",
          "operator": "GT",
          "value": "10000000"
        }
      \]
    }
  \],
  "properties": \["annualrevenue", "name"\]
}
\`\`\`

The response for the above request would look like:

\`\`\`json  theme={null}
{
  "total": 38,
  "results": \[
    {
      "id": "2810868468",
      "properties": {
        "annualrevenue": "1000000000",
        "createdate": "2020-01-09T20:11:27.309Z",
        "hs\_lastmodifieddate": "2024-09-13T20:23:03.333Z",
        "hs\_object\_id": "2810868468",
        "name": "Google"
      },
      "createdAt": "2020-01-09T20:11:27.309Z",
      "updatedAt": "2024-09-13T20:23:03.333Z",
      "archived": false
    },
    {
      "id": "2823023532",
      "properties": {
        "annualrevenue": "10000000000",
        "createdate": "2020-01-13T16:21:08.270Z",
        "hs\_lastmodifieddate": "2024-09-13T20:23:03.064Z",
        "hs\_object\_id": "2823023532",
        "name": "Pepsi"
      },
      "createdAt": "2020-01-13T16:21:08.270Z",
      "updatedAt": "2024-09-13T20:23:03.064Z",
      "archived": false
    },
    {
      "id": "5281147580",
      "properties": {
        "annualrevenue": "50000000",
        "createdate": "2021-02-01T21:17:12.250Z",
        "hs\_lastmodifieddate": "2024-09-13T20:23:03.332Z",
        "hs\_object\_id": "5281147580",
        "name": "CORKCICLE"
      },
      "createdAt": "2021-02-01T21:17:12.250Z",
      "updatedAt": "2024-09-13T20:23:03.332Z",
      "archived": false
    },
    {
      "id": "5281147581",
      "properties": {
        "annualrevenue": "1000000000",
        "createdate": "2021-02-01T21:17:12.250Z",
        "hs\_lastmodifieddate": "2024-09-13T20:23:03.064Z",
        "hs\_object\_id": "5281147581",
        "name": "Ulta Beauty"
      },
      "createdAt": "2021-02-01T21:17:12.250Z",
      "updatedAt": "2024-09-13T20:23:03.064Z",
      "archived": false
    },
    {
      "id": "5281147583",
      "properties": {
        "annualrevenue": "50000000",
        "createdate": "2021-02-01T21:17:12.251Z",
        "hs\_lastmodifieddate": "2024-09-13T20:23:03.332Z",
        "hs\_object\_id": "5281147583",
        "name": "Narvar"
      },
      "createdAt": "2021-02-01T21:17:12.251Z",
      "updatedAt": "2024-09-13T20:23:03.332Z",
      "archived": false
    },
    {
      "id": "5281496154",
      "properties": {
        "annualrevenue": "1000000000",
        "createdate": "2021-02-01T21:17:12.267Z",
        "hs\_lastmodifieddate": "2024-09-13T20:23:03.332Z",
        "hs\_object\_id": "5281496154",
        "name": "Etsy Inc"
      },
      "createdAt": "2021-02-01T21:17:12.267Z",
      "updatedAt": "2024-09-13T20:23:03.332Z",
      "archived": false
    },
    {
      "id": "5281496155",
      "properties": {
        "annualrevenue": "1000000000",
        "createdate": "2021-02-01T21:17:12.267Z",
        "hs\_lastmodifieddate": "2024-09-13T20:23:03.069Z",
        "hs\_object\_id": "5281496155",
        "name": "grubhub"
      },
      "createdAt": "2021-02-01T21:17:12.267Z",
      "updatedAt": "2024-09-13T20:23:03.069Z",
      "archived": false
    },
    {
      "id": "5281496157",
      "properties": {
        "annualrevenue": "1000000000",
        "createdate": "2021-02-01T21:17:12.267Z",
        "hs\_lastmodifieddate": "2024-09-13T20:23:03.332Z",
        "hs\_object\_id": "5281496157",
        "name": "discover"
      },
      "createdAt": "2021-02-01T21:17:12.267Z",
      "updatedAt": "2024-09-13T20:23:03.332Z",
      "archived": false
    },
    {
      "id": "5281496158",
      "properties": {
        "annualrevenue": "50000000",
        "createdate": "2021-02-01T21:17:12.268Z",
        "hs\_lastmodifieddate": "2024-09-13T20:23:03.064Z",
        "hs\_object\_id": "5281496158",
        "name": "Soludos"
      },
      "createdAt": "2021-02-01T21:17:12.268Z",
      "updatedAt": "2024-09-13T20:23:03.064Z",
      "archived": false
    },
    {
      "id": "5281499282",
      "properties": {
        "annualrevenue": "1000000000",
        "createdate": "2021-02-01T21:17:12.285Z",
        "hs\_lastmodifieddate": "2024-09-13T20:23:03.066Z",
        "hs\_object\_id": "5281499282",
        "name": "AEO Management Co."
      },
      "createdAt": "2021-02-01T21:17:12.285Z",
      "updatedAt": "2024-09-13T20:23:03.066Z",
      "archived": false
    }
  \],
  "paging": {
    "next": {
      "after": "10"
    }
  }
}
\`\`\`

## Searchable CRM objects and engagements

### Objects

The tables below contain the object search endpoints, the objects they refer to, and the properties that are returned by default.

| Search endpoint                               | Object                   | Default returned properties                                                                                                                             |
| --------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| \`/crm/v3/objects/carts/search\`                | Carts                    | \`createdate\`, \`hs\_lastmodifieddate\`, \`hs\_object\_id\`                                                                                                     |
| \`/crm/v3/objects/companies/search\`            | Companies                | \`name\`, \`domain\`, \`createdate\`,\`hs\_lastmodifieddate\`, \`hs\_object\_id\`                                                                                    |
| \`/crm/v3/objects/contacts/search\`             | Contacts                 | \`firstname\`,\`lastname\`,\`email\`,\`lastmodifieddate\`,\`hs\_object\_id\`, \`createdate\`                                                                          |
| \`/crm/v3/objects/deals/search\`                | Deals                    | \`dealname\`, \`amount\`, \`closedate\`, \`pipeline\`, \`dealstage\`, \`createdate\`, \`hs\_lastmodifieddate\`, \`hs\_object\_id\`                                         |
| \`/crm/v3/objects/deal\_split/search\`           | Deal splits              | \`hs\_createdate\`, \`hs\_lastmodifieddate\`, \`hs\_object\_id\`                                                                                                  |
| \`/crm/v3/objects/discounts/search\`            | Discounts                | \`createdate\`, \`hs\_lastmodifieddate\`, \`hs\_object\_id\`                                                                                                     |
| \`/crm/v3/objects/feedback\_submissions/search\` | Feedback submissions     | \`hs\_createdate\`,\`hs\_lastmodifieddate\`,\`hs\_object\_id\`                                                                                                    |
| \`/crm/v3/objects/fees/search\`                 | Fees                     | \`createdate\`, \`hs\_lastmodifieddate\`, \`hs\_object\_id\`                                                                                                     |
| \`/crm/v3/objects/invoices/search\`             | Invoices                 | \`createdate\`, \`hs\_lastmodifieddate\`, \`hs\_object\_id\`                                                                                                     |
| \`/crm/v3/objects/leads/search\`                | Leads                    | \`createdate\`, \`hs\_lastmodifieddate\`, \`hs\_object\_id\`                                                                                                     |
| \`/crm/v3/objects/line\_items/search\`           | Line items               | \`quantity\`, \`amount\`, \`price\`, \`createdate\`, \`hs\_lastmodifieddate\`, \`hs\_object\_id\`                                                                      |
| \`/crm/v3/objects/orders/search\`               | Orders                   | \`createdate\`, \`hs\_lastmodifieddate\`, \`hs\_object\_id\`                                                                                                     |
| \`/crm/v3/objects/commerce\_payments/search\`    | Payments                 | \`createdate\`, \`hs\_lastmodifieddate\`, \`hs\_object\_id\`                                                                                                     |
| \`/crm/v3/objects/products/search\`             | Products                 | \`name\`, \`description\` ,\`price\`, \`createdate\`, \`hs\_lastmodifieddate\`, \`hs\_object\_id\`                                                                     |
| \`/crm/v3/objects/quotes/search\`               | Quotes                   | \`hs\_expiration\_date\`, \`hs\_public\_url\_key\`, \`hs\_status\`,\`hs\_title\`, \`hs\_createdate\`, \`hs\_lastmodifieddate\`,\`hs\_object\_id\`                                |
| \`/crm/v3/objects/subscriptions/search\`        | Subscriptions (Commerce) | \`hs\_createdate\`, \`hs\_lastmodifieddate\`, \`hs\_object\_id\`                                                                                                  |
| \`/crm/v3/objects/taxes/search\`                | Taxes                    | \`createdate\`, \`hs\_lastmodifieddate\`, \`hs\_object\_id\`                                                                                                     |
| \`/crm/v3/objects/tickets/search\`              | Tickets                  | \`content\`, \`hs\_pipeline\`, \`hs\_pipeline\_stage\`,\`hs\_ticket\_category\`, \`hs\_ticket\_priority\`, \`subject\`,\`createdate\`, \`hs\_lastmodifieddate\`, \`hs\_object\_id\` |

### Engagements

The table below contains the engagement search endpoints, the engagements they refer to, and the properties that are returned by default.

| Search endpoint                   | Engagement | Default returned properties                          |
| --------------------------------- | ---------- | ---------------------------------------------------- |
| \`/crm/v3/objects/calls/search\`    | Calls      | \`hs\_createdate\`,\`hs\_lastmodifieddate\`,\`hs\_object\_id\` |
| \`/crm/v3/objects/emails/search\`   | Emails     | \`hs\_createdate\`,\`hs\_lastmodifieddate\`,\`hs\_object\_id\` |
| \`/crm/v3/objects/meetings/search\` | Meetings   | \`hs\_createdate\`,\`hs\_lastmodifieddate\`,\`hs\_object\_id\` |
| \`/crm/v3/objects/notes/search\`    | Notes      | \`hs\_createdate\`,\`hs\_lastmodifieddate\`,\`hs\_object\_id\` |
| \`/crm/v3/objects/tasks/search\`    | Tasks      | \`hs\_createdate\`,\`hs\_lastmodifieddate\`,\`hs\_object\_id\` |

## Search default searchable properties

Search all default text properties in records of the specified object to find all records that have a value containing the specified string. By default, the results will be returned in order of object creation (oldest first), but you can override this with \[sorting\](#sorting). For example, the request below searches for all contacts with a default text property value containing the letter \`X\`.

\`\`\`shell  theme={null}
curl https://api.hubapi.com/crm/v3/objects/contacts/search \\
  --request POST \\
  --header "Content-Type: application/json" \\
  --header "authorization: Bearer YOUR\_ACCESS\_TOKEN" \\
  --data '{
    "query": "x"
  }'
\`\`\`

Below are the properties that are searched by default through the above method:

| Search endpoint                               | Object               | Default searchable properties                                                                                                                                    |
| --------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| \`/crm/v3/objects/calls/search\`                | Calls                | \`hs\_call\_title\`, \`hs\_body\_preview\`                                                                                                                               |
| \`/crm/v3/objects/companies/search\`            | Companies            | \`website\`, \`phone\`, \`name\`, \`domain\`                                                                                                                             |
| \`/crm/v3/objects/contacts/search\`             | Contacts             | \`firstname\`,\`lastname\`,\`email\`,\`phone\`,\`hs\_additional\_emails\`, \`fax\`, \`mobilephone\`, \`company\`, \`hs\_marketable\_until\_renewal\`                                    |
| \`/crm/v3/objects/{objectType}/search\`         | Custom objects       | Up to 20 selected properties.                                                                                                                                    |
| \`/crm/v3/objects/deals/search\`                | Deals                | \`dealname\`,\`pipeline\`,\`dealstage\`, \`description\`, \`dealtype\`                                                                                                     |
| \`/crm/v3/objects/emails/search\`               | Emails               | \`hs\_email\_subject\`                                                                                                                                               |
| \`/crm/v3/objects/feedback\_submissions/search\` | Feedback submissions | \`hs\_submission\_name\`, \`hs\_content\`                                                                                                                               |
| \`/crm/v3/objects/meetings/search\`             | Meetings             | \`hs\_meeting\_title\`, \`hs\_meeting\_body\`                                                                                                                            |
| \`/crm/v3/objects/notes/search\`                | Notes                | \`hs\_note\_body\`                                                                                                                                                   |
| \`/crm/v3/objects/products/search\`             | Products             | \`name\`, \`description\` ,\`price\`, \`hs\_sku\`                                                                                                                         |
| \`/crm/v3/objects/quotes/search\`               | Quotes               | \`hs\_sender\_firstname\`, \`hs\_sender\_lastname\`, \`hs\_proposal\_slug\`, \`hs\_title\`, \`hs\_sender\_company\_name\`, \`hs\_sender\_email\`, \`hs\_quote\_number\`, \`hs\_public\_url\_key\` |
| \`/crm/v3/objects/tasks/search\`                | Tasks                | \`hs\_task\_body\`, \`hs\_task\_subject\`                                                                                                                                |
| \`/crm/v3/objects/tickets/search\`              | Tickets              | \`subject\`, \`content\`, \`hs\_pipeline\_stage\`, \`hs\_ticket\_category\`, \`hs\_ticket\_id\`                                                                                  |

## Filter search results

Use filters in the request body to limit the results to only records with matching property values. For example, the request below searches for all contacts with a first name of \*Alice.\*

<Warning>
  \*\*Please note:\*\* when filtering search results for calls, conversations, emails, meetings, notes, or tasks, the property \`hs\_body\_preview\_html\` is not supported. For emails, the properties \`hs\_email\_html\` and \`hs\_body\_preview\` are also not supported.
</Warning>

\`\`\`shell  theme={null}
curl https://api.hubapi.com/crm/v3/objects/contacts/search \\
  --request POST \\
  --header "Content-Type: application/json" \\
  --header "authorization: Bearer YOUR\_ACCESS\_TOKEN" \\

  --data '{
    "filterGroups":\[
      {
        "filters":\[
          {
            "propertyName": "firstname",
            "operator": "EQ",
            "value": "Alice"
          }
        \]
      }
    \]
  }'
\`\`\`

To include multiple filter criteria, you can group \`filters\` within \*\*\`filterGroups\`\*\*:

\* To apply \*AND\* logic, include a comma-separated list of conditions within one set of \`filters\`.
\* To apply \*OR\* logic, include multiple \`filters\` within a \`filterGroup\`.You can include a maximum of five \`filterGroups\` with up to 6 \`filters\` in each group, with a maximum of 18 filters in total. If you've included too many groups or filters, you'll receive a \`VALIDATION\_ERROR\` error response. For example, the request below searches for contacts with the first name \`Alice\` AND a last name other than \`Smith\`\*,\* OR contacts that don't have a value for the property \`email\`.

\`\`\`shell  theme={null}
curl https://api.hubapi.com/crm/v3/objects/contacts/search \\
  --request POST \\
  --header "Content-Type: application/json" \\
  --header "authorization: Bearer YOUR\_ACCESS\_TOKEN" \\
  --data '{
  "filterGroups": \[
    {
      "filters": \[
        {
          "propertyName": "firstname",
          "operator": "EQ",
          "value": "Alice"
        },
        {
          "propertyName": "lastname",
          "operator": "NEQ",
          "value": "Smith"
        }
      \]
    },
    {
      "filters": \[
        {
          "propertyName": "email",
          "operator": "NOT\_HAS\_PROPERTY"
        }
      \]
    }
  \]
}'
\`\`\`

You can use operators in filters to specify which records should be returned. Values in filters are case-insensitive, with the following two exceptions:

\* When filtering for an enumeration property, search is case-sensitive for all filter operators.
\* When filtering for a string property using \`IN\` and \`NOT\_IN\` operators, the searched values must be lowercase.Below are the available filter operators:

| Operator             | Description                                                                                                                                                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| \`LT\`                 | Less than the specified value.                                                                                                                                                                                                                  |
| \`LTE\`                | Less than or equal to the specified value.                                                                                                                                                                                                      |
| \`GT\`                 | Greater than the specified value.                                                                                                                                                                                                               |
| \`GTE\`                | Greater than or equal to the specified value.                                                                                                                                                                                                   |
| \`EQ\`                 | Equal to the specified value.                                                                                                                                                                                                                   |
| \`NEQ\`                | Not equal to the specified value.                                                                                                                                                                                                               |
| \`BETWEEN\`            | Within the specified range. In your request, use key-value pairs to set \`highValue\` and \`value\`. Refer to the example below the table.                                                                                                          |
| \`IN\`                 | Included within the specified list. Searches by exact match. In your request, include the list values in a \`values\` array. When searching a string property with this operator, values must be lowercase. Refer to the example below the table. |
| \`NOT\_IN\`             | Not included within the specified list. In your request, include the list values in a \`values\` array. When searching a string property with this operator, values must be lowercase.                                                            |
| \`HAS\_PROPERTY\`       | Has a value for the specified property.                                                                                                                                                                                                         |
| \`NOT\_HAS\_PROPERTY\`   | Doesn't have a value for the specified property.                                                                                                                                                                                                |
| \`CONTAINS\_TOKEN\`     | Contains a token. In your request, you can use wildcards (\\\*) to complete a partial search. For example, use the value \`\*@hubspot.com\` to retrieve contacts with a HubSpot email address.                                                       |
| \`NOT\_CONTAINS\_TOKEN\` | Doesn't contain a token.                                                                                                                                                                                                                        |

For example, you can use the \`BETWEEN\` operator to search for all tasks that were last modified within a specific time range:

\`\`\`shell  theme={null}
curl https://api.hubapi.com/crm/v3/objects/tasks/search \\
  --request POST \\
  --header "Content-Type: application/json" \\
  --header "authorization: Bearer YOUR\_ACCESS\_TOKEN" \\
  --data '{
   "filterGroups":\[{
      "filters":\[
        {
          "propertyName":"hs\_lastmodifieddate",
          "operator":"BETWEEN",
          "highValue": "1642672800000",
          "value":"1579514400000"
        }
      \]
    }\]
}'
\`\`\`

For another example, you can use the \`IN\` operator to search for companies that have specified values selected in a dropdown property.

\`\`\`shell  theme={null}
curl https://api.hubapi.com/crm/v3/objects/companies/search \\
  --request POST \\
  --header "Content-Type: application/json" \\
  --header "authorization: Bearer YOUR\_ACCESS\_TOKEN" \\
  --data '{
    "filterGroups":\[
      {
        "filters":\[
          {
           "propertyName":"enumeration\_property",
           "operator":"IN",
          "values": \["value\_1", "value\_2"\]
        }
        \]
      }
    \],
   "properties": \["annualrevenue", "enumeration\_property", "name"\]
  }'
\`\`\`

## Search through associations

Search for records that are associated with other specific records by using the pseudo-property \`associations.{objectType}\`. For example, the request below searches for all tickets associated with a contact that has the contact ID of \`123\`:

\`\`\`shell  theme={null}
curl https://api.hubapi.com/crm/v3/objects/tickets/search \\
  --request POST \\
  --header "Content-Type: application/json" \\
  --header "authorization: Bearer YOUR\_ACCESS\_TOKEN" \\
  --data '{
    "filters": \[
      {
        "propertyName": "associations.contact",
        "operator": "EQ",
        "value": "123"
      }
    \]
  }'
\`\`\`

<Warning>
  \*\*Please note:\*\* the option to search through custom object associations is not currently supported via search endpoints. To find custom object associations, you can use the \[associations API\](/api-reference/crm-associations-v4/guide).
</Warning>

## Sort search results

Use a sorting rule in the request body to list results in ascending or descending order. Only one sorting rule can be applied to any search. For example, the request below sorts returned contacts with most recently created first:

\`\`\`shell  theme={null}
curl https://api.hubapi.com/crm/v3/objects/contacts/search \\
  --request POST \\
  --header "Content-Type: application/json" \\
  --header "authorization: Bearer YOUR\_ACCESS\_TOKEN" \\
  --data '{
    "sorts": \[
      {
        "propertyName": "createdate",
        "direction": "DESCENDING"
      }
    \]
  }'
\`\`\`

## Paging through results

By default, the search endpoints will return pages of 10 records at a time. This can be changed by setting the \`limit\` parameter in the request body. The maximum number of supported objects per page is 200. For example, the request below would return pages containing 20 results each.

\`\`\`shell  theme={null}
curl https://api.hubapi.com/crm/v3/objects/contacts/search \\
  --request POST \\
  --header "Content-Type: application/json" \\
  --header "authorization: Bearer YOUR\_ACCESS\_TOKEN" \\
  --data '{
    "limit": 20
  }'
\`\`\`

To access the next page of results, you must pass an \*\*\`after\`\*\* parameter provided in the \*\*\`paging.next.after\`\*\* property of the previous response. If the \*\*\`paging.next.after\`\*\* property isn’t provided, there are no additional results to display. You must format the value in the \`after\` parameter as an integer. For example, the request below would return the next page of results:

\`\`\`shell  theme={null}
curl https://api.hubapi.com/crm/v3/objects/contacts/search \\
  --request POST \\
  --header "Content-Type: application/json" \\
  --header "authorization: Bearer YOUR\_ACCESS\_TOKEN" \\
  --data '{
    "after": "20"
  }'
\`\`\`

## Limits

\* It may take a few moments for newly created or updated CRM objects to appear in search results.
\* Archived CRM objects won’t appear in any search results.
\* The search endpoints are \[rate limited\](/developer-tooling/platform/usage-guidelines) to <u>five</u> requests per second per account.
\* The maximum number of supported objects per page is 200.
\* A query can contain a maximum of 3,000 characters. If the body of your request exceeds 3,000 characters, a 400 error will be returned.
\* The search endpoints are limited to 10,000 total results for any given query. Attempting to page beyond 10,000 will result in a 400 error.
\* When \[filtering\](#filter-search-results), you can include a maximum of five \`filterGroups\` with up to six \`filters\` in each group, with a maximum of 18 filters in total.
\* When searching for phone numbers, HubSpot uses special calculated properties to standardize the format. These properties all start with \`hs\_searchable\_calculated\_\*\`. As a part of this standardization, HubSpot only uses the area code and local number. You should refrain from including the country code in your search or filter criteria.

---
Source: [Untitled](https://developers.hubspot.com/docs/api-reference/search/guide.md)