/**
 * data.gov.in (AGMARKNET "Current Daily Price of Various Commodities from
 * Various Markets (Mandi)") response mapper.
 *
 * The official data.gov.in resource (9ef84268-d588-465a-a308-a864a43d0070) is
 * the proven upstream that FarmLynq's `refresh-market-prices` Edge Function
 * ingested successfully. This module reuses that proven request/response
 * contract while emitting SmartFarm 2.0's existing `MarketPriceRecord` shape so
 * the existing natural-key upsert, crop mappings, freshness calculations and
 * frontend service contracts remain unchanged.
 *
 * IMPORTANT (verified against FarmLynq's own captured probe responses of this
 * exact resource): the resource MIRRORS the case of the filter key it is given.
 *   - lower-case filter  `filters[commodity]` -> lower-case fields
 *     (`arrival_date`, `commodity`, `modal_price`, ...)
 *   - TitleCase filter   `filters[Commodity]` -> TitleCase fields
 *     (`Arrival_Date`, `Commodity`, `Modal_Price`, ...)
 * This module therefore accepts BOTH casings for every field, so it maps the
 * response correctly regardless of how the request is cased.
 *
 * The response also contains a well-known catch-all record
 * (Commodity === 'Onion', price === 65535) that carries no usable price and is
 * dropped so it is never stored as a fabricated price.
 *
 * Dates are `dd/mm/yyyy` (verified) and normalised to ISO `YYYY-MM-DD`. A row
 * with an unparsable/missing date or missing price is rejected and never
 * replaced with an invented value.
 */

type JsonObject = Record<string, unknown>;

/** Same record shape the existing AGMARKNET mapper and upsert RPC expect. */
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

export type MappingRejection = { reasons: string[] };

export type DataGovInMappingResult = {
  input_rows: number;
  records: MarketPriceRecord[];
  rejected_rows: MappingRejection[];
  rejection_counts: Record<string, number>;
};

/**
 * Safe, redacted evidence about the upstream response envelope.
 *
 * Intended for diagnostics on empty or suspicious sweeps: it records the HTTP
 * status, content type, envelope shape and the upstream's own total/count
 * fields WITHOUT any API key, token, or row content. The edge handler may
 * surface this object inside an ok:false error response; individual row
 * validation failures continue to be reported via rejection_counts.
 */
export type EnvelopeEvidence = {
  /** HTTP status of the upstream response (null when parsing a stored payload). */
  http_status: number | null;
  /** Declared response content type, if any. */
  content_type: string | null;
  /** Whether the payload body parsed as JSON. */
  json_parse_ok: boolean;
  /** envelope.status as reported by data.gov.in, when present. */
  api_status: string | null;
  /** envelope.total as reported by data.gov.in, when numeric. */
  api_total: number | null;
  /** envelope.count as reported by data.gov.in, when numeric. */
  api_count: number | null;
  /** Number of entries in envelope.records (null when not an array). */
  records_length: number | null;
  /** Sorted envelope field names (keys only, never values). */
  field_names: string[];
};

/** Safely coerce an unknown value to a finite number, else null. */
function toFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Describe an upstream envelope for diagnostics without leaking secrets.
 * Never throws: every field degrades to null/[] on unexpected shapes.
 */
export function describeEnvelope(
  payload: unknown,
  meta?: { httpStatus?: unknown; contentType?: unknown; jsonParseOk?: boolean },
): EnvelopeEvidence {
  const httpStatus = toFiniteNumber(meta?.httpStatus);
  const contentType =
    typeof meta?.contentType === 'string' && meta.contentType.trim()
      ? meta.contentType.trim().slice(0, 120)
      : null;
  if (!isObject(payload)) {
    return {
      http_status: httpStatus,
      content_type: contentType,
      json_parse_ok: meta?.jsonParseOk ?? true,
      api_status: null,
      api_total: null,
      api_count: null,
      records_length: null,
      field_names: [],
    };
  }
  const statusValue = payload.status;
  return {
    http_status: httpStatus,
    content_type: contentType,
    json_parse_ok: meta?.jsonParseOk ?? true,
    api_status: typeof statusValue === 'string' ? statusValue.slice(0, 120) : null,
    api_total: toFiniteNumber(payload.total),
    api_count: toFiniteNumber(payload.count),
    records_length: Array.isArray(payload.records) ? payload.records.length : null,
    field_names: Object.keys(payload)
      .filter((key) => key !== '__source_url')
      .sort()
      .slice(0, 50),
  };
}

