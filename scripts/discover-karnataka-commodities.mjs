/**
 * READ-ONLY discovery probe: distinct Karnataka commodities.
 * AWAITING APPROVAL — DO NOT RUN until explicitly approved.
 * Run: node scripts/discover-karnataka-commodities.mjs
 */
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';

const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const ENDPOINT = `https://api.data.gov.in/resource/${RESOURCE_ID}`;
const STATE = 'Karnataka';
const PAGE_LIMIT = 1000;
const MAX_PAGES = 10;

function fieldOf(row, base) {
  const low = base.toLowerCase();
  for (const k of Object.keys(row)) {
    if (k.toLowerCase() === low) return row[k];
  }
  return undefined;
}

async function main() {
  const apiKey = (process.env.DATA_GOV_IN_API_KEY ?? '').trim();
  if (!apiKey) throw new Error('Set DATA_GOV_IN_API_KEY in env first.');
  const rl = createInterface({ input: stdin, output: stdout });
  const ans = (await rl.question(`Probe ${PAGE_LIMIT} rows x up to ${MAX_PAGES} pages for state=Karnataka (GET only)? [y/N] `)).trim();
  rl.close();
  if (ans.toLowerCase() !== 'y') {
    console.log(JSON.stringify({ aborted: true }));
    return;
  }
  const counts = new Map();
  let pagesRead = 0;
  let apiTotal = null;
  let complete = false;
  let lastStatus = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      'api-key': apiKey,
      format: 'json',
      limit: String(PAGE_LIMIT),
      offset: String(page * PAGE_LIMIT),
      'filters[state]': STATE,
    });
    const res = await fetch(`${ENDPOINT}?${params}`, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
      headers: { Accept: 'application/json', 'User-Agent': 'SmartFarm-Discovery-Probe/1.0' },
    });
    lastStatus = res.status;
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || !Array.isArray(json.records)) {
      console.log(JSON.stringify({
        http_status: res.status,
        api_total: apiTotal,
        pages_read: pagesRead,
        distinct_commodities: counts.size,
        commodities: [...counts].map(([label, n]) => ({ label, records: n })).sort((a, b) => b.records - a.records),
        pagination: 'error',
        error: `HTTP ${res.status}`,
      }, null, 2));
      return;
    }
    if (apiTotal === null && Number.isFinite(Number(json.total))) apiTotal = Number(json.total);
    pagesRead += 1;
    for (const row of json.records) {
      const c = String(fieldOf(row, 'commodity') ?? '').replace(/\s+/g, ' ').trim();
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    if (json.records.length < PAGE_LIMIT) { complete = true; break; }
  }
  console.log(JSON.stringify({
    http_status: lastStatus,
    api_total: apiTotal,
    pages_read: pagesRead,
    distinct_commodities: counts.size,
    commodities: [...counts].map(([label, n]) => ({ label, records: n })).sort((a, b) => b.records - a.records),
    pagination: complete ? 'complete' : 'truncated',
    errors: [],
  }, null, 2));
}

main().catch((e) => { console.error('probe failed (no writes made)'); process.exitCode = 1; });
