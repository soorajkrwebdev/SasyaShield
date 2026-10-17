/**
 * data.gov.in upstream query builder — pure, dependency-free.
 *
 * Single source of truth for the filters[] parameters used by
 * supabase/functions/market-data/index.ts. The OGD platform is
 * ElasticSearch-backed: TEXT fields expose exact-match `.keyword`
 * sub-fields, and `filters[...]` MUST address them. Plain
 * filters[state]/filters[commodity] match the analyzed (tokenized) text
 * field and silently return ZERO rows — the v10 production symptom
 * (HTTP 200, api_status ok, api_total 0, records_length 0 on both
 * sweep and targeted Coconut).
 *
 * The Edge handler must use these builders and must not hand-roll
 * filters[...] keys elsewhere.
 */

/** Filter key addressing the exact-match keyword sub-field of `state`. */
export const STATE_FILTER_KEY = 'filters[state.keyword]';

/** Filter key addressing the exact-match keyword sub-field of `commodity`. */
export const COMMODITY_FILTER_KEY = 'filters[commodity.keyword]';

export type SweepQueryArgs = {
  state: string;
  limit: number;
  offset: number;
};

export type TargetedQueryArgs = {
  commodity: string;
  state: string;
  limit: number;
  offset: number;
};

function baseParams(limit: number, offset: number): URLSearchParams {
  const params = new URLSearchParams();
  params.set('format', 'json');
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return params;
}

/** Query params for one unfiltered state sweep page (no commodity filter). */
export function buildSweepUpstreamParams(args: SweepQueryArgs): URLSearchParams {
  const params = baseParams(args.limit, args.offset);
  params.set(STATE_FILTER_KEY, args.state);
  return params;
}

/** Query params for one targeted commodity page. */
export function buildTargetedUpstreamParams(args: TargetedQueryArgs): URLSearchParams {
  const params = baseParams(args.limit, args.offset);
  params.set(COMMODITY_FILTER_KEY, args.commodity);
  params.set(STATE_FILTER_KEY, args.state);
  return params;
}
