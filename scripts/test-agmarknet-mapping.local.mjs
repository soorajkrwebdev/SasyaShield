import { normalizeAgmarknetDateWiseResponse } from '../supabase/functions/_shared/agmarknetMapping.ts'

const BASE_URL = 'https://api.agmarknet.gov.in/v1'
const STATE_ID = 16
const COMMODITY_ID = 65

const requestHeaders = {
  Accept: 'application/json, text/plain, */*',
  Origin: 'https://agmarknet.gov.in',
  Referer: 'https://agmarknet.gov.in/',
  'User-Agent': 'Mozilla/5.0',
}

async function getJson(url) {
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
    headers: requestHeaders,
  })
  if (!response.ok) throw new Error(`AGMARKNET returned HTTP ${response.status} for ${url}`)
  return response.json()
}

async function main() {
  const params = new URLSearchParams({
    year: '2026',
    month: '10',
    stateId: String(STATE_ID),
    commodityId: String(COMMODITY_ID),
    includeExcel: 'false',
  })
  const priceUrl = `${BASE_URL}/prices-and-arrivals/date-wise/specific-commodity?${params}`
  const [filters, priceResponse] = await Promise.all([
    getJson(`${BASE_URL}/daily-price-arrival/filters`),
    getJson(priceUrl),
  ])

  const result = normalizeAgmarknetDateWiseResponse(priceResponse, filters, {
    stateId: STATE_ID,
    commodityId: COMMODITY_ID,
    sourceUrl: priceUrl,
    fetchedAt: new Date().toISOString(),
  })
  const report = {
    dry_run: true,
    database_writes: 0,
    input_rows: result.input_rows,
    normalized_rows: result.records.length,
    rejected_rows: result.rejected_rows.length,
    rejection_reasons: result.rejection_counts,
    unresolved_market_district_mappings: result.unresolved_mappings,
    natural_key_collisions: result.natural_key_collisions,
    arrival_values_not_stored: result.arrival_values_not_stored,
    sample_normalized_records: result.records.slice(0, 3),
    sample_rejections: result.rejected_rows.slice(0, 5),
  }
  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  console.error(`AGMARKNET mapping dry run failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})