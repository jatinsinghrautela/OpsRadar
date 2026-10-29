const crypto = require('crypto');

/**
 * Stable fingerprint for alarm identity (open/resolve/dedupe).
 * severity|server|app|group|normalized_message → sha256 hex
 */
function normalizeMessage(message) {
  return String(message || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function buildFingerprint({ severity, server_name, app_name, group_name, message }) {
  const parts = [
    String(severity || '').toLowerCase().trim(),
    String(server_name || '').toLowerCase().trim(),
    String(app_name || '').toLowerCase().trim(),
    String(group_name || '').toLowerCase().trim(),
    normalizeMessage(message)
  ];
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

module.exports = { buildFingerprint, normalizeMessage };
