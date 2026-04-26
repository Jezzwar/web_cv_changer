const fs   = require('fs');
const path = require('path');

const STATE_FILE   = path.join(__dirname, 'usage-state.json');
const BLOCK_AT_PCT = 0.10;

// ── File persistence helpers ──────────────────────────────────────────────────

function loadFileState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch { /* ignore corrupt file */ }
  return { limit: 1000, remaining: null, resetIn: null, updatedAt: null };
}

function saveFileState(s) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); } catch { /* ignore */ }
}

// ── Supabase persistence ──────────────────────────────────────────────────────

let supabaseClient = null;
try {
  const { supabase } = require('./supabase');
  supabaseClient = supabase;
} catch { /* not available */ }

async function loadSupabaseState() {
  if (!supabaseClient) return null;
  try {
    const { data, error } = await supabaseClient
      .from('app_usage')
      .select('remaining, limit_count, reset_in, updated_at')
      .eq('id', 1)
      .single();
    if (error || !data) return null;
    return {
      limit:     data.limit_count ?? 1000,
      remaining: data.remaining,
      resetIn:   data.reset_in,
      updatedAt: data.updated_at,
    };
  } catch { return null; }
}

async function saveSupabaseState(s) {
  if (!supabaseClient) return;
  try {
    await supabaseClient.from('app_usage').upsert({
      id:          1,
      remaining:   s.remaining,
      limit_count: s.limit,
      reset_in:    s.resetIn,
      updated_at:  s.updatedAt,
    });
  } catch { /* ignore */ }
}

// ── In-memory state (seeded from file on startup, then from Supabase async) ──

let state = loadFileState();

// On startup: pull the latest from Supabase (more reliable across deploys)
loadSupabaseState().then(remote => {
  if (!remote) return;
  // Only override if Supabase data is newer or local has no real data
  const localHasData = state.remaining !== null;
  const remoteNewer  = remote.updatedAt && (!state.updatedAt || remote.updatedAt > state.updatedAt);
  if (!localHasData || remoteNewer) {
    state = remote;
    saveFileState(state);
  }
}).catch(() => {});

// ── Public API ────────────────────────────────────────────────────────────────

function updateFromHeaders(headers) {
  const limit     = parseInt(headers.get('x-ratelimit-limit-requests'),     10);
  const remaining = parseInt(headers.get('x-ratelimit-remaining-requests'), 10);
  const resetIn   = headers.get('x-ratelimit-reset-requests');

  if (!isNaN(limit))     state.limit     = limit;
  if (!isNaN(remaining)) state.remaining = remaining;
  if (resetIn)           state.resetIn   = resetIn;
  state.updatedAt = new Date().toISOString();

  saveFileState(state);
  saveSupabaseState(state).catch(() => {});
}

function getStatus() {
  const limit     = state.limit ?? 1000;
  const remaining = state.remaining !== null ? state.remaining : limit;

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
