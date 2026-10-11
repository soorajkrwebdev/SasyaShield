import React, { useState } from 'react';
import { useFarmData } from '../contexts/FarmContext';
import { ActivityTable } from '../components/activities/ActivityTable';
import { ActivityFilters } from '../components/activities/ActivityFilters';
import { ActivityFormModal } from '../components/activities/ActivityFormModal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { CropActivity } from '../types';
import { ClipboardList, Plus, IndianRupee, Layers, CalendarCheck } from 'lucide-react';

export const ActivitiesPage: React.FC = () => {
  const { activities, deleteActivity, selectedFarmId } = useFarmData();

  // Filters state
  const [farmFilter, setFarmFilter] = useState(selectedFarmId || '');
  const [cropFilter, setCropFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Keep local filter in sync when global active farm changes
  React.useEffect(() => {
    if (selectedFarmId) {
      setFarmFilter(selectedFarmId);
      setCropFilter('');
    }
  }, [selectedFarmId]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState<CropActivity | null>(null);
  const [activityIdToDelete, setActivityIdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered activities
  const filteredActivities = activities.filter(act => {
    const matchesFarm = !farmFilter || act.farm_id === farmFilter;
    const matchesCrop = !cropFilter || act.crop_id === cropFilter;
    const matchesType = !typeFilter || act.activity_type === typeFilter;
    const matchesSearch = !searchQuery ||
      act.activity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (act.notes && act.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (act.crop_name && act.crop_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFarm && matchesCrop && matchesType && matchesSearch;
  });

  // Calculate summary metrics
  const totalCost = filteredActivities.reduce((acc, a) => acc + (a.cost || 0), 0);
  const totalOperations = filteredActivities.length;

  const handleDeleteConfirm = async () => {
    if (!activityIdToDelete) return;
    setIsDeleting(true);
    await deleteActivity(activityIdToDelete);
    setIsDeleting(false);
    setActivityIdToDelete(null);
  };

  const handleResetFilters = () => {
    setFarmFilter('');
    setCropFilter('');
    setTypeFilter('');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Farm Operations & Activity Log
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Record intercultural operations, inputs applied, labor costs, and agronomic interventions
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setActivityToEdit(null);
            setIsAddModalOpen(true);
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          Record Farm Activity
        </Button>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Logged Events</span>
            <span className="text-sm font-bold text-slate-900">{totalOperations} Activities</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <IndianRupee className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Operations Expenditure</span>
            <span className="text-sm font-bold text-slate-900">₹{totalCost.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Organic Manure Logs</span>
            <span className="text-sm font-bold text-slate-900">
              {filteredActivities.filter(a => a.activity_type === 'Organic manure' || a.activity_type === 'Biofertilizer application').length} Events
            </span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <ActivityFilters
        farmFilter={farmFilter}
        onFarmFilterChange={setFarmFilter}
        cropFilter={cropFilter}
        onCropFilterChange={setCropFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onReset={handleResetFilters}
      />

      {/* Activities Table or Empty State */}
      {filteredActivities.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-8 h-8" />}
          title={searchQuery || farmFilter || cropFilter || typeFilter ? 'No matching activities' : 'No activities recorded yet'}
          description={
            searchQuery || farmFilter || cropFilter || typeFilter
              ? 'Try widening your filters or search terms.'
              : 'Log your first farm event (such as organic manure application, irrigation, weeding or pruning).'
          }
          actionText={searchQuery || farmFilter || cropFilter || typeFilter ? undefined : 'Record First Activity'}
          onAction={() => {
            setActivityToEdit(null);
            setIsAddModalOpen(true);
          }}
          actionIcon={<Plus className="w-4 h-4" />}
        />
      ) : (
        <ActivityTable
          activities={filteredActivities}
          onEdit={act => {
            setActivityToEdit(act);
            setIsAddModalOpen(true);
          }}
          onDelete={id => setActivityIdToDelete(id)}
        />
      )}

      {/* Form Modal (Add / Edit) */}
      <ActivityFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setActivityToEdit(null);
        }}
        activityToEdit={activityToEdit}
        defaultFarmId={farmFilter || selectedFarmId || undefined}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(activityIdToDelete)}
        onClose={() => setActivityIdToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Activity Log?"
        message="Are you sure you want to remove this farm activity record?"
        confirmText="Delete Activity"
        isDangerous
        loading={isDeleting}
      />
    </div>
  );
};
