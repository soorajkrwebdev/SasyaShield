import React, { useState } from 'react';
import { useFarmData } from '../contexts/FarmContext';
import { CropCard } from '../components/crops/CropCard';
import { CropFormModal } from '../components/crops/CropFormModal';
import { ActivityFormModal } from '../components/activities/ActivityFormModal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { FarmCrop } from '../types';
import { Sprout, Plus, Search } from 'lucide-react';

export const CropsPage: React.FC = () => {
  const { crops, farms, activities, deleteCrop, selectedFarmId } = useFarmData();
  const [searchQuery, setSearchQuery] = useState('');
  const [farmFilter, setFarmFilter] = useState(selectedFarmId || '');
  const [stageFilter, setStageFilter] = useState('');

  // Keep local filter in sync when global active farm changes
  React.useEffect(() => {
    if (selectedFarmId) {
      setFarmFilter(selectedFarmId);
    }
  }, [selectedFarmId]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [cropToEdit, setCropToEdit] = useState<FarmCrop | null>(null);
  const [cropIdToDelete, setCropIdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick activity log for specific crop
  const [cropForActivity, setCropForActivity] = useState<FarmCrop | null>(null);

  const filteredCrops = crops.filter(c => {
    const matchesSearch = c.crop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.variety && c.variety.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFarm = !farmFilter || c.farm_id === farmFilter;
    const matchesStage = !stageFilter || c.growth_stage === stageFilter;
    return matchesSearch && matchesFarm && matchesStage;
  });

  const handleDeleteConfirm = async () => {
    if (!cropIdToDelete) return;
    setIsDeleting(true);
    await deleteCrop(cropIdToDelete);
    setIsDeleting(false);
    setCropIdToDelete(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Crops & Life-Cycle Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track varieties, planting dates, growth stages, and 8-phase agronomic timelines
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setCropToEdit(null);
            setIsAddModalOpen(true);
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          Register New Crop
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search crop or variety..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <select
          value={farmFilter}
          onChange={e => setFarmFilter(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
        >
          <option value="">All Farms ({farms.length})</option>
          {farms.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>

        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
        >
          <option value="">All Growth Stages</option>
          <option value="Nursery / Land Prep">Nursery / Land Prep</option>
          <option value="Vegetative">Vegetative</option>
          <option value="Flowering">Flowering</option>
          <option value="Fruiting / Podding">Fruiting / Podding</option>
          <option value="Maturity / Ripening">Maturity / Ripening</option>
          <option value="Harvesting">Harvesting</option>
          <option value="Post-Harvest">Post-Harvest</option>
        </select>
      </div>

      {/* Crops List or Empty State */}
      {filteredCrops.length === 0 ? (
        <EmptyState
          icon={<Sprout className="w-8 h-8" />}
          title={searchQuery || farmFilter || stageFilter ? 'No matching crops found' : 'No crops registered yet'}
          description={
            searchQuery || farmFilter || stageFilter
              ? 'Try modifying your search or clearing active filters.'
              : 'Register your first crop cycle to begin tracking phenological stages and activities.'
          }
          actionText={searchQuery || farmFilter || stageFilter ? undefined : 'Register First Crop'}
          onAction={() => {
            setCropToEdit(null);
            setIsAddModalOpen(true);
          }}
          actionIcon={<Plus className="w-4 h-4" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCrops.map(crop => (
            <CropCard
              key={crop.id}
              crop={crop}
              activities={activities}
              onEdit={c => {
                setCropToEdit(c);
                setIsAddModalOpen(true);
              }}
              onDelete={id => setCropIdToDelete(id)}
              onRecordActivity={c => setCropForActivity(c)}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Crop Modal */}
      <CropFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setCropToEdit(null);
        }}
        cropToEdit={cropToEdit}
        defaultFarmId={farmFilter || selectedFarmId || undefined}
      />

      {/* Quick Activity Modal for specific Crop */}
      <ActivityFormModal
        isOpen={Boolean(cropForActivity)}
        onClose={() => setCropForActivity(null)}
        defaultCrop={cropForActivity}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(cropIdToDelete)}
        onClose={() => setCropIdToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Crop Cycle?"
        message="Are you sure you want to delete this crop cycle? Activities linked directly to this crop will have their crop association detached."
        confirmText="Delete Crop"
        isDangerous
        loading={isDeleting}
      />
    </div>
  );
};
