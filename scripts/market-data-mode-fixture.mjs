/**
 * market-data request-mode selection — offline unit tests (part 1: fixtures).
 * Mirrors supabase/functions/market-data/index.ts without Deno imports,
 * network, database, or secrets. Run: node --test scripts/test-market-data-modes.mjs
 *
 * Sweep is resolved BEFORE any targeted commodity validation, so
 * { mode: 'sweep', state: 'Karnataka' } never reaches the
 * "targeted mode requires 1 to 5 commodity names." check.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

export const COMMODITY_SOURCE_LABELS = {
  arecanut: ['Arecanut(Betelnut/Supari)'],
  coconut: ['Coconut'],
  'black pepper': ['Black pepper'],
};
export const ALL_SUPPORTED_COMMODITIES = ['Arecanut', 'Coconut', 'Black pepper'];
export const MAX_COMMODITIES = 5;

export function normalizeWhitespace(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const normalized = String(value).replace(/\s+/g, ' ').trim();
  return normalized || null;
}

export function planCommodity(raw) {
  const requestedName = normalizeWhitespace(raw);
  if (!requestedName) throw new Error('Commodity name is empty.');
  const canonical = normalizeWhitespace(requestedName);
  if (!canonical) throw new Error('Commodity name is empty.');
  const labels = COMMODITY_SOURCE_LABELS[canonical.toLowerCase()] ?? [canonical];
  return { canonical, labels };
}

export function selectPlans(body) {
  if (body.mode !== 'targeted' && body.mode !== 'all' && body.mode !== 'sweep') {
    return { error: 'Only targeted, all and sweep ingestion modes are supported.', status: 400 };
  }

  let stateFilter = 'Karnataka';
  if (body.state !== undefined) {
    const provided = normalizeWhitespace(body.state);
    if (!provided || provided.length > 60) {
      return { error: 'state must be 1 to 60 characters when provided.', status: 400 };
    }
    stateFilter = provided;
  }

  try {
    // Sweep is resolved BEFORE any targeted validation.
    if (body.mode === 'sweep') {
      return { route: 'sweep', state: stateFilter };
    }
    if (body.mode === 'all') {
      return {
        route: 'all',
        plans: ALL_SUPPORTED_COMMODITIES.map((name) => planCommodity(name)),
        state: stateFilter,
      };
    }
    // Targeted validation runs ONLY for targeted mode.
    if (!Array.isArray(body.crops) || body.crops.length < 1 || body.crops.length > MAX_COMMODITIES) {
      return { error: `targeted mode requires 1 to ${MAX_COMMODITIES} commodity names.`, status: 400 };
    }
    const seen = new Set();
    const plans = [];
    for (const raw of body.crops) {
      const plan = planCommodity(raw);
      if (seen.has(plan.canonical.toLowerCase())) continue;
      seen.add(plan.canonical.toLowerCase());
      plans.push(plan);
    }
    return { route: 'targeted', plans, state: stateFilter };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Invalid commodity name.', status: 400 };
  }
}
