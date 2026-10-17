/**
 * Upstream query-parameter regression tests (offline, no network/secrets).
 *
 * The data.gov.in resource API (ElasticSearch-backed) exposes TEXT fields
 * with `.keyword` sub-fields; exact-match `filters[...]` MUST address the
 * keyword sub-field. Verified references:
 *   - project probe scripts/test-datagovin-market-data.local.mjs uses
 *     'filters[state.keyword]' + 'filters[commodity.keyword]';
 *   - Pipeworx data-gov-in docs map filters {state, commodity} for resource
 *     9ef84268-d588-465a-a308-a864a43d0070, and the platform exposes the
 *     text fields with .keyword identifiers (dataset metadata lists
 *     state.keyword among exposed fields).
 * Plain filters[state]/filters[commodity] match the analyzed text field
 * (tokenized) and silently return ZERO rows for values like "Karnataka" —
 * exactly the v10 production symptom (HTTP 200, api_status ok, api_total 0,
 * records_length 0 for BOTH sweep and targeted Coconut).
 *
 * Run: node --test scripts/test-market-upstream-query.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSweepUpstreamParams,
  buildTargetedUpstreamParams,
} from '../supabase/functions/_shared/upstreamQuery.ts';

test('sweep page filters address the state keyword sub-field', () => {
  const params = buildSweepUpstreamParams({ state: 'Karnataka', limit: 1000, offset: 0 });
  assert.equal(params.get('filters[state.keyword]'), 'Karnataka');
  assert.equal(params.get('filters[state]'), null);
  assert.equal(params.get('limit'), '1000');
  assert.equal(params.get('offset'), '0');
  assert.equal(params.get('format'), 'json');
});

test('targeted page filters address state+commodity keyword sub-fields', () => {
  const params = buildTargetedUpstreamParams({ commodity: 'Coconut', state: 'Karnataka', limit: 1000, offset: 0 });
  assert.equal(params.get('filters[commodity.keyword]'), 'Coconut');
  assert.equal(params.get('filters[state.keyword]'), 'Karnataka');
  assert.equal(params.get('filters[commodity]'), null);
  assert.equal(params.get('filters[state]'), null);
});

test('verified catalog labels pass through verbatim', () => {
  assert.equal(
    buildTargetedUpstreamParams({ commodity: 'Arecanut(Betelnut/Supari)', state: 'Karnataka', limit: 10, offset: 0 }).get('filters[commodity.keyword]'),
    'Arecanut(Betelnut/Supari)',
  );
  assert.equal(
    buildTargetedUpstreamParams({ commodity: 'Black pepper', state: 'Karnataka', limit: 10, offset: 0 }).get('filters[commodity.keyword]'),
    'Black pepper',
  );
});

test('query builders never include credentials', () => {
  for (const params of [
    buildSweepUpstreamParams({ state: 'Karnataka', limit: 1, offset: 0 }),
    buildTargetedUpstreamParams({ commodity: 'Coconut', state: 'Karnataka', limit: 1, offset: 0 }),
  ]) {
    const serialized = params.toString();
    assert.doesNotMatch(serialized, /api-key|apikey|token|secret/i);
  }
});
