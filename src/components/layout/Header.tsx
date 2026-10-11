import React, { useState } from 'react';
import {
  Trees,
  Plus,
  ChevronDown,
  Database,
  Menu,
  Sprout,
  ClipboardList,
  Package
} from 'lucide-react';
import { useFarmData } from '../../contexts/FarmContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../common/Button';
import { NavigationTab } from './Sidebar';

interface HeaderProps {
  onOpenAddFarm: () => void;
  onOpenAddCrop: () => void;
  onOpenAddActivity: () => void;
  onOpenAddInput: () => void;
  onTabChange: (tab: NavigationTab) => void;
  onToggleMobileDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddFarm,
  onOpenAddCrop,
  onOpenAddActivity,
  onOpenAddInput,
  onTabChange: _onTabChange,
  onToggleMobileDrawer,
}) => {
  const { farms, selectedFarmId, setSelectedFarmId, selectedFarm } = useFarmData();
  const { connection } = useAuth();
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [farmMenuOpen, setFarmMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between dark:bg-slate-900/90 dark:border-slate-800">
      {/* Left: Mobile Drawer Trigger + Active Farm Selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileDrawer}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Farm Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setFarmMenuOpen(!farmMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 text-left transition-all cursor-pointer shadow-2xs dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Trees className="w-4 h-4" />
            </div>
            <div className="hidden sm:block min-w-0 pr-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none">Active Farm</p>
              <p className="text-xs font-bold text-slate-800 truncate max-w-[150px] md:max-w-[200px] leading-tight mt-0.5">
                {selectedFarm ? selectedFarm.name : 'No Farm Selected'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {farmMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFarmMenuOpen(false)} />
              <div className="absolute left-0 mt-1.5 w-64 rounded-2xl bg-white border border-slate-100 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 mb-1">
                  Your Farms ({farms.length})
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {farms.map(f => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setSelectedFarmId(f.id);
                        setFarmMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer ${
                        selectedFarmId === f.id
                          ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/60'
                          : 'text-slate-700 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <span className="truncate">{f.name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{f.area} {f.area_unit}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setFarmMenuOpen(false);
                      onOpenAddFarm();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Farm</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Sandbox Mode Notice / Quick Actions / Settings */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Database state indicator */}
        {connection.status === 'connected' ? (
          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200" title={connection.detail}>
            <Database className="w-3.5 h-3.5" />
            <span>{connection.label}</span>
          </span>
        ) : (
          <span
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 cursor-help"
            title={connection.detail}
          >
            <Database className="w-3.5 h-3.5 text-amber-600" />
            <span>{connection.label}</span>
          </span>
        )}

        {/* Quick Action Button */}
        <div className="relative">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setQuickMenuOpen(!quickMenuOpen)}
            icon={<Plus className="w-4 h-4" />}
          >
            <span className="hidden sm:inline">Quick Action</span>
          </Button>

          {quickMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setQuickMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white border border-slate-100 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => {
                    setQuickMenuOpen(false);
                    onOpenAddInput();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer"
                >
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span>Record Agricultural Input</span>
                </button>
                <button
                  onClick={() => {
                    setQuickMenuOpen(false);
                    onOpenAddActivity();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer"
                >
                  <ClipboardList className="w-4 h-4 text-emerald-600" />
                  <span>Record Farm Activity</span>
                </button>
                <button
                  onClick={() => {
                    setQuickMenuOpen(false);
                    onOpenAddCrop();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer"
                >
                  <Sprout className="w-4 h-4 text-emerald-600" />
                  <span>Register Crop Cycle</span>
                </button>
                <button
                  onClick={() => {
                    setQuickMenuOpen(false);
                    onOpenAddFarm();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer"
                >
                  <Trees className="w-4 h-4 text-emerald-600" />
                  <span>Add New Farm</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
