import React from 'react';
import sasyashieldLogo from '../../assets/sasyashield-logo.png';
import {
  LayoutDashboard,
  Trees,
  Sprout,
  ClipboardList,
  Menu,
  X,
  CloudSun,
  Leaf,
  Bug,
  TestTube,
  Recycle,
  Briefcase,
  TrendingUp,
  BarChart3,
  Bot,
  BookOpen,
  UserCheck,
  LogOut,
  Package
} from 'lucide-react';
import type { NavigationTab } from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';

interface MobileNavProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  isDrawerOpen: boolean;
  onToggleDrawer: (open: boolean) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  onTabChange,
  isDrawerOpen,
  onToggleDrawer,
}) => {
  const { profile, signOut } = useAuth();

  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'farms', label: 'Farms', icon: <Trees className="w-5 h-5" /> },
    { id: 'crops', label: 'Crops', icon: <Sprout className="w-5 h-5" /> },
    { id: 'organic', label: 'Organic', icon: <Leaf className="w-5 h-5" /> },
  ];

  const drawerItems: { id: NavigationTab; label: string; icon: React.ReactNode; phaseNotice?: string; beta?: boolean }[] = [
    { id: 'activities', label: 'Farm Activities', icon: <ClipboardList className="w-4 h-4 text-emerald-600" /> },
    { id: 'inputs', label: 'Inputs Management', icon: <Package className="w-4 h-4 text-emerald-600" /> },
    { id: 'organic', label: 'Flagship: Organic Hub', icon: <Leaf className="w-4 h-4 text-emerald-600" /> },
    { id: 'weather', label: 'Weather Intelligence', icon: <CloudSun className="w-4 h-4 text-emerald-600" /> },
    { id: 'pest-ipm', label: 'Pest & IPM Advisory', icon: <Bug className="w-4 h-4 text-slate-500" />, phaseNotice: 'Phase 3' },
    { id: 'tests', label: 'Soil & Water Tests', icon: <TestTube className="w-4 h-4 text-slate-500" />, phaseNotice: 'Phase 4' },
    { id: 'waste', label: 'Waste Management', icon: <Recycle className="w-4 h-4 text-slate-500" />, phaseNotice: 'Phase 4' },
    { id: 'farm-work', label: 'Farm Work Board', icon: <Briefcase className="w-4 h-4 text-slate-500" />, phaseNotice: 'Phase 6' },
    { id: 'market', label: 'Market Prices', icon: <TrendingUp className="w-4 h-4 text-slate-500" />, phaseNotice: 'Phase 5', beta: true },
    { id: 'analytics', label: 'Farm Analytics', icon: <BarChart3 className="w-4 h-4 text-slate-500" />, phaseNotice: 'Phase 7' },
    { id: 'farm-ai', label: 'Farm AI Assistant', icon: <Bot className="w-4 h-4 text-slate-500" />, phaseNotice: 'Phase 8' },
    { id: 'knowledge', label: 'Knowledge Hub', icon: <BookOpen className="w-4 h-4 text-slate-500" />, phaseNotice: 'Phase 2' },
    { id: 'profile', label: 'Farmer Profile & Settings', icon: <UserCheck className="w-4 h-4 text-emerald-600" /> },
  ];

  return (
    <>
      {/* Fixed Bottom Navigation Bar for Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/80 px-2 py-1 shadow-lg flex items-center justify-around">
        {navItems.map(item => {
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                active ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className={`p-1 rounded-lg ${active ? 'bg-emerald-50 text-emerald-700' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => onToggleDrawer(true)}
          className="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          <div className="p-1">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">More</span>
        </button>
      </nav>

      {/* Slide-over Drawer for All Modules */}
      {isDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => onToggleDrawer(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={sasyashieldLogo} alt="Sasyashield" className="h-5 w-auto" />
                <div>
                  <h3 className="font-bold text-slate-900 font-heading">Agricultural Modules</h3>
                  <p className="text-xs text-slate-500 font-bold">Sasyashield</p>
                </div>
              </div>
              <button
                onClick={() => onToggleDrawer(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {drawerItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    onToggleDrawer(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                    currentTab === item.id
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                    {item.beta && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200/70 shrink-0">
                        Beta
                      </span>
                    )}
                  </div>
                  {item.phaseNotice && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${currentTab === item.id ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                      {item.phaseNotice}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Footer Profile & Logout */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">{profile?.full_name || 'Farmer'}</p>
                  <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{profile?.email}</p>
                </div>
                <button
                  onClick={() => {
                    onToggleDrawer(false);
                    signOut();
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 p-2 rounded-lg hover:bg-rose-50 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
