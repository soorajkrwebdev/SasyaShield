import React, { useState, useEffect, useCallback } from 'react';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Leaf,
  RefreshCw,
  AlertCircle,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useFarmData } from '../../contexts/FarmContext';
import {
  fetchMarketPrices,
  COMMODITY_ALIASES,
  MarketAnalysisResult,
} from '../../services/marketService';
import {
  classifyMarketPriceFreshness,
  parseMarketPriceDate,
} from '../../services/marketFreshness';

// All crops available in the alias dictionary
const SUPPORTED_CROPS = Object.keys(COMMODITY_ALIASES);

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export const MarketPage: React.FC = () => {
  const { farms, crops: farmCrops } = useFarmData();

  // Derive the farmer's unique crop names from registered crops
  const farmerCropNames = Array.from(new Set(farmCrops.map(c => c.crop_name)));

  // Find which of the farmer's crops are in the supported alias list
  const matchedFarmerCrops = farmerCropNames.filter(name =>
    SUPPORTED_CROPS.some(
      sc =>
        sc.toLowerCase() === name.toLowerCase() ||
        (COMMODITY_ALIASES[sc] ?? []).some(
          alias => alias.toLowerCase() === name.toLowerCase(),
        ),
    ),
  );

  const [selectedCrop, setSelectedCrop] = useState<string>(
    matchedFarmerCrops[0] ?? SUPPORTED_CROPS[0] ?? 'Arecanut',
  );
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [result, setResult] = useState<MarketAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAllRecords, setShowAllRecords] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setShowAllRecords(false);
    const data = await fetchMarketPrices({
      crop: selectedCrop,
      state: stateFilter === 'all' ? undefined : stateFilter,
      limit: 50,
    });
    setResult(data);
    setLoading(false);
  }, [selectedCrop, stateFilter]);

  // Load on mount and whenever crop / state changes
  useEffect(() => {
    load();
  }, [load]);

  // Filter records by search query (market / district text)
  const displayedRecords = (result?.records ?? []).filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.market.toLowerCase().includes(q) ||
      r.district.toLowerCase().includes(q) ||
      r.state.toLowerCase().includes(q) ||
      (r.canonical_crop ?? r.crop).toLowerCase().includes(q) ||
      r.crop.toLowerCase().includes(q)
    );
  });

  const visibleRecords = showAllRecords
    ? displayedRecords
    : displayedRecords.slice(0, 10);

  // Unique states in the result for the state filter dropdown
  const availableStates = Array.from(
    new Set((result?.records ?? []).map(r => r.state)),
  ).sort();
  const allDisplayedRecordsStale = displayedRecords.length > 0 &&
    displayedRecords.every(record => classifyMarketPriceFreshness(record.price_date) === 'stale');

  const trendIcon =
    result?.trend === 'up' ? (
      <TrendingUp className="w-4 h-4 text-emerald-600" />
    ) : result?.trend === 'down' ? (
      <TrendingDown className="w-4 h-4 text-rose-600" />
    ) : (
      <Minus className="w-4 h-4 text-slate-400" />
    );

  const trendLabel: Record<string, string> = {
    up: 'Price trending up',
    down: 'Price trending down',
    stable: 'Price stable',
    insufficient_data: 'Insufficient data for trend',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Agricultural Market Prices</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Wholesale mandi prices from AGMARKNET / Directorate of Marketing &amp; Inspection
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="emerald" size="sm">AGMARKNET / DMI</Badge>
        </div>
      </div>

      {/* Important disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-amber-800 space-y-1">
          <p className="font-semibold text-amber-900">Market Data Notice</p>
          <p>
            Prices shown are wholesale mandi (market yard) prices from the{' '}
            <strong>AGMARKNET</strong> database, imported into this platform's database.
            They reflect recorded arrival prices at mandis — not farm-gate prices.
            If no records are available for a crop or market, the platform shows
            "No verified data available" rather than an estimated or demo price.
          </p>
          <p>
            Farmers typically receive 60–80% of the mandi modal price at the farm gate,
            depending on transport costs, intermediary chain, and seasonal factors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left panel — crop selector + farm context */}
        <div className="lg:col-span-1 space-y-4">
          {/* Farmer's crops (quick select) */}
          {matchedFarmerCrops.length > 0 && (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4">
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Leaf className="w-3.5 h-3.5" /> Your Farm Crops
              </p>
              <div className="space-y-1">
                {matchedFarmerCrops.map(crop => (
                  <button
                    key={crop}
                    onClick={() => setSelectedCrop(crop)}
                    className={`w-full text-left text-xs px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
                      selectedCrop === crop
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {crop}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* All supported crops */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              All Supported Crops
            </p>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {SUPPORTED_CROPS.map(crop => (
                <button
                  key={crop}
                  onClick={() => setSelectedCrop(crop)}
                  className={`w-full text-left text-xs px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                    selectedCrop === crop
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {crop}
                </button>
              ))}
            </div>
          </div>

          {/* Farm selector (for regional context) */}
          {farms.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Farm Context
              </p>
              <p className="text-xs text-slate-700 font-semibold">{farms[0].name}</p>
              <p className="text-xs text-slate-400">{farms[0].location}</p>
              <p className="text-[10px] text-slate-400 mt-1">
                Market prices are not filtered by farm location automatically.
                Use the State filter to narrow results to your region.
              </p>
            </div>
          )}
        </div>

        {/* Right panel — price results */}
        <div className="lg:col-span-3 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-36 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search market / district..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 text-xs bg-white rounded-xl border border-slate-200 w-full focus:border-emerald-500 outline-none"
              />
            </div>

            {availableStates.length > 0 && (
              <select
                value={stateFilter}
                onChange={e => setStateFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:border-emerald-500 outline-none cursor-pointer"
              >
                <option value="all">All States</option>
                {availableStates.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}

            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {!loading && allDisplayedRecordsStale && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" role="status">
              Market prices may be outdated. Latest available price dates are shown.
            </div>
          )}

          {/* Summary stats */}
          {result && result.historyCount > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl border p-3">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Modal Price (avg)</p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">
                  {result.averageModalPrice != null
                    ? `₹${result.averageModalPrice.toLocaleString('en-IN')}`
                    : '—'}
                </p>
                <p className="text-[10px] text-slate-400">per quintal · {result.records[0]?.unit}</p>
              </div>
              <div className="bg-white rounded-2xl border p-3">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Min Observed</p>
                <p className="text-xl font-bold text-rose-600 mt-0.5">
                  {result.minObservedPrice != null
                    ? `₹${result.minObservedPrice.toLocaleString('en-IN')}`
                    : '—'}
                </p>
                <p className="text-[10px] text-slate-400">lowest in results</p>
              </div>
              <div className="bg-white rounded-2xl border p-3">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Max Observed</p>
                <p className="text-xl font-bold text-emerald-700 mt-0.5">
                  {result.maxObservedPrice != null
                    ? `₹${result.maxObservedPrice.toLocaleString('en-IN')}`
                    : '—'}
                </p>
                <p className="text-[10px] text-slate-400">highest in results</p>
              </div>
              <div className="bg-white rounded-2xl border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Trend</p>
                  {trendIcon}
                </div>
                <p className="text-xs font-semibold text-slate-700 mt-1">
                  {trendLabel[result.trend]}
                </p>
                <p className="text-[10px] text-slate-400">{result.historyCount} records</p>
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-2xl border p-4 animate-pulse">
                  <div className="h-3 bg-slate-100 rounded w-40 mb-2" />
                  <div className="h-5 bg-slate-100 rounded w-24" />
                </div>
              ))}
            </div>
          )}

          {/* No data */}
          {!loading && result && result.historyCount === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <EmptyState
                icon={<TrendingUp className="w-10 h-10 text-slate-300" />}
                title={`No verified market data for ${selectedCrop}`}
                description={
                  `No records were found in the AGMARKNET dataset for "${selectedCrop}"` +
                  (stateFilter !== 'all' ? ` in ${stateFilter}` : '') +
                  '. This platform does not display estimated or demo prices. ' +
                  'Try a different crop, remove the state filter, or check back when data has been imported.'
                }
              />
              <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-start gap-2 text-xs text-blue-800">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Why might there be no data?</p>
                  <ul className="space-y-1 list-disc list-inside text-blue-700">
                    <li>The AGMARKNET database may not have recent arrivals for this commodity</li>
                    <li>The crop alias may not match the commodity name used in the source</li>
                    <li>Data import into this platform's database may be pending</li>
                  </ul>
                  <a
                    href="https://agmarknet.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-blue-600 font-semibold hover:underline"
                  >
                    Check AGMARKNET directly <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Records table */}
          {!loading && displayedRecords.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left p-3 font-bold text-slate-600">Commodity</th>
                      <th className="text-left p-3 font-bold text-slate-600">Market</th>
                      <th className="text-left p-3 font-bold text-slate-600">District / State</th>
                      <th className="text-right p-3 font-bold text-slate-600">Min (₹)</th>
                      <th className="text-right p-3 font-bold text-slate-600">Modal (₹)</th>
                      <th className="text-right p-3 font-bold text-slate-600">Max (₹)</th>
                      <th className="text-left p-3 font-bold text-slate-600">Price / Fetch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleRecords.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-slate-800">{r.canonical_crop ?? r.crop}</td>
                        <td className="p-3 text-slate-700">{r.market}</td>
                        <td className="p-3 text-slate-500">
                          {r.district}, {r.state}
                        </td>
                        <td className="p-3 text-right text-slate-600">
                          {r.min_price != null
                            ? r.min_price.toLocaleString('en-IN')
                            : '—'}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          {r.modal_price.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right text-slate-600">
                          {r.max_price != null
                            ? r.max_price.toLocaleString('en-IN')
                            : '—'}
                        </td>
                        <td className="p-3 text-slate-500">
                          <div>Price date: {formatPriceDate(r.price_date)}</div>
                          <div>Fetched: {formatFetchedAt(r.fetched_at)}</div>
                          <div className={getFreshnessClass(r.price_date)}>
                            {getFreshnessLabel(r.price_date)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Show more / less */}
              {displayedRecords.length > 10 && (
                <div className="border-t border-slate-100 px-4 py-2">
                  <button
                    onClick={() => setShowAllRecords(v => !v)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    {showAllRecords ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        Show fewer records
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        Show all {displayedRecords.length} records
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Source footer */}
              <div className="border-t border-slate-100 px-4 py-2 flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  Source: {result?.source ?? 'AGMARKNET / Directorate of Marketing & Inspection'}
                </span>
                <a
                  href="https://agmarknet.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-emerald-600 hover:underline font-medium"
                >
                  agmarknet.gov.in <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Farm gate advisory note */}
          <div className="bg-slate-800 rounded-2xl p-4 text-white text-xs">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-200">Understanding Mandi Prices</p>
                <p className="text-slate-400 leading-relaxed">
                  These are <strong className="text-slate-300">wholesale arrival prices</strong> at
                  regulated market yards (mandis). The price a farmer actually receives at the farm
                  gate depends on transportation costs, post-harvest losses, local trader margins,
                  and the quality and grading of the produce. Record your own sale transactions in
                  the Harvest module for an accurate farm-level picture.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatPriceDate(value: string | null | undefined): string {
  const date = parseMarketPriceDate(value);
  if (!date) return 'Unknown';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function formatFetchedAt(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  const fetchedAt = new Date(value);
  if (!Number.isFinite(fetchedAt.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(fetchedAt);
}

function getFreshnessLabel(priceDate: string): string {
  const freshness = classifyMarketPriceFreshness(priceDate);
  if (freshness === 'recent') return 'Recent';
  if (freshness === 'stale') return 'Stale';
  return 'Unknown';
}

function getFreshnessClass(priceDate: string): string {
  const freshness = classifyMarketPriceFreshness(priceDate);
  if (freshness === 'recent') return 'text-emerald-700';
  if (freshness === 'stale') return 'text-amber-700';
  return 'text-slate-400';
}
