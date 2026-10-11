import React, { useState } from 'react';
import {
  Leaf,
  ShieldCheck,
  CloudSun,
  TrendingUp,
  Briefcase,
  BookOpen,
  ArrowRight,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/common/Button';

interface LandingPageProps {
  onGoToAuth: (mode: 'login' | 'register') => void;
  onExploreDemo?: () => void;
  onBrowseJobs?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToAuth,
  onBrowseJobs,
}) => {
  const [activeTab, setActiveTab] = useState<'organic' | 'ipm' | 'weather' | 'market' | 'work' | 'knowledge'>('organic');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-white shadow-sm shadow-emerald-700/20">
              <Leaf className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg font-heading">SmartFarm</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase tracking-wider">2.0</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Sustainable Agriculture Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {onBrowseJobs && (
              <button
                type="button"
                onClick={onBrowseJobs}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200/60 px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Browse Farm Jobs</span>
              </button>
            )}
            <button
              onClick={() => onGoToAuth('login')}
              className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-emerald-700 px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Farmer Login
            </button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onGoToAuth('register')}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Create Farmer Account
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 bg-gradient-to-b from-emerald-50/60 via-slate-50 to-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200/60 text-emerald-800 text-xs font-bold mb-6 animate-in fade-in">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <span>Digital Farm Management & Sustainable Agriculture Intelligence Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight font-heading max-w-4xl mx-auto leading-[1.15]">
            Smart Digital Management for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 to-teal-600">
              Sustainable Farming
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
            A modern platform to manage farms, crops, sustainable practices, IPM pest management, farm intelligence, hyperlocal weather and verified market information.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onGoToAuth('register')}
              className="w-full sm:w-auto shadow-md shadow-emerald-600/25"
            >
              Create Farmer Account
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => onGoToAuth('login')}
              className="w-full sm:w-auto border-emerald-600/30 text-emerald-800 hover:bg-emerald-50"
            >
              Sign In to SmartFarm
            </Button>
            {onBrowseJobs && (
              <Button
                variant="outline"
                size="lg"
                onClick={onBrowseJobs}
                className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-50"
                icon={<Briefcase className="w-4 h-4 text-emerald-600" />}
              >
                Browse Farm Jobs
              </Button>
            )}
          </div>

          {/* Quick value badges */}
          <div className="mt-12 pt-8 border-t border-slate-200/60 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" /> Multi-Farm & Crop Lifecycles
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" /> IPM Decision Support
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" /> 100% Authoritative Agricultural Data
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" /> No E-Commerce / No Selling
            </span>
          </div>
        </div>
      </section>

      {/* Public Interactive Intelligence Showcase */}
      <section className="py-16 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
              Open Agricultural Knowledge & Intelligence
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Farmers and agronomists can freely browse verified technical information without barriers.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4 no-scrollbar">
            {[
              { id: 'organic', label: 'Organic Practices', icon: <Leaf className="w-4 h-4" /> },
              { id: 'ipm', label: 'IPM & Pest Decisions', icon: <ShieldCheck className="w-4 h-4" /> },
              { id: 'weather', label: 'Hyperlocal Weather', icon: <CloudSun className="w-4 h-4" /> },
              { id: 'market', label: 'Market Intelligence', icon: <TrendingUp className="w-4 h-4" /> },
              { id: 'work', label: 'Farm Work Opportunities', icon: <Briefcase className="w-4 h-4" /> },
              { id: 'knowledge', label: 'Authoritative Sources', icon: <BookOpen className="w-4 h-4" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content Display */}
          <div className="mt-8 bg-slate-50 rounded-3xl border border-slate-200/80 p-6 sm:p-10">
            {activeTab === 'organic' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-white border border-slate-200/70">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">Composting</span>
                  <h4 className="text-base font-bold text-slate-900 mt-2 mb-1">Vermicompost & FYM</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Recycle farm residues, animal manure, and biomass into humus-rich soil amendments. Increases water holding capacity and microbial density.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200/70">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">Bio-Inputs</span>
                  <h4 className="text-base font-bold text-slate-900 mt-2 mb-1">Microbial Consortium</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Azospirillum, Rhizobium, and Phosphate Solubilizing Bacteria (PSB) that biologically fix atmospheric nitrogen and mobilize fixed soil phosphorus.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200/70">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">Soil Health</span>
                  <h4 className="text-base font-bold text-slate-900 mt-2 mb-1">Green Manuring & Mulch</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Cover crops like Sunn hemp and Sesbania incorporated at 45 days. Mulching with dry biomass reduces soil temperature and controls weed seed emergence.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'ipm' && (
              <div className="space-y-4">
                <div className="p-5 bg-white rounded-2xl border border-slate-200/70">
                  <h4 className="text-base font-bold text-slate-900 mb-2">Integrated Pest Management (IPM) Workflow</h4>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    The platform enforces a graduated decision hierarchy rather than jumping directly to synthetic chemical inputs:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                      <span className="font-bold block mb-1">1. Cultural & Mechanical</span>
                      Sticky yellow traps, light traps, bird perches, field sanitation.
                    </div>
                    <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900">
                      <span className="font-bold block mb-1">2. Biological Controls</span>
                      Trichoderma, Pseudomonas fluorescens, Beauveria bassiana.
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                      <span className="font-bold block mb-1">3. Botanical Extracts</span>
                      Neem seed kernel extract (NSKE 5%), Dasaparni Kashayam.
                    </div>
                    <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-800">
                      <span className="font-bold block mb-1">4. Chemical (Last Resort)</span>
                      Strict compliance with CIBRC label claims and Pre-Harvest Intervals (PHI).
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'weather' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div>
                  <h4 className="text-base font-bold text-slate-900 mb-2">Open-Meteo Hyperlocal Integration</h4>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    Every registered farm automatically receives weather metrics grounded in its GPS latitude and longitude:
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1.5">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Temperature, humidity, wind velocity and precipitation
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> 5-day precipitation probability forecast
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Spraying and irrigation agronomic advisories
                    </li>
                  </ul>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-3 text-xs">
                    <span className="font-bold text-slate-800">Live Agricultural Preview</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">28°C • Partly Cloudy</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="block text-[10px] text-slate-400">Rain Prob.</span>
                      <span className="font-bold text-slate-800">20%</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="block text-[10px] text-slate-400">Humidity</span>
                      <span className="font-bold text-slate-800">76%</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="block text-[10px] text-slate-400">Wind</span>
                      <span className="font-bold text-slate-800">9 km/h</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'market' && (
              <div className="text-left">
                <h4 className="text-base font-bold text-slate-900 mb-2">AGMARKNET & Mandi Price Tracking</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Visualizes transparent minimum, maximum, and modal wholesale agricultural prices across APMC mandis.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Arecanut (Rashi)</span>
                    <p className="font-bold text-slate-900 text-sm mt-1">₹48,500 / quintal</p>
                    <span className="text-[10px] text-emerald-600 font-semibold">Shimoga APMC</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Black Pepper (Garbled)</span>
                    <p className="font-bold text-slate-900 text-sm mt-1">₹62,000 / quintal</p>
                    <span className="text-[10px] text-emerald-600 font-semibold">Kochi Terminal</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Paddy (Gandhasale)</span>
                    <p className="font-bold text-slate-900 text-sm mt-1">₹4,200 / quintal</p>
                    <span className="text-[10px] text-emerald-600 font-semibold">Wayanad Market</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'work' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <h4 className="text-base font-bold text-slate-900">Public Farm Work Board</h4>
                  {onBrowseJobs && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onBrowseJobs}
                      icon={<Briefcase className="w-3.5 h-3.5 text-emerald-600" />}
                      className="self-start sm:self-auto border-emerald-600/30 text-emerald-800 hover:bg-emerald-50"
                    >
                      Browse Live Jobs
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Farmers can post agricultural labor needs (pruning, harvesting, weeding, organic input preparation) without requiring worker account registration.
                </p>
                <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">Areca Harvesting & De-husking</span>
                    <p className="text-xs font-bold text-slate-800 mt-1">Thirthahalli, Karnataka • 4 Workers Needed</p>
                    <p className="text-xs text-slate-500">Wage: ₹850/day with farm-cooked meals provided</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400">Public Contact Listed</span>
                    {onBrowseJobs && (
                      <button
                        type="button"
                        onClick={onBrowseJobs}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                      >
                        View Board &rarr;
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'knowledge' && (
              <div>
                <h4 className="text-base font-bold text-slate-900 mb-2">Authoritative Agricultural Sources</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Strictly grounded in verified research bodies. The platform explicitly forbids AI hallucinated chemical dosages or fake facts.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 font-semibold text-slate-800">
                    ICAR Institutes
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 font-semibold text-slate-800">
                    APEDA / NPOP
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 font-semibold text-slate-800">
                    State Agri Universities (SAUs)
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 font-semibold text-slate-800">
                    CIBRC Guidelines
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-slate-900 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-500" />
            <span className="text-white font-bold">SmartFarm 2.0</span>
            <span>— Sustainable Agriculture Intelligence</span>
          </div>
          <p className="text-slate-500 text-center sm:text-right">
            Authoritative knowledge • Multi-farm lifecycle tracking • Non-commercial
          </p>
        </div>
      </footer>
    </div>
  );
};
