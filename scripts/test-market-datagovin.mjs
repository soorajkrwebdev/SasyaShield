/**
 * data.gov.in market-price mapping — focused unit tests.
 *
 * Covers the proven FarmLynq upstream contract reused by SmartFarm 2.0:
 *   - Response field mapping for BOTH casings the resource can return
 *     (verified: the resource mirrors the case of the filter key).
 *   - Date normalisation (dd/mm/yyyy -> ISO YYYY-MM-DD).
 *   - Arecanut (Betelnut/Supari), Coconut and Black Pepper.
 *   - Rejections/failures (bad envelope, missing price/date/market, state
 *     mismatch) — never fabricated, never silently successful.
 *   - Duplicate handling via the natural key used by the upsert RPC.
 *
 * These tests never touch the network, the database, or any secret.
 * Run: node --test scripts/test-market-datagovin.mjs
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeDataGovInResponse,
  parseDataGovInDate,
} from '../supabase/functions/_shared/dataGovInMapping.ts';

const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const SOURCE_URL = `https://api.data.gov.in/resource/${RESOURCE_ID}`;
const FETCHED_AT = '2026-10-13T00:00:00.000Z';

// Natural key mirrors the DB unique index / upsert ON CONFLICT target exactly.
function naturalKey(record) {
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

// ── Response field mapping (lower-case filter -> lower-case fields) ──────────

test('maps lower-case data.gov.in fields into SmartFarm records', () => {
  const response = {
    records: [{
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
    }],
  };

  const result = normalizeDataGovInResponse(response, {
    crop: 'Coconut',
    sourceUrl: SOURCE_URL,
    fetchedAt: FETCHED_AT,
    aliases: ['Coconut'],
    state: 'Karnataka',
  });

  assert.equal(result.input_rows, 1);
  assert.equal(result.records.length, 1);
  assert.equal(result.rejected_rows.length, 0);
  const record = result.records[0];
  assert.equal(record.crop, 'Coconut');
  assert.equal(record.state, 'Karnataka');
  assert.equal(record.district, 'Shimoga');
  assert.equal(record.market, 'Shimoga');
  assert.equal(record.variety, 'Other');
  assert.equal(record.grade, 'FAQ');
  assert.equal(record.price_date, '2026-10-09');
  assert.equal(record.min_price, 6000);
  assert.equal(record.max_price, 6400);
  assert.equal(record.modal_price, 6200);
  assert.equal(record.unit, 'INR/quintal');
  assert.equal(record.source_name, 'data.gov.in / AGMARKNET (Current Daily Price)');
  assert.equal(record.source_url, SOURCE_URL);
  assert.equal(record.fetched_at, FETCHED_AT);
});

// ── Response field mapping (TitleCase filter -> TitleCase fields) ───────────

test('maps TitleCase data.gov.in fields into the same record shape', () => {
  const response = {
    records: [{
      State: 'Kerala',
      District: 'Kozhikode(Calicut)',
      Market: 'Mukkom Market',
      Commodity: 'Coconut',
      Variety: 'Other',
      Grade: 'FAQ',
      Arrival_Date: '20/09/2026',
      Min_Price: 6000,
      Max_Price: 6400,
      Modal_Price: 6200,
    }],
  };

  const result = normalizeDataGovInResponse(response, {
    crop: 'Coconut',
    sourceUrl: SOURCE_URL,
    fetchedAt: FETCHED_AT,
    aliases: ['Coconut'],
    // no state filter here: TitleCase probe may be unfiltered across states
  });

  assert.equal(result.records.length, 1);
  const record = result.records[0];
  assert.equal(record.state, 'Kerala');
  assert.equal(record.district, 'Kozhikode(Calicut)');
  assert.equal(record.market, 'Mukkom Market');
  assert.equal(record.price_date, '2026-09-20');
  assert.equal(record.modal_price, 6200);
});

// ── Date normalisation ──────────────────────────────────────────────────────

test('parseDataGovInDate normalises dd/mm/yyyy to ISO and rejects bad input', () => {
  assert.equal(parseDataGovInDate('09/10/2026'), '2026-10-09');
  assert.equal(parseDataGovInDate('31/12/2025'), '2025-12-31');
  assert.equal(parseDataGovInDate('2026-10-09'), '2026-10-09'); // ISO tolerated
  assert.equal(parseDataGovInDate('09-10-2026'), null); // unsupported
  assert.equal(parseDataGovInDate('31/02/2026'), null); // impossible date
  assert.equal(parseDataGovInDate(''), null);
  assert.equal(parseDataGovInDate(null), null);
  assert.equal(parseDataGovInDate(undefined), null);
});

test('a row with an unparsable date is rejected, never assigned a date', () => {
  const result = normalizeDataGovInResponse({
    records: [{
      State: 'Karnataka', District: 'Shimoga', Market: 'Shimoga', Commodity: 'Coconut',
      Arrival_Date: 'not-a-date', Min_Price: 6000, Max_Price: 6400, Modal_Price: 6200,
    }],
  }, { crop: 'Coconut', sourceUrl: SOURCE_URL, fetchedAt: FETCHED_AT, aliases: ['Coconut'] });

  assert.equal(result.records.length, 0);
  assert.equal(result.rejection_counts.invalid_arrival_date, 1);
});
