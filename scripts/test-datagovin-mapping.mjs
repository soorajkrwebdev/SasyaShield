import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeDataGovInResponse,
  parseDataGovInDate,
} from '../supabase/functions/_shared/dataGovInMapping.ts';
import { getCommoditySearchTerms } from '../src/services/marketCommodityMapping.ts';

/**
 * data.gov.in ingestion mapping tests.
 *
 * These exercise the exact upstream contract that FarmLynq's refresh-market-prices
 * Edge Function used successfully (resource 9ef84268-d588-465a-a308-a864a43d0070),
 * reusing the verified field names, date format and the proven request approach,
 * while asserting SmartFarm 2.0's existing record shape and frontend contract.
 *
 * The resource MIRRORS the case of the request filter key, so both the lower-case
 * (`arrival_date`) and TitleCase (`Arrival_Date`) field names are asserted here.
 */

const FETCHED_AT = '2026-10-13T06:30:00.000Z';
const SOURCE_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?filters[commodity]=Coconut';

function lowerCaseCoconutRow(overrides = {}) {
  return {
    state: 'Karnataka',
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

function titleCaseCoconutRow(overrides = {}) {
  return {
    State: 'Karnataka',
    District: 'Shimoga',
    Market: 'Shimoga',
    Commodity: 'Coconut',
    Variety: 'Other',
    Grade: 'FAQ',
    Arrival_Date: '09/10/2026',
    Min_Price: 6000,
    Max_Price: 6400,
    Modal_Price: 6200,
    ...overrides,
  };
}

function mapRows(rows, options) {
  return normalizeDataGovInResponse({ records: rows }, {
    sourceUrl: SOURCE_URL,
    fetchedAt: FETCHED_AT,
    ...options,
  });
}

// ── Response field mapping ────────────────────────────────────────────────────

test('maps a verified lower-case data.gov.in record with all provenance fields', () => {
  const result = mapRows([lowerCaseCoconutRow()], { crop: 'Coconut', aliases: ['Coconut'] });
  assert.equal(result.records.length, 1);
  const record = result.records[0];
  assert.equal(record.crop, 'Coconut');
  assert.equal(record.state, 'Karnataka');
  assert.equal(record.district, 'Shimoga');
  assert.equal(record.market, 'Shimoga');
  assert.equal(record.variety, 'Other');
  assert.equal(record.grade, 'FAQ');
  assert.equal(record.min_price, 6000);
  assert.equal(record.max_price, 6400);
  assert.equal(record.modal_price, 6200);
  assert.equal(record.unit, 'INR/quintal');
  assert.equal(record.source_name, 'data.gov.in / AGMARKNET (Current Daily Price)');
  assert.equal(record.source_url, SOURCE_URL);
  assert.equal(record.fetched_at, FETCHED_AT);
});

test('maps a TitleCase data.gov.in record identically (case-mirroring handled)', () => {
  const lower = mapRows([lowerCaseCoconutRow()], { crop: 'Coconut', aliases: ['Coconut'] }).records[0];
  const title = mapRows([titleCaseCoconutRow()], { crop: 'Coconut', aliases: ['Coconut'] }).records[0];
  assert.deepEqual(title, lower);
});

test('a malformed response envelope throws (never reports success)', () => {
  assert.throws(() => normalizeDataGovInResponse({}, { crop: 'Coconut', sourceUrl: SOURCE_URL, fetchedAt: FETCHED_AT }));
  assert.throws(() => normalizeDataGovInResponse(null, { crop: 'Coconut', sourceUrl: SOURCE_URL, fetchedAt: FETCHED_AT }));
  assert.throws(() => normalizeDataGovInResponse({ records: {} }, { crop: 'Coconut', sourceUrl: SOURCE_URL, fetchedAt: FETCHED_AT }));
});

// ── Date normalization ─────────────────────────────────────────────────────────

test('parses the verified dd/mm/yyyy arrival date into ISO yyyy-mm-dd', () => {
  assert.equal(parseDataGovInDate('09/10/2026'), '2026-10-09');
  assert.equal(parseDataGovInDate('31/12/2025'), '2025-12-31');
  assert.equal(parseDataGovInDate('01/01/2026'), '2026-01-01');
});

test('normalized price_date in the mapped record is ISO yyyy-mm-dd', () => {
  const record = mapRows([lowerCaseCoconutRow({ arrival_date: '13/10/2026' })], { crop: 'Coconut', aliases: ['Coconut'] }).records[0];
  assert.equal(record.price_date, '2026-10-13');
});

test('unparsable / impossible / empty dates reject the row (no invented date)', () => {
  assert.equal(parseDataGovInDate('2026-13-40'), null);
  assert.equal(parseDataGovInDate('31/02/2026'), null); // Feb 31 impossible
  assert.equal(parseDataGovInDate(''), null);
  assert.equal(parseDataGovInDate(undefined), null);
  assert.equal(parseDataGovInDate('not-a-date'), null);

  const result = mapRows([lowerCaseCoconutRow({ arrival_date: '31/02/2026' })], { crop: 'Coconut', aliases: ['Coconut'] });
  assert.equal(result.records.length, 0);
  assert.equal(result.rejection_counts.invalid_arrival_date, 1);
});

// ── Missing price / no fabricated values ────────────────────────────────────────

test('missing or non-numeric prices reject the row rather than inventing a value', () => {
  const missing = mapRows([lowerCaseCoconutRow({ modal_price: null })], { crop: 'Coconut', aliases: ['Coconut'] });
  assert.equal(missing.records.length, 0);
  assert.equal(missing.rejection_counts.missing_price, 1);

  const blank = mapRows([lowerCaseCoconutRow({ min_price: '' })], { crop: 'Coconut', aliases: ['Coconut'] });
  assert.equal(blank.records.length, 0);
  assert.equal(blank.rejection_counts.missing_price, 1);

  const negative = mapRows([lowerCaseCoconutRow({ max_price: -5 })], { crop: 'Coconut', aliases: ['Coconut'] });
  assert.equal(negative.records.length, 0);
  assert.equal(negative.rejection_counts.missing_price, 1);
});

test('the known Onion / 65535 catch-all record is never stored', () => {
  const sentinelByCommodity = mapRows(
    [lowerCaseCoconutRow({ commodity: 'Onion', min_price: 65535, max_price: 65535, modal_price: 65535 })],
    { crop: 'Coconut', aliases: ['Coconut'] },
  );
  assert.equal(sentinelByCommodity.records.length, 0);
  assert.equal(sentinelByCommodity.rejection_counts.ignored_placeholder_commodity, 1);

  const sentinelByPrice = mapRows([lowerCaseCoconutRow({ modal_price: 65535 })], { crop: 'Coconut', aliases: ['Coconut'] });
  assert.equal(sentinelByPrice.records.length, 0);
  assert.equal(sentinelByPrice.rejection_counts.ignored_price_sentinel, 1);
});


test('an invalid fetchedAt throws instead of stamping a bad timestamp', () => {
  assert.throws(() => mapRows([lowerCaseCoconutRow()], { crop: 'Coconut', aliases: ['Coconut'], fetchedAt: 'not-a-date' }));
});

// ── Commodity filtering / matching ──────────────────────────────────────────────

test('rows of other commodities are excluded (commodity mismatch)', () => {
  const result = mapRows(
    [lowerCaseCoconutRow({ commodity: 'Copra' }), lowerCaseCoconutRow({ commodity: 'Coconut' })],
    { crop: 'Coconut', aliases: ['Coconut'] },
  );
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].crop, 'Coconut');
  assert.equal(result.rejection_counts.commodity_mismatch, 1);
});

