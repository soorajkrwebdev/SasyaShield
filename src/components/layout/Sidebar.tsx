import React from 'react';
import {
  LayoutDashboard,
  Trees,
  Sprout,
  ClipboardList,
  Package,
  Leaf,
  Bug,
  Shield,
  FlaskConical,
  TestTube,
  Recycle,
  CloudSun,
  TrendingUp,
  BarChart3,
  Bot,
  BookOpen,
  FileText,
  Bell,
  Briefcase,
  LogOut,
  Sparkles,
  IndianRupee,
  Wheat,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../common/Badge';

export type NavigationTab = 
  | 'dashboard'
  | 'farms'
  | 'crops'
  | 'activities'
  | 'inputs'
  | 'organic'
  | 'pest-ipm'
  | 'tests'
  | 'waste'
  | 'sustainability'
  | 'farm-work'
  | 'weather'
  | 'market'
  | 'expenses'
  | 'harvests'
  | 'analytics'
  | 'farm-ai'
  | 'knowledge'
  | 'reports'
  | 'notifications'
  | 'profile';

interface SidebarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  subItem?: boolean;
  /** Render an inline "BETA" chip right after the label (experimental feature). */
  beta?: boolean;
}

type SectionAccent = 'default' | 'crop-protection' | 'organic';

interface NavSection {
  heading: string;
  headingAccent?: SectionAccent;
  headingEmoji?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    heading: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    ],
  },
  {
    heading: 'Farm Management',
    items: [
      { id: 'farms', label: 'My Farms', icon: <Trees className="w-4 h-4" /> },
      { id: 'crops', label: 'Crops', icon: <Sprout className="w-4 h-4" /> },
      { id: 'activities', label: 'Activities', icon: <ClipboardList className="w-4 h-4" /> },
      { id: 'inputs', label: 'Inputs', icon: <Package className="w-4 h-4" /> },
      { id: 'expenses', label: 'Expenses', icon: <IndianRupee className="w-4 h-4" /> },
      { id: 'harvests', label: 'Harvests', icon: <Wheat className="w-4 h-4" /> },
    ],
  },
  {
    heading: 'Crop Protection',
    headingAccent: 'crop-protection',
    headingEmoji: '🐛',
    items: [
      { id: 'pest-ipm', label: 'Pest & Disease Monitoring', icon: <Bug className="w-4 h-4" />, subItem: true },
      { id: 'pest-ipm', label: 'IPM & Pesticide Advisory', icon: <Shield className="w-4 h-4" />, subItem: true },
    ],
  },
  {
    heading: 'Organic Farming',
    headingAccent: 'organic',
    headingEmoji: '🌿',
    items: [
      { id: 'organic', label: 'Organic Farming', icon: <Leaf className="w-4 h-4" />, subItem: true },
      { id: 'organic', label: 'Organic Input Library', icon: <FlaskConical className="w-4 h-4" />, subItem: true },
    ],
  },
  {
    heading: 'Farm Intelligence',
    items: [
      { id: 'tests', label: 'Soil & Water', icon: <TestTube className="w-4 h-4" /> },
      { id: 'weather', label: 'Weather', icon: <CloudSun className="w-4 h-4" /> },
      { id: 'market', label: 'Market Prices', icon: <TrendingUp className="w-4 h-4" />, beta: true },
      { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    ],
  },
  {
    heading: 'Sustainability',
    items: [
      { id: 'waste', label: 'Waste & Compost', icon: <Recycle className="w-4 h-4" /> },
      { id: 'sustainability', label: 'Sustainability', icon: <Sparkles className="w-4 h-4" /> },
    ],
  },
  {
    heading: 'Tools',
    items: [
      { id: 'farm-ai', label: 'Farm AI', icon: <Bot className="w-4 h-4" /> },
      { id: 'knowledge', label: 'Knowledge Hub', icon: <BookOpen className="w-4 h-4" /> },
      { id: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
      { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    ],
  },
  {
    heading: 'Public',
    items: [
      { id: 'farm-work', label: 'Farm Work Board', icon: <Briefcase className="w-4 h-4" /> },
    ],
  },
];

function sectionAccentClass(accent?: SectionAccent) {
  switch (accent) {
    case 'crop-protection':
      return 'bg-rose-50 text-rose-800 border border-rose-200/70';
    case 'organic':
      return 'bg-emerald-50 text-emerald-800 border border-emerald-200/70';
    default:
      return 'text-slate-400';
  }
}

function itemActiveColor(id: NavigationTab) {
  if (id === 'pest-ipm') return 'bg-rose-600 text-white shadow-xs shadow-rose-600/30';
  if (id === 'organic') return 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30';
  return 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30';
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const { profile, signOut, connection } = useAuth();

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200/80 min-h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-white shadow-sm shadow-emerald-700/20">
          <Leaf className="w-5 h-5 fill-white/20" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 tracking-tight text-base font-heading">SmartFarm</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase tracking-wider">2.0</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">Crop Protection Intelligence</p>
        </div>
      </div>

      {/* Database State Badge */}
      <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500 font-medium">Database State:</span>
          {connection.status === 'connected' ? (
            <Badge variant="emerald" size="sm">{connection.label}</Badge>
          ) : (
            <Badge variant="amber" size="sm">{connection.label}</Badge>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_SECTIONS.map((section) => {
          const headingClass = sectionAccentClass(section.headingAccent);
          return (
            <div key={section.heading}>
              <div className="px-3 mb-2 flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 px-2 py-0.5 rounded-lg ${headingClass}`}
                >
                  {section.headingEmoji && <span>{section.headingEmoji}</span>}
                  <span>{section.heading}</span>
                </span>
              </div>
              <nav className="space-y-1">
                {section.items.map((item, idx) => {
                  const active = currentTab === item.id;
                  const uniqueKey = `${item.id}-${idx}`;
                  return (
                    <button
                      key={uniqueKey}
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        item.subItem ? 'pl-7' : ''
                      } ${
                        active
                          ? itemActiveColor(item.id)
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.icon}
                        <span className="truncate">{item.label}</span>
                        {item.beta && (
                          <span
                            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200/70 shrink-0"
                          >
                            Beta
                          </span>
                        )}
                      </div>
                      {item.badge && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      {/* User Profile Card / Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 shadow-2xs">
          <button 
            onClick={() => onTabChange('profile')}
            className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'F'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{profile?.full_name || 'Farmer'}</p>
              <p className="text-[10px] text-slate-400 capitalize truncate">{profile?.farming_type || 'Organic'} grower</p>
            </div>
          </button>
          <button
            onClick={signOut}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
