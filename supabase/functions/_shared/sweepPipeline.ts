/**
 * market-data sweep pipeline — pure, dependency-free upstream handling.
 *
 * Single source of truth for interpreting data.gov.in sweep responses, used by
 * supabase/functions/market-data/index.ts. Extracted so the exact production
 * logic (empty-vs-failure classification, pagination honesty, per-commodity
 * aggregation, upsert gating) can be unit-tested in plain Node with mocked
 * upstream responses — no Deno, network, database, or secrets.
 *
 * The Edge handler must delegate to these helpers and must not re-implement
 * the classification/aggregation branching.
 */

import {
  describeEnvelope,
  normalizeDataGovInResponse,
  type EnvelopeEvidence,
  type MarketPriceRecord,
} from './dataGovInMapping.ts';

/** Sweep pagination bound (must match SWEEP_MAX_PAGES in index.ts). */
export const SWEEP_MAX_PAGES = 10;

/** Per-page row limit (must match PAGE_LIMIT in index.ts). */
export const SWEEP_PAGE_LIMIT = 1000;

/** Outcome of classifying one fetched upstream page. */
export type SweepPageOutcome =
  | {
      kind: 'page';
      /** Parsed envelope (records array guaranteed present). */
      payload: Record<string, unknown>;
      /** Redacted source URL (API key already replaced with [REDACTED]). */
      sourceUrl: string;
      /** Redacted envelope evidence for diagnostics. */
      evidence: EnvelopeEvidence;
      /** Whether this page is the last one (< PAGE_LIMIT rows returned). */
      lastPage: boolean;
    }
  | {
      kind: 'failure';
      /** Safe, key-free diagnostic message for the ok:false response. */
      message: string;
      /** HTTP-derived failure category for honest reporting. */
      category:
        | 'auth'
        | 'rate_limited'
        | 'http_error'
        | 'invalid_json'
        | 'invalid_envelope'
        | 'api_error';
    };


/**
 * Classify a raw upstream HTTP response into a usable page or an explicit
 * failure. Never returns a "successful empty page" for a failed request:
 * any non-2xx status, non-JSON body, unexpected envelope, missing
 * records array, or API-level error status becomes { kind: 'failure' } with
 * a sanitized message (no keys, tokens, or headers).
 */
export function classifyUpstreamPage(args: {
  status: number;
  contentType: string | null;
  bodyText: string;
  redactedSourceUrl: string;
  context: string;
}): SweepPageOutcome {
  const { status, contentType, bodyText, redactedSourceUrl, context } = args;
  const hint =
    'The DATA_GOV_IN_API_KEY may be invalid, unauthorized for this resource, or quota-exhausted.';
  if (status === 429) {
    return {
      kind: 'failure',
      category: 'rate_limited',
      message: `data.gov.in rate-limited the request for ${context} (HTTP 429).`,
    };
  }
  if (status === 403) {
    return {
      kind: 'failure',
      category: 'auth',
      message: `data.gov.in denied the request (HTTP 403) for ${context}. ${hint}`,
    };
  }
  if (status < 200 || status >= 300) {
    return {
      kind: 'failure',
      category: 'http_error',
      message: `data.gov.in returned HTTP ${status} for ${context}.`,
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return {
      kind: 'failure',
      category: 'invalid_json',
      message:
        `data.gov.in returned a non-JSON body for ${context} ` +
        `(HTTP ${status}, content-type ${contentType ?? 'unknown'}).`,
    };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      kind: 'failure',
      category: 'invalid_envelope',
      message: `data.gov.in returned an invalid response envelope for ${context}.`,
    };
  }
  const envelope = parsed as Record<string, unknown>;
  if (envelope.status !== undefined && envelope.status !== 'ok') {
    return {
      kind: 'failure',
      category: 'api_error',
      message: `data.gov.in reported status "${String(envelope.status)}" for ${context}.`,
    };
  }
  if (!Array.isArray(envelope.records)) {
    return {
      kind: 'failure',
      category: 'invalid_envelope',
      message:
        `data.gov.in returned a response without a records array for ${context} ` +
        `(envelope fields: ${Object.keys(envelope).sort().join(', ') || '(none)'}).`,
    };
  }
  return {
    kind: 'page',
    payload: envelope,
    sourceUrl: redactedSourceUrl,
    evidence: describeEnvelope(envelope, { httpStatus: status, contentType, jsonParseOk: true }),
    lastPage: envelope.records.length < SWEEP_PAGE_LIMIT,
  };
}

/** Running sweep aggregate folded across pages (caller-owned). */
export type SweepAggregate = {
  records: MarketPriceRecord[];
  seenNaturalKeys: Set<string>;
  labelCounts: Record<string, number>;
  inputRows: number;
  duplicates: number;
  rejectionCounts: Record<string, number>;
};

/** One classified success page (narrows SweepPageOutcome). */
export type SweepSuccessPage = {
  kind: 'page';
  payload: Record<string, unknown>;
  sourceUrl: string;
  evidence: EnvelopeEvidence;
  lastPage: boolean;
};

/** Options for folding one page. */
export type FoldSweepPageOptions = {
  state: string;
  sourceUrl: string;
  fetchedAt: string;
};

/**
 * Map one classified page's records through the shared normalizer and fold
 * them into the running sweep aggregate (dedupe by natural key, per-label
 * counts, rejection counts). Pure: the caller supplies the aggregate.
 */
export function foldSweepPage(
  aggregate: SweepAggregate,
  page: SweepSuccessPage,
  options: FoldSweepPageOptions,
  naturalKeyOf: (record: MarketPriceRecord) => string,
): void {
  const mapped = normalizeDataGovInResponse(page.payload, {
    crop: 'sweep',
    acceptAnyCommodity: true,
    state: options.state,
    sourceUrl: options.sourceUrl,
    fetchedAt: options.fetchedAt,
  });
  aggregate.inputRows += mapped.input_rows;
  for (const rec of mapped.records) {
    const key = naturalKeyOf(rec);
    if (aggregate.seenNaturalKeys.has(key)) {
      aggregate.duplicates += 1;
      continue;
    }
    aggregate.seenNaturalKeys.add(key);
    aggregate.records.push(rec);
    aggregate.labelCounts[rec.crop] = (aggregate.labelCounts[rec.crop] ?? 0) + 1;
  }
  for (const [reason, n] of Object.entries(mapped.rejection_counts)) {
    aggregate.rejectionCounts[reason] = (aggregate.rejectionCounts[reason] ?? 0) + n;
  }
}

/** Per-commodity sweep entry (one real upstream label each, never folded). */
export type SweepCommodityEntry = {
  crop: string;
  labels: string[];
  records: number;
};

/**
 * Aggregate stored sweep records into per-commodity entries: one entry per
 * real upstream label actually stored (verbatim — Coconut and Copra stay
 * distinct), sorted by count desc then label. Returns [] when nothing was
 * stored so the caller can emit the honest empty representation.
 */
export function aggregateSweepCommodities(labelCounts: Record<string, number>): SweepCommodityEntry[] {
  return Object.entries(labelCounts)
    .map(([label, n]) => ({ crop: label, labels: [label], records: n }))
    .sort((a, b) => b.records - a.records || a.crop.localeCompare(b.crop));
}

/**
 * Whether the database upsert may run: only when every fetched page
 * classified successfully. Any upstream failure gates the upsert off so a
 * failed sweep never writes partial data and never reports ok:true.
 */
export function canUpsertSweepResults(outcomes: SweepPageOutcome[]): boolean {
  return outcomes.length > 0 && outcomes.every((o) => o.kind === 'page');
}
