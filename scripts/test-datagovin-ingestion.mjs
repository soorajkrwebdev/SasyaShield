import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeDataGovInResponse,
  parseDataGovInDate,
} from '../supabase/functions/_shared/dataGovInMapping.ts';

// ── Proven data.gov.in upstream response fixtures ────────────────────────────
// These mirror the verified shape of resource
// 9ef84268-d588-465a-a308-a864a43d0070 captured from FarmLynq's own probes:
// an envelope { status, total, count, records:[...] } whose records carry
// lower-case fields (min/modal_price, arrival_date) and occasionally a
// placeholder row (Onion, 65535). data.gov.in also mirrors the case of the
// filter key, so TitleCase record fields are exercised too.

const FETCHED_AT = '2026-10-13T06:00:00.000Z';
const SOURCE_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

function envelope(records) {
  return { status: 'ok', total: 13, count: records.length, records };
}

function arecanutRecord(overrides = {}) {
  return {
    state: 'Karnataka',
    district: 'Shimoga',
    market: 'Shimoga',
    commodity: 'Arecanut(Betelnut/Supari)',
    variety: 'Red',
    grade: 'FAQ',
    arrival_date: '09/10/2026',
    min_price: 41000,
    max_price: 43000,
    modal_price: 42000,
    ...overrides,
  };
}

function coconutRecord(overrides = {}) {
  return {
    State: 'Karnataka',
    District: 'Sirsi',
    Market: 'Sirsi',
    Commodity: 'Coconut',
    Variety: 'Other',
    Grade: 'FAQ',
    Arrival_Date: '10/10/2026',
    Min_Price: 6000,
    Max_Price: 6400,
    Modal_Price: 6200,
    ...overrides,
  };
}

function pepperRecord(overrides = {}) {
  return {
    State: 'Karnataka',
    District: 'Chikkamagaluru',
    Market: 'Mudigere APMC',
    Commodity: 'Black pepper',
    Variety: 'Malabar',
    Grade: null,
    Arrival_Date: '11/10/2026',
    Min_Price: 35200,
    Max_Price: 69500,
    Modal_Price: 48850,
    ...overrides,
  };
}

const placeholder = {
  State: 'Karnataka',
  District: 'Any',
  Market: 'Any',
  Commodity: 'Onion',
  Variety: 'Onion',
  Grade: 'Onion',
  Arrival_Date: '12/10/2026',
  Min_Price: 65535,
  Max_Price: 65535,
  Modal_Price: 65535,
};

function map(records, options) {
  return normalizeDataGovInResponse(envelope(records), {
    crop: options.crop,
    aliases: options.aliases ?? [options.crop],
    sourceUrl: SOURCE_URL,
    fetchedAt: FETCHED_AT,
    ...options,
  });
}

// ── Date normalisation (source format verified as dd/mm/yyyy) ────────────────

test('dd/mm/yyyy source dates become ISO YYYY-MM-DD', () => {
  assert.equal(parseDataGovInDate('09/10/2026'), '2026-10-09');
  assert.equal(parseDataGovInDate('01/01/2026'), '2026-01-01');
  assert.equal(parseDataGovInDate('2026-10-09'), '2026-10-09'); // ISO tolerated
});

test('invalid or ambiguous dates are rejected, never coerced', () => {
  assert.equal(parseDataGovInDate('32/01/2026'), null); // impossible day
  assert.equal(parseDataGovInDate('31/02/2026'), null); // Feb 31
  assert.equal(parseDataGovInDate('13/13/2026'), null); // impossible month
  assert.equal(parseDataGovInDate('not-a-date'), null);
  assert.equal(parseDataGovInDate(null), null);
  assert.equal(parseDataGovInDate(undefined), null);
});

// ── Field mapping (both casings) + provenance ────────────────────────────────