export type DataGovInMappingOptions = {
  /** Canonical crop group stored verbatim in `crop` (e.g. discovered raw label or requested name). */
  crop: string;
  sourceUrl: string;
  fetchedAt: string;
  /** Full set of raw commodity labels that resolve to this canonical crop. */
  aliases?: string[];
  /** Optional state filter (data.gov.in returns every state when unfiltered). */
  state?: string;
  sourceName?: string;
  unit?: string;
  /**
   * When true, accept ANY non-sentinel commodity label (dynamic discovery mode).
   * The raw upstream label is then stored verbatim in `crop` instead of options.crop,
   * so no per-crop code change is ever needed for new commodities.
   * Strict validation (district/market/date/prices/sentinel) still applies.
   * Explicitly incompatible with IGNORE placeholder handling: Onion rows are still
   * gated by the 65535 sentinel (see below), never stored blindly.
   */
  acceptAnyCommodity?: boolean;
};

const SOURCE_NAME = 'data.gov.in / AGMARKNET (Current Daily Price)';
const PRICE_UNIT = 'INR/quintal';

// Known catch-all row in the feed (Onion / 65535) that carries no usable price.
// Only rows carrying the 65535 sentinel in ANY price field are dropped — genuine
// Onion rows with real prices are accepted. The commodity-name check below is
// therefore sentinel-gated, with ignored_price_sentinel as a second net.
const IGNORE_COMMODITIES = new Set(['onion']);
const IGNORE_PRICE_SENTINEL = 65535;

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeWhitespace(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const normalized = String(value).replace(/\s+/g, ' ').trim();
  return normalized || null;
}

/** Read a field regardless of whether the feed returned snake_case or TitleCase. */
function readField(record: JsonObject, base: string): unknown {
  const variants = new Set<string>([
    // lower-case snake_case, e.g. `commodity`, `arrival_date`
    base,
    // collapsed, e.g. `arrivaldate`
    base.replace(/_/g, ''),
    // TitleCase with the first letter of every word capitalised, e.g.
    // `Commodity`, `Arrival_Date`, `Min_Price` (this is the real data.gov.in form).
    base
      .split('_')
      .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
      .join('_'),
  ]);
  for (const key of variants) {
    const value = record[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day;
}

/**
 * Parse the resource's `dd/mm/yyyy` date (also tolerating ISO) into ISO
 * `YYYY-MM-DD`. Returns null for anything it cannot unambiguously parse so the
 * caller rejects the row instead of inventing a date.
 */
export function parseDataGovInDate(value: unknown): string | null {
  const raw = normalizeWhitespace(value);
  if (!raw) return null;

  const slash = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]);
    const year = Number(slash[3]);
    return isValidDate(year, month, day) ? `${slash[3]}-${slash[2]}-${slash[1]}` : null;
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    return isValidDate(year, month, day) ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
  }

  return null;
}

/**
 * Coerce a price to a finite, non-negative number. Returns null for blanks,
 * non-numbers or negatives so the caller rejects the row rather than storing a
 * fabricated price.
 */
