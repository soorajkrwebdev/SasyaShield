const ENDPOINT = 'https://api.agmarknet.gov.in/v1/daily-price-arrival/filters';

type ResponseType = 'JSON' | 'API error' | 'connection error' | 'non-JSON';
type CollectionKind = 'states' | 'commodities' | 'groups' | 'districts' | 'markets' | 'varieties' | 'grades';
type JsonObject = Record<string, unknown>;

type Match = {
  id: string | number | null;
  fields: string[];
  path: string;
  record: JsonObject;
};

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function safeName(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 100);
}

function classifyCollection(segment: string): CollectionKind | null {
  const key = normalized(segment.replace(/\[\]$/, ''));
  if (key.includes('commoditygroup')) return 'groups';
  if (key.includes('state')) return 'states';
  if (key.includes('commodit') || key.includes('crop')) return 'commodities';
  if (key.includes('district')) return 'districts';
  if (key.includes('market')) return 'markets';
  if (key.includes('variety')) return 'varieties';
  if (key.includes('grade')) return 'grades';
  return null;
}

function collectionForPath(path: string): CollectionKind | null {
  const segments = path.split('.').reverse();
  for (const segment of segments) {
    const kind = classifyCollection(segment);
    if (kind) return kind;
  }
  return null;
}

function safeId(value: unknown): string | number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.length > 0 && value.length <= 100) return value;
  return null;
}

function findId(record: JsonObject, kind: 'states' | 'commodities'): string | number | null {
  const preferred = kind === 'states'
    ? ['id', 'stateid', 'statecode']
    : ['id', 'commodityid', 'cropid'];
  for (const wanted of preferred) {
    for (const [key, value] of Object.entries(record)) {
      if (normalized(key) === wanted) {
        const id = safeId(value);
        if (id !== null) return id;
      }
    }
  }
  return null;
}

function hasName(record: JsonObject, target: 'karnataka' | 'tomato'): boolean {
  const acceptedKeys = target === 'karnataka'
    ? /^(name|label|title|state|statename|value|text)$/
    : /^(name|label|title|commodity|commodityname|crop|cropname|value|text)$/;
  return Object.entries(record).some(([key, value]) =>
    acceptedKeys.test(normalized(key)) && typeof value === 'string' && normalized(value) === target
  );
}

function matchRecord(
  objects: Array<{ path: string; record: JsonObject }>,
  kind: 'states' | 'commodities',
  target: 'karnataka' | 'tomato',
): Match | null {
  const candidate = objects.find(({ path, record }) => collectionForPath(path) === kind && hasName(record, target));
  if (!candidate) return null;
  return {
    id: findId(candidate.record, kind),
    fields: Object.keys(candidate.record).map(safeName).slice(0, 40),
    path: safeName(candidate.path).slice(0, 200),
    record: candidate.record,
  };
}

function groupId(record: JsonObject): string | number | null {
  for (const [key, value] of Object.entries(record)) {
    const keyName = normalized(key);
    if (keyName.includes('group') && keyName.endsWith('id')) {
      const id = safeId(value);
      if (id !== null) return id;
    }
    if (keyName.includes('group') && value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(value as JsonObject)) {
        if (normalized(nestedKey) === 'id' || normalized(nestedKey).endsWith('groupid')) {
          const id = safeId(nestedValue);
          if (id !== null) return id;
        }
      }
    }
  }
  return null;
}

function summarize(payload: unknown) {
  const objects: Array<{ path: string; record: JsonObject }> = [];
  const collections: Array<{ kind: CollectionKind; path: string; count: number; fields: string[] }> = [];

  function visit(value: unknown, path: string): void {
    if (Array.isArray(value)) {
      const kind = classifyCollection(path.split('.').pop() ?? '');
      if (kind) {
        const fields = new Set<string>();
        for (const item of value.slice(0, 5)) {
          if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            for (const key of Object.keys(item as JsonObject)) fields.add(safeName(key));
          }
        }
        collections.push({ kind, path: safeName(path).slice(0, 200), count: value.length, fields: [...fields].slice(0, 40) });
      }
      for (const item of value) visit(item, `${path}[]`);
      return;
    }
    if (value !== null && typeof value === 'object') {
      objects.push({ path, record: value as JsonObject });
      for (const [key, child] of Object.entries(value as JsonObject)) {
        visit(child, path ? `${path}.${safeName(key)}` : safeName(key));
      }
    }
  }

  visit(payload, '');
  const state = matchRecord(objects, 'states', 'karnataka');
  const tomato = matchRecord(objects, 'commodities', 'tomato');
  const counts: Record<CollectionKind, number | null> = {
    states: null,
    commodities: null,
    groups: null,
    districts: null,
    markets: null,
    varieties: null,
    grades: null,
  };
  for (const collection of collections) {
    counts[collection.kind] = Math.max(counts[collection.kind] ?? 0, collection.count);
  }

  const fields = payload !== null && typeof payload === 'object' && !Array.isArray(payload)
    ? Object.keys(payload).map(safeName).slice(0, 40)
    : [];
  const groupFields = tomato ? Object.keys(tomato.record)
    .filter((key) => normalized(key).includes('group'))
    .map(safeName).slice(0, 20) : [];

  return {
    topLevelFields: fields,
    karnataka: state ? { id: state.id, path: state.path, fields: state.fields } : null,
    tomato: tomato ? { id: tomato.id, path: tomato.path, fields: tomato.fields } : null,
    commodityGroupId: tomato ? groupId(tomato.record) : null,
    commodityGroupFields: groupFields,
    counts: {
      states: counts.states,
      commodities: counts.commodities,
      districts: counts.districts,
      markets: counts.markets,
    },
    relevantCollections: collections.slice(0, 30).map(({ kind, path, count, fields: collectionFields }) => ({
      kind,
      path,
      count,
      fields: collectionFields,
    })),
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
      return jsonResponse({ status: response.status, reachable: true, responseType: 'API error' as ResponseType });
    }

    try {
      const payload: unknown = await response.json();
      return jsonResponse({
        status: response.status,
        reachable: true,
        responseType: 'JSON' as ResponseType,
        ...summarize(payload),
      });
    } catch {
      return jsonResponse({ status: response.status, reachable: true, responseType: 'non-JSON' as ResponseType });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({
      status: null,
      reachable: false,
      responseType: 'connection error' as ResponseType,
      connectionRefused: /connection refused|econnrefused|actively refused/i.test(message),
    });
  }
});
