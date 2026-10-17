import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import {
  describeEnvelope,
  normalizeDataGovInResponse,
  naturalKey,
  type EnvelopeEvidence,
  type MarketPriceRecord,
} from '../_shared/dataGovInMapping.ts';
import {
  aggregateSweepCommodities,
  canUpsertSweepResults,
  classifyUpstreamPage,
  foldSweepPage,
  type SweepPageOutcome,
} from '../_shared/sweepPipeline.ts';
import {
  buildSweepUpstreamParams,
  buildTargetedUpstreamParams,
} from '../_shared/upstreamQuery.ts';
import {
  resolveIngestionPlan,
  type CommodityPlan,
} from '../_shared/marketDataModes.ts';

// ── Proven data.gov.in upstream (FarmLynq's working approach) ──────────────────
// Official Government of India resource "Current Daily Price of Various
// Commodities from Various Markets (Mandi)" (resource id 9ef84268-d588-465a-
// a308-a864a43d0070). This is the exact endpoint FarmLynq's refresh-market-prices
// function ingested successfully. The API key is read server-side from the
// DATA_GOV_IN_API_KEY secret and is never exposed, logged, or placed in a
// frontend variable.
const DATA_GOV_IN_BASE_URL = 'https://api.data.gov.in';
const DATA_GOV_IN_RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
// data.gov.in returns EVERY state when no state filter is supplied, so the
// caller can narrow to one state (Karnataka by default) without losing rows.
const DEFAULT_STATE_FILTER = 'Karnataka';
const PAGE_LIMIT = 1000; // verified upper bound the resource supports per page
const MAX_PAGES_PER_CROP = 10; // pagination safety bound (10k rows/crop max)

const REQUEST_TIMEOUT_MS = 8_000;
const TOTAL_TIME_BUDGET_MS = 50_000;
const REQUEST_SPACING_MS = 150;
const MAX_TOTAL_REQUESTS = 60;
const MAX_REQUEST_BODY_BYTES = 8_192;
const MAX_UPSTREAM_BODY_BYTES = 8_000_000;
const UPSERT_CHUNK_SIZE = 500;

const RATE_LIMIT_STATUS = 429;
const RATE_LIMIT_MAX_ATTEMPTS = 3;
const RATE_LIMIT_BASE_DELAY_MS = 1_000;

// Verified source-label catalog + all-mode list are re-exported from
// ../_shared/marketDataModes.ts (single source of truth, importable by plain
// Node tests). Provenance: FarmLynq's captured API responses of this resource —
//   Arecanut -> "Arecanut(Betelnut/Supari)", Coconut -> "Coconut",
//   Black Pepper -> "Black pepper". Unknown crops fall through to their
// literal name. Request filters address the .keyword sub-fields
// (see ../_shared/upstreamQuery.ts); the LOWER-CASE filter values keep the
// response fields lower-case, which the mapper accepts alongside TitleCase.
export { COMMODITY_SOURCE_LABELS, ALL_SUPPORTED_COMMODITIES } from '../_shared/marketDataModes.ts';

// Bounded state-wide sweep: fetch Karnataka pages WITHOUT a commodity filter so
// the upstream returns whatever commodities it holds. Each raw label is stored
// verbatim (acceptAnyCommodity), so Paddy(Dhan)(Common), Ragi, Onion-with-prices
// etc. ingest without a per-crop code change. Coconut/Copra stay distinct because
// each raw label becomes its own `crop` value — nothing is folded.
// Budget: SWEEP_MAX_PAGES pages x 1000 rows, inside the same time/request guards.
const SWEEP_MAX_PAGES = 10;

type JsonObject = Record<string, unknown>;

const DATA_GOV_IN_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'SmartFarm2.0-MarketIngestion/1.0',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function normalizeWhitespace(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const normalized = String(value).replace(/\s+/g, ' ').trim();
  return normalized || null;
}


/**
 * Read a bounded upstream body as raw text so the caller can classify it
 * through the shared sweepPipeline helpers. Distinguishes an empty body
 * from an oversized one; JSON parsing happens in classifyUpstreamPage so a
 * non-JSON body yields a sanitized invalid_json failure, never a crash.
 */
