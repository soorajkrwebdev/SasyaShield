import React from 'react';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';
import {
  BarChart3,
  TrendingUp,
  Leaf,
  Wheat,
  CircleDollarSign,
  Activity,
  Bug,
  FileCheck,
  Recycle,
  DollarSign,
  ShieldAlert,
  FlaskConical,
} from 'lucide-react';
import { useFarmData } from '../../contexts/FarmContext';

export const AnalyticsPage: React.FC = () => {
  const {
    farms,
    crops,
    activities,
    soilTests,
    waterTests,
    farmWaste,
    compostBatches,
    pestObservations,
    ipmRecords,
    pesticideApplications,
    expenses,
    harvests,
    loading,
  } = useFarmData();

  // ---- Summary metrics (all from real Supabase data) ----
  const totalFarms = farms.length;

  // Normalise all areas to acres for display
  const totalFarmAcres = farms.reduce((sum, f) => {
    const factor = f.area_unit === 'hectares' ? 2.47105 : 1;
    return sum + (Number(f.area) || 0) * factor;
  }, 0);

  const organicFarmCount = farms.filter(
    f => f.farming_method === 'organic' || f.farming_method === 'natural'
  ).length;
  const organicPercent = totalFarms > 0
    ? Math.round((organicFarmCount / totalFarms) * 100)
    : 0;

  const totalCropsCount = crops.length;
  const activeCropsCount = crops.filter(c => c.status === 'active').length;
  const totalCropAcres = crops.reduce((sum, c) => {
    const factor = c.area_unit === 'hectares' ? 2.47105 : 1;
    return sum + (Number(c.area) || 0) * factor;
  }, 0);

  const totalActivitiesCount = activities.length;
  const organicActivitiesCount = activities.filter(
    a =>
      a.activity_type === 'Organic manure' ||
      a.activity_type === 'Biofertilizer application' ||
      a.activity_type === 'Mulching'
  ).length;

  const pestObservationsCount = pestObservations.length;
  const ipmActionsCount = ipmRecords.length;

  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalHarvestRevenue = harvests.reduce(
    (sum, h) => sum + (Number(h.quantity) || 0) * (Number(h.sale_price) || 0),
    0
  );

  const totalWasteRecycled = farmWaste
    .filter(w => w.status === 'composted' || w.status === 'applied')
    .reduce((sum, w) => sum + (Number(w.quantity) || 0), 0);

  const totalCompostProduced = compostBatches
    .filter(b => b.status === 'finished' || b.status === 'used')
    .reduce((sum, b) => sum + (Number(b.finished_quantity) || 0), 0);

  const totalSoilTests = soilTests.length;
  const totalWaterTests = waterTests.length;

  // ---- Expense breakdown by category ----
  const expenseByCategory: Record<string, number> = {};
  expenses.forEach(e => {
    const cat = e.category ?? 'other';
    expenseByCategory[cat] = (expenseByCategory[cat] ?? 0) + Number(e.amount);
  });
  const expenseEntries = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
  const maxExpense = Math.max(...Object.values(expenseByCategory), 1);

  // ---- Activity breakdown by type ----
  const activityByType: Record<string, number> = {};
  activities.forEach(a => {
    const t = a.activity_type ?? 'other';
    activityByType[t] = (activityByType[t] ?? 0) + 1;
  });
  const activityEntries = Object.entries(activityByType).sort((a, b) => b[1] - a[1]);
  const maxActivity = Math.max(...Object.values(activityByType), 1);

  // ---- Crop area + harvest breakdown ----
  const cropMap: Record<string, { area: number; production: number }> = {};
  crops.forEach(c => {
    const factor = c.area_unit === 'hectares' ? 2.47105 : 1;
    const key = c.crop_name;
    if (!cropMap[key]) cropMap[key] = { area: 0, production: 0 };
    cropMap[key].area += (Number(c.area) || 0) * factor;
  });
  harvests.forEach(h => {
    const crop = crops.find(c => c.id === h.crop_id);
    const key = crop ? crop.crop_name : 'Harvested Crop';
    if (!cropMap[key]) cropMap[key] = { area: 0, production: 0 };
    cropMap[key].production += Number(h.quantity) || 0;
  });
  const cropBreakdown = Object.entries(cropMap);
  const maxCropArea = Math.max(...cropBreakdown.map(e => e[1].area), 1);

  // ── Crop-protection analytics ─────────────────────────────────────────
  // Pest observations grouped by crop name
  const pestByCrop: Record<string, { total: number; high: number; critical: number }> = {};
  pestObservations.forEach(obs => {
    const cropName = obs.crop_name || 'Unspecified Crop';
    if (!pestByCrop[cropName]) pestByCrop[cropName] = { total: 0, high: 0, critical: 0 };
    pestByCrop[cropName].total += 1;
    if (obs.severity === 'high') pestByCrop[cropName].high += 1;
    if (obs.severity === 'critical') pestByCrop[cropName].critical += 1;
  });
  const pestByCropEntries = Object.entries(pestByCrop).sort((a, b) => b[1].total - a[1].total);
  const maxPestCropCount = Math.max(...pestByCropEntries.map(([, v]) => v.total), 1);

  // IPM by advisory level
  const ipmByLevel: Record<string, number> = {};
  ipmRecords.forEach(r => {
    ipmByLevel[r.advisory_level] = (ipmByLevel[r.advisory_level] ?? 0) + 1;
  });
  const ipmEntries = Object.entries(ipmByLevel).sort((a, b) => b[1] - a[1]);
  const totalIPM = ipmRecords.length;
  const chemicalIPM = ipmByLevel['chemical'] ?? 0;
  const nonChemicalIPM = totalIPM - chemicalIPM;

  // Severity distribution across all observations
  const severityCounts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  pestObservations.forEach(o => { severityCounts[o.severity] = (severityCounts[o.severity] ?? 0) + 1; });
  const severityColors: Record<string, string> = {
    low: 'bg-emerald-500',
    medium: 'bg-amber-500',
    high: 'bg-orange-500',
    critical: 'bg-rose-600',
  };

  const hasCropProtectionData =
    pestObservations.length > 0 || ipmRecords.length > 0 || pesticideApplications.length > 0;

  const hasAnyData =
    totalFarms > 0 || totalCropsCount > 0 || totalActivitiesCount > 0 ||
    totalExpenses > 0 || totalSoilTests > 0;

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Calculating farm analytics from database...</p>
      </div>
    );
  }

  if (!hasAnyData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Farm Analytics</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Live metrics calculated from your farm records
            </p>
          </div>
          <Badge variant="emerald" size="sm">Live Database Data</Badge>
        </div>
        <EmptyState
          icon={<BarChart3 className="w-12 h-12 text-slate-400" />}
          title="No farm records yet"
          description="Analytics are computed strictly from your farm records, crops, activities, expenses, and tests. Add your first farm to see real charts and indicators."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Farm Analytics & Intelligence</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real data from your farms, crops, activities, inputs, tests, and harvests
          </p>
        </div>
        <Badge variant="emerald" size="sm">Supabase Source of Truth</Badge>
      </div>

      {/* KPI top cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Total Farm Area</span>
            <Leaf className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {totalFarmAcres.toFixed(1)}{' '}
            <span className="text-base font-normal text-slate-500">acres</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Across {totalFarms} farm(s) · {organicPercent}% organic method
          </p>
        </div>

        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Active Crop Cycles</span>
            <Wheat className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-slate-800">{activeCropsCount}</p>
          <p className="text-xs text-slate-400 mt-1">
            {totalCropAcres.toFixed(1)} acres planted · {totalCropsCount} total
          </p>
        </div>

        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Recorded Expenses</span>
            <CircleDollarSign className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-3xl font-bold text-slate-800">
            ₹{totalExpenses.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {expenses.length} expense entr{expenses.length === 1 ? 'y' : 'ies'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Harvest Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-slate-800">
            ₹{totalHarvestRevenue.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            From {harvests.length} recorded harvest(s)
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity distribution */}
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800">Field Activity Distribution</h3>
              <p className="text-xs text-slate-400">Categorised from logged crop activities</p>
            </div>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          {activityEntries.length > 0 ? (
            <div className="space-y-3">
              {activityEntries.map(([type, count]) => {
                const pct = ((count / totalActivitiesCount) * 100).toFixed(0);
                const w = (count / maxActivity) * 100;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700">{type}</span>
                      <span className="text-xs font-semibold text-slate-600">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full w-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full transition-all" style={{ width: `${w}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-6 text-center">No field activities recorded yet.</p>
          )}
          <div className="mt-4 pt-3 border-t flex justify-between text-xs text-slate-500">
            <span>Total</span>
            <span className="font-bold text-slate-800">{totalActivitiesCount}</span>
          </div>
        </div>

        {/* Expense breakdown */}
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800">Expense Breakdown</h3>
              <p className="text-xs text-slate-400">Operational spend by category</p>
            </div>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          {expenseEntries.length > 0 ? (
            <div className="space-y-3">
              {expenseEntries.map(([category, amount]) => {
                const pct = totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(0) : '0';
                const w = (amount / maxExpense) * 100;
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700 capitalize">{category}</span>
                      <span className="text-xs font-semibold text-slate-600">
                        ₹{amount.toLocaleString('en-IN')} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full w-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${w}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-6 text-center">No farm expenses recorded yet.</p>
          )}
          <div className="mt-4 pt-3 border-t flex justify-between text-xs text-slate-500">
            <span>Total Expenditure</span>
            <span className="font-bold text-slate-800">₹{totalExpenses.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Crops acreage + harvest output */}
      <div className="bg-white rounded-2xl border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-800">Crops — Acreage & Harvest Output</h3>
            <p className="text-xs text-slate-400">From registered crops and harvest logs</p>
          </div>
          <Wheat className="w-4 h-4 text-emerald-600" />
        </div>
        {cropBreakdown.length > 0 ? (
          <div className="space-y-3">
            {cropBreakdown.map(([cropName, data]) => {
              const w = (data.area / maxCropArea) * 100;
              return (
                <div key={cropName} className="flex items-center gap-4 text-xs">
                  <span className="font-medium text-slate-700 w-36 truncate">{cropName}</span>
                  <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full flex items-center px-2 text-[10px] text-white font-medium transition-all"
                      style={{ width: `${Math.max(w, 8)}%` }}
                    >
                      {data.area > 0 ? `${data.area.toFixed(1)} ac` : '—'}
                    </div>
                  </div>
                  <div className="w-32 text-right">
                    <span className="font-semibold text-slate-800">
                      {data.production > 0 ? `${data.production.toLocaleString()} kg` : 'Pending'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Harvested</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic py-4 text-center">No crops registered yet.</p>
        )}
      </div>

      {/* ── CROP PROTECTION ANALYTICS ───────────────────────────────────────── */}
      <div className="bg-slate-50 rounded-3xl border border-slate-200 p-1">
        <div className="bg-white rounded-2xl border border-slate-200/50 p-5 mb-1">
          <div className="flex items-center gap-2 mb-1">
            <Bug className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-slate-800">Crop Protection Analytics</h2>
          </div>
          <p className="text-xs text-slate-400">
            Pest observations, IPM decisions, and pesticide application records — all from your
            logged data. No values are estimated or benchmarked.
          </p>
        </div>

        {!hasCropProtectionData ? (
          <div className="bg-white rounded-2xl border border-slate-200/50 p-8">
            <EmptyState
              icon={<Bug className="w-10 h-10 text-slate-300" />}
              title="No crop-protection records yet"
              description="Record pest observations, log IPM decisions, and add pesticide applications in the Pest & IPM module to see analytics here."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
            {/* Summary KPIs */}
            <div className="bg-white rounded-2xl border border-slate-200/50 p-5">
              <h3 className="font-bold text-slate-800 text-sm mb-4">Summary Counts</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-indigo-50 rounded-2xl p-3 border border-indigo-100">
                  <p className="text-2xl font-extrabold text-indigo-800">
                    {pestObservations.length}
                  </p>
                  <p className="text-[10px] text-indigo-600 font-semibold mt-0.5 uppercase tracking-wide">
                    Observations
                  </p>
                </div>
                <div className="bg-blue-50 rounded-2xl p-3 border border-blue-100">
                  <p className="text-2xl font-extrabold text-blue-800">{totalIPM}</p>
                  <p className="text-[10px] text-blue-600 font-semibold mt-0.5 uppercase tracking-wide">
                    IPM Decisions
                  </p>
                </div>
                <div className="bg-rose-50 rounded-2xl p-3 border border-rose-100">
                  <p className="text-2xl font-extrabold text-rose-800">
                    {pesticideApplications.length}
                  </p>
                  <p className="text-[10px] text-rose-600 font-semibold mt-0.5 uppercase tracking-wide">
                    Pesticide Apps
                  </p>
                </div>
              </div>

              {/* Chemical vs non-chemical ratio */}
              {totalIPM > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">
                      IPM: Chemical vs Non-chemical
                    </span>
                    <span className="text-xs text-slate-500">
                      {totalIPM} total decisions
                    </span>
                  </div>
                  {/* Stacked bar */}
                  <div className="h-4 rounded-full overflow-hidden flex w-full bg-slate-100">
                    {nonChemicalIPM > 0 && (
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${(nonChemicalIPM / totalIPM) * 100}%` }}
                        title={`Non-chemical: ${nonChemicalIPM}`}
                      />
                    )}
                    {chemicalIPM > 0 && (
                      <div
                        className="bg-rose-500 h-full transition-all"
                        style={{ width: `${(chemicalIPM / totalIPM) * 100}%` }}
                        title={`Chemical: ${chemicalIPM}`}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      <span className="text-emerald-700 font-semibold">
                        {nonChemicalIPM} Non-chemical (
                        {totalIPM > 0 ? Math.round((nonChemicalIPM / totalIPM) * 100) : 0}%)
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                      <span className="text-rose-700 font-semibold">
                        {chemicalIPM} Chemical (
                        {totalIPM > 0 ? Math.round((chemicalIPM / totalIPM) * 100) : 0}%)
                      </span>
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    "Non-chemical" = monitoring, prevention, cultural, mechanical, biological,
                    botanical. "Chemical" = advisory_level set to chemical in IPM record.
                  </p>
                </div>
              )}
            </div>

            {/* Severity distribution */}
            {pestObservations.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/50 p-5">
                <h3 className="font-bold text-slate-800 text-sm mb-4">Severity Distribution</h3>
                <div className="space-y-3">
                  {(['low', 'medium', 'high', 'critical'] as const).map(sev => {
                    const count = severityCounts[sev] ?? 0;
                    if (count === 0) return null;
                    const pct = Math.round((count / pestObservations.length) * 100);
                    const labelColors: Record<string, string> = {
                      low: 'text-emerald-700',
                      medium: 'text-amber-700',
                      high: 'text-orange-700',
                      critical: 'text-rose-700',
                    };
                    return (
                      <div key={sev}>
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs font-semibold capitalize ${labelColors[sev]}`}
                          >
                            {sev}
                          </span>
                          <span className="text-xs text-slate-600">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${severityColors[sev]}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-3 border-t border-slate-100 pt-2">
                  Severity as recorded by the farmer in each pest observation log.
                </p>
              </div>
            )}

            {/* Pest observations per crop */}
            {pestByCropEntries.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/50 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 text-sm">Observations per Crop</h3>
                  <Bug className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="space-y-3">
                  {pestByCropEntries.map(([cropName, data]) => {
                    const barW = (data.total / maxPestCropCount) * 100;
                    return (
                      <div key={cropName}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-700 truncate max-w-[140px]">
                            {cropName}
                          </span>
                          <span className="text-xs text-slate-500 shrink-0 ml-2">
                            {data.total} obs
                            {data.critical > 0 && (
                              <span className="ml-1 text-rose-600 font-semibold">
                                · {data.critical} critical
                              </span>
                            )}
                            {data.high > 0 && (
                              <span className="ml-1 text-orange-600 font-semibold">
                                · {data.high} high
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full transition-all"
                            style={{ width: `${barW}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* IPM by advisory level */}
            {ipmEntries.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/50 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 text-sm">IPM by Advisory Level</h3>
                  <ShieldAlert className="w-4 h-4 text-blue-600" />
                </div>
                <div className="space-y-3">
                  {ipmEntries.map(([level, count]) => {
                    const pct = totalIPM > 0 ? Math.round((count / totalIPM) * 100) : 0;
                    const barClass =
                      level === 'chemical'
                        ? 'bg-rose-500'
                        : level === 'biological' || level === 'botanical'
                        ? 'bg-emerald-500'
                        : level === 'monitoring' || level === 'prevention'
                        ? 'bg-blue-400'
                        : 'bg-amber-400';
                    return (
                      <div key={level}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-700 capitalize">
                            {level}
                          </span>
                          <span className="text-xs text-slate-500">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barClass}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pesticide applications notice */}
            {pesticideApplications.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/50 p-5 lg:col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <FlaskConical className="w-4 h-4 text-rose-600" />
                  <h3 className="font-bold text-slate-800 text-sm">
                    Pesticide Application Records ({pesticideApplications.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[500px]">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="text-left p-2">Product</th>
                        <th className="text-left p-2">Active Ingredient</th>
                        <th className="text-left p-2">Crop</th>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Area</th>
                        <th className="text-left p-2">PHI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pesticideApplications.slice(0, 10).map(app => (
                        <tr key={app.id} className="hover:bg-slate-50">
                          <td className="p-2 font-semibold text-slate-800">{app.product_name}</td>
                          <td className="p-2 text-slate-500">{app.active_ingredient || '—'}</td>
                          <td className="p-2 text-slate-600">{app.crop_name || '—'}</td>
                          <td className="p-2 text-slate-500">{app.application_date}</td>
                          <td className="p-2 text-slate-500">
                            {app.area} {app.area_unit}
                          </td>
                          <td className="p-2">
                            {app.pre_harvest_interval_days != null ? (
                              <span className="text-amber-700 font-semibold">
                                {app.pre_harvest_interval_days} days
                              </span>
                            ) : (
                              <span className="text-slate-400">Not recorded</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pesticideApplications.length > 10 && (
                    <p className="text-[10px] text-slate-400 px-2 pt-2">
                      Showing 10 of {pesticideApplications.length} records. View all in the Pest & IPM module.
                    </p>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-3 border-t border-slate-100 pt-2">
                  These are farmer-entered application records. PHI = Pre-Harvest Interval as
                  entered by the farmer. This platform does not verify label compliance.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sustainability indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">        <div className="bg-emerald-900 rounded-2xl p-4 text-white shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Leaf className="w-4 h-4 text-emerald-300" />
            <span className="text-xs text-emerald-200">Organic Practices</span>
          </div>
          <p className="text-2xl font-bold">{organicActivitiesCount}</p>
          <p className="text-xs text-emerald-200/70 mt-1">Manure, bio-inputs & mulch logs</p>
        </div>

        <div className="bg-blue-900 rounded-2xl p-4 text-white shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Bug className="w-4 h-4 text-blue-300" />
            <span className="text-xs text-blue-200">IPM & Pest Logs</span>
          </div>
          <p className="text-2xl font-bold">
            {ipmActionsCount}{' '}
            <span className="text-sm font-normal">/ {pestObservationsCount} obs</span>
          </p>
          <p className="text-xs text-blue-200/70 mt-1">Integrated pest interventions</p>
        </div>

        <div className="bg-amber-900 rounded-2xl p-4 text-white shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Recycle className="w-4 h-4 text-amber-300" />
            <span className="text-xs text-amber-200">Waste Recycled</span>
          </div>
          <p className="text-2xl font-bold">
            {totalWasteRecycled}{' '}
            <span className="text-sm font-normal">kg</span>
          </p>
          <p className="text-xs text-amber-200/70 mt-1">
            Compost produced: {totalCompostProduced} kg
          </p>
        </div>

        <div className="bg-teal-900 rounded-2xl p-4 text-white shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <FileCheck className="w-4 h-4 text-teal-300" />
            <span className="text-xs text-teal-200">Soil & Water Tests</span>
          </div>
          <p className="text-2xl font-bold">
            {totalSoilTests + totalWaterTests}{' '}
            <span className="text-sm font-normal">tests</span>
          </p>
          <p className="text-xs text-teal-200/70 mt-1">
            {totalSoilTests} Soil · {totalWaterTests} Water
          </p>
        </div>
      </div>

      {/* Sustainability tracking summary */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="font-bold text-base text-slate-100">Farm Sustainability Indicators</h3>
            <p className="text-xs text-slate-400 mt-1">
              Internal farm progress tracking based on logged agricultural practices
            </p>
          </div>
          <Badge variant="emerald" size="sm">Self-Tracked Indicators</Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <div className="text-xl font-bold text-emerald-400">{organicPercent}%</div>
            <div className="text-xs text-slate-400 mt-1">Organic Farms</div>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <div className="text-xl font-bold text-emerald-400">{totalSoilTests}</div>
            <div className="text-xs text-slate-400 mt-1">Soil Tests Logged</div>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <div className="text-xl font-bold text-emerald-400">{totalCompostProduced} kg</div>
            <div className="text-xs text-slate-400 mt-1">Compost Produced</div>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <div className="text-xl font-bold text-emerald-400">{ipmActionsCount}</div>
            <div className="text-xs text-slate-400 mt-1">IPM Decisions</div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span>Source: Farm records entered by farmer in Sasyashield.</span>
          <span className="text-emerald-400 font-medium">Active Data-Driven Monitoring</span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Activity className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-900 text-sm">Sustainability Tracking Disclaimer</h4>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              These indicators reflect internal farm tracking entered by the farmer. They do not constitute official organic certification or government NPOP validation. For accredited third-party organic certification, consult with recognised APEDA/NPOP certification bodies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
