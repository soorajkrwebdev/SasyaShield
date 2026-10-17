import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAgmarknetDateWiseResponse } from '../supabase/functions/_shared/agmarknetMapping.ts';

// ── AGMARKNET fixture builders ────────────────────────────────────────────────
// Mimic the verified AGMARKNET 2.0 date-wise response shape so ingestion mapping
// can be tested without hitting the (now captcha-protected) upstream API.

const STATE_ID = 16; // Karnataka
const AREA_ID = 118; // Arecanut(Betelnut/Supari)
const COCONUT_ID = 116; // Coconut
const PEPPER_ID = 34; // Black pepper

function buildFilters(commodityId, commodityName) {
  return {
    status: true,
    data: {
      state_data: [{ state_id: STATE_ID, state_name: 'Karnataka' }],
      cmdt_data: [{ cmdt_id: commodityId, cmdt_name: commodityName }],
      market_data: [{ id: 1, mkt_name: 'Mudigere APMC', state_id: STATE_ID, district_id: 5 }],
      district_data: [{ id: 5, state_id: STATE_ID, district_name: 'Chikkamagaluru' }],
    },
  };
}

function priceColumns() {
  return [
    { key: 'minimumPrice', title: 'Min (Rs./Quintal)' },
    { key: 'maximumPrice', title: 'Max (Rs./Quintal)' },
    { key: 'modalPrice', title: 'Modal (Rs./Quintal)' },
  ];
}

function priceRow(minPrice, maxPrice, modalPrice) {
  return { variety: '', grade: '', minimumPrice: minPrice, maximumPrice: maxPrice, modalPrice: modalPrice };
}

function buildDateWiseResponse(arrivalDate, row = priceRow(30000, 45000, 38000)) {
  return {
    success: true,
    columns: priceColumns(),
    markets: [{ marketName: 'Mudigere APMC', dates: [{ arrivalDate, data: [row] }] }],
  };
}

const FETCHED_AT = '2026-10-12T09:00:00.000Z';
const SOURCE_URL = 'https://api.agmarknet.gov.in/v1/prices-and-arrivals/date-wise/specific-commodity?commodityId=118';

function normalize(response, commodityId = AREA_ID, commodityName = 'Arecanut(Betelnut/Supari)') {
  return normalizeAgmarknetDateWiseResponse(response, buildFilters(commodityId, commodityName), {
    stateId: STATE_ID,
    commodityId,
    sourceUrl: SOURCE_URL,
    fetchedAt: FETCHED_AT,
  });
}

// ── Newer upstream records are stored correctly ────────────────────────────────

test('newer upstream records are stored with the correct source price date', () => {
  const result = normalize(buildDateWiseResponse('12/10/2026'));
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].price_date, '2026-10-12');
  assert.equal(result.records[0].modal_price, 38000);
  assert.equal(result.records[0].crop, 'Arecanut(Betelnut/Supari)');
  assert.equal(result.records[0].state, 'Karnataka');
  assert.equal(result.records[0].district, 'Chikkamagaluru');
  assert.equal(result.records[0].market, 'Mudigere APMC');
  assert.equal(result.records[0].unit, 'INR/quintal');
});

test('fetched_at records the import time and never overwrites the source price date', () => {
  const result = normalize(buildDateWiseResponse('12/10/2026'));
  assert.equal(result.records[0].price_date, '2026-10-12');
  assert.equal(result.records[0].fetched_at, FETCHED_AT);
  assert.notEqual(result.records[0].price_date, result.records[0].fetched_at);
});

// ── Deduplication / natural-key collisions ─────────────────────────────────────

test('duplicate natural keys are rejected rather than stored twice', () => {
  const response = {
    success: true,
    columns: priceColumns(),
    markets: [{
      marketName: 'Mudigere APMC',
      dates: [
        { arrivalDate: '12/10/2026', data: [priceRow(30000, 45000, 38000)] },
        { arrivalDate: '12/10/2026', data: [priceRow(31000, 46000, 39000)] },
      ],
    }],
  };
  const result = normalize(response);
  assert.equal(result.input_rows, 2);
  assert.equal(result.records.length, 0, 'colliding rows must not be stored');
  assert.equal(result.natural_key_collisions.length, 1);
  assert.equal(result.rejected_rows.length, 2);
  assert.ok(result.rejection_counts.natural_key_collision >= 2);
});

// ── Empty responses and failures must not be treated as success ────────────────

test('an empty markets array yields zero records and does not throw', () => {
  const result = normalize({ success: true, columns: priceColumns(), markets: [] });
  assert.equal(result.records.length, 0);
  assert.equal(result.input_rows, 0);
  assert.equal(result.rejected_rows.length, 0);
});

test('an invalid date-wise response throws instead of reporting success', () => {
  assert.throws(
    () => normalize({ success: false, columns: priceColumns(), markets: [] }),
    /success=true/,
  );
});

test('a response missing the Rs./Quintal price-unit columns throws', () => {
  const response = {
    success: true,
    columns: [{ key: 'minimumPrice', title: 'Min (Rs./Kg)' }],
    markets: [],
  };
  assert.throws(() => normalize(response), /Rs\.?\/Quintal/);
});

// ── Supported crop mappings keep their exact source labels end to end ──────────

test('Coconut, Black pepper ingestion resolve distinct commodity crops', () => {
  const coconut = normalize(buildDateWiseResponse('11/10/2026'), COCONUT_ID, 'Coconut');
  assert.equal(coconut.records[0].crop, 'Coconut');
  assert.equal(coconut.records[0].price_date, '2026-10-11');

  const pepper = normalize(buildDateWiseResponse('11/10/2026'), PEPPER_ID, 'Black pepper');
  assert.equal(pepper.records[0].crop, 'Black pepper');
  assert.equal(pepper.records[0].price_date, '2026-10-11');
});

