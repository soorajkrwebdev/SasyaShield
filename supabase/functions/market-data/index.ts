import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { normalizeAgmarknetDateWiseResponse, type MarketPriceRecord } from '../_shared/agmarknetMapping.ts';

const AGMARKNET_BASE_URL = 'https://api.agmarknet.gov.in/v1';
const FILTERS_URL = `${AGMARKNET_BASE_URL}/daily-price-arrival/filters`;
const PRICE_ENDPOINT_PATH = '/prices-and-arrivals/date-wise/specific-commodity';
const KARNATAKA_STATE_ID = 16;
const SOURCE_NAME = 'AGMARKNET';
const REQUEST_TIMEOUT_MS = 8_000;
const TOTAL_TIME_BUDGET_MS = 50_000;
const REQUEST_SPACING_MS = 120;
const MAX_COMMODITIES = 5;
const MAX_TOTAL_REQUESTS = 1 + MAX_COMMODITIES;
const MAX_REQUEST_BODY_BYTES = 8_192;
const MAX_UPSTREAM_BODY_BYTES = 2_000_000;
const UPSERT_CHUNK_SIZE = 500;

type JsonObject = Record<string, unknown>;
type CommoditySelection = { id: number; name: string };

const AGMARKNET_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  Origin: 'https://agmarknet.gov.in',
  Referer: 'https://agmarknet.gov.in/',
  'User-Agent': 'Mozilla/5.0',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function normalizeWhitespace(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const normalized = String(value).replace(/\s+/g, ' ').trim();
  return normalized || null;
}

async function readJsonLimited(response: Response, maxBytes: number): Promise<unknown> {
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
  return JSON.parse(new TextDecoder().decode(body));
}

function readRequestLimited(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BODY_BYTES) {
    throw new Error('Request body exceeded the size limit.');
  }
  if (!request.body) throw new Error('Request body is required.');
  return readJsonLimited(new Response(request.body), MAX_REQUEST_BODY_BYTES);
}

function readId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function resolveCommodities(filters: unknown, requestedNames: string[]): CommoditySelection[] {
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
    throw new Error('AGMARKNET filters response is invalid.');
  }
  const filterObject = filters as JsonObject;
  const data = filterObject.data;
  if (filterObject.status !== true || !data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('AGMARKNET filters response is invalid.');
  }
  const filterData = data as JsonObject;
  if (!Array.isArray(filterData.state_data) || !Array.isArray(filterData.cmdt_data)) {
    throw new Error('AGMARKNET filters are missing state or commodity metadata.');
  }

  const states = filterData.state_data.filter((entry): entry is JsonObject =>
    !!entry && typeof entry === 'object' && !Array.isArray(entry)
  ).filter((entry) => readId(entry.state_id) === KARNATAKA_STATE_ID &&
    normalizeWhitespace(entry.state_name)?.toLowerCase() === 'karnataka');
  if (states.length !== 1) {
    throw new Error('AGMARKNET filters must resolve Karnataka stateId 16 uniquely.');
  }

  const commodities = filterData.cmdt_data.filter((entry): entry is JsonObject =>
    !!entry && typeof entry === 'object' && !Array.isArray(entry)
  );
  const selections: CommoditySelection[] = [];
  const seenIds = new Set<number>();
  for (const requestedName of requestedNames) {
    const matches = commodities.filter((entry) =>
      normalizeWhitespace(entry.cmdt_name)?.toLowerCase() === requestedName.toLowerCase()
    );
    if (matches.length !== 1) {
      throw new Error(matches.length === 0
        ? `AGMARKNET commodity "${requestedName}" was not found in metadata.`
        : `AGMARKNET commodity "${requestedName}" is ambiguous in metadata.`);
    }
    const id = readId(matches[0].cmdt_id);
    const name = normalizeWhitespace(matches[0].cmdt_name);
    if (id === null || !name) throw new Error(`AGMARKNET metadata for "${requestedName}" has an invalid ID or name.`);
    if (!seenIds.has(id)) {
      selections.push({ id, name });
      seenIds.add(id);
    }
  }
  return selections;
}

