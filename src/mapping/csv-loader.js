const fs = require("fs");

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(header) {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function parseMappingCsv(csvPath) {
  const raw = fs.readFileSync(csvPath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const rows = lines.slice(1).map((line, rowIndex) => {
    const cols = parseCsvLine(line);
    const row = { rowNumber: rowIndex + 2 };
    headers.forEach((header, colIndex) => {
      row[header] = cols[colIndex] || "";
    });
    return row;
  });

  return rows.filter((row) => row.direction.trim().toUpperCase() === "HS -> CR");
}

function needsContactFetch(mappingRows) {
  void mappingRows;
  // Deal-only mapping contract: contact hydration is disabled.
  return false;
}

function collectDealProperties(mappingRows) {
  const properties = new Set([
    "hs_object_id",
    "hs_lastmodifieddate",
    "pipeline",
    "dealstage",
    "integration_last_write",
    "updated_by_integration",
    "client_id_number",
    // Deal-only contract requires direct hydration of these mapped fields.
    "email",
    "phone",
    "phi_first_name__cloned_",
    "phi_last_name",
    "guardian_first_name",
    "guardian_last_name",
  ]);

  mappingRows
    .filter((row) => row.hubspot_object.trim().toLowerCase().startsWith("deal"))
    .forEach((row) => {
      const raw = row.hubspot_internal_value || "";
      raw
        .split("+")
        .map((token) => token.trim())
        .filter((token) => token && /^[a-z0-9_]+$/i.test(token))
        .forEach((token) => properties.add(token));
    });

  return [...properties];
}

function collectContactProperties(mappingRows) {
  void mappingRows;
  return [];
}

module.exports = {
  parseMappingCsv,
  needsContactFetch,
  collectDealProperties,
  collectContactProperties,
};