test('state filter excludes other states and retains the requested state', () => {
  const result = mapRows(
    [
      lowerCaseCoconutRow({ state: 'Kerala', market: 'Kozhikode' }),
      lowerCaseCoconutRow({ state: 'Karnataka', market: 'Shimoga' }),
    ],
    { crop: 'Coconut', aliases: ['Coconut'], state: 'Karnataka' },
  );
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].state, 'Karnataka');
  assert.equal(result.rejection_counts.state_mismatch, 1);
});

// ── Duplicate / natural-key handling ────────────────────────────────────────────

test('duplicate natural-key rows map to identical stored rows for the upsert to dedupe', () => {
  // Two identical source rows (same market/date/variety/grade) must produce
  // identical MarketPriceRecord payloads so the DB natural-key upsert collapses
  // them instead of storing duplicates.
  const result = mapRows(
    [lowerCaseCoconutRow(), lowerCaseCoconutRow()],
    { crop: 'Coconut', aliases: ['Coconut'] },
  );
  assert.equal(result.records.length, 2);
  assert.deepEqual(result.records[0], result.records[1]);
});

test('distinct markets on the same date are kept as separate rows', () => {
  const result = mapRows(
    [lowerCaseCoconutRow({ market: 'Shimoga' }), lowerCaseCoconutRow({ market: 'Sirsi' })],
    { crop: 'Coconut', aliases: ['Coconut'] },
  );
  assert.equal(result.records.length, 2);
  assert.equal(result.records[0].market, 'Shimoga');
  assert.equal(result.records[1].market, 'Sirsi');
});

