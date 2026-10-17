import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyMarketPriceFreshness,
  parseMarketPriceDate,
  MARKET_PRICE_RECENT_MAX_AGE_DAYS,
} from '../src/services/marketFreshness.ts';
import { maxIsoTimestamp } from '../src/services/marketResultSummary.ts';

// ── Freshness labeling ────────────────────────────────────────────────────────

test('a price_date within the threshold is recent, older is stale', () => {
  const now = new Date('2026-10-12T12:00:00Z');
  assert.equal(classifyMarketPriceFreshness('2026-10-12', now), 'recent');
  assert.equal(classifyMarketPriceFreshness('2026-10-09', now), 'recent');
  assert.equal(classifyMarketPriceFreshness('2026-10-03', now), 'stale');
  assert.ok(MARKET_PRICE_RECENT_MAX_AGE_DAYS === 3);
});

test('stale records remain labelled stale even when fetched_at is recent', () => {
  // Reproduces the reported bug: a 3 Oct price imported on 4 Oct is still stale on 12 Oct.
  const priceDate = '2026-10-03';
  const now = new Date('2026-10-12T14:00:00Z');
  assert.equal(classifyMarketPriceFreshness(priceDate, now), 'stale');
  // Freshness depends only on price_date vs "now", never on the fetch timestamp,
  // so a recent import time cannot flip a stale price to "recent".
  assert.equal(classifyMarketPriceFreshness(priceDate, now), 'stale');
});

test('missing / invalid / future price dates are unknown', () => {
  const now = new Date('2026-10-12T12:00:00Z');
  assert.equal(classifyMarketPriceFreshness(null, now), 'unknown');
  assert.equal(classifyMarketPriceFreshness(undefined, now), 'unknown');
  assert.equal(classifyMarketPriceFreshness('2026-13-40', now), 'unknown');
  assert.equal(classifyMarketPriceFreshness('2026-10-13', now), 'unknown');
});

// ── maxIsoTimestamp (source date vs fetch time separation) ──────────────────────

test('maxIsoTimestamp picks the latest value and ignores invalid/empty entries', () => {
  assert.equal(maxIsoTimestamp(['2026-10-03', '2026-10-12', '2026-10-05']), '2026-10-12');
  assert.equal(
    maxIsoTimestamp(['2026-10-04T10:26:00Z', '2026-10-12T09:00:00Z', null, undefined, 'not-a-date']),
    '2026-10-12T09:00:00Z',
  );
  assert.equal(maxIsoTimestamp([null, undefined, 'nope']), null);
  assert.equal(maxIsoTimestamp([]), null);
});

// ── Displayed source date and fetch timestamp are accurate ──────────────────────

test('source price date and fetch timestamp are reported independently', () => {
  // 50 stored records: newest arrival date is 3 Oct, imported 4 Oct.
  const priceDates = Array.from({ length: 50 }, () => '2026-10-03');
  const fetchedAts = Array.from({ length: 50 }, () => '2026-10-04T10:26:00Z');
  const latestSourcePriceDate = maxIsoTimestamp(priceDates);
  const latestFetchedAt = maxIsoTimestamp(fetchedAts);

  assert.equal(latestSourcePriceDate, '2026-10-03');
  assert.equal(latestFetchedAt, '2026-10-04T10:26:00Z');

  // The source date drives the stale label, not the fetch time.
  assert.equal(
    classifyMarketPriceFreshness(latestSourcePriceDate, new Date('2026-10-12T12:00:00Z')),
    'stale',
  );
  assert.notEqual(
    parseMarketPriceDate(latestSourcePriceDate)?.toISOString(),
    parseMarketPriceDate('2026-10-04')?.toISOString(),
  );
});

test('a dataset with newer records is reported recent, not stale', () => {
  // After a successful newer import, the newest source date is today.
  const latestSourcePriceDate = maxIsoTimestamp(['2026-10-10', '2026-10-12', '2026-10-09']);
  assert.equal(
    classifyMarketPriceFreshness(latestSourcePriceDate, new Date('2026-10-12T12:00:00Z')),
    'recent',
  );
});
