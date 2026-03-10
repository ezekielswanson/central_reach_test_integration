require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TOKEN_URL = 'https://login.centralreach.com/connect/token';
const API_BASE_URL = 'https://partners-api.centralreach.com/enterprise/v1';
const DEFAULT_CONTACT_ID = '4770887';

function validateEnv() {
  const required = ['CR_CLIENT_ID', 'CR_CLIENT_SECRET', 'CR_API_KEY'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
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

  return response.data.access_token;
}

async function fetchAllLabels(contactId) {
  const accessToken = await getAccessToken();
  const url = `${API_BASE_URL}/contacts/${contactId}/labels`;

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

function writeOutput(data) {
  const outputDir = path.join(__dirname, 'output_files');
  const outputPath = path.join(outputDir, 'all_labels.json');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Response written to ${outputPath}`);
}

async function main() {
  try {
    validateEnv();
    const contactId = process.argv[2] || DEFAULT_CONTACT_ID;
    const labels = await fetchAllLabels(contactId);
    writeOutput(labels);
    console.log(`Labels fetched successfully for contact ID ${contactId}.`);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const data = err.response?.data;
      const message = data?.message || data?.responseStatus?.message || err.message;

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
      console.error(err.message);
    }

    process.exit(1);
  }
}

main();