test('lower-case field records map with full provenance preserved', () => {
  const result = map([arecanutRecord()], { crop: 'Arecanut(Betelnut/Supari)' });
  assert.equal(result.records.length, 1);
  const record = result.records[0];
  assert.equal(record.crop, 'Arecanut(Betelnut/Supari)');
  assert.equal(record.state, 'Karnataka');
  assert.equal(record.district, 'Shimoga');
  assert.equal(record.market, 'Shimoga');
  assert.equal(record.variety, 'Red');
  assert.equal(record.grade, 'FAQ');
  assert.equal(record.min_price, 41000);
  assert.equal(record.max_price, 43000);
  assert.equal(record.modal_price, 42000);
  assert.equal(record.price_date, '2026-10-09');
  assert.equal(record.unit, 'INR/quintal');
  assert.equal(record.source_name, 'data.gov.in / AGMARKNET (Current Daily Price)');
  assert.equal(record.source_url, SOURCE_URL);
  assert.equal(record.fetched_at, FETCHED_AT);
});

test('TitleCase field records map identically (filter-case mirroring handled)', () => {
  const result = map([coconutRecord()], { crop: 'Coconut' });
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].crop, 'Coconut');
  assert.equal(result.records[0].district, 'Sirsi');
  assert.equal(result.records[0].price_date, '2026-10-10');
  assert.equal(result.records[0].modal_price, 6200);
});

// ── Target crops and aliases ─────────────────────────────────────────────────

test('Arecanut maps via its Betelnut/Supari alias and canonicalises', () => {
  const result = map([arecanutRecord()], {
    crop: 'Arecanut',
    aliases: ['Arecanut(Betelnut/Supari)'],
  });
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].crop, 'Arecanut');
});

test('Coconut maps and never silently pulls Copra rows', () => {
  const result = map([coconutRecord()], { crop: 'Coconut', aliases: ['Coconut'] });
  const copra = map([coconutRecord({ Commodity: 'Copra' })], { crop: 'Coconut', aliases: ['Coconut'] });
  assert.equal(result.records.length, 1);
  assert.equal(copra.records.length, 0);
  assert.equal(copra.rejection_counts.commodity_mismatch, 1);
});

test('Black Pepper maps and preserves its real prices verbatim', () => {
  const result = map([pepperRecord()], { crop: 'Black pepper', aliases: ['Black pepper'] });
  assert.equal(result.records.length, 1);
  const record = result.records[0];
  assert.equal(record.crop, 'Black pepper');
  assert.equal(record.price_date, '2026-10-11');
  assert.equal(record.min_price, 35200);
  assert.equal(record.max_price, 69500);
  assert.equal(record.modal_price, 48850);
});

// ── Placeholder + price integrity ────────────────────────────────────────────

test('the Onion/65535 placeholder row is dropped, not stored', () => {
  const result = map([coconutRecord(), placeholder], { crop: 'Coconut' });
  assert.equal(result.records.length, 1);
  assert.equal(result.rejection_counts.ignored_placeholder_commodity, 1);
  assert.equal(result.input_rows, 2);
});

test('genuine Onion rows with real prices are accepted', () => {
  const genuine = {
    State: 'Karnataka', District: 'Belagavi', Market: 'Belagavi',
    Commodity: 'Onion', Variety: 'Other', Grade: 'FAQ',
    Arrival_Date: '10/10/2026', Min_Price: 1200, Max_Price: 1800, Modal_Price: 1500,
  };
  const result = map([genuine], { crop: 'Onion', aliases: ['Onion'] });
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].crop, 'Onion');
  assert.equal(result.records[0].modal_price, 1500);
});

test('Onion with any 65535 price is still rejected', () => {
  const bad = {
    State: 'Karnataka', District: 'Belagavi', Market: 'Belagavi',
    Commodity: 'Onion', Variety: 'Other', Grade: 'FAQ',
    Arrival_Date: '10/10/2026', Min_Price: 1200, Max_Price: 1800, Modal_Price: 65535,
  };
  const result = map([bad], { crop: 'Onion', aliases: ['Onion'] });
  assert.equal(result.records.length, 0);
  assert.equal(
    (result.rejection_counts.ignored_placeholder_commodity ?? 0) +
    (result.rejection_counts.ignored_price_sentinel ?? 0), 1);
});