async function readUpstreamBodyText(response: Response, maxBytes: number): Promise<string> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error('Upstream response exceeded the size limit.');
  }
  if (!response.body) throw new Error('Upstream response body was empty.');

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) {
      await reader.cancel();
      throw new Error('Upstream response exceeded the size limit.');
    }
    chunks.push(value);
  }

  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(body);
}

async function readJsonLimited(response: Response, maxBytes: number): Promise<unknown> {
  const text = await readUpstreamBodyText(response, maxBytes);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('Upstream returned invalid JSON.');
  }
}

async function readRequestLimited(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BODY_BYTES) {
    throw new Error('Request body too large.');
  }
  const text = await request.text();
  if (text.length > MAX_REQUEST_BODY_BYTES) {
    throw new Error('Request body too large.');
  }
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('Invalid JSON body.');
  }
}

/**
 * Fetch one page of the resource for a single commodity label, retrying on
 * HTTP 429 after a bounded backoff. Returns the raw body plus metadata so the
 * caller classifies it through the shared sweepPipeline helpers (single
 * empty-vs-failure contract for sweep and commodity paths).
 * Throws on transport-level problems (timeout/budget/over-limit/aborted fetch)
 * so the caller treats them as failed ingestion, never silent success.
 * The API key is never included in the returned source URL.
 */
async function fetchDataGovInPage(
  apiKey: string,
  commodityLabel: string,
  offset: number,
  state: string,
  deadline: number,
): Promise<{ bodyText: string; status: number; contentType: string | null; sourceUrl: string }> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error('Market ingestion exceeded its overall time budget.');

  const url = new URL(`${DATA_GOV_IN_BASE_URL}/resource/${DATA_GOV_IN_RESOURCE_ID}`);
  url.searchParams.set('api-key', apiKey);
  // Exact-match keyword filters (see _shared/upstreamQuery.ts): plain
  // filters[state]/filters[commodity] match the analyzed text field and
  // silently return zero rows.
  for (const [key, value] of buildTargetedUpstreamParams({
    commodity: commodityLabel,
    state,
    limit: PAGE_LIMIT,
    offset,
  })) {
    url.searchParams.set(key, value);
  }

  const redactedUrl = url.toString().replace(apiKey, '[REDACTED]');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Math.min(REQUEST_TIMEOUT_MS, remaining));
  try {
    let attempt = 0;
    for (;;) {
      attempt += 1;
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: DATA_GOV_IN_HEADERS,
      });
      if (response.status === RATE_LIMIT_STATUS && attempt < RATE_LIMIT_MAX_ATTEMPTS) {
        const retryAfter = Number(response.headers.get('retry-after'));
        const backoff = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 5000)
          : RATE_LIMIT_BASE_DELAY_MS * attempt;
        await response.body?.cancel().catch(() => undefined);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }
      const contentType = response.headers.get('content-type');
      const bodyText = await readUpstreamBodyText(response, MAX_UPSTREAM_BODY_BYTES);
      return { bodyText, status: response.status, contentType, sourceUrl: redactedUrl };
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch one unfiltered state page (no commodity filter) for sweep mode.
 * Same contract as fetchDataGovInPage: raw body + metadata for shared
 * classification, bounded 429 retries, bounded body, redacted source URL.
 */
