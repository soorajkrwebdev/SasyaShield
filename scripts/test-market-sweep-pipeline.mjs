/**
 * Offline regression tests for the market-data sweep pipeline (part 1).
 *
 * Exercises the REAL shared helpers (sweepPipeline + dataGovInMapping +
 * marketDataModes) with MOCKED upstream HTTP payloads — no network, database,
 * Deno, secrets, or live API calls.
 *
 * Run: node --test scripts/test-market-sweep-pipeline.mjs
 *      node --test scripts/test-market-sweep-pipeline2.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateSweepCommodities,
  canUpsertSweepResults,
  classifyUpstreamPage,
  foldSweepPage,
} from '../supabase/functions/_shared/sweepPipeline.ts';
import {
  describeEnvelope,
  naturalKey,
} from '../supabase/functions/_shared/dataGovInMapping.ts';
import { resolveIngestionPlan } from '../supabase/functions/_shared/marketDataModes.ts';

export const FETCHED_AT = '2026-10-17T00:00:00.000Z';
export const SOURCE_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=[REDACTED]&format=json';
export const STATE = 'Karnataka';

export function row(overrides = {}) {
  return {
    state: STATE,
    district: 'Shimoga',
    market: 'Shimoga',
    commodity: 'Coconut',
    variety: 'Other',
    grade: 'FAQ',
    arrival_date: '09/10/2026',
    min_price: 6000,
    max_price: 6400,
    modal_price: 6200,
    ...overrides,
  };
}

export function envelope(records, extra = {}) {
  return { status: 'ok', total: records.length, count: records.length, records, ...extra };
}

export function classify(body, status = 200, contentType = 'application/json') {
  return classifyUpstreamPage({
    status,
    contentType,
    bodyText: typeof body === 'string' ? body : JSON.stringify(body),
    redactedSourceUrl: SOURCE_URL,
    context: `state sweep "${STATE}"`,
  });
}

export function freshAggregate() {
  return {
    records: [],
    seenNaturalKeys: new Set(),
    labelCounts: {},
    inputRows: 0,
    duplicates: 0,
    rejectionCounts: {},
  };
}

export function foldPage(outcome) {
  assert.equal(outcome.kind, 'page');
  const agg = freshAggregate();
  foldSweepPage(agg, outcome, { state: STATE, sourceUrl: SOURCE_URL, fetchedAt: FETCHED_AT }, naturalKey);
  return agg;
}

// ── Valid responses: multiple + single commodity ────────────────────────────

test('valid multi-commodity page maps, aggregates, and keeps Coconut/Copra distinct', () => {
  const outcome = classify(envelope([
    row({ commodity: 'Coconut' }),
    row({ commodity: 'Copra', market: 'Sirsi', district: 'Sirsi' }),
    row({ commodity: 'Tomato', market: 'Kolar', district: 'Kolar', min_price: 800, max_price: 1200, modal_price: 1000 }),
  ]));
  assert.equal(outcome.kind, 'page');
  const agg = foldPage(outcome);
  assert.equal(agg.records.length, 3);
  assert.equal(agg.inputRows, 3);
  const entries = aggregateSweepCommodities(agg.labelCounts);
  assert.deepEqual(entries.map((e) => e.crop).sort(), ['Coconut', 'Copra', 'Tomato']);
  assert.ok(canUpsertSweepResults([outcome]));
});

test('valid single-commodity page aggregates to one entry', () => {
  const outcome = classify(envelope([row(), row({ market: 'Sirsi', district: 'Sirsi' })]));
  const agg = foldPage(outcome);
  assert.equal(agg.records.length, 2);
  assert.deepEqual(aggregateSweepCommodities(agg.labelCounts), [
    { crop: 'Coconut', labels: ['Coconut'], records: 2 },
  ]);
});

// ── Genuine empty dataset ───────────────────────────────────────────────────

test('genuine empty dataset is a usable page with zero rows and evidence', () => {
  const outcome = classify(envelope([], { total: 0, count: 0 }));
  assert.equal(outcome.kind, 'page');
  assert.equal(outcome.evidence.records_length, 0);
  assert.equal(outcome.evidence.api_total, 0);
  assert.equal(outcome.lastPage, true);
  const agg = foldPage(outcome);
  assert.equal(agg.records.length, 0);
  assert.equal(agg.inputRows, 0);
  assert.deepEqual(aggregateSweepCommodities(agg.labelCounts), []);
  // Empty is NOT a failure: upsert gate stays open (zero rows to write).
  assert.ok(canUpsertSweepResults([outcome]));
});

// ── HTTP failures: 403, 429, other ──────────────────────────────────────────

test('HTTP 403 classifies as auth failure with a key-free diagnostic', () => {
  const outcome = classify({ message: 'invalid api key' }, 403);
  assert.equal(outcome.kind, 'failure');
  assert.equal(outcome.category, 'auth');
  assert.match(outcome.message, /HTTP 403/);
  assert.doesNotMatch(outcome.message, /api-key=|key=[A-Za-z0-9]/);
  assert.ok(!canUpsertSweepResults([outcome]));
});

test('HTTP 429 classifies as rate_limited and gates the upsert off', () => {
  const outcome = classify('too many requests', 429, 'text/plain');
  assert.equal(outcome.kind, 'failure');
  assert.equal(outcome.category, 'rate_limited');
  assert.ok(!canUpsertSweepResults([outcome]));
});

test('other HTTP errors (500/502/503) classify as http_error', () => {
  for (const status of [500, 502, 503]) {
    const outcome = classify('boom', status, 'text/plain');
    assert.equal(outcome.kind, 'failure');
    assert.equal(outcome.category, 'http_error');
    assert.match(outcome.message, new RegExp(`HTTP ${status}`));
    assert.ok(!canUpsertSweepResults([outcome]));
  }
});
