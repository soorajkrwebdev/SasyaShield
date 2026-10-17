import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Button } from '../components/common/Button';
import { FarmingType } from '../types';
import { getDistrictsForState, getStateNames, getTaluksForDistrict, isValidStateDistrict } from '../data/indianStates';
import { Check } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const stateOptions = useMemo(() => getStateNames(), []);

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [state, setState] = useState(profile?.state || '');
  const [district, setDistrict] = useState(profile?.district || '');
  const districtOptions = useMemo(() => getDistrictsForState(state), [state]);
  const talukOptions = useMemo(() => getTaluksForDistrict(district).map(t => ({ value: t, label: t })), [district]);
  const [taluk, setTaluk] = useState(profile?.village || '');
  const [farmingType, setFarmingType] = useState<FarmingType>(profile?.farming_type || 'organic');

  const handleStateChange = (next: string) => {
    setState(next);
    setDistrict('');
    setTaluk('');
  };

  const handleDistrictChange = (next: string) => {
    setDistrict(next);
    setTaluk('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setSaveError(null);

    if (state && district && !isValidStateDistrict(state, district)) {
      setSaveError('The selected district does not belong to the selected state. Please choose again.');
      setLoading(false);
      return;
    }

    const res = await updateProfile({
      full_name: fullName.trim(),
      phone: phone.trim() || undefined,
      state,
      district,
      village: taluk,
      farming_type: farmingType,
    });

    setLoading(false);
    if (res.error) {
      setSaveError(res.error);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
          Farmer Profile & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your agricultural background, regional agro-climatic zone, and preferences
        </p>
      </div>

      {/* Main Profile Form */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs">
        {success && (
          <div className="p-3 mb-5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Profile and farming preferences successfully saved!</span>
          </div>
        )}

        {saveError && (
          <div className="p-3 mb-5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {saveError}
          </div>
        )}

        {!profile ? (
          <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <p className="font-semibold mb-1">Farmer profile is still loading.</p>
            <p className="text-xs">
              Your profile row is stored in Supabase under your authenticated user id and should appear automatically
              within a moment. Refreshing the page forces a fresh authenticated profile reload.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Farmer Full Name"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
            <Input
              label="Contact Phone"
              placeholder="+91 98450 12345"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="State / Union Territory"
              value={state}
              onChange={e => handleStateChange(e.target.value)}
              options={[
                { value: '', label: 'Select state/UT' },
                ...stateOptions.map(s => ({ value: s, label: s })),
              ]}
            />
            <Select
              label="District"
              value={district}
              onChange={e => handleDistrictChange(e.target.value)}
              disabled={!state}
              helperText={!state ? 'Select a state first' : undefined}
              options={[
                { value: '', label: 'Select district' },
                ...districtOptions.map(d => ({ value: d, label: d })),
              ]}
            />
            <Select
              label="Taluk / Village"
              value={taluk}
              onChange={e => setTaluk(e.target.value)}
              helperText={!district ? 'Select a district first' : talukOptions.length === 0 ? 'No taluks available for this district' : undefined}
              options={[
                { value: '', label: 'Select Taluk' },
                ...talukOptions,
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Farming Philosophy & System"
              value={farmingType}
              onChange={e => setFarmingType(e.target.value as FarmingType)}
              options={[
                { value: 'organic', label: '100% Organic Farming' },
                { value: 'transitioning', label: 'Transitioning to Organic (In-conversion)' },
                { value: 'mixed', label: 'Mixed Farming System' },
                { value: 'conventional', label: 'Conventional / Integrated' },
              ]}
            />

          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <Button type="submit" variant="primary" size="md" loading={loading}>
              Save Profile Changes
            </Button>
          </div>
        </form>
        )}
      </div>


    </div>
  );
};