function toPrice(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

/**
 * Natural key mirroring SmartFarm's existing upsert identity:
 * crop + state + district + market + price_date + variety + grade.
 */
export function naturalKey(record: MarketPriceRecord): string {
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

/**
 * Map a raw data.gov.in response into SmartFarm `MarketPriceRecord`s.
 *
 * Throws only when the response envelope itself is unusable (so a malformed
 * upstream is reported as a failure, never as a silent success). Individual
 * unusable rows are collected as rejections.
 */
export function normalizeDataGovInResponse(
  response: unknown,
  options: DataGovInMappingOptions,
): DataGovInMappingResult {
  if (!isObject(response) || !Array.isArray(response.records)) {
    throw new Error('data.gov.in response must contain a records array.');
  }
  if (!Number.isFinite(new Date(options.fetchedAt).getTime())) {
    throw new Error('fetchedAt must be a valid timestamp.');
  }

  const fetchedAt = options.fetchedAt;
  const sourceName = options.sourceName ?? SOURCE_NAME;
  const unit = options.unit ?? PRICE_UNIT;
  const aliases = new Set(
    (options.aliases ?? [options.crop]).map((alias) => alias.trim().toLowerCase()),
  );
  const stateFilter = options.state ? options.state.trim().toLowerCase() : null;

  const records: MarketPriceRecord[] = [];
  const rejectedRows: MappingRejection[] = [];
  const rejectionCounts: Record<string, number> = {};
  let inputRows = 0;

  const reject = (reason: string) => {
    rejectedRows.push({ reasons: [reason] });
    rejectionCounts[reason] = (rejectionCounts[reason] ?? 0) + 1;
  };

  for (const rowValue of response.records) {
    inputRows += 1;
    if (!isObject(rowValue)) {
      reject('invalid_record');
      continue;
    }

    const commodity = normalizeWhitespace(readField(rowValue, 'commodity'));
    const minPricePeek = toPrice(readField(rowValue, 'min_price'));
    const maxPricePeek = toPrice(readField(rowValue, 'max_price'));
    const modalPricePeek = toPrice(readField(rowValue, 'modal_price'));
    const carriesSentinel =
      minPricePeek === IGNORE_PRICE_SENTINEL || maxPricePeek === IGNORE_PRICE_SENTINEL ||
      modalPricePeek === IGNORE_PRICE_SENTINEL;
    if (commodity && IGNORE_COMMODITIES.has(commodity.toLowerCase()) && carriesSentinel) {
      reject('ignored_placeholder_commodity');
      continue;
    }
    const acceptAny = options.acceptAnyCommodity === true;
    if (!commodity || (!acceptAny && !aliases.has(commodity.toLowerCase()))) {
      reject('commodity_mismatch');
      continue;
    }

    const state = normalizeWhitespace(readField(rowValue, 'state'));
    if (stateFilter && (!state || state.toLowerCase() !== stateFilter)) {
      reject('state_mismatch');
      continue;
    }

    const district = normalizeWhitespace(readField(rowValue, 'district'));
    const market = normalizeWhitespace(readField(rowValue, 'market'));
    if (!district) { reject('missing_district'); continue; }
    if (!market) { reject('missing_market'); continue; }

    const priceDate = parseDataGovInDate(readField(rowValue, 'arrival_date'));
    if (!priceDate) { reject('invalid_arrival_date'); continue; }

    const minPrice = toPrice(readField(rowValue, 'min_price'));
    const maxPrice = toPrice(readField(rowValue, 'max_price'));
    const modalPrice = toPrice(readField(rowValue, 'modal_price'));
    if (minPrice === null || maxPrice === null || modalPrice === null) {
      reject('missing_price');
      continue;
    }
    if (minPrice === IGNORE_PRICE_SENTINEL || maxPrice === IGNORE_PRICE_SENTINEL ||
      modalPrice === IGNORE_PRICE_SENTINEL) {
      reject('ignored_price_sentinel');
      continue;
    }

    records.push({
      crop: acceptAny && commodity ? commodity : options.crop,
      state: state ?? '',
      district,
      market,
      variety: normalizeWhitespace(readField(rowValue, 'variety')),
      grade: normalizeWhitespace(readField(rowValue, 'grade')),
      min_price: minPrice,
      max_price: maxPrice,
      modal_price: modalPrice,
      unit,
      price_date: priceDate,
      source_name: sourceName,
      source_url: options.sourceUrl,
      fetched_at: fetchedAt,
    });
  }

  return { input_rows: inputRows, records, rejected_rows: rejectedRows, rejection_counts: rejectionCounts };
}

