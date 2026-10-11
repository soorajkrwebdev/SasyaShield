import React, { useState } from 'react';
import { useFarmData } from '../contexts/FarmContext';
import { InputTable } from '../components/inputs/InputTable';
import { InputFormModal, INPUT_CATEGORIES } from '../components/inputs/InputFormModal';
import { ActivityFormModal } from '../components/activities/ActivityFormModal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { FarmInput } from '../types';
import { Package, Plus, Search, IndianRupee, CheckCircle2 } from 'lucide-react';

export const InputsPage: React.FC = () => {
  const { inputs, deleteInput, selectedFarmId, farms, crops } = useFarmData();

  // Filters state
  const [farmFilter, setFarmFilter] = useState(selectedFarmId || '');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [cropFilter, setCropFilter] = useState('');
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
  const [inputToEdit, setInputToEdit] = useState<FarmInput | null>(null);
  const [inputIdToDelete, setInputIdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick activity log state
  const [inputForActivity, setInputForActivity] = useState<FarmInput | null>(null);

  // Filter logic
  const filteredInputs = inputs.filter(item => {
    const matchesFarm = !farmFilter || item.farm_id === farmFilter;
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    const matchesCrop = !cropFilter || item.crop_id === cropFilter;
    const matchesSearch = !searchQuery ||
      item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.purpose && item.purpose.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.supplier_or_source && item.supplier_or_source.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFarm && matchesCategory && matchesCrop && matchesSearch;
  });

  // Calculate summaries
  const totalCost = filteredInputs.reduce((acc, i) => acc + (i.cost || 0), 0);
  const organicCategories = ['Organic manure', 'Biofertilizers', 'Biological inputs', 'Botanical inputs'];
  const organicCount = filteredInputs.filter(i => organicCategories.includes(i.category)).length;
  const organicPercent = filteredInputs.length > 0
    ? Math.round((organicCount / filteredInputs.length) * 100)
    : 100;

  const handleDeleteConfirm = async () => {
    if (!inputIdToDelete) return;
    setIsDeleting(true);
    await deleteInput(inputIdToDelete);
    setIsDeleting(false);
    setInputIdToDelete(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Agricultural Inputs Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track seeds, bio-inoculants, organic manures, botanical extracts, and inventory expenditure
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setInputToEdit(null);
            setIsAddModalOpen(true);
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Agricultural Input
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Registered Inputs</span>
            <span className="text-sm font-bold text-slate-900">{filteredInputs.length} Input Batches</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <IndianRupee className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Inputs Investment</span>
            <span className="text-sm font-bold text-slate-900">₹{totalCost.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Organic Input Ratio</span>
            <span className="text-sm font-bold text-emerald-700">{organicPercent}% Bio & Organic</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search input name or purpose..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        {/* Farm Filter */}
        <select
          value={farmFilter}
          onChange={e => {
            setFarmFilter(e.target.value);
            setCropFilter('');
          }}
          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
        >
          <option value="">All Farms ({farms.length})</option>
          {farms.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
        >
          <option value="">All Input Categories</option>
          {INPUT_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Crop Filter */}
        <select
          value={cropFilter}
          onChange={e => setCropFilter(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
        >
          <option value="">All Crops</option>
          {crops.map(c => (
            <option key={c.id} value={c.id}>
              {c.crop_name} {c.variety ? `(${c.variety})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Table or Empty State */}
      {filteredInputs.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title={searchQuery || farmFilter || categoryFilter || cropFilter ? 'No matching inputs' : 'No agricultural inputs recorded yet'}
          description={
            searchQuery || farmFilter || categoryFilter || cropFilter
              ? 'Try widening your filters or search terms.'
              : 'Record your seed lots, organic manures, biofertilizers or bio-control agents to begin tracking inventory.'
          }
          actionText={searchQuery || farmFilter || categoryFilter || cropFilter ? undefined : 'Add First Input'}
          onAction={() => {
            setInputToEdit(null);
            setIsAddModalOpen(true);
          }}
          actionIcon={<Plus className="w-4 h-4" />}
        />
      ) : (
        <InputTable
          inputs={filteredInputs}
          onEdit={inp => {
            setInputToEdit(inp);
            setIsAddModalOpen(true);
          }}
          onDelete={id => setInputIdToDelete(id)}
          onLogAsActivity={inp => setInputForActivity(inp)}
        />
      )}

      {/* Add / Edit Input Modal */}
      <InputFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setInputToEdit(null);
        }}
        inputToEdit={inputToEdit}
        defaultFarmId={farmFilter || selectedFarmId || undefined}
      />

      {/* Quick Activity Logging for Input */}
      {inputForActivity && (
        <ActivityFormModal
          isOpen={Boolean(inputForActivity)}
          onClose={() => setInputForActivity(null)}
          defaultFarmId={inputForActivity.farm_id}
          activityToEdit={{
            id: '',
            farm_id: inputForActivity.farm_id,
            crop_id: inputForActivity.crop_id,
            user_id: inputForActivity.user_id,
            activity_type: inputForActivity.category === 'Organic manure'
              ? 'Organic manure'
              : inputForActivity.category === 'Biofertilizers'
              ? 'Biofertilizer application'
              : inputForActivity.category === 'Seeds'
              ? 'Planting'
              : 'Fertilization',
            activity_date: new Date().toISOString().split('T')[0],
            quantity: inputForActivity.quantity,
            unit: inputForActivity.unit,
            cost: inputForActivity.cost,
            notes: `Applied ${inputForActivity.product_name} (${inputForActivity.purpose || 'Soil nutrition'}). Batch: ${inputForActivity.batch_or_lot_no || 'N/A'}.`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(inputIdToDelete)}
        onClose={() => setInputIdToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Input Record?"
        message="Are you sure you want to remove this input batch from your farm inventory records?"
        confirmText="Delete Input"
        isDangerous
        loading={isDeleting}
      />
    </div>
  );
};
