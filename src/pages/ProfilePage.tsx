import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Button } from '../components/common/Button';
import { FarmingType } from '../types';
import { Database, Check, Copy } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { profile, updateProfile, connection } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [state, setState] = useState(profile?.state || 'Karnataka');
  const [district, setDistrict] = useState(profile?.district || 'Shimoga');
  const [village, setVillage] = useState(profile?.village || 'Thirthahalli');
  const [language, setLanguage] = useState(profile?.preferred_language || 'en');
  const [farmingType, setFarmingType] = useState<FarmingType>(profile?.farming_type || 'organic');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setSaveError(null);

    const res = await updateProfile({
      full_name: fullName.trim(),
      phone: phone.trim() || undefined,
      state,
      district,
      village,
      preferred_language: language,
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

  const handleCopyEnvSnippet = () => {
    const snippet = `# .env\nVITE_SUPABASE_URL=https://your-project-id.supabase.co\nVITE_SUPABASE_ANON_KEY=your-anon-public-key-here\n# optional alias:\n# VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here`;
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <Input
              label="State"
              value={state}
              onChange={e => setState(e.target.value)}
            />
            <Input
              label="District"
              value={district}
              onChange={e => setDistrict(e.target.value)}
            />
            <Input
              label="Taluk / Village"
              value={village}
              onChange={e => setVillage(e.target.value)}
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
            <Select
              label="Preferred Language"
              value={language}
              onChange={e => setLanguage(e.target.value)}
              options={[
                { value: 'en', label: 'English' },
                { value: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
                { value: 'hi', label: 'Hindi (हिन्दी)' },
                { value: 'ml', label: 'Malayalam (മലയാളം)' },
                { value: 'ta', label: 'Tamil (தமிழ்)' },
                { value: 'te', label: 'Telugu (తెలుగు)' },
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

      {/* Supabase PostgreSQL Backend Status & Config Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold font-heading">Backend & Database Architecture</h3>
            <p className="text-xs text-slate-400">PostgreSQL with Row Level Security (RLS)</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 mb-5 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Current Mode:</span>
            <span className={`font-bold ${connection.status === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {connection.label}
            </span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-slate-400 shrink-0">Detail:</span>
            <span className="font-mono text-slate-300 text-right">{connection.detail}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Schema File:</span>
            <span className="font-mono text-slate-300">supabase/migrations/20260923000000_phase1_core_schema.sql</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Security Isolation:</span>
            <span className="text-emerald-300">RLS Active (auth.uid() = user_id)</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <p className="text-xs text-slate-400">
            To connect your live Supabase project, paste your URL and Anon Key in <code className="text-emerald-400 font-mono">.env</code>.
          </p>
          <button
            onClick={handleCopyEnvSnippet}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer shrink-0 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied .env template!' : 'Copy .env format'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
