/**
 * data.gov.in (AGMARKNET) market-price integration — LOCAL VERIFICATION ONLY.
 *
 * Purpose: verify the official data.gov.in resource that is intended to replace
 * the now-blocked AGMARKNET web endpoint, without touching production.
 *   - Confirms resource ID + endpoint reachability
 *   - Reports HTTP status, returned field names (incl. exact price-key spelling)
 *   - Checks Arecanut / Coconut / Black Pepper coverage for Karnataka markets
 *
 * SECURITY:
 *   - Never prints, logs, or commits any API key.
 *   - Uses the publicly documented data.gov.in sample/demo key as a fallback
 *     (published openly on data.gov.in; explicitly "not a secret").
 *   - If DATA_GOV_IN_API_KEY is set in the environment it is preferred, but its
 *     value is never emitted — only whether a key was found.
 *
 * Run:  node scripts/test-datagovin-market-data.local.mjs
 */

const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const ENDPOINT = `https://api.data.gov.in/resource/${RESOURCE_ID}`;

// Publicly documented data.gov.in demo key (caps responses at 10 rows/request;
// sufficient for a verification probe). Not a secret.
const PUBLIC_DEMO_KEY = '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';

// Prefer the project's own key from env (same secret already configured on the
// linked Supabase project) but never reveal its value.
const envKey = (process.env.DATA_GOV_IN_API_KEY ?? '').trim();
const keySource = envKey ? 'DATA_GOV_IN_API_KEY (from env — value redacted)' : 'public data.gov.in demo key (redacted)';
const apiKey = envKey || PUBLIC_DEMO_KEY;

// Candidate commodity spellings in the data.gov.in feed (feed uses its own labels).
const TARGETS = [
  { canonical: 'Arecanut', spellings: ['Arecanut(Betelnut/Supari)', 'Arecanut', 'Betelnut'] },
  { canonical: 'Coconut', spellings: ['Coconut'] },
  { canonical: 'Black Pepper', spellings: ['Black pepper', 'Black Pepper'] },
];

const STATE = 'Karnataka';

function redactHeaders(headers) {
  // Show header NAMES only; redact any value that could carry the key.
  const out = {};
  for (const [name] of headers.entries()) out[name] = '<redacted>';
  return out;
}

async function probe(url) {
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'manual',
    signal: AbortSignal.timeout(20_000),
    headers: { Accept: 'application/json, text/plain, */*', 'User-Agent': 'Mozilla/5.0' },
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON body (e.g. HTML) */ }
  return { status: res.status, json, body: text };
}

function fieldNamesOf(record) {
  return record && typeof record === 'object' ? Object.keys(record) : [];
}

async function main() {
  const report = {
    dry_run: true,
    database_writes: 0,
    resource_id: RESOURCE_ID,
    endpoint: ENDPOINT,
    api_key_source: keySource,
    note: 'Uses only the publicly documented data.gov.in demo key or DATA_GOV_IN_API_KEY from env; key value is never printed.',
  };

  // 1) Baseline probe — reveal the response shape + price-key spelling.
  const baseParams = new URLSearchParams({ 'api-key': apiKey, format: 'json', limit: '10' });
  try {
    const base = await probe(`${ENDPOINT}?${baseParams.toString()}`);
    report.baseline = {
      url: `${ENDPOINT}?format=json&limit=10&api-key=<redacted>`,
      http_status: base.status,
      status_field: base.json?.status ?? null,
      total: base.json?.total ?? null,
      count: base.json?.count ?? null,
      record_count: Array.isArray(base.json?.records) ? base.json.records.length : 0,
      returned_field_names: fieldNamesOf(base.json?.records?.[0]),
      sample_record: base.json?.records?.[0] ?? base.body.slice(0, 300),
    };
  } catch (err) {
    report.baseline = { error: String(err?.message ?? err), cause: err?.cause?.code ?? null };
  }

  // 2) Per-commodity coverage for Karnataka markets.
  report.coverage = [];
  for (const target of TARGETS) {
    let matched = null;
    for (const spelling of target.spellings) {
      const params = new URLSearchParams({
        'api-key': apiKey,
        format: 'json',
        limit: '10',
        'filters[state.keyword]': STATE,
        'filters[commodity.keyword]': spelling,
      });
      try {
        const r = await probe(`${ENDPOINT}?${params.toString()}`);
        const records = Array.isArray(r.json?.records) ? r.json.records : [];
        if (r.status === 200 && records.length > 0) {
          matched = {
            canonical: target.canonical,
            commodity_spelling_tried: spelling,
            http_status: r.status,
            records_found: records.length,
            total_for_filter: r.json?.total ?? null,
            sample: records[0],
          };
          break;
        }
        if (!matched) {
          matched = {
            canonical: target.canonical,
            commodity_spelling_tried: spelling,
            http_status: r.status,
            records_found: records.length,
            total_for_filter: r.json?.total ?? null,
          };
        }
      } catch (err) {
        matched = { canonical: target.canonical, commodity_spelling_tried: spelling, error: String(err?.message ?? err) };
        break;
      }
    }
    report.coverage.push(matched);
  }

  report.summary = {
    karnataka_records_available: report.coverage.filter((c) => c?.records_found > 0).map((c) => c.canonical),
    arecanut_ok: (report.coverage.find((c) => c?.canonical === 'Arecanut')?.records_found ?? 0) > 0,
    coconut_ok: (report.coverage.find((c) => c?.canonical === 'Coconut')?.records_found ?? 0) > 0,
    black_pepper_ok: (report.coverage.find((c) => c?.canonical === 'Black Pepper')?.records_found ?? 0) > 0,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(`data.gov.in verification failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
