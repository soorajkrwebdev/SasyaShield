import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFarmData } from '../contexts/FarmContext';
import { StatCard } from '../components/common/StatCard';
import { WeatherWidget } from '../components/dashboard/WeatherWidget';
import { RecentActivitiesFeed } from '../components/dashboard/RecentActivitiesFeed';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import {
  Trees,
  Sprout,
  Bug,
  ClipboardList,
  ArrowRight,
  Package,
  Shield,
  Leaf,
  FlaskConical,
  CalendarDays,
  Droplets,
  TestTubeDiagonal
} from 'lucide-react';
import { NavigationTab } from '../components/layout/Sidebar';

interface DashboardPageProps {
  onTabChange: (tab: NavigationTab) => void;
  onOpenAddFarm: () => void;
  onOpenAddCrop: () => void;
  onOpenAddActivity: () => void;
  onOpenAddInput: () => void;
  onOpenRecordPestObservation: () => void;
  onOpenPesticideAdvisory: () => void;
  onOpenOrganicInputs: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onTabChange,
  onOpenAddFarm: _onOpenAddFarm,
  onOpenAddCrop,
  onOpenAddActivity,
  onOpenAddInput: _onOpenAddInput,
  onOpenRecordPestObservation,
  onOpenPesticideAdvisory,
  onOpenOrganicInputs,
}) => {
  const { profile } = useAuth();
  const {
    farms,
    crops,
    activities,
    inputs,
    organicInputs,
    pestObservations,
    pesticideApplications,
    pestFollowUps,
    soilTests,
    waterTests,
    selectedFarm,
  } = useFarmData();

  const farmFilter = <T extends { farm_id: string }>(items: T[]): T[] =>
    selectedFarm ? items.filter(i => i.farm_id === selectedFarm.id) : items;

  const farmCrops = farmFilter(crops);
  const farmPests = farmFilter(pestObservations);
  const farmApps = farmFilter(pesticideApplications);
  const farmFollowUps = farmFilter(pestFollowUps);

  const activeFarms = farms.filter(f =>
    crops.some(c => c.farm_id === f.id && c.status === 'active') || farms.length <= 3
  );
  const activeCrops = farmCrops.filter(c => c.status === 'active');
  const totalPestObs = farmPests.length;

  const highSeverityPests = farmPests.filter(
    p => p.severity === 'high' || p.severity === 'critical'
  );

  // Scheduled pesticide applications that do NOT yet have an associated pest_follow_up
  const pendingAppFollowups = farmApps.filter(a => {
    if (!a.follow_up_date) return false;
    const hasFollowUp = farmFollowUps.some(f => f.pesticide_application_id === a.id);
    return !hasFollowUp;
  });

  // Recorded follow-ups with unresolved/unknown outcome
  const unresolvedFollowUps = farmFollowUps.filter(f => f.outcome === 'unknown');

  // Open follow-up count (matching Pest & IPM page semantics)
  const openFollowUpsCount = pendingAppFollowups.length + unresolvedFollowUps.length;

  const organicPracticeActivities = activities.filter(a => {
    const t = a.activity_type;
    return (
      t === 'Organic manure' ||
      t === 'Biofertilizer application' ||
      t === 'Mulching'
    );
  });
  const sustainableScore = Math.min(
    Math.round(
      ((organicPracticeActivities.length * 0.6 + organicInputs.length * 0.4) /
        Math.max(activities.length + 1, 5)) *
        100
    ),
    100
  );

  const recentInputs = [...inputs]
    .sort((a, b) => {
      const ad = a.purchase_date ? new Date(a.purchase_date).getTime() : 0;
      const bd = b.purchase_date ? new Date(b.purchase_date).getTime() : 0;
      return bd - ad;
    })
    .slice(0, 3);

  const latestSoil = soilTests[0];
  const latestWater = waterTests[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Farmer Greeting & Context + Flagship Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
              {profile?.farming_type ? `${profile.farming_type} Farming` : 'Sustainable Farm System'}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-100">
              Crop Protection Intelligence
            </span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
              Organic Knowledge Hub
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Welcome back, {profile?.full_name || 'Farmer'}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Your crop protection & organic farming snapshot for{' '}
            <span className="font-semibold text-slate-800">{selectedFarm?.name || 'your farm'}</span>.
            Scout pests, follow IPM advice, and explore source-backed organic inputs.
          </p>
        </div>

        {/* Flagship Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenRecordPestObservation}
            icon={<Bug className="w-4 h-4" />}
          >
            Record Pest Observation
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenPesticideAdvisory}
            icon={<Shield className="w-4 h-4" />}
          >
            Open Pesticide Advisory
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenOrganicInputs}
            icon={<Leaf className="w-4 h-4" />}
          >
            Explore Organic Inputs
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Farms"
          value={activeFarms.length}
          subtext={`${farms.length} total farm records`}
          icon={<Trees className="w-5 h-5" />}
          accentColor="emerald"
        />
        <StatCard
          title="Active Crops"
          value={activeCrops.length}
          subtext={`${crops.length} total crop cycles`}
          icon={<Sprout className="w-5 h-5" />}
          accentColor="blue"
        />
        <StatCard
          title="Pest Observations"
          value={totalPestObs}
          subtext={`${highSeverityPests.length} high/critical severity`}
          icon={<Bug className="w-5 h-5" />}
          accentColor="rose"
        />
        <StatCard
          title="Open Follow-ups"
          value={openFollowUpsCount}
          subtext={`${pendingAppFollowups.length} scheduled treatment follow-ups`}
          icon={<ClipboardList className="w-5 h-5" />}
          accentColor="amber"
        />
      </div>

      {/* Column-based dashboard layout */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3 items-start">
        {/* Column 1 */}
        <div className="flex flex-col gap-5">
          {/* Pest & IPM Attention */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Pest &amp; IPM Attention</h3>
                <p className="text-[11px] text-slate-500">Scouting alerts &amp; follow-up actions</p>
              </div>
            </div>
            <button
              onClick={onOpenPesticideAdvisory}
              className="text-xs font-semibold text-rose-700 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Open Advisory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {highSeverityPests.length === 0 && pendingAppFollowups.length === 0 ? (
            <div className="py-5 text-center rounded-xl bg-rose-50/50 border border-rose-100/70">
              <p className="text-xs font-semibold text-rose-700">No urgent pest alerts</p>
              <p className="text-xs text-slate-500 mt-1">
                Continue routine scouting. Record any new observation immediately.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {highSeverityPests.slice(0, 3).map(p => (
                <li key={p.id} className="flex min-w-0 items-start justify-between gap-2 p-2.5 rounded-xl bg-rose-50/70 border border-rose-100">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 truncate">{p.pest_name}</span>
                      <Badge variant={p.severity === 'critical' ? 'rose' : 'amber'} size="sm">
                        {p.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{p.symptoms}</p>
                  </div>
                </li>
              ))}
              {pendingAppFollowups.slice(0, 2).map(a => (
                <li key={a.id} className="flex min-w-0 items-start justify-between gap-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 truncate">App: {a.product_name}</span>
                      <Badge variant="amber" size="sm">follow-up</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Follow-up date: {a.follow_up_date || 'Not set'}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Recent Farm Activities */}
        <RecentActivitiesFeed
          activities={activities}
          onViewAll={() => onTabChange('activities')}
          onRecordActivity={onOpenAddActivity}
        />

        {/* Soil & Water Tests */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                <TestTubeDiagonal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Soil &amp; Water Tests</h3>
                <p className="text-[11px] text-slate-500">Laboratory reports &amp; analysis</p>
              </div>
            </div>
            <button
              onClick={() => onTabChange('tests')}
              className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
            >
              <span>All Tests</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-3 rounded-xl bg-teal-50/80 border border-teal-100">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">Soil Tests</span>
              </div>
              <p className="text-xl font-extrabold text-teal-900 mt-1">{soilTests.length}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Latest: {latestSoil?.test_date || 'None'}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-100">
              <div className="flex items-center gap-1.5">
                <Droplets className="w-3 h-3 text-blue-700" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">Water Tests</span>
              </div>
              <p className="text-xl font-extrabold text-blue-900 mt-1">{waterTests.length}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Latest: {latestWater?.test_date || 'None'}</p>
            </div>
          </div>

          {soilTests.length === 0 && waterTests.length === 0 ? (
            <div className="py-3 text-center rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-semibold text-slate-600">No lab reports yet</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Upload soil/water tests to receive nutrient recommendations.
              </p>
            </div>
          ) : (
            <button
              onClick={() => onTabChange('tests')}
              className="w-full text-[11px] font-semibold px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-center cursor-pointer transition-colors"
            >
              View Reports &amp; Recommendations →
            </button>
          )}
        </div>
      </div>

        {/* Column 2 */}
        <div className="flex flex-col gap-5">
          {/* Organic Farming Progress */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Leaf className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Organic Farming Progress</h3>
                <p className="text-[11px] text-slate-500">Source-backed inputs &amp; practices</p>
              </div>
            </div>
            <button
              onClick={onOpenOrganicInputs}
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Browse Library</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 font-medium">Sustainable Practice Score</span>
              <span className="font-extrabold text-emerald-800">{sustainableScore}%</span>
            </div>
            <div className="w-full bg-emerald-200/60 rounded-full h-2">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all"
                style={{ width: `${sustainableScore}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-100">
                <div className="flex items-center gap-1">
                  <FlaskConical className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Organic Inputs</span>
                </div>
                <p className="text-lg font-extrabold text-emerald-900 mt-0.5">{organicInputs.length}</p>
                <p className="text-[10px] text-slate-500">curated in library</p>
              </div>
              <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-100">
                <div className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Practice Logs</span>
                </div>
                <p className="text-lg font-extrabold text-emerald-900 mt-0.5">{organicPracticeActivities.length}</p>
                <p className="text-[10px] text-slate-500">organic applications</p>
              </div>
            </div>

            <button
              onClick={() => onOpenAddCrop()}
              className="w-full text-[11px] font-semibold px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-center cursor-pointer transition-colors"
            >
              Add Crop with Organic Practices →
            </button>
          </div>
        </div>

        {/* Recent Farm Inputs */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Recent Farm Inputs</h3>
                <p className="text-[11px] text-slate-500">Fertilizers, pesticides &amp; amendments</p>
              </div>
            </div>
            <button
              onClick={() => onTabChange('inputs')}
              className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <span>All Inputs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentInputs.length === 0 ? (
            <div className="py-5 text-center rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-semibold text-slate-600">No inputs recorded yet</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Record pesticide, fertilizer, or organic-input purchases for traceability.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {recentInputs.map(i => (
                <li key={i.id} className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 truncate">{i.product_name}</span>
                      {i.category && (
                        <Badge variant="indigo" size="sm">{i.category}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                      <CalendarDays className="w-3 h-3" />
                      <span>{i.purchase_date || 'Date TBD'}</span>
                      {i.quantity && (
                        <>
                          <span>•</span>
                          <span>{i.quantity} {i.unit || ''}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {i.supplier_or_source && (
                    <span className="text-[10px] text-slate-500 shrink-0 truncate max-w-[80px]">
                      {i.supplier_or_source}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

        {/* Column 3 */}
        <div className="flex flex-col gap-5">
          {/* Weather Widget */}
          <div className="rounded-2xl border border-white/40 shadow-sm p-3">
            <WeatherWidget farm={selectedFarm} />
          </div>
      </div>
      </div>
    </div>
  );
};
