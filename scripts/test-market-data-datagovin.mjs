import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeDataGovInResponse,
  parseDataGovInDate,
} from '../supabase/functions/_shared/dataGovInMapping.ts';

// ── data.gov.in fixtures ──────────────────────────────────────────────────────
// Built from FarmLynq's own captured probe responses of resource
// 9ef84268-d588-465a-a308-a864a43d0070. The resource mirrors the case of the
// request filter key, so both casings are exercised across these fixtures.

const FETCHED_AT = '2026-10-13T04:00:00.000Z';
const SOURCE_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=***&format=json&limit=100&filters[commodity]=Coconut';

// Verified source commodity labels (data.gov.in) for the three target crops.
const ARECANUT = 'Arecanut(Betelnut/Supari)';
const COCONUT = 'Coconut';
const BLACK_PEPPER = 'Black pepper';

function record(overrides = {}) {
  return {
    state: 'Karnataka',
    district: 'Chikkamagaluru',
    market: 'Mudigere APMC',
    commodity: COCONUT,
    variety: 'Other',
    grade: 'FAQ',
    arrival_date: '20/09/2026',
    min_price: 6000,
    max_price: 6400,
    modal_price: 6200,
    ...overrides,
  };
}

function options(crop, extra = {}) {
  return {
    crop,
    aliases: [crop],
    sourceUrl: SOURCE_URL,
    fetchedAt: FETCHED_AT,
    ...extra,
  };
}

// ── Date normalization ─────────────────────────────────────────────────────────

test('dd/mm/yyyy arrival_date is normalized to ISO price_date', () => {
  const result = normalizeDataGovInResponse({ records: [record()] }, options(COCONUT));
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].price_date, '2026-09-20');
});

test('parseDataGovInDate rejects ambiguous or impossible dates instead of inventing one', () => {
  assert.equal(parseDataGovInDate('20/09/2026'), '2026-09-20');
  assert.equal(parseDataGovInDate('31/02/2026'), null); // impossible day
  assert.equal(parseDataGovInDate('2026-13-40'), null);
  assert.equal(parseDataGovInDate('not-a-date'), null);
  assert.equal(parseDataGovInDate(''), null);
  assert.equal(parseDataGovInDate(undefined), null);
});

test('a row with an unparsable arrival_date is rejected and never stored', () => {
  const result = normalizeDataGovInResponse(
    { records: [record({ arrival_date: 'XX/XX/XXXX' })] },
    options(COCONUT),
  );
  assert.equal(result.records.length, 0);
  assert.equal(result.rejection_counts.invalid_arrival_date, 1);
});

// ── Field mapping (both request-case variants) ──────────────────────────────────

test('lowercase snake_case fields map to SmartFarm records with the full provenance shape', () => {
  const result = normalizeDataGovInResponse({ records: [record()] }, options(COCONUT));
  const r = result.records[0];
  assert.equal(r.crop, COCONUT);
  assert.equal(r.state, 'Karnataka');
  assert.equal(r.district, 'Chikkamagaluru');
  assert.equal(r.market, 'Mudigere APMC');
  assert.equal(r.variety, 'Other');
  assert.equal(r.grade, 'FAQ');
  assert.equal(r.min_price, 6000);
  assert.equal(r.max_price, 6400);
  assert.equal(r.modal_price, 6200);
  assert.equal(r.unit, 'INR/quintal');
  assert.equal(r.source_name, 'data.gov.in / AGMARKNET (Current Daily Price)');
  assert.equal(r.source_url, SOURCE_URL);
  assert.equal(r.fetched_at, FETCHED_AT);
  assert.equal(result.input_rows, 1);
  assert.equal(result.rejected_rows.length, 0);
});

test('TitleCase field names (TitleCase request filter) map identically', () => {
  const titleCase = {
    State: 'Karnataka',
    District: 'Shimoga',
    Market: 'Shikaripur APMC',
    Commodity: ARECANUT,
    Variety: 'Other',
    Grade: 'FAQ',
    Arrival_Date: '05/10/2026',
    Min_Price: 41000,
    Max_Price: 45000,
    Modal_Price: 43000,
  };
  const result = normalizeDataGovInResponse({ records: [titleCase] }, options(ARECANUT));
  assert.equal(result.records.length, 1);
  const r = result.records[0];
  assert.equal(r.price_date, '2026-10-05');
  assert.equal(r.modal_price, 43000);
  assert.equal(r.crop, ARECANUT);
});

// ── The three target crops and their aliases ──────────────────────────────────

