const fs   = require('fs');
const path = require('path');

const STATE_FILE   = path.join(__dirname, 'usage-state.json');
const BLOCK_AT_PCT = 0.10;

// ── Persist helpers ───────────────────────────────────────────────────────────

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch { /* ignore corrupt file */ }
  return { limit: 1000, remaining: null, resetIn: null, updatedAt: null };
}

function saveState(s) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); } catch { /* ignore */ }
}

// ── In-memory state (seeded from disk on module load) ────────────────────────

let state = loadState();

// ── Public API ────────────────────────────────────────────────────────────────

// Called after every Groq API call with the HTTP response headers.
function updateFromHeaders(headers) {
  const limit     = parseInt(headers.get('x-ratelimit-limit-requests'),     10);
  const remaining = parseInt(headers.get('x-ratelimit-remaining-requests'), 10);
  const resetIn   = headers.get('x-ratelimit-reset-requests');

  if (!isNaN(limit))     state.limit     = limit;
  if (!isNaN(remaining)) state.remaining = remaining;
  if (resetIn)           state.resetIn   = resetIn;
  state.updatedAt = new Date().toISOString();

  saveState(state);
}

function getStatus() {
  const limit     = state.limit ?? 1000;
  const remaining = state.remaining !== null ? state.remaining : limit; // optimistic until first call

  const pct     = remaining / limit;
  const blocked = pct < BLOCK_AT_PCT;

  return {
    limit,
    remaining,
    percentRemaining: Math.round(pct * 100),
    analysesLeft:  Math.floor(remaining / 2),
    analysesTotal: Math.floor(limit / 2),
    resetIn:   state.resetIn  ?? 'unknown',
    updatedAt: state.updatedAt ?? null,
    blocked,
  };
}

module.exports = { updateFromHeaders, getStatus };
