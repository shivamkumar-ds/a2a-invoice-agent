const crypto = require('crypto');

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const sortedKeys = Object.keys(value).sort();
  const result = {};
  for (const k of sortedKeys) result[k] = canonicalize(value[k]);
  return result;
}

function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256Hex(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

// Per spec: "Hash recursively key-sorted compact JSON of the message only;
// ignore configuration." Used for (principal, messageId) idempotency.
function messageContentHash(message) {
  return sha256Hex(canonicalStringify(message));
}

// Cache key for a single invoice package's content, so identical packages
// (same packageId + same fields) never trigger a second model call even
// across new batch/message/task IDs (per "cache by canonical package
// content" in the spec's cost section).
function packageFingerprint(pkg) {
  return sha256Hex(canonicalStringify({ packageId: pkg.packageId, content: pkg }));
}

// Deterministic actionId derived from package content hash, so re-decisions
// of the SAME package are stable across batches/Checks (mirrors the
// "durable unique id" requirement). Must be >=12 chars; this gives 32.
function actionIdFromFingerprint(fingerprint) {
  return 'act_' + fingerprint.slice(0, 28);
}

module.exports = {
  canonicalize,
  canonicalStringify,
  sha256Hex,
  messageContentHash,
  packageFingerprint,
  actionIdFromFingerprint,
};
