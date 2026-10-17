/**
 * Offline regression tests for the market-data sweep pipeline (part 2b).
 * Upsert behavior, aggregation, pagination, routing, evidence hygiene.
 * Run: node --test scripts/test-market-sweep-pipeline3.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateSweepCommodities,
  canUpsertSweepResults,
} from '../supabase/functions/_shared/sweepPipeline.ts';
import { describeEnvelope } from '../supabase/functions/_shared/dataGovInMapping.ts';
import { resolveIngestionPlan } from '../supabase/functions/_shared/marketDataModes.ts';
import {
  FETCHED_AT,
  classify,
  envelope,
  foldPage,
  row,
} from './test-market-sweep-pipeline.mjs';

async function fakeUpsert(records, fail = false) {
  if (fail) throw new Error('Failed to upsert market prices: connection refused');
  return records.length;
}

test('successful upsert stores the folded record count', async () => {
  const outcome = classify(envelope([
    row(),
    row({ commodity: 'Ragi', market: 'Tumakuru', district: 'Tumakuru', min_price: 2100, max_price: 2400, modal_price: 2250 }),
  ]));
  const agg = foldPage(outcome);
  assert.ok(canUpsertSweepResults([outcome]));
  assert.equal(await fakeUpsert(agg.records), 2);
});

test('upsert failure surfaces with zero stored', async () => {
  const outcome = classify(envelope([row()]));
  const agg = foldPage(outcome);
  let stored = 0;
  let error = null;
  try {
    stored = await fakeUpsert(agg.records, true);
  } catch (e) {
    error = e.message;
  }
  assert.equal(stored, 0);
  assert.match(error, /upsert/i);
});

test('no database writes occur when the upstream response cannot be interpreted', async () => {
  let writes = 0;
  const countingUpsert = async () => { writes += 1; return 0; };
  for (const bad of [
    classify({ nope: true }),
    classify('not json', 200, 'text/html'),
    classify({}, 403),
  ]) {
    assert.equal(bad.kind, 'failure');
    if (canUpsertSweepResults([bad])) await countingUpsert();
  }
  assert.equal(writes, 0);
});

test('commodity aggregation preserves raw labels verbatim and sorts by count', () => {
  const entries = aggregateSweepCommodities({ Tomato: 5, Coconut: 2, 'Paddy(Dhan)(Common)': 5, Copra: 1 });
  assert.deepEqual(entries.map((e) => e.crop), ['Paddy(Dhan)(Common)', 'Tomato', 'Coconut', 'Copra']);
  assert.ok(!entries.some((e) => e.crop === 'sweep'));
});

test('pagination honesty: full pages continue, short pages complete', () => {
  const many = Array.from({ length: 1000 }, () => row());
  const full = classify({ status: 'ok', total: 2500, count: 1000, records: many });
  assert.equal(full.kind, 'page');
  assert.equal(full.lastPage, false);
  const short = classify(envelope([row()]));
  assert.equal(short.kind, 'page');
  assert.equal(short.lastPage, true);
});

test('REGRESSION: sweep never triggers targeted validation', () => {
  const route = resolveIngestionPlan({ mode: 'sweep', state: 'Karnataka' }, 'Karnataka');
  assert.equal(route.route, 'sweep');
  assert.equal(route.state, 'Karnataka');
  assert.ok(!('error' in route));
});

test('targeted and all modes still resolve through the shared dispatcher', () => {
  const targeted = resolveIngestionPlan({ mode: 'targeted', crops: ['Coconut'] }, 'Karnataka');
  assert.equal(targeted.route, 'targeted');
  assert.equal(targeted.plans.length, 1);
  const all = resolveIngestionPlan({ mode: 'all' }, 'Karnataka');
  assert.equal(all.route, 'all');
  assert.equal(all.plans.length, 3);
});

test('envelope evidence carries diagnostics without secrets', () => {
  const payload = envelope([row()], { total: 1, count: 1 });
  const evidence = describeEnvelope(payload, { httpStatus: 200, contentType: 'application/json', jsonParseOk: true });
  assert.equal(evidence.http_status, 200);
  assert.equal(evidence.api_total, 1);
  assert.equal(evidence.records_length, 1);
  assert.ok(evidence.field_names.includes('records'));
  const serialized = JSON.stringify(evidence);
  assert.doesNotMatch(serialized, /DATA_GOV_IN_API_KEY|Bearer/i);
});

test('source dates stay distinct from fetch timestamps in mapped records', () => {
  const outcome = classify(envelope([row({ arrival_date: '09/10/2026' })]));
  const agg = foldPage(outcome);
  assert.equal(agg.records[0].price_date, '2026-10-09');
  assert.equal(agg.records[0].fetched_at, FETCHED_AT);
  assert.notEqual(agg.records[0].price_date, agg.records[0].fetched_at);
});
