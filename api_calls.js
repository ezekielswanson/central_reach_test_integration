require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TOKEN_URL = 'https://login.centralreach.com/connect/token';
const API_BASE_URL = 'https://partners-api.centralreach.com/enterprise/v1';

function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(base64, 'base64').toString());
  } catch {
    return null;
  }
}

function maskSecret(value, showStart = 4, showEnd = 0) {
  if (!value) return '(not set)';
  if (value.length <= showStart + showEnd) return '***';
  const start = value.slice(0, showStart);
  const end = showEnd ? value.slice(-showEnd) : '';
  return `${start}${'*'.repeat(Math.min(8, value.length - showStart - showEnd))}${end}`;
}

function validateEnv() {
  const required = ['CR_CLIENT_ID', 'CR_CLIENT_SECRET', 'CR_API_KEY'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
  console.log('--- Credentials loaded ---');
  console.log('CR_CLIENT_ID:', process.env.CR_CLIENT_ID);
  console.log('CR_CLIENT_SECRET:', maskSecret(process.env.CR_CLIENT_SECRET));
  console.log('CR_API_KEY:', maskSecret(process.env.CR_API_KEY, 17, 0));
}

async function getAccessToken() {
  const response = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.CR_CLIENT_ID,
      client_secret: process.env.CR_CLIENT_SECRET,
      scope: 'cr-api',
    }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  const accessToken = response.data.access_token;
  console.log('Connected to CentralReach SSO. Token obtained.');

  const payload = decodeJwtPayload(accessToken);
  if (payload) {
    console.log('--- Decoded JWT payload ---');
    console.log(JSON.stringify(payload, null, 2));
    const tokenOrgId = payload.orgid ?? payload.orgId;
    console.log('Token is scoped to org ID:', tokenOrgId);
    console.log('You should be connected to this org. Client records must exist in this org for API lookups to succeed.');
  }

  console.log('CR_CLIENT_ID + CR_CLIENT_SECRET: Valid (token obtained)');
  return accessToken;
}

async function fetchClient(contactId) {
  const accessToken = await getAccessToken();
  console.log('API key loaded. Making request to CentralReach API.');
  const url = `${API_BASE_URL}/contacts/client/${contactId}`;
  console.log('Requesting:', url);

  const response = await axios.get(url, {
    headers: {
      'x-api-key': process.env.CR_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  console.log('CR_API_KEY: Valid (API accepted request)');
  return response.data;
}

async function fetchContactMetadata(contactId) {
  const accessToken = await getAccessToken();
  const url = `${API_BASE_URL}/contacts/${contactId}/metadata`;
  console.log('Requesting:', url);

  const response = await axios.get(url, {
    headers: {
      'x-api-key': process.env.CR_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
}

function writeToOutputFile(contactId, data, suffix = 'client') {
  const outputDir = path.join(__dirname, 'output_files');
  const filename = `${suffix}_${contactId}.json`;
  const filepath = path.join(outputDir, filename);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Response written to ${filepath}`);
}

async function main() {
  const CONTACT_ID = 4708516;

  try {
    validateEnv();
    const client = await fetchClient(CONTACT_ID);
    console.log('Client fetched successfully:', JSON.stringify(client, null, 2));
    writeToOutputFile(CONTACT_ID, client);

    const metadata = await fetchContactMetadata(CONTACT_ID);
    console.log('Metadata fetched successfully:', JSON.stringify(metadata, null, 2));
    writeToOutputFile(CONTACT_ID, metadata, 'metadata');
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const data = err.response?.data;
      const msg = data?.message || data?.responseStatus?.message || err.message;

      if (status === 401) {
        console.error('401 Unauthorized: Invalid or expired JWT. Ensure Authorization: Bearer <token> format.');
      } else if (status === 403) {
        console.error('403 Forbidden: Missing or incorrect API Key in header.');
      } else if (status === 404) {
        console.error('404 Not Found: Requested record not found. Client may not exist in this organization.');
        console.error('Full API response:', JSON.stringify(data, null, 2));
        console.log('Credentials: CR_CLIENT_ID + CR_CLIENT_SECRET valid (token obtained). CR_API_KEY valid (404 means request reached API, not auth failure).');
      } else if (status === 400) {
        console.error('400 Bad Request:', msg);
      } else if (status === 500) {
        console.error('500 Internal Server Error: Review header, expired JWT, or request new token.');
      } else {
        console.error(`API Error (${status}):`, msg);
      }
    } else {
      console.error(err.message);
    }
    process.exit(1);
  }
}

main();