test('Arecanut(Betelnut/Supari) is accepted via the Betelnut/Supari alias family', () => {
  const result = normalizeDataGovInResponse(
    { records: [record({ commodity: ARECANUT, modal_price: 43000 })] },
    options(ARECANUT, { aliases: [ARECANUT, 'Arecanut', 'Betelnut', 'Supari'] }),
  );
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].crop, ARECANUT);
});

test('Coconut is accepted and Copra is not folded into Coconut', () => {
  const coconut = normalizeDataGovInResponse({ records: [record({ commodity: COCONUT })] }, options(COCONUT));
  assert.equal(coconut.records.length, 1);
  const copra = normalizeDataGovInResponse(
    { records: [record({ commodity: 'Copra' })] },
    options(COCONUT),
  );
  assert.equal(copra.records.length, 0);
  assert.equal(copra.rejection_counts.commodity_mismatch, 1);
});

test('Black pepper is accepted and rejected labels do not leak in', () => {
  const pepper = normalizeDataGovInResponse(
    { records: [record({ commodity: BLACK_PEPPER, modal_price: 48850 })] },
    options(BLACK_PEPPER),
  );
  assert.equal(pepper.records.length, 1);
  assert.equal(pepper.records[0].crop, BLACK_PEPPER);
  const other = normalizeDataGovInResponse(
    { records: [record({ commodity: 'Pepper garbled' })] },
    options(BLACK_PEPPER),
  );
  assert.equal(other.records.length, 0);
  assert.equal(other.rejection_counts.commodity_mismatch, 1);
});

// ── Duplicate / natural-key handling ────────────────────────────────────────────

test('duplicate natural keys in one response are kept as distinct records for upsert conflict handling', () => {
  // The mapper does not deduplicate; the DB natural-key upsert resolves conflicts.
  const dup = record();
  const result = normalizeDataGovInResponse({ records: [dup, { ...dup }] }, options(COCONUT));
  assert.equal(result.records.length, 2);
  const key = (r) => JSON.stringify([r.crop, r.state, r.district, r.market, r.price_date, r.variety, r.grade]);
  assert.equal(key(result.records[0]), key(result.records[1]));
});

test('rows differing only by market produce distinct natural keys', () => {
  const result = normalizeDataGovInResponse(
    { records: [record({ market: 'A' }), record({ market: 'B' })] },
    options(COCONUT),
  );
  assert.equal(result.records.length, 2);
  assert.notEqual(result.records[0].market, result.records[1].market);
});

// ── Failure handling (never silently succeed, never invent prices) ──────────────

test('a malformed envelope throws instead of reporting an empty success', () => {
  assert.throws(() => normalizeDataGovInResponse({}, options(COCONUT)), /records array/);
  assert.throws(() => normalizeDataGovInResponse(null, options(COCONUT)), /records array/);
  assert.throws(() => normalizeDataGovInResponse({ records: {} }, options(COCONUT)), /records array/);
});

test('an invalid fetchedAt throws', () => {
  assert.throws(
    () => normalizeDataGovInResponse({ records: [] }, { crop: COCONUT, sourceUrl: SOURCE_URL, fetchedAt: 'nope' }),
    /fetchedAt/,
  );
});

test('a genuinely empty records array is a valid empty result (no throw)', () => {
  const result = normalizeDataGovInResponse({ records: [] }, options(COCONUT));
  assert.equal(result.input_rows, 0);
  assert.equal(result.records.length, 0);
  assert.equal(result.rejected_rows.length, 0);
});

test('missing/blank prices are rejected rather than replaced with fabricated values', () => {
  const result = normalizeDataGovInResponse(
    { records: [
      record({ min_price: '' }),
      record({ modal_price: undefined }),
      record({ max_price: 'abc' }),
      record({ min_price: -5 }),
    ] },
    options(COCONUT),
  );
  assert.equal(result.records.length, 0);
  assert.equal(result.rejection_counts.missing_price, 4);
});

test('the known Onion/65535 catch-all placeholder row is dropped, not stored', () => {
  const result = normalizeDataGovInResponse(
    { records: [record({ commodity: 'Onion', min_price: 65535, max_price: 65535, modal_price: 65535 })] },
    options('Onion', { aliases: ['Onion'] }),
  );
  assert.equal(result.records.length, 0);
  assert.equal(result.rejection_counts.ignored_placeholder_commodity, 1);
});

// ── Optional state filter ───────────────────────────────────────────────────────

test('an optional state filter drops out-of-state rows', () => {
  const result = normalizeDataGovInResponse(
    { records: [record({ state: 'Karnataka' }), record({ state: 'Kerala', market: 'Other' })] },
    options(COCONUT, { state: 'Karnataka' }),
  );
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].state, 'Karnataka');
  assert.equal(result.rejection_counts.state_mismatch, 1);
});

