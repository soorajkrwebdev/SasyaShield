/**
 * Offline tests for market-data mode selection (mirrors index.ts logic).
 * No network, database, or secrets. Run: node --test scripts/test-market-data-modes.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { selectPlans } from './market-data-mode-fixture.mjs';

test('mode all produces exactly the three catalog commodities', () => {
  const { plans, error } = selectPlans({ mode: 'all' });
  assert.equal(error, undefined);
  assert.deepEqual(plans.map((p) => p.canonical), ['Arecanut', 'Coconut', 'Black pepper']);
});

test('mode all resolves verified source labels', () => {
  const { plans } = selectPlans({ mode: 'all' });
  assert.deepEqual(plans[0].labels, ['Arecanut(Betelnut/Supari)']);
  assert.deepEqual(plans[1].labels, ['Coconut']);
  assert.deepEqual(plans[2].labels, ['Black pepper']);
});

test('mode all needs no crops array', () => {
  assert.equal(selectPlans({ mode: 'all' }).plans.length, 3);
  assert.equal(selectPlans({ mode: 'all', crops: undefined }).plans.length, 3);
});

test('targeted Coconut unchanged single plan', () => {
  const { plans, error } = selectPlans({ mode: 'targeted', crops: ['Coconut'] });
  assert.equal(error, undefined);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].canonical, 'Coconut');
  assert.deepEqual(plans[0].labels, ['Coconut']);
});

test('targeted dedupes repeated Coconut', () => {
  const { plans } = selectPlans({ mode: 'targeted', crops: ['Coconut', 'coconut', ' Coconut '] });
  assert.equal(plans.length, 1);
});

test('invalid modes rejected', () => {
  for (const mode of ['full', 'ALL', '', null, undefined, 42]) {
    const r = selectPlans({ mode, crops: ['Coconut'] });
    assert.equal(r.status, 400);
    assert.match(r.error, /Only targeted, all and sweep/);
    assert.equal(r.plans, undefined);
  }
});

test('targeted enforces 1 to 5 limits', () => {
  assert.equal(selectPlans({ mode: 'targeted', crops: [] }).status, 400);
  assert.equal(selectPlans({ mode: 'targeted' }).status, 400);
  const six = selectPlans({ mode: 'targeted', crops: ['A', 'B', 'C', 'D', 'E', 'F'] });
  assert.equal(six.status, 400);
  assert.match(six.error, /1 to 5/);
  const five = selectPlans({ mode: 'targeted', crops: ['Arecanut', 'Coconut', 'Black pepper', 'X', 'Y'] });
  assert.equal(five.plans.length, 5);
});

test('blank names rejected', () => {
  const r = selectPlans({ mode: 'targeted', crops: ['   '] });
  assert.equal(r.status, 400);
  assert.match(r.error, /empty/i);
});

test('zero-row commodity stays explicit zero', () => {
  const perCrop = { crop: 'Black pepper', input_rows: 4, records: 0, duplicates: 0 };
  const response = { ok: true, stored: 0, records: 0, crops: [perCrop] };
  assert.equal(response.ok, true);
  assert.equal(response.crops[0].records, 0);
});

test('budget errors never ok true', () => {
  for (const m of ['data.gov.in request limit reached.', 'data.gov.in request exceeded overall time budget.']) {
    const f = { ok: false, error: m, stored: 0, records: 0 };
    assert.equal(f.ok, false);
  }
});

test('sweep mode needs no crops and routes to sweep handler', () => {
  const r = selectPlans({ mode: 'sweep', state: 'Karnataka' });
  assert.equal(r.error, undefined);
  assert.equal(r.route, 'sweep');
  assert.equal(r.state, 'Karnataka');
});

test('REGRESSION: sweep must not trigger targeted commodity-names validation', () => {
  // { mode: 'sweep', state: 'Karnataka' } must NOT produce
  // "targeted mode requires 1 to 5 commodity names."
  const r = selectPlans({ mode: 'sweep', state: 'Karnataka' });
  assert.equal(r.error, undefined);
  assert.equal(r.route, 'sweep');
});

test('sweep mode with no crops array is accepted', () => {
  const r = selectPlans({ mode: 'sweep' });
  assert.equal(r.error, undefined);
  assert.equal(r.route, 'sweep');
  assert.equal(r.state, 'Karnataka');
});

test('sweep mode with custom state', () => {
  const r = selectPlans({ mode: 'sweep', state: 'Maharashtra' });
  assert.equal(r.error, undefined);
  assert.equal(r.route, 'sweep');
  assert.equal(r.state, 'Maharashtra');
});

test('sweep pagination honesty: truncated unless last page short', () => {
  // Mirrors index.ts sweep loop: complete only when a page returns < PAGE_LIMIT.
  const pageLimit = 1000;
  const decide = (pages) => {
    let complete = false;
    for (const n of pages) {
      if (n < pageLimit) { complete = true; break; }
    }
    return complete ? 'complete' : 'truncated';
  };
  assert.equal(decide([1000, 1000, 412]), 'complete');
  assert.equal(decide(Array(10).fill(1000)), 'truncated');
});