test('rows missing district or market are rejected', () => {
  const noDistrict = mapRows([lowerCaseCoconutRow({ district: null })], { crop: 'Coconut', aliases: ['Coconut'] });
  assert.equal(noDistrict.records.length, 0);
  assert.equal(noDistrict.rejection_counts.missing_district, 1);

  const noMarket = mapRows([lowerCaseCoconutRow({ market: '  ' })], { crop: 'Coconut', aliases: ['Coconut'] });
  assert.equal(noMarket.records.length, 0);
  assert.equal(noMarket.rejection_counts.missing_market, 1);
});

// ── The three target crops + aliases (Betelnut / Supari) ───────────────────────

test('Arecanut maps the verified source label and its Betelnut/Supari aliases', () => {
  const label = 'Arecanut(Betelnut/Supari)';
  const aliases = getCommoditySearchTerms('Arecanut');
  assert.deepEqual(aliases, ['Arecanut(Betelnut/Supari)']);

  const result = mapRows(
    [{ state: 'Karnataka', district: 'Shimoga', market: 'Shimoga', commodity: label, variety: 'Other', grade: 'FAQ', arrival_date: '09/10/2026', min_price: 40000, max_price: 46000, modal_price: 43000 }],
    { crop: label, aliases },
  );
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].crop, label);
  assert.equal(result.records[0].modal_price, 43000);
  assert.equal(result.records[0].price_date, '2026-10-09');
});

test('Coconut maps the verified source label', () => {
  const aliases = getCommoditySearchTerms('Coconut');
  assert.deepEqual(aliases, ['Coconut']);
  const result = mapRows([lowerCaseCoconutRow()], { crop: 'Coconut', aliases });
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].crop, 'Coconut');
});

test('Black Pepper maps the verified lower-case "Black pepper" source label', () => {
  const aliases = getCommoditySearchTerms('Black Pepper');
  assert.deepEqual(aliases, ['Black pepper']);
  const result = mapRows(
    [{ state: 'Karnataka', district: 'Chikkamagaluru', market: 'Mudigere APMC', commodity: 'Black pepper', variety: 'Black Pepper', grade: null, arrival_date: '09/10/2026', min_price: 35200, max_price: 69500, modal_price: 48850 }],
    { crop: 'Black pepper', aliases },
  );
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].crop, 'Black pepper');
  assert.equal(result.records[0].grade, null);
  assert.equal(result.records[0].modal_price, 48850);
});

test('input_rows counts every record including rejected ones', () => {
  const result = mapRows(
    [lowerCaseCoconutRow(), lowerCaseCoconutRow({ commodity: 'Copra' }), { broken: true }],
    { crop: 'Coconut', aliases: ['Coconut'] },
  );
  assert.equal(result.input_rows, 3);
  assert.equal(result.records.length, 1);
  assert.equal(result.rejected_rows.length, 2);
});

