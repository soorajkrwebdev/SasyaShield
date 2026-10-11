import { supabase } from '../lib/supabase';
import type { MarketPriceRecord } from '../types';
import {
  getCommoditySearchTerms,
  mapMarketPriceRow,
} from './marketCommodityMapping';

export { COMMODITY_ALIASES, getCommoditySearchTerms } from './marketCommodityMapping';

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
}

/**
 * Fetch real market records from the authoritative database / AGMARKNET records
 */
export async function fetchMarketPrices(
  filters: MarketQueryFilter
): Promise<MarketAnalysisResult> {
  const limit = filters.limit || 50;

  if (!supabase) {
    return {
      records: [],
      averageModalPrice: null,
      minObservedPrice: null,
      maxObservedPrice: null,
      historyCount: 0,
      trend: 'insufficient_data',
      latestPrice: null,
      source: 'Database not configured',
    };
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
      console.warn('Notice querying market_prices:', error.message);
      return {
        records: [],
        averageModalPrice: null,
        minObservedPrice: null,
        maxObservedPrice: null,
        historyCount: 0,
        trend: 'insufficient_data',
        latestPrice: null,
        source: 'AGMARKNET / DMI (No records found)',
      };
    }

    const records: MarketPriceRecord[] = (data || []).map((row: any) => mapMarketPriceRow(row));

    if (records.length === 0) {
      return {
        records: [],
        averageModalPrice: null,
        minObservedPrice: null,
        maxObservedPrice: null,
        historyCount: 0,
        trend: 'insufficient_data',
        latestPrice: null,
        source: 'AGMARKNET / Directorate of Marketing & Inspection',
      };
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

    return {
      records,
      averageModalPrice,
      minObservedPrice: minObserved,
      maxObservedPrice: maxObserved,
      historyCount: records.length,
      trend,
      latestPrice: records[0] || null,
      source: records[0]?.source_name || 'AGMARKNET / Directorate of Marketing & Inspection',
    };
  } catch (err: any) {
    console.error('Failed to retrieve market records:', err);
    return {
      records: [],
      averageModalPrice: null,
      minObservedPrice: null,
      maxObservedPrice: null,
      historyCount: 0,
      trend: 'insufficient_data',
      latestPrice: null,
      source: 'Error loading market data',
    };
  }
}
