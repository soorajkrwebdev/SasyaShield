// TEMPORARY local-only one-shot — DO NOT COMMIT. Delete after use. Never imported by App/router.
// Invokes deployed market-data Edge Function in all-commodities mode: { mode: "all" }
// Reuses existing Supabase client + signed-in session. No credentials hardcoded.
// Single invocation only, no retries. Run once via: await import('/src/dev/__oneShotAll.ts')
import { supabase } from '../lib/supabase';

const GUARD_KEY = '__all_oneshot_fired';
const GLOBAL_FLAG = '__allOneShotFired';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function alreadyFired(): boolean {
  try {
    if ((globalThis as UnknownRecord)[GLOBAL_FLAG] === true) return true;
  } catch { /* ignore */ }
  try {
    if (sessionStorage.getItem(GUARD_KEY) !== null) return true;
  } catch { /* ignore */ }
  return false;
}

function markFired(): void {
  try {
    (globalThis as UnknownRecord)[GLOBAL_FLAG] = true;
  } catch { /* ignore */ }
  try {
    sessionStorage.setItem(GUARD_KEY, '1');
  } catch { /* ignore */ }
}

// Scrub only embedded api-key query values; preserve all counts/errors.
// The function response includes source_urls built from the upstream URL,
// which may embed api-key=<value> — never print that value.
function scrubApiKey(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubApiKey);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]): [string, unknown] => [k, scrubApiKey(v)]),
    );
  }
  if (typeof value === 'string') {
    return value.replace(/(api[-_]?key=)[^&\s"']+/gi, '$1[REDACTED]');
  }
  return value;
}

async function runOnce(): Promise<void> {
  if (alreadyFired()) {
    console.log(JSON.stringify({ skipped: 'already-fired-this-browser-session' }));
    return;
  }
  markFired(); // set BEFORE any network: guarantees max 1 POST, no retry

  if (!supabase) throw new Error('Supabase not configured.');

  const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
  if (sessErr || !sessionData.session) {
    throw new Error('Sign in as operator (market_data_ingest=true) first.');
  }

  // supabase-js attaches apikey + Authorization: Bearer <session-token> internally.
  // Token is never assigned to a variable, never logged, never persisted.
  const { data, error } = await supabase.functions.invoke('market-data', {
    body: { mode: 'all' },
  });

  if (error) {
    console.log(
      JSON.stringify(
        { http_status: 'edge-error', response: scrubApiKey({ message: error.message }) },
        null,
        2,
      ),
    );
    return;
  }

  // Print HTTP status + complete JSON response (api-key values redacted only).
  console.log(
    JSON.stringify({ http_status: 200, response: scrubApiKey(data ?? null) }, null, 2),
  );
}

// Single fire on import. Second import in same tab is blocked by alreadyFired().
// Final handler logs only a fixed generic message — never the original exception.
void runOnce().catch(() =>
  console.log(
    JSON.stringify({
      http_status: 'local-error',
      response: { message: 'One-shot all-mode test failed before completion.' },
    }),
  ),
);
