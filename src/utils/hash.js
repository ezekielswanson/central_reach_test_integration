const crypto = require("crypto");

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortKeys(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function stableHash(value) {
  const normalized = sortKeys(value);
  return crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

module.exports = {
  stableHash,
};
