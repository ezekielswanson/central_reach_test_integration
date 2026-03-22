require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TOKEN_URL = 'https://login.centralreach.com/connect/token';
const API_BASE_URL = 'https://partners-api.centralreach.com/enterprise/v1';
const DEFAULT_CONTACT_ID = '4770887';
const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'get_all_labels.log');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function logEvent(level, message, data = null) {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const payload = data ? ` | ${JSON.stringify(data)}` : '';
  fs.appendFileSync(LOG_FILE, `[${timestamp}] [${level}] ${message}${payload}\n`, 'utf8');
}

function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(base64, 'base64').toString());
  } catch {
    return null;
  }
}

function validateEnv() {
  const required = ['CR_CLIENT_ID', 'CR_CLIENT_SECRET', 'CR_API_KEY'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    logEvent('ERROR', 'Missing required environment variables', { missing });
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
  logEvent('INFO', 'Environment variables validated successfully');
}

async function getAccessToken() {
  logEvent('INFO', 'Requesting access token', { tokenUrl: TOKEN_URL });
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
  const payload = decodeJwtPayload(accessToken);
  const tokenOrgId = payload?.orgid ?? payload?.orgId ?? null;
  logEvent('INFO', 'Access token received', { tokenOrgId });
  return accessToken;
}

async function fetchAllLabels(contactId) {
  const accessToken = await getAccessToken();
  const url = `${API_BASE_URL}/contacts/${contactId}/labels`;
  logEvent('INFO', 'Fetching labels', { contactId, url });

  const response = await axios.get(url, {
    headers: {
      'x-api-key': process.env.CR_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  logEvent('INFO', 'Labels request completed successfully', {
    contactId,
    status: response.status,
  });
  return response.data;
}

async function fetchOrganizationContactLabels(requestId = null) {
  const accessToken = await getAccessToken();
  const url = `${API_BASE_URL}/contacts/labels`;
  logEvent('INFO', 'Fetching organization contact labels', { requestId, url });

  const response = await axios.get(url, {
    headers: {
      'x-api-key': process.env.CR_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  logEvent('INFO', 'Organization labels request completed successfully', {
    requestId,
    status: response.status,
  });
  return response.data;
}

function getUniqueOutputPath(outputDir, baseName) {
  let candidatePath = path.join(outputDir, `${baseName}.json`);
  let suffix = 1;

  while (fs.existsSync(candidatePath)) {
    candidatePath = path.join(outputDir, `${baseName}_${suffix}.json`);
    suffix += 1;
  }

  return candidatePath;
}

function writeOutput(data, baseName = 'all_labels') {
  const outputDir = path.join(__dirname, 'output_files');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = getUniqueOutputPath(outputDir, baseName);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
  logEvent('INFO', 'Output file written', { outputPath });
  console.log(`Response written to ${outputPath}`);
}

async function main() {
  try {
    validateEnv();
    const isOrgLabelsMode = process.argv[2] === 'orglabels';
    if (isOrgLabelsMode) {
      const requestId = process.argv[3] || null;
      const outputBaseName = process.argv[4] || `org_labels${requestId ? `_${requestId}` : ''}`;
      logEvent('INFO', 'Script started in orglabels mode', { requestId, outputBaseName });
      const labels = await fetchOrganizationContactLabels(requestId);
      writeOutput(labels, outputBaseName);
      logEvent('INFO', 'Script completed successfully in orglabels mode', { requestId, outputBaseName });
      console.log('Organization contact labels fetched successfully.');
      return;
    }

    const contactId = process.argv[2] || DEFAULT_CONTACT_ID;
    const outputBaseName = process.argv[3] || 'all_labels';
    logEvent('INFO', 'Script started', { contactId, outputBaseName });
    const labels = await fetchAllLabels(contactId);
    writeOutput(labels, outputBaseName);
    logEvent('INFO', 'Script completed successfully', { contactId, outputBaseName });
    console.log(`Labels fetched successfully for contact ID ${contactId}.`);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const data = err.response?.data;
      const message = data?.message || data?.responseStatus?.message || err.message;
      logEvent('ERROR', 'Axios error while fetching labels', {
        status,
        message,
        responseData: data ?? null,
      });

      if (status === 401) {
        console.error('401 Unauthorized: Invalid or expired JWT. Ensure Authorization: Bearer <token> format.');
      } else if (status === 403) {
        console.error('403 Forbidden: Missing or incorrect API Key in header.');
      } else if (status === 404) {
        console.error('404 Not Found: Labels endpoint or org contact not found.');
      } else if (status === 429) {
        console.error('429 Rate Limit Exceeded: Try again after a short delay.');
      } else if (status === 500) {
        console.error('500 Internal Server Error: Review headers and token validity.');
      } else {
        console.error(`API Error (${status}): ${message}`);
      }
    } else {
      logEvent('ERROR', 'Unexpected non-Axios error', { message: err.message, stack: err.stack });
      console.error(err.message);
    }

    logEvent('INFO', 'Script terminated with failure');
    process.exit(1);
  }
}

main();
