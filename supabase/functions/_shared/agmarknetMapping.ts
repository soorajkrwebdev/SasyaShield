type JsonObject = Record<string, unknown>;

export type MarketPriceRecord = {
  crop: string;
  state: string;
  district: string;
  market: string;
  variety: string | null;
  grade: string | null;
  min_price: number;
  max_price: number;
  modal_price: number;
  unit: string;
  price_date: string;
  source_name: string;
  source_url: string;
  fetched_at: string;
};

export type MappingRejection = {
  market_index: number;
  date_index: number;
  data_index: number;
  market_name: string | null;
  arrival_date: string | null;
  variety: string | null;
  reasons: string[];
};

export type UnresolvedMarketMapping = {
  market_name: string;
  reason: 'market_not_found' | 'ambiguous_market' | 'district_not_found' | 'ambiguous_district';
  market_ids: number[];
  district_ids: number[];
};

export type NaturalKeyCollision = {
  crop: string;
  state: string;
  district: string;
  market: string;
  price_date: string;
  variety: string | null;
  grade: string | null;
  row_indexes: number[];
};

export type AgmarknetMappingResult = {
  input_rows: number;
  records: MarketPriceRecord[];
  rejected_rows: MappingRejection[];
  rejection_counts: Record<string, number>;
  unresolved_mappings: UnresolvedMarketMapping[];
  natural_key_collisions: NaturalKeyCollision[];
  arrival_values_not_stored: number;
};

export type AgmarknetMappingOptions = {
  stateId: number;
  commodityId: number;
  sourceUrl: string;
  fetchedAt: string;
};

const SOURCE_NAME = 'AGMARKNET 2.0 / Directorate of Marketing & Inspection';
const PRICE_UNIT = 'INR/quintal';

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeWhitespace(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const normalized = String(value).replace(/\s+/g, ' ').trim();
  return normalized || null;
}

function normalizeMarketKey(value: unknown): string | null {
  return normalizeWhitespace(value)?.toLowerCase() ?? null;
}

function readId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function parsePrice(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) return null;
  const price = Number(value);
  return Number.isFinite(price) ? price : null;
}

function parseAgmarknetDate(value: unknown): string | null {
  const dateText = normalizeWhitespace(value);
  const match = dateText?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function ensurePriceUnit(columns: unknown): void {
  if (!Array.isArray(columns)) throw new Error('AGMARKNET response is missing its price-unit columns.');
  const requiredKeys = ['minimumPrice', 'maximumPrice', 'modalPrice'];
  const unitIsQuintal = requiredKeys.every((key) => {
    const column = columns.find((entry) => isObject(entry) && entry.key === key);
    const title = isObject(column) ? normalizeWhitespace(column.title) : null;
    return title !== null && /Rs\.?\s*\/\s*Quintal/i.test(title);
  });
  if (!unitIsQuintal) throw new Error('AGMARKNET price columns do not confirm Rs./Quintal units.');
}

function validateOptions(options: AgmarknetMappingOptions): string {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(options.sourceUrl);
  } catch {
    throw new Error('sourceUrl must be a valid URL.');
  }
  if (parsedUrl.protocol !== 'https:') throw new Error('sourceUrl must use HTTPS.');
  if (!Number.isSafeInteger(options.stateId) || options.stateId <= 0) throw new Error('stateId must be a positive integer.');
  if (!Number.isSafeInteger(options.commodityId) || options.commodityId <= 0) throw new Error('commodityId must be a positive integer.');

  const fetchedAt = new Date(options.fetchedAt);
  if (!Number.isFinite(fetchedAt.getTime())) throw new Error('fetchedAt must be a valid timestamp.');
  return fetchedAt.toISOString();
}

function readMetadata(filtersResponse: unknown, options: AgmarknetMappingOptions) {
  if (!isObject(filtersResponse) || filtersResponse.status !== true || !isObject(filtersResponse.data)) {
    throw new Error('AGMARKNET filters response is invalid.');
  }

  const data = filtersResponse.data;
  const arrays = ['state_data', 'cmdt_data', 'market_data', 'district_data'] as const;
  for (const key of arrays) {
    if (!Array.isArray(data[key])) throw new Error(`AGMARKNET filters are missing ${key}.`);
  }

  const states = (data.state_data as unknown[]).filter(isObject);
  const commodities = (data.cmdt_data as unknown[]).filter(isObject);
  const stateMatches = states.filter((record) => readId(record.state_id) === options.stateId);
  const commodityMatches = commodities.filter((record) => readId(record.cmdt_id) === options.commodityId);
  if (stateMatches.length !== 1 || !normalizeWhitespace(stateMatches[0]?.state_name)) {
    throw new Error(`Expected exactly one state metadata record for stateId ${options.stateId}.`);
  }
  if (commodityMatches.length !== 1 || !normalizeWhitespace(commodityMatches[0]?.cmdt_name)) {
    throw new Error(`Expected exactly one commodity metadata record for commodityId ${options.commodityId}.`);
  }

  return {
    state: normalizeWhitespace(stateMatches[0].state_name) as string,
    crop: normalizeWhitespace(commodityMatches[0].cmdt_name) as string,
    markets: (data.market_data as unknown[]).filter(isObject),
    districts: (data.district_data as unknown[]).filter(isObject),
  };
}

