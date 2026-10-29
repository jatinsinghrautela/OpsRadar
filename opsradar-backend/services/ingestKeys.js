const crypto = require('crypto');

function generateIngestApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

function hashIngestApiKey(plaintext) {
  return crypto.createHash('sha256').update(String(plaintext), 'utf8').digest('hex');
}

function prefixIngestApiKey(plaintext) {
  return String(plaintext).slice(0, 8);
}

/** Generate a new key and its at-rest fields (plaintext returned only to caller). */
function createIngestKeyMaterial() {
  const plaintext = generateIngestApiKey();
  return {
    plaintext,
    ingest_api_key_hash: hashIngestApiKey(plaintext),
    ingest_api_key_prefix: prefixIngestApiKey(plaintext)
  };
}

module.exports = {
  generateIngestApiKey,
  hashIngestApiKey,
  prefixIngestApiKey,
  createIngestKeyMaterial
};
