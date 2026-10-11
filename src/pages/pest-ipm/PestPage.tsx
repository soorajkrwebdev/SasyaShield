import React, { useMemo, useState } from 'react';
import { useFarmData } from '../../contexts/FarmContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { StatCard } from '../../components/common/StatCard';
import { Bug, Plus, ShieldCheck, Trash2, ExternalLink, Info, Leaf, FlaskConical } from 'lucide-react';
import { PestObservationModal } from '../../components/pest-ipm/PestObservationModal';
import { IpmRecordModal } from '../../components/pest-ipm/IpmRecordModal';
import { PesticideApplicationModal } from '../../components/pest-ipm/PesticideApplicationModal';
import { PestFollowUpModal } from '../../components/pest-ipm/PestFollowUpModal';
import {
  AdvisoryLevel,
  AdvisoryVerificationStatus,
  PestAdvisory,
  PestFollowUp,
  PestObservation,
} from '../../types';

type TimelineType = 'observation' | 'ipm' | 'control' | 'application' | 'followup';

interface TimelineEvent {
  date: string;
  type: TimelineType;
  title: string;
  subtitle: string;
}

const IPM_STEPS: { n: number; title: string; level: AdvisoryLevel | null; points: string[] }[] = [
  { n: 1, title: 'STEP 1 — VERIFY', level: null, points: ['Confirm symptoms on multiple plants and blocks.', 'Note field conditions: rain, drainage, shade, recent inputs.'] },
  { n: 2, title: 'STEP 2 — MONITOR', level: null, points: ['Record severity and affected area percent.', 'Re-scout every 3–7 days during risk periods.'] },
  { n: 3, title: 'STEP 3 — PREVENTION', level: 'prevention', points: ['Crop hygiene and sanitation; remove infested debris.', 'Resistant varieties where source-backed; proper spacing.', 'Soil health, drainage, balanced nutrition.'] },
  { n: 4, title: 'STEP 4 — CULTURAL CONTROL', level: 'cultural', points: ['Adjust sowing time, spacing, irrigation and drainage.', 'Intercropping and rotation to break pest cycles.'] },
  { n: 5, title: 'STEP 5 — MECHANICAL/PHYSICAL CONTROL', level: 'mechanical', points: ['Hand-picking, pruning, traps and barriers.', 'Light traps and sticky traps for monitoring.'] },
  { n: 6, title: 'STEP 6 — BIOLOGICAL CONTROL', level: 'biological', points: ['Conserve natural enemies; avoid broad-spectrum harm.', 'Trichoderma, Pseudomonas, Metarhizium where suitable.'] },
  { n: 7, title: 'STEP 7 — BOTANICAL OPTIONS', level: 'botanical', points: ['Neem seed kernel extract and neem oil preparations.', 'Plant-extract repellents as first spray option.'] },
  { n: 8, title: 'STEP 8 — CHEMICAL CONTROL (LAST RESORT)', level: 'chemical', points: ['Only if justified and source-backed at recommended doses.', 'Strictly follow label and extension guidance.'] },
  { n: 9, title: 'STEP 9 — FOLLOW-UP', level: null, points: ['Record outcome after treatment.', 'Re-assess severity and affected area.'] },
];

function verificationBadgeVariant(status: AdvisoryVerificationStatus): 'emerald' | 'slate' | 'rose' | 'amber' {
  switch (status) {
    case 'Non-chemical IPM Practice': return 'emerald';
    case 'General Agricultural Information': return 'slate';
    case 'Registered Use (Crop/Pest)': return 'rose';
    case 'Registered Formulation': return 'amber';
    case 'Unverified / For Review': return 'slate';
    default: return 'slate';
  }
}

export interface PestPageProps {
  onNavigateToOrganic?: () => void;
}