// ── Sweep / discovery mode: raw labels stored verbatim, no per-crop allowlist ─

function sweepRecord(overrides = {}) {
  return {
    state: 'Karnataka', district: 'Mysuru', market: 'Mysuru',
    commodity: 'Paddy(Dhan)(Common)', variety: 'Common', grade: 'FAQ',
    arrival_date: '09/10/2026', min_price: 2100, max_price: 2400, modal_price: 2250,
    ...overrides,
  };
}

test('sweep mode stores raw Paddy/Ragi labels verbatim without allowlist edits', () => {
  const result = map(
    [sweepRecord(), sweepRecord({ commodity: 'Ragi', market: 'Tumakuru', district: 'Tumakuru' })],
    { crop: 'sweep', acceptAnyCommodity: true, state: 'Karnataka' },
  );
  assert.equal(result.records.length, 2);
  assert.deepEqual(result.records.map((r) => r.crop).sort(), ['Paddy(Dhan)(Common)', 'Ragi']);
});

test('sweep mode keeps Coconut and Copra as distinct crops', () => {
  const result = map(
    [sweepRecord({ commodity: 'Coconut' }), sweepRecord({ commodity: 'Copra', market: 'Sirsi', district: 'Sirsi' })],
    { crop: 'sweep', acceptAnyCommodity: true, state: 'Karnataka' },
  );
  assert.equal(result.records.length, 2);
  assert.deepEqual(result.records.map((r) => r.crop).sort(), ['Coconut', 'Copra']);
});

test('sweep mode still drops Onion/65535 placeholder and bad rows', () => {
  const result = map(
    [
      sweepRecord({ commodity: 'Onion', min_price: 65535, max_price: 65535, modal_price: 65535 }),
      sweepRecord({ commodity: 'Tomato', market: 'Kolar', district: 'Kolar', min_price: 800, max_price: 1200, modal_price: 1000 }),
      { broken: true },
    ],
    { crop: 'sweep', acceptAnyCommodity: true, state: 'Karnataka' },
  );
  assert.equal(result.input_rows, 3);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].crop, 'Tomato');
});

test('rows with a missing price are rejected rather than invented', () => {
  const result = map([coconutRecord({ Modal_Price: '' })], { crop: 'Coconut' });
  assert.equal(result.records.length, 0);
  assert.equal(result.rejection_counts.missing_price, 1);
});

// ── Duplicate handling on the natural key ────────────────────────────────────

test('duplicate natural keys within a page collapse to one record', () => {
  const result = map([coconutRecord(), { ...coconutRecord() }], { crop: 'Coconut' });
  assert.equal(result.records.length, 2); // mapper keeps both; the function dedupes
  const keys = new Set(result.records.map((r) => JSON.stringify([
    r.crop, r.state, r.district, r.market, r.price_date, r.variety ?? '', r.grade ?? '',
  ])));
  assert.equal(keys.size, 1); // identical natural key -> collapses to one
});

// ── Envelope failures are reported, never silently successful ────────────────

test('a response missing a records array throws (never reports success)', () => {
  assert.throws(
    () => normalizeDataGovInResponse({ status: 'ok', total: 0 }, { crop: 'Coconut', sourceUrl: SOURCE_URL, fetchedAt: FETCHED_AT }),
    /records array/,
  );
});

test('all rows failing validation yields zero records with rejection counts', () => {
  const result = map([coconutRecord({ Arrival_Date: 'bad-date' })], { crop: 'Coconut' });
  assert.equal(result.records.length, 0);
  assert.equal(result.rejection_counts.invalid_arrival_date, 1);
});
