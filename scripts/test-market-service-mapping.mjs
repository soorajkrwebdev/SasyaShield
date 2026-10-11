import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCanonicalCommodityName,
  getCommoditySearchTerms,
  mapMarketPriceRow,
} from '../src/services/marketCommodityMapping.ts'
import {
  classifyMarketPriceFreshness,
  parseMarketPriceDate,
} from '../src/services/marketFreshness.ts'

test('Arecanut request queries its exact source label and canonicalizes separately', () => {
  assert.deepEqual(getCommoditySearchTerms('Arecanut'), ['Arecanut(Betelnut/Supari)'])
  assert.equal(getCanonicalCommodityName('Arecanut(Betelnut/Supari)'), 'Arecanut')
})

test('Coconut does not include Copra', () => {
  assert.deepEqual(getCommoditySearchTerms('Coconut'), ['Coconut'])
  assert.deepEqual(getCommoditySearchTerms('Copra'), ['Copra'])
  assert.equal(getCanonicalCommodityName('Copra'), 'Copra')
})

test('Black Pepper queries only the verified source label', () => {
  assert.deepEqual(getCommoditySearchTerms('Black Pepper'), ['Black pepper'])
  assert.equal(getCanonicalCommodityName('Black pepper'), 'Black Pepper')
  assert.deepEqual(getCommoditySearchTerms('Pepper garbled'), ['Pepper garbled'])
  assert.deepEqual(getCommoditySearchTerms('Pepper ungarbled'), ['Pepper ungarbled'])
  assert.equal(getCanonicalCommodityName('Pepper garbled'), 'Pepper garbled')
  assert.equal(getCanonicalCommodityName('Pepper ungarbled'), 'Pepper ungarbled')
})

test('Tomato search and display labels remain unchanged', () => {
  assert.deepEqual(getCommoditySearchTerms('Tomato'), ['Tomato'])
  assert.equal(getCanonicalCommodityName('Tomato'), 'Tomato')
})

test('mapped records retain raw crop and all market provenance fields', () => {
  const record = mapMarketPriceRow({
    id: 'row-1',
    crop: 'Black pepper',
    state: 'Karnataka',
    district: 'Chikkamagaluru',
    market: 'Mudigere APMC',
    price_date: '2026-10-01',
    min_price: 35200,
    max_price: 69500,
    modal_price: 48850,
    unit: 'INR/quintal',
    source_name: 'AGMARKNET',
    source_url: 'https://api.agmarknet.gov.in/v1/prices-and-arrivals/date-wise/specific-commodity?commodityId=34',
    variety: 'Black Pepper',
    grade: null,
    fetched_at: '2026-10-04T04:56:38.590Z',
    created_at: '2026-10-04T04:56:38.590Z',
  })

  assert.equal(record.crop, 'Black pepper')
  assert.equal(record.canonical_crop, 'Black Pepper')
  assert.equal(record.state, 'Karnataka')
  assert.equal(record.district, 'Chikkamagaluru')
  assert.equal(record.market, 'Mudigere APMC')
  assert.equal(record.price_date, '2026-10-01')
  assert.equal(record.min_price, 35200)
  assert.equal(record.max_price, 69500)
  assert.equal(record.modal_price, 48850)
  assert.equal(record.unit, 'INR/quintal')
  assert.equal(record.source_name, 'AGMARKNET')
  assert.equal(record.source_url, 'https://api.agmarknet.gov.in/v1/prices-and-arrivals/date-wise/specific-commodity?commodityId=34')
  assert.equal(record.variety, 'Black Pepper')
  assert.equal(record.grade, null)
  assert.equal(record.fetched_at, '2026-10-04T04:56:38.590Z')
  assert.equal(record.created_at, '2026-10-04T04:56:38.590Z')
})

test('recent price dates are classified as recent using the current date', () => {
  assert.equal(classifyMarketPriceFreshness('2026-10-03', new Date('2026-10-04T12:00:00Z')), 'recent')
  assert.equal(classifyMarketPriceFreshness('2025-04-15', new Date('2025-04-16T12:00:00Z')), 'recent')
})

test('older price dates are classified as stale', () => {
  assert.equal(classifyMarketPriceFreshness('2026-09-30', new Date('2026-10-04T12:00:00Z')), 'stale')
})

test('missing, invalid, and future price dates are unknown', () => {
  const now = new Date('2026-10-04T12:00:00Z')
  assert.equal(classifyMarketPriceFreshness(null, now), 'unknown')
  assert.equal(classifyMarketPriceFreshness(undefined, now), 'unknown')
  assert.equal(classifyMarketPriceFreshness('2026-02-30', now), 'unknown')
  assert.equal(classifyMarketPriceFreshness('2026-10-05', now), 'unknown')
  assert.equal(parseMarketPriceDate('2026-10-05')?.toISOString(), '2026-10-05T00:00:00.000Z')
})

test('fetched_at does not override an old price_date', () => {
  const record = { price_date: '2026-09-20', fetched_at: '2026-10-04T12:00:00Z' }
  assert.equal(classifyMarketPriceFreshness(record.price_date, new Date(record.fetched_at)), 'stale')
})