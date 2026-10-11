const ENDPOINT_PATH = '/prices-and-arrivals/date-wise/specific-commodity';
const ENDPOINT = `https://api.agmarknet.gov.in/v1${ENDPOINT_PATH}`;
const REQUEST_PARAMS = new URLSearchParams({
  year: '2026',
  month: '10',
  stateId: '16',
  commodityId: '65',
  includeExcel: 'false',
});

type JsonObject = Record<string, unknown>;
type ResponseType = 'JSON' | 'API error' | 'connection error' | 'non-JSON';
type FieldMapping = Record<string, string | null>;

const FIELD_CANDIDATES: Record<string, string[]> = {
  commodity: ['commodity', 'commodityname', 'crop', 'cropname', 'cmdtname', 'cmdt', 'commodityid', 'cmdtid', 'cropid'],
  market: ['market', 'marketname', 'mktname', 'marketid', 'mktid'],
  district: ['district', 'districtname', 'districtid'],
  state: ['state', 'statename', 'stateid'],
  date: ['date', 'pricedate', 'arrivaldate', 'reportdate'],
  variety: ['variety', 'varietyname'],
  grade: ['grade', 'gradename'],
  minPrice: ['minprice', 'minimumprice'],
  maxPrice: ['maxprice', 'maximumprice'],
  modalPrice: ['modalprice', 'modal'],
};

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function hasPriceField(record: JsonObject): boolean {
  const priceKeys = new Set(['minprice', 'minimumprice', 'maxprice', 'maximumprice', 'modalprice', 'modal']);
  return Object.keys(record).some((key) => priceKeys.has(normalized(key)));
}

function collectRecordArrays(payload: unknown): unknown[][] {
  const arrays: unknown[][] = [];

  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      if (value.some((item) => item !== null && typeof item === 'object' && !Array.isArray(item))) {
        arrays.push(value);
      }
      for (const item of value) visit(item);
      return;
    }
    if (value !== null && typeof value === 'object') {
      for (const child of Object.values(value as JsonObject)) visit(child);
    }
  }

  visit(payload);
  return arrays;
}

function getRecords(payload: unknown): JsonObject[] {
  const arrays = collectRecordArrays(payload);
  const priceArray = arrays.find((array) =>
    array.some((item) => item !== null && typeof item === 'object' && !Array.isArray(item) && hasPriceField(item as JsonObject))
  );
  const selected = priceArray ?? arrays.sort((left, right) => right.length - left.length)[0] ?? [];
  return selected.filter((item): item is JsonObject =>
    item !== null && typeof item === 'object' && !Array.isArray(item)
  );
}

function fieldMapping(record: JsonObject | null): FieldMapping {
  const mapping: FieldMapping = {};
  for (const [semantic, candidates] of Object.entries(FIELD_CANDIDATES)) {
    mapping[semantic] = record
      ? Object.keys(record).find((field) => candidates.includes(normalized(field))) ?? null
      : null;
  }
  return mapping;
}

function dimensionMatches(record: JsonObject, semantic: 'commodity' | 'state', expectedId: string, expectedName: string): boolean {
  const candidates = FIELD_CANDIDATES[semantic];
  const fields = Object.entries(record).filter(([key]) => candidates.includes(normalized(key)));
  if (fields.length === 0) return true;
  return fields.some(([key, value]) => {
    if (typeof value !== 'string' && typeof value !== 'number') return false;
    const valueText = String(value);
    if (normalized(key).endsWith('id')) return valueText === expectedId;
    return normalized(valueText) === normalized(expectedName) || valueText === expectedId;
  });
}

function hasUsablePrice(record: JsonObject): boolean {
  return Object.entries(record).some(([key, value]) => {
    if (!['minprice', 'minimumprice', 'maxprice', 'maximumprice', 'modalprice', 'modal'].includes(normalized(key))) return false;
    if (typeof value === 'number') return Number.isFinite(value) && value >= 0;
    if (typeof value !== 'string') return false;
    const parsed = Number(value.replace(/,/g, '').trim());
    return Number.isFinite(parsed) && parsed >= 0;
  });
}

function summarize(payload: unknown) {
  const records = getRecords(payload);
  const firstRecord = records[0] ?? null;
  const firstRecordFields = firstRecord ? Object.keys(firstRecord).slice(0, 100) : [];
  const mapping = fieldMapping(firstRecord);
  const usableRecord = records.some((record) =>
    dimensionMatches(record, 'commodity', '65', 'Tomato') &&
    dimensionMatches(record, 'state', '16', 'Karnataka') &&
    hasUsablePrice(record)
  );
  const topLevelKeys = payload !== null && typeof payload === 'object' && !Array.isArray(payload)
    ? Object.keys(payload as JsonObject).slice(0, 100)
    : [];

  return {
    priceRecordCount: records.length,
    topLevelKeys,
    firstRecordFieldNames: firstRecordFields,
    fieldMapping: mapping,
    containsUsableKarnatakaTomatoRecords: usableRecord,
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

Deno.serve(async () => {
  try {
    const response = await fetch(`${ENDPOINT}?${REQUEST_PARAMS.toString()}`, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
      headers: {
        Accept: 'application/json, text/plain, */*',
        Origin: 'https://agmarknet.gov.in',
        Referer: 'https://agmarknet.gov.in/',
        'User-Agent': 'Mozilla/5.0',
      },
    });

    let payload: unknown;
    let parsedJson = false;
    try {
      payload = await response.json();
      parsedJson = true;
    } catch {
      payload = null;
    }

    const summary = parsedJson ? summarize(payload) : {
      priceRecordCount: 0,
      topLevelKeys: [],
      firstRecordFieldNames: [],
      fieldMapping: fieldMapping(null),
      containsUsableKarnatakaTomatoRecords: false,
    };

    return jsonResponse({
      status: response.status,
      responseType: parsedJson ? (response.ok ? 'JSON' : 'API error') : (response.ok ? 'non-JSON' : 'API error'),
      endpointPath: ENDPOINT_PATH,
      method: 'GET',
      succeeded: response.ok && parsedJson,
      ...summary,
    });
  } catch {
    return jsonResponse({
      status: null,
      responseType: 'connection error' as ResponseType,
      endpointPath: ENDPOINT_PATH,
      method: 'GET',
      succeeded: false,
      priceRecordCount: 0,
      topLevelKeys: [],
      firstRecordFieldNames: [],
      fieldMapping: fieldMapping(null),
      containsUsableKarnatakaTomatoRecords: false,
    });
  }
});