async function fetchAgmarknet(url: URL, deadline: number): Promise<unknown> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error('Market ingestion exceeded its overall time budget.');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Math.min(REQUEST_TIMEOUT_MS, remaining));
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: AGMARKNET_HEADERS,
    });
    if (!response.ok) throw new Error(`AGMARKNET returned HTTP ${response.status}.`);
    return await readJsonLimited(response, MAX_UPSTREAM_BODY_BYTES);
  } finally {
    clearTimeout(timeoutId);
  }
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

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Required Edge Function secrets are not configured.' }, 500);
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

  const body = input as { mode?: unknown; crops?: unknown; year?: unknown; month?: unknown };
  const mode = body.mode;
  if (mode !== 'targeted') {
    return jsonResponse({ error: 'Only targeted single-month ingestion is supported.' }, 400);
  }

  if (!Array.isArray(body.crops) || body.crops.length < 1 || body.crops.length > MAX_COMMODITIES) {
    return jsonResponse({ error: `targeted mode requires 1 to ${MAX_COMMODITIES} commodity names.` }, 400);
  }
  const crops = body.crops.map(normalizeWhitespace);
  if (crops.some((crop) => !crop || crop.length > 60)) {
    return jsonResponse({ error: 'Each commodity name must contain 1 to 60 characters.' }, 400);
  }

  const now = new Date();
  const year = body.year === undefined && body.month === undefined ? now.getUTCFullYear() : body.year;
  const month = body.year === undefined && body.month === undefined ? now.getUTCMonth() + 1 : body.month;
  if (!Number.isSafeInteger(year) || (year as number) < 2000 || (year as number) > now.getUTCFullYear() ||
    !Number.isSafeInteger(month) || (month as number) < 1 || (month as number) > 12) {
    return jsonResponse({ error: 'year and month must identify one valid month no later than the current UTC month.' }, 400);
  }
  if ((year as number) === now.getUTCFullYear() && (month as number) > now.getUTCMonth() + 1) {
    return jsonResponse({ error: 'Future months cannot be ingested.' }, 400);
  }

  const deadline = Date.now() + TOTAL_TIME_BUDGET_MS;
  let lastRequestAt = 0;
  let requestCount = 0;
  const fetchedAt = new Date().toISOString();
  const records: MarketPriceRecord[] = [];
  const rejectedRows: Array<{ commodity: string; rejection: unknown }> = [];
  const rejectionCounts: Record<string, number> = {};
  const unresolvedMappings: unknown[] = [];
  const naturalKeyCollisions: unknown[] = [];
  let inputRows = 0;
  let arrivalValuesNotStored = 0;
  let emptyCommodities = 0;

  try {
    const waitForSpacing = async () => {
      const remaining = REQUEST_SPACING_MS - (Date.now() - lastRequestAt);
      if (lastRequestAt > 0 && remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    };

    requestCount += 1;
    lastRequestAt = Date.now();
    const filters = await fetchAgmarknet(new URL(FILTERS_URL), deadline);
    const selections = resolveCommodities(filters, crops as string[]);

    for (const selection of selections) {
      await waitForSpacing();
      if (requestCount >= MAX_TOTAL_REQUESTS) throw new Error('AGMARKNET request limit reached.');
      const priceUrl = new URL(`${AGMARKNET_BASE_URL}${PRICE_ENDPOINT_PATH}`);
      priceUrl.searchParams.set('year', String(year));
      priceUrl.searchParams.set('month', String(month));
      priceUrl.searchParams.set('stateId', String(KARNATAKA_STATE_ID));
      priceUrl.searchParams.set('commodityId', String(selection.id));
      priceUrl.searchParams.set('includeExcel', 'false');

      requestCount += 1;
      lastRequestAt = Date.now();
      const payload = await fetchAgmarknet(priceUrl, deadline);
      if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
        (payload as JsonObject).success !== true || !Array.isArray((payload as JsonObject).markets)) {
        throw new Error(`AGMARKNET returned an invalid date-wise response for "${selection.name}".`);
      }
      const markets = (payload as JsonObject).markets as unknown[];
      if (markets.length === 0) {
        emptyCommodities += 1;
        continue;
      }

      const mapping = normalizeAgmarknetDateWiseResponse(payload, filters, {
        stateId: KARNATAKA_STATE_ID,
        commodityId: selection.id,
        sourceUrl: priceUrl.toString(),
        fetchedAt,
      });
      if (mapping.input_rows === 0 && mapping.rejected_rows.length === 0) emptyCommodities += 1;
      inputRows += mapping.input_rows;
      arrivalValuesNotStored += mapping.arrival_values_not_stored;
      for (const record of mapping.records) {
        record.source_name = SOURCE_NAME;
        records.push(record);
      }
      rejectedRows.push(...mapping.rejected_rows.map((rejection) => ({ commodity: selection.name, rejection })));
      for (const [reason, count] of Object.entries(mapping.rejection_counts)) {
        rejectionCounts[reason] = (rejectionCounts[reason] ?? 0) + count;
      }
      unresolvedMappings.push(...mapping.unresolved_mappings.map((mappingItem) => ({ commodity: selection.name, ...mappingItem })));
      naturalKeyCollisions.push(...mapping.natural_key_collisions.map((collision) => ({ commodity: selection.name, ...collision })));
    }

    if (records.length === 0) {
      const trulyEmpty = inputRows === 0 && rejectedRows.length === 0;
      if (!trulyEmpty) {
        return jsonResponse({
          error: 'AGMARKNET returned rows, but no records passed validation; no database writes were made.',
          requested_year: year,
          requested_month: month,
          fetched_records: inputRows,
          accepted_records: 0,
          rejected_records: rejectedRows.length,
          rejection_reasons: rejectionCounts,
          unresolved_market_district_mappings: unresolvedMappings,
          natural_key_collisions: naturalKeyCollisions,
          requests: requestCount,
        }, 422);
      }
      return jsonResponse({
        mode,
        requested_year: year,
        requested_month: month,
        empty: true,
        empty_commodities: emptyCommodities,
        fetched_records: 0,
        accepted_records: 0,
        rejected_records: 0,
        upserted_records: 0,
        requests: requestCount,
        arrival_values_not_stored: 0,
      });
    }

    for (let index = 0; index < records.length; index += UPSERT_CHUNK_SIZE) {
      if (Date.now() >= deadline) throw new Error('Market ingestion exceeded its overall time budget.');
      const chunk = records.slice(index, index + UPSERT_CHUNK_SIZE);
      const { error } = await serviceClient.rpc('upsert_market_prices_batch', { p_rows: chunk });
      if (error) throw new Error(`Supabase market-price upsert failed: ${error.message}`);
    }

    return jsonResponse({
      mode,
      requested_year: year,
      requested_month: month,
      fetched_records: inputRows,
      accepted_records: records.length,
      rejected_records: rejectedRows.length,
      rejection_reasons: rejectionCounts,
      rejected_rows: rejectedRows,
      unresolved_market_district_mappings: unresolvedMappings,
      natural_key_collisions: naturalKeyCollisions,
      arrival_values_not_stored: arrivalValuesNotStored,
      upserted_records: records.length,
      requests: requestCount,
      empty_commodities: emptyCommodities,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Market ingestion failed.';
    const status = error instanceof DOMException && error.name === 'AbortError' ? 504 : 502;
    return jsonResponse({ error: message, requests: requestCount }, status);
  }
});