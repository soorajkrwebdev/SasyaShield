/**
 * Offline regression tests for the market-data sweep pipeline (part 2a).
 * Failure envelopes + validation rejections + duplicates (mocked only).
 * Run: node --test scripts/test-market-sweep-pipeline2.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { canUpsertSweepResults } from '../supabase/functions/_shared/sweepPipeline.ts';
import {
  classify,
  envelope,
  foldPage,
  row,
} from './test-market-sweep-pipeline.mjs';

test('malformed JSON classifies as invalid_json with content-type context', () => {
  const outcome = classify('<html>not json</html>', 200, 'text/html');
  assert.equal(outcome.kind, 'failure');
  assert.equal(outcome.category, 'invalid_json');
  assert.match(outcome.message, /non-JSON body/);
  assert.ok(!canUpsertSweepResults([outcome]));
});

test('unexpected envelope shapes classify as invalid_envelope', () => {
  for (const body of [[1, 2], 'just a string', 42, null]) {
    const outcome = classify(JSON.stringify(body));
    assert.equal(outcome.kind, 'failure');
    assert.equal(outcome.category, 'invalid_envelope');
  }
  const noRecords = classify({ status: 'ok', total: 5, count: 5 });
  assert.equal(noRecords.kind, 'failure');
  assert.equal(noRecords.category, 'invalid_envelope');
  assert.match(noRecords.message, /without a records array/);
  assert.ok(!canUpsertSweepResults([noRecords]));
});

test('API-level error status surfaces as api_error, never an empty success', () => {
  const outcome = classify({ status: 'error', message: 'quota exceeded', records: [] });
  assert.equal(outcome.kind, 'failure');
  assert.equal(outcome.category, 'api_error');
  assert.ok(!canUpsertSweepResults([outcome]));
});

test('rows present but invalid are rejected with counts (not a failure)', () => {
  const outcome = classify(envelope([
    row({ arrival_date: 'not-a-date' }),
    row({ modal_price: '' }),
    row({ district: '' }),
  ]));
  assert.equal(outcome.kind, 'page');
  const agg = foldPage(outcome);
  assert.equal(agg.records.length, 0);
  assert.equal(agg.inputRows, 3);
  assert.ok(Object.keys(agg.rejectionCounts).length > 0);
  assert.ok(canUpsertSweepResults([outcome]));
});

test('duplicate natural keys fold to one stored record with a duplicate count', () => {
  const outcome = classify(envelope([row(), { ...row() }]));
  const agg = foldPage(outcome);
  assert.equal(agg.records.length, 1);
  assert.equal(agg.duplicates, 1);
  assert.equal(agg.inputRows, 2);
});
