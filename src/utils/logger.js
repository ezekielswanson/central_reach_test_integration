function baseLog(level, message, meta = {}) {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
  // Keep logs PHI-safe: callers must only pass IDs/keys/ops.
  console.log(JSON.stringify(payload));
}

function info(message, meta) {
  baseLog("info", message, meta);
}

function warn(message, meta) {
  baseLog("warn", message, meta);
}

function error(message, meta) {
  baseLog("error", message, meta);
}

module.exports = {
  info,
  warn,
  error,
};
