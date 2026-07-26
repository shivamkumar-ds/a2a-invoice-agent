// Plain JSON-file-backed store. No native compilation (avoids the
// better-sqlite3 build failures seen on some hosts' free tiers).
//
// IMPORTANT: DATA_DIR should point at a persistent volume in production.
// If left unset, it defaults to ./data next to this file, which is
// writable on Render's free tier (unlike a root-level /data path, which
// requires a mounted disk and fails with EACCES otherwise).

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const STORE_PATH = path.join(DATA_DIR, 'store.json');

function emptyState() {
  return { tasks: {}, dedup: {}, packageDecisions: {} };
}

function loadState() {
  if (!fs.existsSync(STORE_PATH)) return emptyState();
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    if (!raw.trim()) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      tasks: parsed.tasks || {},
      dedup: parsed.dedup || {},
      packageDecisions: parsed.packageDecisions || {},
    };
  } catch (err) {
    console.error('Failed to read store.json, starting from empty state:', err.message);
    return emptyState();
  }
}

let state = loadState();

let writeQueue = Promise.resolve();
function persist() {
  writeQueue = writeQueue.then(() => {
    const tmpPath = STORE_PATH + '.tmp';
    return fs.promises
      .writeFile(tmpPath, JSON.stringify(state), 'utf8')
      .then(() => fs.promises.rename(tmpPath, STORE_PATH));
  });
  return writeQueue;
}

function nowIso() {
  return new Date().toISOString();
}

// ---------------- tasks ----------------

function getTask(taskId) {
  return state.tasks[taskId] || null;
}

function putTask(task) {
  state.tasks[task.id] = task;
  persist();
}

function listTasksForPrincipal(principal) {
  return Object.values(state.tasks).filter((t) => t.principal === principal);
}

// ---------------- message dedup ----------------
// key: `${principal}::${messageId}`

function dedupKey(principal, messageId) {
  return `${principal}::${messageId}`;
}

function getDedup(principal, messageId) {
  return state.dedup[dedupKey(principal, messageId)] || null;
}

function putDedup(principal, messageId, contentHash, taskId) {
  state.dedup[dedupKey(principal, messageId)] = { contentHash, taskId, createdAt: nowIso() };
  persist();
}

// ---------------- package decision cache (keyed by content hash) ----------------

function getPackageDecision(fingerprint) {
  return state.packageDecisions[fingerprint] || null;
}

function putPackageDecision(fingerprint, proposal) {
  if (state.packageDecisions[fingerprint]) return; // first write wins
  state.packageDecisions[fingerprint] = proposal;
  persist();
}

module.exports = {
  getTask,
  putTask,
  listTasksForPrincipal,
  getDedup,
  putDedup,
  getPackageDecision,
  putPackageDecision,
};
