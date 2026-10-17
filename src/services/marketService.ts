import { supabase } from '../lib/supabase';
import type { MarketPriceRecord } from '../types';
import {
  getCommoditySearchTerms,
  mapMarketPriceRow,
} from './marketCommodityMapping';
import { maxIsoTimestamp, type MarketPriceLoadStatus } from './marketResultSummary';

export { COMMODITY_ALIASES, getCommoditySearchTerms } from './marketCommodityMapping';
export type { MarketPriceLoadStatus } from './marketResultSummary';

export interface CommodityMapping {
  standardName: string;
  aliases: string[];
}

export interface MarketQueryFilter {
  crop?: string;
  state?: string;
  district?: string;
  market?: string;
  limit?: number;
}

export interface MarketAnalysisResult {
  records: MarketPriceRecord[];
  averageModalPrice: number | null;
  minObservedPrice: number | null;
  maxObservedPrice: number | null;
  historyCount: number;
  trend: 'up' | 'down' | 'stable' | 'insufficient_data';
  latestPrice: MarketPriceRecord | null;
  source: string;
  /**
   * Load outcome so callers can distinguish a genuine "no records" state from a
   * failed database read. Previously both collapsed into a "No records found"
   * message, which misrepresented errors as empty results.
   */
  status: MarketPriceLoadStatus;
  /**
   * The newest source (arrival) price date present in the loaded records, or null.
   * This is the date the price actually refers to — it is intentionally distinct
   * from latestFetchedAt, which is only when the row was imported.
   */
  latestSourcePriceDate: string | null;
  /**
   * The most recent fetch/import timestamp present in the loaded records, or null.
   * Reflects when the upstream data was last synchronized into the database; it is
   * NOT the date the price itself refers to.
   */
  latestFetchedAt: string | null;
}

function emptyResult(
  status: MarketPriceLoadStatus,
  source: string,
): MarketAnalysisResult {
  return {
    records: [],
    averageModalPrice: null,
    minObservedPrice: null,
    maxObservedPrice: null,
    historyCount: 0,
    trend: 'insufficient_data',
    latestPrice: null,
    source,
    status,
    latestSourcePriceDate: null,
    latestFetchedAt: null,
  };
}

/**
 * Fetch real market records from the authoritative database / AGMARKNET records
 */
export async function fetchMarketPrices(
  filters: MarketQueryFilter
): Promise<MarketAnalysisResult> {
  const limit = filters.limit || 50;

  if (!supabase) {
    return emptyResult('unconfigured', 'Database not configured');
  }

  try {
    let query = supabase
      .from('market_prices')
      .select('*')
      .order('price_date', { ascending: false })
      .limit(limit);

    if (filters.crop && filters.crop !== 'all') {
      const aliases = getCommoditySearchTerms(filters.crop);
      query = query.in('crop', aliases);
    }

    if (filters.state && filters.state !== 'all') {
      query = query.ilike('state', `%${filters.state}%`);
    }

    if (filters.district && filters.district !== 'all') {
      query = query.ilike('district', `%${filters.district}%`);
    }

    if (filters.market && filters.market !== 'all') {
      query = query.ilike('market', `%${filters.market}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Error querying market_prices:', error.message);
      return emptyResult('error', 'AGMARKNET / DMI (database read failed)');
    }

    const records: MarketPriceRecord[] = (data || []).map((row: any) => mapMarketPriceRow(row));

    if (records.length === 0) {
      return emptyResult('empty', 'AGMARKNET / Directorate of Marketing & Inspection');
    }

    // Calculations
    const validPrices = records.map(r => r.modal_price).filter(p => !isNaN(p) && p > 0);
    const averageModalPrice =
      validPrices.length > 0
        ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length)
        : null;

    const minObserved =
      records.length > 0
        ? Math.min(...records.map(r => r.min_price ?? r.modal_price))
        : null;

    const maxObserved =
      records.length > 0
        ? Math.max(...records.map(r => r.max_price ?? r.modal_price))
        : null;

    let trend: 'up' | 'down' | 'stable' | 'insufficient_data' = 'insufficient_data';
    if (records.length >= 2) {
      const latest = records[0].modal_price;
      const previous = records[1].modal_price;
      if (latest > previous * 1.02) trend = 'up';
      else if (latest < previous * 0.98) trend = 'down';
      else trend = 'stable';
    }

    const latestSourcePriceDate = maxIsoTimestamp(
      records.map((r) => r.price_date),
    );
    const latestFetchedAt = maxIsoTimestamp(records.map((r) => r.fetched_at));

    return {
      records,
      averageModalPrice,
      minObservedPrice: minObserved,
      maxObservedPrice: maxObserved,
      historyCount: records.length,
      trend,
      latestPrice: records[0] || null,
      source: records[0]?.source_name || 'AGMARKNET / Directorate of Marketing & Inspection',
      status: 'ok',
      latestSourcePriceDate,
      latestFetchedAt,
    };
  } catch (err: any) {
    console.error('Failed to retrieve market records:', err);
    return emptyResult('error', 'Error loading market data');
  }
}

/**
 * Distinct raw `crop` labels actually stored in market_prices (bounded scan).
 * Sweep mode stores upstream labels verbatim, so this lets the Market page
 * offer every imported commodity without a per-crop frontend change.
 * Read-only; returns [] when unconfigured or on error.
 */
export async function fetchDistinctMarketCrops(limit = 1000): Promise<string[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('market_prices')
      .select('crop')
      .order('crop', { ascending: true })
      .limit(limit);
    if (error || !data) return [];
    return Array.from(new Set(
      (data as Array<{ crop: unknown }>)
        .map((row) => typeof row.crop === 'string' ? row.crop.trim() : '')
        .filter(Boolean),
    )).sort();
  } catch {
    return [];
  }
}
