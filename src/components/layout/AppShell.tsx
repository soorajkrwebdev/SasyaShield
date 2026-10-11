import React, { useState } from 'react';
import { Sidebar, NavigationTab } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { FarmFormModal } from '../farms/FarmFormModal';
import { CropFormModal } from '../crops/CropFormModal';
import { ActivityFormModal } from '../activities/ActivityFormModal';
import { InputFormModal } from '../inputs/InputFormModal';

interface AppShellProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onTabChange,
  children,
}) => {
  const [isAddFarmOpen, setIsAddFarmOpen] = useState(false);
  const [isAddCropOpen, setIsAddCropOpen] = useState(false);
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [isAddInputOpen, setIsAddInputOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-50/60 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <Sidebar currentTab={currentTab} onTabChange={onTabChange} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <Header
          onOpenAddFarm={() => setIsAddFarmOpen(true)}
          onOpenAddCrop={() => setIsAddCropOpen(true)}
          onOpenAddActivity={() => setIsAddActivityOpen(true)}
          onOpenAddInput={() => setIsAddInputOpen(true)}
          onTabChange={onTabChange}
          onToggleMobileDrawer={() => setIsMobileDrawerOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation & Slideover */}
      <MobileNav
        currentTab={currentTab}
        onTabChange={onTabChange}
        isDrawerOpen={isMobileDrawerOpen}
        onToggleDrawer={setIsMobileDrawerOpen}
      />

      {/* Global Quick Modals */}
      <FarmFormModal
        isOpen={isAddFarmOpen}
        onClose={() => setIsAddFarmOpen(false)}
      />

      <CropFormModal
        isOpen={isAddCropOpen}
        onClose={() => setIsAddCropOpen(false)}
      />

      <ActivityFormModal
        isOpen={isAddActivityOpen}
        onClose={() => setIsAddActivityOpen(false)}
      />

      <InputFormModal
        isOpen={isAddInputOpen}
        onClose={() => setIsAddInputOpen(false)}
      />
    </div>
  );
};