export const PestPage: React.FC<PestPageProps> = ({ onNavigateToOrganic }) => {
  const {
    farms, crops, pestObservations, ipmRecords, pesticideApplications,
    pesticideAdvisories, pestFollowUps, organicInputs,
    deletePestObservation, deleteIPMRecord,
  } = useFarmData();
  const [searchQuery, setSearchQuery] = useState('');
  const [cropFilter, setCropFilter] = useState('All');
  const [pestFilter, setPestFilter] = useState('All');
  const [controlFilter, setControlFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [isObsModalOpen, setIsObsModalOpen] = useState(false);
  const [isIpmModalOpen, setIsIpmModalOpen] = useState(false);
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [selectedObs, setSelectedObs] = useState<PestObservation | null>(null);
  const [preselectedLevel, setPreselectedLevel] = useState<AdvisoryLevel>('prevention');
  const [openStep, setOpenStep] = useState<number | null>(3);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const highSeverity = pestObservations.filter(o => o.severity === 'high' || o.severity === 'critical').length;
  // Scheduled pesticide applications that do NOT yet have an associated pest_follow_up
  const pendingAppFollowUps = pesticideApplications.filter(a => {
    if (!a.follow_up_date) return false;
    return !pestFollowUps.some(f => f.pesticide_application_id === a.id);
  });
  // Recorded follow-ups with unresolved/unknown outcome
  const unresolvedFollowUps = pestFollowUps.filter((f: PestFollowUp) => f.outcome === 'unknown');
  // Total open follow-ups
  const openFollowUps = pendingAppFollowUps.length + unresolvedFollowUps.length;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentApps = pesticideApplications.filter(a => new Date(a.application_date) >= sixMonthsAgo).length;

  const cropOptions = useMemo(() => ['All', ...Array.from(new Set(pesticideAdvisories.map(a => a.crop))).sort()], [pesticideAdvisories]);
  const pestOptionsForCrop = useMemo(() => {
    const rows = cropFilter === 'All' ? pesticideAdvisories : pesticideAdvisories.filter(a => a.crop === cropFilter);
    return ['All', ...Array.from(new Set(rows.map(a => a.pest_or_disease))).sort()];
  }, [pesticideAdvisories, cropFilter]);
  const controlOptions = ['All', 'prevention', 'cultural', 'mechanical', 'biological', 'botanical', 'chemical'];

  const filteredObservations = pestObservations
    .filter(o => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || o.pest_name.toLowerCase().includes(q) || o.symptoms.toLowerCase().includes(q);
      const matchesSeverity = severityFilter === 'all' || o.severity === severityFilter;
      return matchesSearch && matchesSeverity;
    })
    .sort((a, b) => new Date(b.observation_date).getTime() - new Date(a.observation_date).getTime());

  const filteredAdvisories = pesticideAdvisories.filter((a: PestAdvisory) => {
    if (cropFilter !== 'All' && a.crop !== cropFilter) return false;
    if (pestFilter !== 'All' && a.pest_or_disease !== pestFilter) return false;
    if (controlFilter !== 'All' && a.control_category !== controlFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return a.crop.toLowerCase().includes(q) || a.pest_or_disease.toLowerCase().includes(q) || a.recommendation.toLowerCase().includes(q);
    }
    return true;
  });

  const timeline: TimelineEvent[] = useMemo(() => {
    const obsEvents: TimelineEvent[] = pestObservations.map(o => ({
      date: o.observation_date, type: 'observation' as TimelineType,
      title: `Observation — ${o.pest_name}`, subtitle: `${o.severity} severity • ${o.affected_area_percent}% affected`,
    }));
    const ipmEvents: TimelineEvent[] = ipmRecords.map(r => ({
      date: r.created_at ? r.created_at.split('T')[0] : '', type: 'ipm' as TimelineType,
      title: `IPM Decision — ${r.advisory_level}`, subtitle: r.pest_name,
    }));
    const controlEvents: TimelineEvent[] = ipmRecords
      .filter(r => r.advisory_level === 'cultural' || r.advisory_level === 'mechanical' || r.advisory_level === 'biological' || r.advisory_level === 'botanical')
      .map(r => ({
        date: r.created_at ? r.created_at.split('T')[0] : '', type: 'control' as TimelineType,
        title: `Control method — ${r.advisory_level}`, subtitle: r.recommendation.slice(0, 80),
      }));
    const appEvents: TimelineEvent[] = pesticideApplications.map(a => ({
      date: a.application_date, type: 'application' as TimelineType,
      title: `Treatment — ${a.product_name}`, subtitle: `${a.quantity} ${a.unit} • ${a.application_method}`,
    }));
    const followEvents: TimelineEvent[] = pestFollowUps.map(f => ({
      date: f.follow_up_date, type: 'followup' as TimelineType,
      title: `Follow-up — ${f.outcome}`, subtitle: `Severity after: ${f.severity_after_treatment}`,
    }));
    return [...obsEvents, ...ipmEvents, ...controlEvents, ...appEvents, ...followEvents]
      .filter(e => e.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [pestObservations, ipmRecords, pesticideApplications, pestFollowUps]);

  const latestThree = filteredObservations.slice(0, 3);
  const relatedOrganic = (level: AdvisoryLevel): string[] => {
    if (level !== 'biological' && level !== 'botanical') return [];
    const needles = level === 'biological'
      ? ['trichoderma', 'pseudomonas', 'metarhizium']
      : ['neem', 'nske', 'neem oil', 'plant extract'];
    return organicInputs
      .filter(o => needles.some(n => o.name.toLowerCase().includes(n)))
      .map(o => `${o.name} — ${o.organic_relevance || o.category}`)
      .slice(0, 3);
  };
  const openLogLevel = (level: AdvisoryLevel) => {
    setPreselectedLevel(level);
    setSelectedObs(filteredObservations[0] || null);
    setIsIpmModalOpen(true);
  };
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full mb-1">
            <Bug className="w-3.5 h-3.5 text-emerald-700" />
            <span>Integrated Pest Management (IPM) — Primary Intelligence Module</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Pest Monitoring &amp; IPM Advisory</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Prevent → Monitor → Identify → Assess → Non-chemical → Biological → Botanical → Chemical (last resort) → Follow-up → Evaluate.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="md" icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />} onClick={() => { setSelectedObs(null); setPreselectedLevel('prevention'); setIsIpmModalOpen(true); }}>Record IPM Action</Button>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setIsObsModalOpen(true)}>Record Observation</Button>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto bg-white border border-slate-200/80 rounded-2xl p-2 text-xs font-bold text-slate-600" aria-label="IPM sections">
        <button className="px-3 py-1.5 rounded-xl hover:bg-slate-50 cursor-pointer whitespace-nowrap" onClick={() => scrollTo('overview')}>Overview</button>
        <button className="px-3 py-1.5 rounded-xl hover:bg-slate-50 cursor-pointer whitespace-nowrap" onClick={() => scrollTo('record-observation')}>Record</button>
        <button className="px-3 py-1.5 rounded-xl hover:bg-slate-50 cursor-pointer whitespace-nowrap" onClick={() => scrollTo('pest-history')}>History</button>
        <button className="px-3 py-1.5 rounded-xl hover:bg-slate-50 cursor-pointer whitespace-nowrap" onClick={() => scrollTo('ipm-workflow')}>IPM Workflow</button>
        <button className="px-3 py-1.5 rounded-xl hover:bg-slate-50 cursor-pointer whitespace-nowrap" onClick={() => scrollTo('advisory')}>Advisory</button>
        <button className="px-3 py-1.5 rounded-xl hover:bg-slate-50 cursor-pointer whitespace-nowrap" onClick={() => scrollTo('application-records')}>Applications</button>
        <button className="px-3 py-1.5 rounded-xl hover:bg-slate-50 cursor-pointer whitespace-nowrap" onClick={() => scrollTo('follow-up-outcome')}>Follow-up</button>
      </nav>

      <section id="overview" className="space-y-4">
        <h2 className="text-lg font-extrabold text-slate-900">A. Crop/Pest Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Active Observations" value={pestObservations.length} subtext={`${farms.length} farms • ${crops.length} crops`} icon={<Bug className="w-5 h-5" />} accentColor="emerald" />
          <StatCard title="High / Critical Severity" value={highSeverity} subtext="Needs close monitoring" icon={<ShieldCheck className="w-5 h-5" />} accentColor="rose" />
          <StatCard title="Open Follow-ups" value={openFollowUps} subtext="Unknown outcomes + pending dates" icon={<Info className="w-5 h-5" />} accentColor="amber" />
          <StatCard title="Applications (6 months)" value={recentApps} subtext="Recorded on-farm treatments" icon={<FlaskConical className="w-5 h-5" />} accentColor="indigo" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="primary" size="sm" onClick={() => scrollTo('record-observation')}>Record Observation</Button>
          <Button variant="outline" size="sm" onClick={() => scrollTo('advisory')}>Open Pesticide Advisory</Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Leaf className="w-4 h-4 text-emerald-600" />}
            onClick={() => {
              if (onNavigateToOrganic) {
                onNavigateToOrganic();
              }
              window.scrollTo({ top: 0 });
            }}
          >
            Explore Organic Inputs
          </Button>
        </div>
      </section>

      <section id="record-observation" className="space-y-3">
        <h2 className="text-lg font-extrabold text-slate-900">B. Record Observation</h2>
        <p className="text-xs text-slate-500">Possible causes are listed as suspected pest/disease with confidence and source — field notes are not a laboratory diagnosis.</p>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setIsObsModalOpen(true)}>Record New Observation</Button>
        </div>
        {latestThree.length === 0 ? (
          <EmptyState icon={<Bug className="w-8 h-8" />} title="No pest observations found" description="Record your first field scouting observation to track symptoms, severity and treatments." actionText="Record First Observation" onAction={() => setIsObsModalOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {latestThree.map((o) => (
              <div key={o.id} className="bg-white rounded-2xl border border-slate-200/80 p-4">
                <p className="text-[10px] font-bold text-emerald-800 bg-emerald-50 inline-block px-2 py-0.5 rounded-full">
                  {o.farm_name || 'Farm'}{o.crop_name ? ' - ' + o.crop_name : ''}
                </p>
                <h3 className="font-bold text-sm text-slate-900 mt-1">
                  {o.pest_name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {o.symptoms}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
      <section id="pest-history" className="space-y-3">
        <h2 className="text-lg font-extrabold text-slate-900">C. My Pest History</h2>
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row gap-3">
          <input type="text" placeholder="Search observations by pest, disease or symptoms..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-3 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none" />
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-white text-slate-700">
            <option value="all">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        {timeline.length === 0 ? (
          <EmptyState icon={<Bug className="w-8 h-8" />} title="No crop-protection history yet" description="Observations, decisions, treatments and follow-ups will appear here as a timeline." actionText="Record Observation" onAction={() => setIsObsModalOpen(true)} />
        ) : (
          <ol className="relative border-l-2 border-emerald-100 ml-2 space-y-3">
            {timeline.map((e, i) => (
              <li key={`${e.type}-${i}`} className="ml-4 bg-white rounded-2xl border border-slate-200/80 p-3">
                <p className="text-[10px] font-bold text-slate-400">{e.date} • {e.type}</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">{e.title}</p>
                <p className="text-[11px] text-slate-500">{e.subtitle}</p>
              </li>
            ))}
          </ol>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredObservations.map(obs => (
            <div key={obs.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 relative">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">{obs.farm_name || 'Farm'}</span>
                  {obs.crop_name && (<span className="text-[10px] font-medium text-slate-500"> • {obs.crop_name}</span>)}
                  <h3 className="font-bold text-base text-slate-900 mt-1">{obs.pest_name}</h3>
                  <p className="text-[11px] text-slate-400 capitalize">{obs.pest_type} • {obs.growth_stage || 'Stage not recorded'} • {obs.observation_date}</p>
                </div>
                <button onClick={() => deletePestObservation(obs.id)} title="Delete observation" className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"><Trash2 className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-slate-600 mt-2">Possible causes: suspected {obs.pest_name} ({obs.pest_type}). {obs.symptoms}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Severity: <strong className="text-slate-700">{obs.severity}</strong> • Affected: <strong className="text-slate-700">{obs.affected_area_percent}%</strong></span>
                <Button variant="outline" size="sm" onClick={() => { setSelectedObs(obs); setPreselectedLevel('prevention'); setIsIpmModalOpen(true); }}>Log IPM Action</Button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section id="ipm-workflow" className="space-y-3">
        <h2 className="text-lg font-extrabold text-slate-900">D. IPM Decision Workflow</h2>
        <p className="text-xs text-slate-500">Non-chemical options come first. Chemical control is the last resort, only when justified and source-backed.</p>
        <div className="space-y-2">
          {IPM_STEPS.map(step => (
            <div key={step.n} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
              <button onClick={() => setOpenStep(openStep === step.n ? null : step.n)} className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer">
                <span className="text-xs font-extrabold text-slate-900">{step.title}</span>
                <span className="text-[11px] text-slate-400">{openStep === step.n ? 'Hide' : 'Show'}</span>
              </button>
              {openStep === step.n && (
                <div className="px-4 pb-4">
                  <ul className="list-disc ml-5 text-xs text-slate-600 space-y-1">
                    {step.points.map((p, i) => (<li key={i}>{p}</li>))}
                  </ul>
                  {step.level && step.n >= 3 && step.n <= 7 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openLogLevel(step.level as AdvisoryLevel)}>Log this IPM level</Button>
                      {(step.level === 'biological' || step.level === 'botanical') && relatedOrganic(step.level).map((chip, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            if (onNavigateToOrganic) {
                              onNavigateToOrganic();
                            }
                          }}
                          className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 px-2.5 py-1 rounded-full cursor-pointer transition-colors"
                          title="View in Organic Inputs"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                  {step.level === 'chemical' && (
                    <div className="mt-3 space-y-2">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">Use only according to the applicable registered label and official agricultural guidance. This platform does not replace product labels, qualified agricultural advice, or regulatory requirements.</div>
                      <Button variant="outline" size="sm" onClick={() => openLogLevel('chemical')}>Log this IPM level</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>


      <section id="ipm-records" className="space-y-3">
        <h2 className="text-lg font-extrabold text-slate-900">D2. Logged IPM Decisions</h2>
        <p className="text-xs text-slate-500">Your recorded decisions with the level applied (non-chemical first), rationale and source consulted.</p>
        {ipmRecords.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="w-8 h-8" />} title="No IPM records logged yet" description="Log cultural, mechanical, biological, or botanical pest management decisions." actionText="Record First IPM Action" onAction={() => { setSelectedObs(null); setPreselectedLevel('prevention'); setIsIpmModalOpen(true); }} />
        ) : (
          <div className="space-y-3">
            {ipmRecords.map(record => (
              <div key={record.id} className="bg-white rounded-2xl border border-slate-200/80 p-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">{record.advisory_level}</span>
                    <span className="text-xs font-bold text-slate-800">Target: {record.pest_name}</span>
                  </div>
                  <button onClick={() => deleteIPMRecord(record.id)} title="Delete IPM record" className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                </div>
                <p className="text-xs font-semibold text-slate-900 mt-1">{record.recommendation}</p>
                <p className="text-xs text-slate-500 mt-1"><span className="font-medium text-slate-600">Rationale: </span>{record.rationale}</p>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Source: {record.source_name}</span>
                  <span>Logged on: {record.created_at?.split('T')[0]}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section id="advisory" className="space-y-3">
        <h2 className="text-lg font-extrabold text-slate-900">E. Pesticide Advisory</h2>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Use only according to the applicable registered label and official agricultural guidance. This platform does not replace product labels, qualified agricultural advice, or regulatory requirements.</span>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Crop</label>
            <select value={cropFilter} onChange={e => { setCropFilter(e.target.value); setPestFilter('All'); }} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white">
              {cropOptions.map(c => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Pest/Disease</label>
            <select value={pestFilter} onChange={e => setPestFilter(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white">
              {pestOptionsForCrop.map(p => (<option key={p} value={p}>{p}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Control method</label>
            <select value={controlFilter} onChange={e => setControlFilter(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white">
              {controlOptions.map(c => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAdvisories.map((adv) => {
            const chemIncomplete = adv.control_category === 'chemical' && (!adv.application_information || adv.phi_days == null || adv.rei_hours == null);
            return (
              <div key={adv.id} className="bg-white rounded-2xl border border-slate-200/80 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">{adv.crop}</span>
                    <h3 className="font-bold text-base text-slate-900 mt-1.5">{adv.pest_or_disease}</h3>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={adv.control_category === 'biological' ? 'emerald' : adv.control_category === 'chemical' ? 'amber' : adv.control_category === 'botanical' ? 'indigo' : 'slate'}>{adv.control_category || 'Advisory'}</Badge>
                    <Badge variant={verificationBadgeVariant(adv.verification_status)}>{adv.verification_status}</Badge>
                  </div>
                </div>
                <p className="text-xs text-slate-700 mt-3 leading-relaxed">{adv.recommendation}</p>
                {adv.control_category === 'chemical' && chemIncomplete && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Verified chemical application information is not available in the current knowledge base.</span>
                  </div>
                )}
                {adv.control_category === 'chemical' && !chemIncomplete && adv.application_information && (
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                    <strong className="text-slate-800">Application: </strong>{adv.application_information}
                    {adv.phi_days != null && (<span> • PHI: {adv.phi_days} days</span>)}
                    {adv.rei_hours != null && (<span> • REI: {adv.rei_hours} hours</span>)}
                  </div>
                )}
                {adv.safety_information && (
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                    <strong className="text-slate-800">Safety and Environmental Precautions: </strong>{adv.safety_information}
                  </div>
                )}
                <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-500 space-y-1">
                  <p>Source: <strong>{adv.source_name}</strong></p>
                  <p>Document: <strong>{adv.source_document_title || adv.source_reference || 'Not specified'}</strong></p>
                  <p>Last verified: <strong>{adv.last_verified || 'Not verified'}</strong></p>
                  <p>Verification: <strong>{adv.verification_status}</strong></p>
                  {adv.source_url ? (
                    <a href={adv.source_url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1">
                      Open source (external) <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span>Direct internal document reference only — no URL available</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section id="application-records" className="space-y-3">
        <h2 className="text-lg font-extrabold text-slate-900">F. Pesticide Application Records</h2>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => { setSelectedObs(null); setIsAppModalOpen(true); }}>Record pesticide application</Button>
        </div>
        {pesticideApplications.length === 0 ? (
          <EmptyState icon={<FlaskConical className="w-8 h-8" />} title="No application records yet" description="Record what was actually applied on the farm. Records are distinct from advisory knowledge." actionText="Record Application" onAction={() => setIsAppModalOpen(true)} />
        ) : (
          <div className="space-y-3">
            {pesticideApplications.map(a => (
              <div key={a.id} className="bg-white rounded-2xl border border-slate-200/80 p-5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="slate">APPLICATION RECORD</Badge>
                    {a.source_reference && (<Badge variant="emerald">Source: {a.source_reference}</Badge>)}
                  </div>
                  <span className="text-[10px] text-slate-400">{a.application_date} • {a.farm_name}{a.crop_name ? ` • ${a.crop_name}` : ''}</span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 mt-2">{a.product_name}{a.active_ingredient ? ` (${a.active_ingredient})` : ''}</h3>
                <p className="text-[11px] text-slate-500 mt-1">{a.quantity} {a.unit} over {a.area} {a.area_unit} • {a.application_method}</p>
                <p className="text-[11px] text-slate-500 mt-1">PHI: {a.pre_harvest_interval_days != null ? `${a.pre_harvest_interval_days} days` : 'PHI not verified'} • REI: {a.re_entry_interval_hours != null ? `${a.re_entry_interval_hours} hours` : 'REI not verified'}</p>
                {a.notes && (<p className="text-xs text-slate-600 mt-1">{a.notes}</p>)}
              </div>
            ))}
          </div>
        )}
      </section>

      <section id="follow-up-outcome" className="space-y-3">
        <h2 className="text-lg font-extrabold text-slate-900">G. Follow-up &amp; Outcome</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setIsFollowUpModalOpen(true)}>Log follow-up</Button>
        </div>
        {pestFollowUps.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="w-8 h-8" />} title="No follow-up records yet" description="Log post-treatment severity, affected area and outcome for each observation." actionText="Log First Follow-up" onAction={() => setIsFollowUpModalOpen(true)} />
        ) : (
          <div className="space-y-3">
            {pestFollowUps.map(f => (
              <div key={f.id} className="bg-white rounded-2xl border border-slate-200/80 p-5">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={f.outcome === 'improved' ? 'emerald' : f.outcome === 'worsened' ? 'rose' : f.outcome === 'unchanged' ? 'amber' : 'slate'}>{f.outcome}</Badge>
                  <span className="text-[10px] text-slate-400">{f.follow_up_date} • {f.farm_name}{f.crop_name ? ` • ${f.crop_name}` : ''}</span>
                </div>
                <p className="text-xs text-slate-600 mt-2">Severity after treatment: <strong>{f.severity_after_treatment}</strong>{f.affected_area_after_percent != null ? ` • Area after: ${f.affected_area_after_percent}%` : ''}</p>
                {f.notes && (<p className="text-xs text-slate-500 mt-1">{f.notes}</p>)}
              </div>
            ))}
          </div>
        )}
      </section>

      <PestObservationModal isOpen={isObsModalOpen} onClose={() => setIsObsModalOpen(false)} />
      <IpmRecordModal isOpen={isIpmModalOpen} onClose={() => { setIsIpmModalOpen(false); setSelectedObs(null); }} selectedObservation={selectedObs} defaultLevel={preselectedLevel} defaultPestName={selectedObs?.pest_name} />
      <PesticideApplicationModal isOpen={isAppModalOpen} onClose={() => { setIsAppModalOpen(false); setSelectedObs(null); }} preselectedObservation={selectedObs} />
      <PestFollowUpModal isOpen={isFollowUpModalOpen} onClose={() => setIsFollowUpModalOpen(false)} preselectedObservationId={selectedObs?.id} />
    </div>
  );
};
