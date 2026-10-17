/**
 * market-data request dispatch — pure, dependency-free request routing.
 *
 * Single source of truth for mode selection used by
 * supabase/functions/market-data/index.ts. Extracted so the exact production
 * dispatch logic can be unit-tested in plain Node (no Deno, network, database
 * or secrets). The Edge handler delegates to resolveIngestionPlan() and must
 * not re-implement mode branching.
 *
 * Routes:
 *   - sweep    -> state-wide unfiltered ingestion; needs NO commodity names.
 *   - all      -> catalog-driven ingestion of the three verified commodities.
 *   - targeted -> 1..MAX_COMMODITIES commodity names (validated ONLY here).
 */

/** Canonical crop (lower-cased) -> verified data.gov.in commodity label(s). */
export const COMMODITY_SOURCE_LABELS: Record<string, string[]> = {
  arecanut: ['Arecanut(Betelnut/Supari)'],
  coconut: ['Coconut'],
  'black pepper': ['Black pepper'],
};

/** Explicit all-mode catalog in canonical display-name form. */
export const ALL_SUPPORTED_COMMODITIES = ['Arecanut', 'Coconut', 'Black pepper'] as const;

/** Upper bound for targeted-mode commodity names per request. */
export const MAX_COMMODITIES = 5;

export type CommodityPlan = {
  /** Canonical display crop stored verbatim in `crop`. */
  canonical: string;
  /** Raw data.gov.in commodity label(s) used in filters[commodity]. */
  labels: string[];
};

function normalizeRequestText(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const normalized = String(value).replace(/\s+/g, ' ').trim();
  return normalized || null;
}

export function planCommodity(requestedName: unknown): CommodityPlan {
  const canonical = normalizeRequestText(requestedName);
  if (!canonical) throw new Error('Commodity name is empty.');
  const labels = COMMODITY_SOURCE_LABELS[canonical.toLowerCase()] ?? [canonical];
  return { canonical, labels };
}

export type IngestionRoute =
  | { route: 'sweep'; state: string }
  | { route: 'all'; plans: CommodityPlan[]; state: string }
  | { route: 'targeted'; plans: CommodityPlan[]; state: string }
  | { error: string; status: number };

/**
 * Decide which ingestion handler a request body routes to.
 *
 * Sweep is resolved BEFORE any commodity validation, so
 * { mode: 'sweep', state: 'Karnataka' } never touches the targeted
 * 1-to-5 commodity-names check.
 */
export function resolveIngestionPlan(body: unknown, defaultState = 'Karnataka'): IngestionRoute {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object.', status: 400 };
  }
  const { mode, crops, state } = body as { mode?: unknown; crops?: unknown; state?: unknown };
  if (mode !== 'targeted' && mode !== 'all' && mode !== 'sweep') {
    return { error: 'Only targeted, all and sweep ingestion modes are supported.', status: 400 };
  }

  let stateFilter = defaultState;
  if (state !== undefined) {
    const provided = normalizeRequestText(state);
    if (!provided || provided.length > 60) {
      return { error: 'state must be 1 to 60 characters when provided.', status: 400 };
    }
    stateFilter = provided;
  }

  try {
    if (mode === 'sweep') {
      // No commodity names required: the sweep handler pages the state filter
      // unfiltered and stores each raw upstream label verbatim.
      return { route: 'sweep', state: stateFilter };
    }
    if (mode === 'all') {
      // Catalog-driven: no crops array required.
      return {
        route: 'all',
        plans: ALL_SUPPORTED_COMMODITIES.map((name) => planCommodity(name)),
        state: stateFilter,
      };
    }
    // Targeted validation runs ONLY for targeted mode.
    if (!Array.isArray(crops) || crops.length < 1 || crops.length > MAX_COMMODITIES) {
      return { error: `targeted mode requires 1 to ${MAX_COMMODITIES} commodity names.`, status: 400 };
    }
    const seen = new Set<string>();
    const plans: CommodityPlan[] = [];
    for (const raw of crops as unknown[]) {
      const plan = planCommodity(raw);
      if (seen.has(plan.canonical.toLowerCase())) continue;
      seen.add(plan.canonical.toLowerCase());
      plans.push(plan);
    }
    return { route: 'targeted', plans, state: stateFilter };
  } catch {
    return { error: 'Invalid commodity name.', status: 400 };
  }
}
