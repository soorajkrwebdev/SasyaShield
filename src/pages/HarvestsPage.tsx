import React, { useState } from 'react';
import { useFarmData } from '../contexts/FarmContext';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  Wheat,
  Plus,
  Search,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { HarvestQuality } from '../types';

// ─── Harvest Form Modal ───────────────────────────────────────────────────────
interface HarvestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUALITY_OPTIONS: { value: HarvestQuality; label: string }[] = [
  { value: 'premium', label: 'Premium Grade' },
  { value: 'grade_a', label: 'Grade A' },
  { value: 'grade_b', label: 'Grade B' },
  { value: 'grade_c', label: 'Grade C' },
  { value: 'standard', label: 'Standard' },
];

const HarvestModal: React.FC<HarvestModalProps> = ({ isOpen, onClose }) => {
  const { farms, crops, addHarvest } = useFarmData();

  const [farmId, setFarmId] = useState(farms[0]?.id ?? '');
  const [cropId, setCropId] = useState('');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [quality, setQuality] = useState<HarvestQuality>('grade_a');
  const [salePrice, setSalePrice] = useState('');
  const [marketName, setMarketName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const farmCrops = crops.filter(c => c.farm_id === farmId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId || !cropId || !quantity || parseFloat(quantity) <= 0) {
      setError('Farm, crop, and a positive quantity are required.');
      return;
    }
    setLoading(true);
    setError(null);

    const salePriceNum = salePrice ? parseFloat(salePrice) : undefined;
    const revenue = salePriceNum != null ? parseFloat(quantity) * salePriceNum : undefined;

    const res = await addHarvest({
      farm_id: farmId,
      crop_id: cropId,
      harvest_date: harvestDate,
      quantity: parseFloat(quantity),
      unit,
      quality,
      sale_price: salePriceNum,
      revenue,
      market_name: marketName.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      onClose();
      setQuantity('');
      setSalePrice('');
      setMarketName('');
      setNotes('');
      setCropId('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Crop Harvest">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Farm *</label>
            <select value={farmId} onChange={e => { setFarmId(e.target.value); setCropId(''); }} required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-emerald-600 focus:outline-none">
              {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Crop *</label>
            <select value={cropId} onChange={e => setCropId(e.target.value)} required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-emerald-600 focus:outline-none">
              <option value="">Select a crop</option>
              {farmCrops.map(c => <option key={c.id} value={c.id}>{c.crop_name}{c.variety ? ` (${c.variety})` : ''}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Harvest Date *</label>
            <input type="date" value={harvestDate} onChange={e => setHarvestDate(e.target.value)} required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Quantity *</label>
            <input type="number" min="0.01" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} required
              placeholder="e.g. 500"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Unit</label>
            <select value={unit} onChange={e => setUnit(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-emerald-600 focus:outline-none">
              {['kg', 'quintal', 'tonne', 'bags', 'bunches', 'nuts', 'litres'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Quality Grade</label>
            <select value={quality} onChange={e => setQuality(e.target.value as HarvestQuality)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-emerald-600 focus:outline-none">
              {QUALITY_OPTIONS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Sale Price (₹ per unit)</label>
            <input type="number" min="0" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Market / Buyer</label>
            <input type="text" value={marketName} onChange={e => setMarketName(e.target.value)}
              placeholder="e.g. Local mandi"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none" />
          </div>
        </div>

        {salePrice && quantity && parseFloat(quantity) > 0 && parseFloat(salePrice) > 0 && (
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800">
            <strong>Estimated Revenue: </strong>
            ₹{(parseFloat(quantity) * parseFloat(salePrice)).toLocaleString('en-IN')}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="e.g. First harvest of the season, good quality"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none" />
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" type="submit" loading={loading}>Record Harvest</Button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const qualityBadge = (q: HarvestQuality) => {
  const map: Record<HarvestQuality, { variant: 'emerald' | 'blue' | 'amber' | 'slate'; label: string }> = {
    premium: { variant: 'emerald', label: 'Premium' },
    grade_a: { variant: 'blue', label: 'Grade A' },
    grade_b: { variant: 'amber', label: 'Grade B' },
    grade_c: { variant: 'slate', label: 'Grade C' },
    standard: { variant: 'slate', label: 'Standard' },
  };
  const m = map[q] ?? { variant: 'slate', label: q };
  return <Badge variant={m.variant} size="sm">{m.label}</Badge>;
};

export const HarvestsPage: React.FC = () => {
  const { harvests, deleteHarvest, loading } = useFarmData();

  const [q, setQ] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filtered = harvests.filter(h =>
    !q ||
    h.crop_name?.toLowerCase().includes(q.toLowerCase()) ||
    h.farm_name?.toLowerCase().includes(q.toLowerCase()) ||
    h.market_name?.toLowerCase().includes(q.toLowerCase())
  );

  const totalQty = filtered.reduce((s, h) => s + (Number(h.quantity) || 0), 0);
  const totalRevenue = filtered.reduce((s, h) => s + (Number(h.revenue) || 0), 0);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading harvest records…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Crop Harvests</h1>
          <p className="text-xs text-slate-500 mt-1">
            Record yield, quality, sale price, and market for each harvest lot.
          </p>
        </div>
        <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}>
          Record Harvest
        </Button>
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border p-5">
            <p className="text-xs text-slate-500 font-medium mb-1">Total Harvest</p>
            <p className="text-3xl font-extrabold text-slate-900">
              {totalQty.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-400 mt-1">multiple units — see records</p>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <p className="text-xs text-slate-500 font-medium mb-1">Total Revenue</p>
            <p className="text-3xl font-extrabold text-emerald-700">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-400 mt-1">from sales with price entered</p>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <p className="text-xs text-slate-500 font-medium mb-1">Harvest Records</p>
            <p className="text-3xl font-extrabold text-slate-900">{filtered.length}</p>
            <p className="text-xs text-slate-400 mt-1">across {new Set(filtered.map(h => h.farm_id)).size} farm(s)</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input type="text" value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search by crop, farm, or market…"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none" />
        </div>
      </div>

      {/* Records */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Wheat className="w-10 h-10 text-slate-300" />}
          title={harvests.length === 0 ? 'No harvest records yet' : 'No matching harvests'}
          description={
            harvests.length === 0
              ? 'Record your crop harvests to track yield, quality, and revenue across seasons.'
              : 'Try clearing your search to see all harvest records.'
          }
          actionText="Record First Harvest"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(h => (
            <div key={h.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {h.farm_name}
                  </span>
                  <h3 className="font-bold text-base text-slate-900 mt-1">{h.crop_name}</h3>
                  <p className="text-xs text-slate-400">{h.harvest_date}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {qualityBadge(h.quality)}
                  <button onClick={() => deleteHarvest(h.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs mt-3">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">QUANTITY</span>
                  <span className="font-bold text-slate-800">
                    {Number(h.quantity).toLocaleString('en-IN')} {h.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">REVENUE</span>
                  <span className="font-bold text-emerald-700">
                    {h.revenue != null && Number(h.revenue) > 0
                      ? `₹${Number(h.revenue).toLocaleString('en-IN')}`
                      : '—'}
                  </span>
                </div>
                {h.sale_price != null && (
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">SALE PRICE</span>
                    <span className="font-semibold text-slate-700">
                      ₹{Number(h.sale_price).toLocaleString('en-IN')} / {h.unit}
                    </span>
                  </div>
                )}
                {h.market_name && (
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">MARKET</span>
                    <span className="font-semibold text-slate-700">{h.market_name}</span>
                  </div>
                )}
              </div>

              {h.notes && (
                <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">{h.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-600">
        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p>
          Harvest records are farmer-entered. Revenue is calculated as quantity × sale price when both are provided.
          These records feed the Analytics module.
        </p>
      </div>

      <HarvestModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