function rejection(
  marketIndex: number,
  dateIndex: number,
  dataIndex: number,
  marketName: string | null,
  arrivalDate: string | null,
  variety: string | null,
  reasons: string[],
): MappingRejection {
  return { market_index: marketIndex, date_index: dateIndex, data_index: dataIndex, market_name: marketName, arrival_date: arrivalDate, variety, reasons };
}

function incrementReasons(counts: Record<string, number>, reasons: string[]): void {
  for (const reason of reasons) counts[reason] = (counts[reason] ?? 0) + 1;
}

function naturalKey(record: MarketPriceRecord): string {
  return JSON.stringify([
    record.crop,
    record.state,
    record.district,
    record.market,
    record.price_date,
    record.variety ?? '',
    record.grade ?? '',
  ]);
}

export function normalizeAgmarknetDateWiseResponse(
  response: unknown,
  filtersResponse: unknown,
  options: AgmarknetMappingOptions,
): AgmarknetMappingResult {
  const fetchedAt = validateOptions(options);
  if (!isObject(response) || response.success !== true || !Array.isArray(response.markets)) {
    throw new Error('AGMARKNET date-wise response must have success=true and a markets array.');
  }
  ensurePriceUnit(response.columns);
  const metadata = readMetadata(filtersResponse, options);
  const rejectedRows: MappingRejection[] = [];
  const unresolvedByKey = new Map<string, UnresolvedMarketMapping>();
  const candidates: Array<{ record: MarketPriceRecord; rowIndex: number; source: MappingRejection }> = [];
  const rejectionCounts: Record<string, number> = {};
  let inputRows = 0;
  let arrivalValuesNotStored = 0;
  let rowIndex = 0;

  const reject = (item: MappingRejection) => {
    rejectedRows.push(item);
    incrementReasons(rejectionCounts, item.reasons);
  };

  response.markets.forEach((marketValue, marketIndex) => {
    if (!isObject(marketValue)) {
      reject(rejection(marketIndex, -1, -1, null, null, null, ['invalid_market_record']));
      return;
    }
    const marketName = normalizeWhitespace(marketValue.marketName);
    if (!Array.isArray(marketValue.dates)) {
      reject(rejection(marketIndex, -1, -1, marketName, null, null, ['invalid_dates_array']));
      return;
    }

    marketValue.dates.forEach((dateValue, dateIndex) => {
      if (!isObject(dateValue) || !Array.isArray(dateValue.data)) {
        reject(rejection(marketIndex, dateIndex, -1, marketName, null, null, ['invalid_price_data_array']));
        return;
      }

      dateValue.data.forEach((rowValue, dataIndex) => {
        const currentRowIndex = rowIndex++;
        inputRows += 1;
        if (isObject(rowValue) && Object.prototype.hasOwnProperty.call(rowValue, 'arrivals')) {
          arrivalValuesNotStored += 1;
        }
        if (!isObject(rowValue)) {
          reject(rejection(marketIndex, dateIndex, dataIndex, marketName, normalizeWhitespace(dateValue.arrivalDate), null, ['invalid_price_record']));
          return;
        }

        const arrivalDate = normalizeWhitespace(dateValue.arrivalDate);
        const priceDate = parseAgmarknetDate(dateValue.arrivalDate);
        const variety = normalizeWhitespace(rowValue.variety);
        const grade = normalizeWhitespace(rowValue.grade);
        const reasons: string[] = [];
        if (!marketName) reasons.push('missing_market_name');
        if (!priceDate) reasons.push('invalid_arrival_date');

        let mappedMarket: JsonObject | null = null;
        let mappedDistrict: JsonObject | null = null;
        if (marketName) {
          const key = normalizeMarketKey(marketName) as string;
          const matches = metadata.markets.filter((record) =>
            normalizeMarketKey(record.mkt_name) === key && readId(record.state_id) === options.stateId
          );
          if (matches.length === 0) {
            reasons.push('market_not_found');
            unresolvedByKey.set(`${key}:market_not_found`, {
              market_name: marketName,
              reason: 'market_not_found',
              market_ids: [],
              district_ids: [],
            });
          } else if (matches.length > 1) {
            reasons.push('ambiguous_market');
            unresolvedByKey.set(`${key}:ambiguous_market`, {
              market_name: marketName,
              reason: 'ambiguous_market',
              market_ids: matches.map((record) => readId(record.id)).filter((id): id is number => id !== null),
              district_ids: matches.map((record) => readId(record.district_id)).filter((id): id is number => id !== null),
            });
          } else {
            mappedMarket = matches[0];
            const districtId = readId(mappedMarket.district_id);
            const districtMatches = metadata.districts.filter((record) =>
              readId(record.id) === districtId && readId(record.state_id) === options.stateId
            );
            if (districtMatches.length === 0) {
              reasons.push('district_not_found');
              unresolvedByKey.set(`${key}:district_not_found`, {
                market_name: marketName,
                reason: 'district_not_found',
                market_ids: [readId(mappedMarket.id)].filter((id): id is number => id !== null),
                district_ids: districtId === null ? [] : [districtId],
              });
            } else if (districtMatches.length > 1) {
              reasons.push('ambiguous_district');
              unresolvedByKey.set(`${key}:ambiguous_district`, {
                market_name: marketName,
                reason: 'ambiguous_district',
                market_ids: [readId(mappedMarket.id)].filter((id): id is number => id !== null),
                district_ids: districtMatches.map((record) => readId(record.id)).filter((id): id is number => id !== null),
              });
            } else {
              mappedDistrict = districtMatches[0];
            }
          }
        }

        const rawPrices = [
          ['minimumPrice', 'min_price'],
          ['maximumPrice', 'max_price'],
          ['modalPrice', 'modal_price'],
        ] as const;
        const prices: Partial<Record<(typeof rawPrices)[number][1], number>> = {};
        for (const [sourceKey, targetKey] of rawPrices) {
          const value = rowValue[sourceKey];
          if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
            reasons.push(`missing_${targetKey}`);
            continue;
          }
          const price = parsePrice(value);
          if (price === null) {
            reasons.push(`invalid_${targetKey}`);
            continue;
          }
          if (price < 0) {
            reasons.push(`negative_${targetKey}`);
            continue;
          }
          prices[targetKey] = price;
        }

        const minPrice = prices.min_price;
        const maxPrice = prices.max_price;
        const modalPrice = prices.modal_price;
        if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) reasons.push('min_price_exceeds_max_price');
        if (minPrice !== undefined && modalPrice !== undefined && modalPrice < minPrice) reasons.push('modal_price_below_min_price');
        if (maxPrice !== undefined && modalPrice !== undefined && modalPrice > maxPrice) reasons.push('modal_price_above_max_price');

        if (reasons.length > 0 || !mappedMarket || !mappedDistrict || priceDate === null ||
          minPrice === undefined || maxPrice === undefined || modalPrice === undefined) {
          if (reasons.length === 0) reasons.push('unresolved_market_district');
          reject(rejection(marketIndex, dateIndex, dataIndex, marketName, arrivalDate, variety, [...new Set(reasons)]));
          return;
        }

        const record: MarketPriceRecord = {
          crop: metadata.crop,
          state: metadata.state,
          district: normalizeWhitespace(mappedDistrict.district_name) as string,
          market: normalizeWhitespace(mappedMarket.mkt_name) as string,
          variety,
          grade,
          min_price: minPrice,
          max_price: maxPrice,
          modal_price: modalPrice,
          unit: PRICE_UNIT,
          price_date: priceDate,
          source_name: SOURCE_NAME,
          source_url: options.sourceUrl,
          fetched_at: fetchedAt,
        };
        candidates.push({ record, rowIndex: currentRowIndex, source: rejection(marketIndex, dateIndex, dataIndex, marketName, arrivalDate, variety, []) });
      });
    });
  });

  const rowsByNaturalKey = new Map<string, typeof candidates>();
  for (const candidate of candidates) {
    const key = naturalKey(candidate.record);
    const existing = rowsByNaturalKey.get(key) ?? [];
    existing.push(candidate);
    rowsByNaturalKey.set(key, existing);
  }

  const records: MarketPriceRecord[] = [];
  const naturalKeyCollisions: NaturalKeyCollision[] = [];
  for (const sameKeyRows of rowsByNaturalKey.values()) {
    if (sameKeyRows.length === 1) {
      records.push(sameKeyRows[0].record);
      continue;
    }
    const first = sameKeyRows[0].record;
    naturalKeyCollisions.push({
      crop: first.crop,
      state: first.state,
      district: first.district,
      market: first.market,
      price_date: first.price_date,
      variety: first.variety,
      grade: first.grade,
      row_indexes: sameKeyRows.map((candidate) => candidate.rowIndex),
    });
    for (const candidate of sameKeyRows) {
      reject({ ...candidate.source, reasons: ['natural_key_collision'] });
    }
  }

  return {
    input_rows: inputRows,
    records,
    rejected_rows: rejectedRows,
    rejection_counts: rejectionCounts,
    unresolved_mappings: [...unresolvedByKey.values()],
    natural_key_collisions: naturalKeyCollisions,
    arrival_values_not_stored: arrivalValuesNotStored,
  };
}