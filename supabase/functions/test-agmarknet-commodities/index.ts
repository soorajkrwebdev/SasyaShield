const ENDPOINT = 'https://api.agmarknet.gov.in/v1/daily-price-arrival/filters';

type JsonObject = Record<string, unknown>;
type ResponseType = 'JSON' | 'API error' | 'connection error' | 'non-JSON';
type CommodityCollection = { path: string; records: unknown[] };

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function safeField(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 100);
}

function scalarId(record: JsonObject): string | number | null {
  const preferred = ['commodityid', 'cmdtid', 'cropid', 'id'];
  for (const wanted of preferred) {
    for (const [key, value] of Object.entries(record)) {
      if (normalized(key) !== wanted) continue;
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string' && value.length > 0 && value.length <= 100) return value;
    }
  }
  return null;
}

function commodityName(record: JsonObject): string | null {
  for (const [key, value] of Object.entries(record)) {
    const nameKey = normalized(key);
    if (
      typeof value === 'string' &&
      (nameKey.includes('name') || ['name', 'label', 'title', 'commodity', 'crop', 'cmdt', 'text'].includes(nameKey)) &&
      normalized(value).includes('tomato')
    ) {
      return value.slice(0, 120);
    }
  }
  return null;
}

function isCommodityCollection(path: string, records: unknown[]): boolean {
  const key = normalized(path.split('.').pop() ?? '');
  if (key.includes('group') || /state|district|market|variety|grade/.test(key)) return false;
  if (key.includes('commodit') || key.includes('cmdt') || key.includes('crop')) return true;

  const sample = records.slice(0, 10).find((record) => record !== null && typeof record === 'object' && !Array.isArray(record));
  if (!sample) return false;
  const fields = Object.keys(sample as JsonObject).map(normalized);
  return fields.some((field) => ['commodityname', 'cmdtname', 'cropname'].includes(field));
}

function inspect(payload: unknown) {
  const collections: CommodityCollection[] = [];

  function visit(value: unknown, path: string): void {
    if (Array.isArray(value)) {
      if (isCommodityCollection(path, value)) collections.push({ path, records: value });
      for (const item of value) visit(item, `${path}[]`);
      return;
    }
    if (value !== null && typeof value === 'object') {
      for (const [key, child] of Object.entries(value as JsonObject)) {
        visit(child, path ? `${path}.${safeField(key)}` : safeField(key));
      }
    }
  }

  visit(payload, '');
  const collection = collections.sort((left, right) => right.records.length - left.records.length)[0];
  const records = collection?.records ?? [];
  let tomato: JsonObject | null = null;
  let tomatoName: string | null = null;

  for (const record of records) {
    if (record === null || typeof record !== 'object' || Array.isArray(record)) continue;
    const name = commodityName(record as JsonObject);
    if (!name) continue;
    tomato = record as JsonObject;
    tomatoName = name;
    if (normalized(name) === 'tomato') break;
  }

  return {
    tomatoId: tomato ? scalarId(tomato) : null,
    tomatoName,
    commodityFields: tomato ? Object.keys(tomato).map(safeField).slice(0, 40) : [],
    commodityRecordsInspected: records.length,
    responseScope: 'global',
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

Deno.serve(async () => {
  try {
    const response = await fetch(ENDPOINT, {
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

    if (!response.ok) {
      return jsonResponse({ status: response.status, responseType: 'API error' as ResponseType });
    }

    try {
      const payload: unknown = await response.json();
      return jsonResponse({
        status: response.status,
        responseType: 'JSON' as ResponseType,
        ...inspect(payload),
      });
    } catch {
      return jsonResponse({ status: response.status, responseType: 'non-JSON' as ResponseType });
    }
  } catch {
    return jsonResponse({ status: null, responseType: 'connection error' as ResponseType });
  }
});
