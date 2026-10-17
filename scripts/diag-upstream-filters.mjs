const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const ENDPOINT = `https://api.data.gov.in/resource/${RESOURCE_ID}`;
const PUBLIC_DEMO_KEY = '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
const envKey = (process.env.DATA_GOV_IN_API_KEY ?? '').trim();
const keySource = envKey ? 'env' : 'demo';
const apiKey = envKey || PUBLIC_DEMO_KEY;
async function probe(params, label) {
  const redacted = new URLSearchParams(params);
  redacted.set('api-key', '<redacted>');
  const res = await fetch(`${ENDPOINT}?${params}`, {
    method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(20000),
    headers: { Accept: 'application/json', 'User-Agent': 'SmartFarm-Diag/1.0' },
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON */ }
  const records = Array.isArray(json?.records) ? json.records : null;
  const first = records && records.length ? records[0] : null;
  const allCommodities = records ? [...new Set(records.map((r) => r.commodity ?? r.Commodity).filter(Boolean))] : [];
  const vals = (r) => {
    if (!r) return null;
    const pick = (...ks) => { for (const k of ks) { if (r[k] !== undefined) return r[k]; } return null; };
    return {
      state: pick('state', 'State'),
      commodity: pick('commodity', 'Commodity'),
      market: pick('market', 'Market'),
      arrival_date: pick('arrival_date', 'Arrival_Date'),
    };
  };
  console.log(JSON.stringify({
    label, url: `${ENDPOINT}?${redacted}`,
    http_status: res.status,
    api_status: json?.status ?? null,
    api_message: json?.message ?? null,
    api_total: json?.total ?? null,
    api_count: json?.count ?? null,
    records_length: records ? records.length : null,
    field_names: first ? Object.keys(first) : [],
    all_commodities: allCommodities,
    sample_values: vals(first),
    body_head: json ? null : text.slice(0, 200),
  }));
}
function p(extra) {
  const q = new URLSearchParams({ 'api-key': apiKey, format: 'json', limit: '5', offset: '0', ...extra });
  return q;
}
async function main() {
  const only = (process.argv[2] ?? '').trim();
  console.log(JSON.stringify({ key_source: keySource, resource_id: RESOURCE_ID }));
  const jobs = [
    ['A', () => probe(p({}), 'A: no filters, limit 5')],
    ['B', () => probe(p({ 'filters[commodity]': 'Coconut', 'filters[state]': 'Karnataka' }), 'B: plain Coconut+Karnataka')],
    ['C', () => probe(p({ 'filters[commodity]': 'Tomato', 'filters[state]': 'Karnataka' }), 'C: plain Tomato+Karnataka')],
    ['D', () => probe(p({ 'filters[state]': 'Karnataka' }), 'D: plain Karnataka only')],
    ['E1', () => probe(p({ 'filters[commodity.keyword]': 'Coconut', 'filters[state.keyword]': 'Karnataka' }), 'E1: keyword Coconut+Karnataka')],
    ['E2', () => probe(p({ 'filters[state.keyword]': 'Karnataka' }), 'E2: keyword Karnataka only')],
    ['F1', () => probe(p({ 'filters[commodity]': 'Coconut' }), 'F1: plain Coconut, no state')],
    ['F2', () => probe(p({ 'filters[commodity]': 'Tomato' }), 'F2: plain Tomato, no state')],
    ['F3', () => probe(p({ 'filters[commodity]': 'Sunflower/Sunflower Seed', 'filters[state]': 'Karnataka' }), 'F3: plain Sunflower+Karnataka')],
    ['F4', () => probe(p({ limit: '5', offset: '0' }), 'F4: unfiltered sample commodities')],
    ['F5', () => probe(p({ 'filters[state]': 'Karnataka', limit: '1000' }), 'F5: ALL Karnataka rows (limit 1000)')],
  ];
  for (const [tag, run] of jobs) {
    if (only && only.toUpperCase() !== tag) continue;
    await run();
  }
}
main().catch((e) => { console.error('probe failed:', e.message); process.exitCode = 1; });