async function fetchStateSweepPage(
  apiKey: string,
  offset: number,
  state: string,
  deadline: number,
): Promise<{ bodyText: string; status: number; contentType: string | null; sourceUrl: string }> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error('Market ingestion exceeded its overall time budget.');

  const url = new URL(`${DATA_GOV_IN_BASE_URL}/resource/${DATA_GOV_IN_RESOURCE_ID}`);
  url.searchParams.set('api-key', apiKey);
  // Exact-match keyword state filter (see _shared/upstreamQuery.ts).
  for (const [key, value] of buildSweepUpstreamParams({
    state,
    limit: PAGE_LIMIT,
    offset,
  })) {
    url.searchParams.set(key, value);
  }

  const redactedUrl = url.toString().replace(apiKey, '[REDACTED]');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Math.min(REQUEST_TIMEOUT_MS, remaining));
  try {
    let attempt = 0;
    for (;;) {
      attempt += 1;
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: DATA_GOV_IN_HEADERS,
      });
      if (response.status === RATE_LIMIT_STATUS && attempt < RATE_LIMIT_MAX_ATTEMPTS) {
        const retryAfter = Number(response.headers.get('retry-after'));
        const backoff = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 5000)
          : RATE_LIMIT_BASE_DELAY_MS * attempt;
        await response.body?.cancel().catch(() => undefined);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }
      const contentType = response.headers.get('content-type');
      const bodyText = await readUpstreamBodyText(response, MAX_UPSTREAM_BODY_BYTES);
      return { bodyText, status: response.status, contentType, sourceUrl: redactedUrl };
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const apiKey = Deno.env.get('DATA_GOV_IN_API_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Required Edge Function secrets are not configured.' }, 500);
  }
  if (!apiKey) {
    // Upstream credential missing: report failure, never fabricate prices.
    return jsonResponse({ error: 'DATA_GOV_IN_API_KEY secret is not configured.' }, 500);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  if (!(await authorize(request, serviceClient.auth, serviceRoleKey))) {
    return jsonResponse({ error: 'Ingestion is restricted to authorized operators.' }, 403);
  }

  let input: unknown;
  try {
    input = await readRequestLimited(request);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Invalid request body.' }, 400);
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return jsonResponse({ error: 'Request body must be a JSON object.' }, 400);
  }

  const body = input as { mode?: unknown; crops?: unknown; state?: unknown };
  // Single dispatch point: resolveIngestionPlan() routes sweep BEFORE any
  // targeted commodity validation, so { mode:'sweep', state } never triggers
  // "targeted mode requires 1 to 5 commodity names."
  const route = resolveIngestionPlan(body, DEFAULT_STATE_FILTER);
  if ('error' in route) {
    return jsonResponse({ error: route.error }, route.status);
  }
  const stateFilter = route.state;
  // `all` plans come pre-resolved from the dispatcher; targeted plans too.
  // Sweep carries no plans — it is handled by the sweep branch below.
  const plans: CommodityPlan[] = route.route === 'sweep' ? [] : route.plans;

  const deadline = Date.now() + TOTAL_TIME_BUDGET_MS;
  let lastRequestAt = 0;
  let requestCount = 0;
  const fetchedAt = new Date().toISOString();
  const records: MarketPriceRecord[] = [];
  const seenNaturalKeys = new Set<string>();
  const perCrop: Array<Record<string, unknown>> = [];
  const rejectionCounts: Record<string, number> = {};
  const sourceUrls = new Set<string>();
  let inputRows = 0;
  let duplicates = 0;

  const waitForSpacing = async () => {
    const remaining = REQUEST_SPACING_MS - (Date.now() - lastRequestAt);
    if (lastRequestAt > 0 && remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
  };

  try {
    if (body.mode === 'sweep') {
      // State-wide sweep: no commodity filter. Each page's raw labels are stored
      // verbatim via acceptAnyCommodity, so every valid Karnataka commodity the
      // upstream holds is captured without per-crop code changes. Pagination is
      // bounded (SWEEP_MAX_PAGES) and the response reports pages_read +
      // pagination complete|truncated so callers never assume full coverage.
      // Coconut vs Copra stay distinct (separate `crop` values, nothing folded);
      // Onion placeholder rows are still rejected by the 65535 sentinel.
      // Empty sweeps stay diagnosable: the first page's redacted envelope
      // evidence (HTTP status, content type, upstream total/count, envelope
      // field names — no API key) is surfaced as upstream_evidence so a
      // zero-row result can be separated from an unreadable failure.
      // Classification/aggregation run through the pure sweepPipeline helpers
      // (shared with offline regression tests); the handler only performs the
      // fetch and the final upsert. Any upstream failure throws -> ok:false,
      // and the upsert is gated on every page classifying successfully.
      let offset = 0;
      let pagesRead = 0;
      let complete = false;
      const sweepRejections: Record<string, number> = {};
      const labelCounts: Record<string, number> = {};
      const upstreamEvidence: EnvelopeEvidence[] = [];
      const sweepOutcomes: SweepPageOutcome[] = [];
      let apiTotal: number | null = null;
      const sweepAggregate = {
        records: [] as MarketPriceRecord[],
        seenNaturalKeys: new Set<string>(),
        labelCounts,
        inputRows: 0,
        duplicates: 0,
        rejectionCounts: {} as Record<string, number>,
      };
      for (let page = 0; page < SWEEP_MAX_PAGES; page++) {
        await waitForSpacing();
        if (requestCount >= MAX_TOTAL_REQUESTS) throw new Error('data.gov.in request limit reached.');
        requestCount += 1;
        lastRequestAt = Date.now();

        const raw = await fetchStateSweepPage(apiKey, offset, stateFilter, deadline) as {
          bodyText: string;
          status: number;
          contentType: string | null;
          sourceUrl: string;
        };
        pagesRead += 1;
        if (raw.sourceUrl) sourceUrls.add(raw.sourceUrl);
        const outcome = classifyUpstreamPage({
          status: raw.status,
          contentType: raw.contentType,
          bodyText: raw.bodyText,
          redactedSourceUrl: raw.sourceUrl,
          context: `state sweep "${stateFilter}"`,
        });
        sweepOutcomes.push(outcome);
        if (outcome.kind === 'failure') {
          throw new Error(outcome.message);
        }
        upstreamEvidence.push(outcome.evidence);
        if (apiTotal === null && outcome.evidence.api_total !== null) apiTotal = outcome.evidence.api_total;

        foldSweepPage(sweepAggregate, outcome, {
          state: stateFilter,
          sourceUrl: outcome.sourceUrl,
          fetchedAt,
        }, naturalKey);
        for (const [reason, n] of Object.entries(sweepAggregate.rejectionCounts)) {
          sweepRejections[reason] = n;
          rejectionCounts[reason] = n;
        }

        if (outcome.lastPage) { complete = true; break; }
        offset += PAGE_LIMIT;
      }
      inputRows += sweepAggregate.inputRows;
      duplicates += sweepAggregate.duplicates;
      records.push(...sweepAggregate.records);
      for (const rec of sweepAggregate.records) seenNaturalKeys.add(naturalKey(rec));
      if (!canUpsertSweepResults(sweepOutcomes)) {
        throw new Error(`data.gov.in state sweep "${stateFilter}" could not be interpreted.`);
      }
      // Per-commodity breakdown: one entry per real upstream label actually
      // stored (verbatim, never folded), plus one honest empty entry when the
      // sweep stored nothing. Totals (input_rows/records/duplicates/
      // rejection_counts) agree with the top-level aggregates, and pagination
      // reports complete|truncated.
      const commodityEntries = aggregateSweepCommodities(labelCounts);
      if (commodityEntries.length === 0) {
        perCrop.push({
          crop: '(no commodities returned)',
          labels: ['(unfiltered state sweep)'],
          input_rows: inputRows,
          records: 0,
          duplicates,
          rejection_counts: sweepRejections,
          pages_read: pagesRead,
          pagination: complete ? 'complete' : 'truncated',
          distinct_commodities: 0,
          commodities: [],
          upstream_total: apiTotal,
          upstream_evidence: upstreamEvidence.slice(0, SWEEP_MAX_PAGES),
        });
      } else {
        for (const entry of commodityEntries) {
          perCrop.push({
            crop: entry.crop,
            labels: entry.labels,
            input_rows: inputRows,
            records: entry.records,
            duplicates,
            rejection_counts: sweepRejections,
            pages_read: pagesRead,
            pagination: complete ? 'complete' : 'truncated',
            distinct_commodities: commodityEntries.length,
            upstream_total: apiTotal,
          });
        }
      }
    } else {
    for (const plan of plans) {
      const planRecords: MarketPriceRecord[] = [];
      const planRejections: Record<string, number> = {};
      let planInput = 0;
      let planDuplicates = 0;

      for (const label of plan.labels) {
        let offset = 0;
        let page = 0;
        for (;;) {
          if (page >= MAX_PAGES_PER_CROP) break;
          await waitForSpacing();
          if (requestCount >= MAX_TOTAL_REQUESTS) throw new Error('data.gov.in request limit reached.');
          requestCount += 1;
          lastRequestAt = Date.now();

          const raw = await fetchDataGovInPage(apiKey, label, offset, stateFilter, deadline);
          page += 1;
          if (raw.sourceUrl) sourceUrls.add(raw.sourceUrl);
          const outcome = classifyUpstreamPage({
            status: raw.status,
            contentType: raw.contentType,
            bodyText: raw.bodyText,
            redactedSourceUrl: raw.sourceUrl,
            context: `commodity "${label}"`,
          });
          if (outcome.kind === 'failure') {
            throw new Error(outcome.message);
          }
          const payload = outcome.payload;

          const mapped = normalizeDataGovInResponse(payload, {
            crop: plan.canonical,
            aliases: plan.labels,
            state: stateFilter,
            sourceUrl: raw.sourceUrl,
            fetchedAt,
          });
          planInput += mapped.input_rows;
          for (const rec of mapped.records) {
            // Drop cross-page duplicates before the upsert so one natural key
            // is stored exactly once per ingestion run.
            const key = naturalKey(rec);
            if (seenNaturalKeys.has(key)) {
              planDuplicates += 1;
              continue;
            }
            seenNaturalKeys.add(key);
            planRecords.push(rec);
          }
          for (const [reason, n] of Object.entries(mapped.rejection_counts)) {
            planRejections[reason] = (planRejections[reason] ?? 0) + n;
            rejectionCounts[reason] = (rejectionCounts[reason] ?? 0) + n;
          }

          if (outcome.lastPage) break; // last page reached
          offset += PAGE_LIMIT;
        }
      }

      inputRows += planInput;
      duplicates += planDuplicates;
      records.push(...planRecords);
      perCrop.push({
        crop: plan.canonical,
        labels: plan.labels,
        input_rows: planInput,
        records: planRecords.length,
        duplicates: planDuplicates,
        rejection_counts: planRejections,
      });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected ingestion failure.';
    // Never report a failed upstream as success.
    return jsonResponse({ ok: false, error: message, fetched_at: fetchedAt, stored: 0, records: 0 }, 502);
  }

  let stored = 0;
  try {
    stored = await upsertRecords(serviceClient, records);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upsert failed.';
    return jsonResponse({ ok: false, error: message, fetched_at: fetchedAt, stored: 0, records: records.length }, 500);
  }

  return jsonResponse({
    ok: true,
    fetched_at: fetchedAt,
    state: stateFilter,
    source_name: 'data.gov.in / AGMARKNET (Current Daily Price)',
    source_urls: Array.from(sourceUrls),
    input_rows: inputRows,
    records: records.length,
    stored,
    duplicates,
    rejection_counts: rejectionCounts,
    crops: perCrop,
    requests: requestCount,
  });
});

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function upsertRecords(serviceClient: ReturnType<typeof createClient>, records: MarketPriceRecord[]) {
  let stored = 0;
  for (const batch of chunk(records, UPSERT_CHUNK_SIZE)) {
    const { data, error } = await serviceClient.rpc('upsert_market_prices_batch', { p_rows: batch });
    if (error) throw new Error(`Failed to upsert market prices: ${error.message}`);
    if (typeof data !== 'number') throw new Error('Upsert RPC did not return an affected-row count.');
    stored += data;
  }
  return stored;
}

async function authorize(
  request: Request,
  authClient: Pick<ReturnType<typeof createClient>['auth'], 'getUser'>,
  serviceRoleKey: string,
): Promise<boolean> {
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return false;
  if (token === serviceRoleKey) return true;

  const { data, error } = await authClient.getUser(token);
  return !error && data.user?.app_metadata?.market_data_ingest === true;
}
