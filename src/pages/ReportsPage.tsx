import React, { useState, useEffect, useCallback } from 'react';
import { useFarmData } from '../contexts/FarmContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';
import {
  FileText,
  Plus,
  Printer,
  Trash2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ShieldCheck,
  Leaf,
  Layers,
  Bug,
} from 'lucide-react';
import {
  compileFarmReportData,
  saveFarmReport,
  fetchFarmReports,
  exportReportToPdf,
} from '../services/reportService';
import { supabase } from '../lib/supabase';
import { FarmReportRecord, ReportType } from '../types';

export const ReportsPage: React.FC = () => {
  const { user, profile } = useAuth();
  const {
    farms,
    selectedFarmId: contextFarmId,
    crops,
    activities,
    inputs,
    expenses,
    pestObservations,
    ipmRecords,
    pesticideApplications,
    pestFollowUps,
    soilTests,
    waterTests,
    farmWaste,
    compostBatches,
    harvests,
    loading: farmLoading,
  } = useFarmData();

  const [reports, setReports] = useState<FarmReportRecord[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState<string>(contextFarmId || '');
  const [reportType, setReportType] = useState<ReportType>('crop_protection');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!user?.id) return;
    setLoadingReports(true);
    const data = await fetchFarmReports(user.id);
    setReports(data);
    setLoadingReports(false);
  }, [user?.id]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (contextFarmId) {
      setSelectedFarmId(contextFarmId);
    } else if (farms.length > 0 && !selectedFarmId) {
      setSelectedFarmId(farms[0].id);
    }
  }, [contextFarmId, farms, selectedFarmId]);

  const handleGenerate = async () => {
    if (!user?.id || !selectedFarmId) {
      setError('Select a farm first.');
      return;
    }

    const farm = farms.find(f => f.id === selectedFarmId);
    if (!farm) {
      setError('Farm not found.');
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(null);

    const data = compileFarmReportData({
      userId: user.id,
      farm,
      farmer: profile,
      reportType,
      crops,
      activities,
      inputs,
      expenses,
      pestObservations,
      ipmRecords,
      pesticideApplications,
      pestFollowUps,
      soilTests,
      waterTests,
      waste: farmWaste,
      compost: compostBatches,
      harvests,
    });

    const typeLabels: Record<ReportType, string> = {
      crop_protection: 'Crop Protection & IPM Report',
      organic_summary: 'Organic Farming & Sustainability Report',
      farm_operations: 'Farm Operations Summary Report',
    };

    const title = `${farm.name} — ${typeLabels[reportType]} (${new Date().toLocaleDateString('en-IN')})`;
    const result = await saveFarmReport(user.id, selectedFarmId, title, data);

    setGenerating(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('Report generated and saved to your official ledger.');
      await loadReports();
      if (result.data) {
        exportReportToPdf(data, title);
      }
    }
  };

  const handlePrint = (report: FarmReportRecord) => {
    exportReportToPdf(report.report_data, report.report_title);
  };

  const handleDelete = async (reportId: string) => {
    if (!window.confirm('Delete this report? This cannot be undone.')) return;
    if (!supabase) return;
    await supabase.from('farm_reports').delete().eq('id', reportId);
    setReports(prev => prev.filter(r => r.id !== reportId));
  };

  const isLoading = farmLoading || loadingReports;

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading farm reports…</p>
      </div>
    );
  }

  const getReportTypeBadge = (type?: ReportType) => {
    switch (type) {
      case 'crop_protection':
        return <Badge variant="amber">Crop Protection</Badge>;
      case 'organic_summary':
        return <Badge variant="emerald">Organic Farming</Badge>;
      case 'farm_operations':
      default:
        return <Badge variant="blue">Operations Summary</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Farm Reports & Audit Ledger</h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate verifiable agricultural reports from your authenticated Supabase records. Export as print-ready PDF via your browser's print dialog.
          </p>
        </div>
      </div>

      {/* Official Disclaimer */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <p className="text-emerald-900 leading-relaxed">
          <strong>Official Records Notice:</strong> Generated reports compile authenticated farm-level entries (crop cycles, pest observations, IPM decisions, pesticide applications, organic inputs, and compost logs). All advisories align with ICAR/CIBRC standards. Internal logs do not substitute for accredited third-party NPOP/APEDA organic certification.
        </p>
      </div>

      {/* Generate New Report Form */}
      {farms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700">No farms added yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Add at least one farm to compile agricultural records and generate reports.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <h3 className="font-bold text-slate-900 text-sm mb-4">Generate Official Farm Report</h3>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Report Type Selector Tabs */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-slate-700 mb-2">Select Report Purpose</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                onClick={() => setReportType('crop_protection')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  reportType === 'crop_protection'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs mb-1">
                  <Bug className="w-4 h-4 text-emerald-600" />
                  <span>Crop Protection Summary</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Pest observations, severity, IPM cultural controls, pesticide sprays, PHI/REI, and treatment outcomes.
                </p>
              </div>

              <div
                onClick={() => setReportType('organic_summary')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  reportType === 'organic_summary'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs mb-1">
                  <Leaf className="w-4 h-4 text-emerald-600" />
                  <span>Organic Farming Summary</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Organic management practices, biofertilizers, botanical inputs, compost batches, waste recycling & soil health tests.
                </p>
              </div>

              <div
                onClick={() => setReportType('farm_operations')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  reportType === 'farm_operations'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs mb-1">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>Farm Operations Summary</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Holistic farm ledger covering registered crop stages, field activities, material inputs, expenditures & harvests.
                </p>
              </div>
            </div>
          </div>

          {/* Farm Selection & Action Button */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-56">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Target Farm</label>
              <select
                value={selectedFarmId}
                onChange={e => setSelectedFarmId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:border-emerald-600 focus:outline-none"
              >
                {farms.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.area} {f.area_unit} · {f.farming_method})
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="primary"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              loading={generating}
              onClick={handleGenerate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Generate & Export PDF
            </Button>
          </div>

          {/* Farm Quick Stats Preview */}
          {selectedFarmId && (
            <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
              {[
                { label: 'Crops', value: crops.filter(c => c.farm_id === selectedFarmId).length },
                { label: 'Pest Records', value: pestObservations.filter(p => p.farm_id === selectedFarmId).length },
                { label: 'IPM Decisions', value: ipmRecords.filter(i => i.farm_id === selectedFarmId).length },
                { label: 'Spray Logs', value: pesticideApplications.filter(a => a.farm_id === selectedFarmId).length },
                { label: 'Organic Inputs', value: inputs.filter(i => i.farm_id === selectedFarmId).length },
                { label: 'Soil Tests', value: soilTests.filter(s => s.farm_id === selectedFarmId).length },
              ].map(s => (
                <div key={s.label} className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">{s.label}</span>
                  <span className="font-bold text-slate-900 text-base">{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Saved Reports Ledger */}
      <div>
        <h3 className="font-bold text-slate-900 text-sm mb-3">
          Saved Reports History ({reports.length})
        </h3>

        {reports.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-10 h-10 text-slate-300" />}
            title="No reports generated yet"
            description="Generate a Crop Protection, Organic Farming, or Operations Summary report above. Generated reports will be archived here for instant review and printing."
          />
        ) : (
          <div className="space-y-3">
            {reports.map(r => {
              const isExpanded = expandedReportId === r.id;
              const rd = r.report_data;
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-slate-900 text-sm truncate">{r.report_title}</p>
                          {getReportTypeBadge(rd?.report_type)}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {r.farm_name} · Generated{' '}
                          {new Date(r.generated_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setExpandedReportId(isExpanded ? null : r.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                        title={isExpanded ? 'Collapse' : 'Expand summary'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Printer className="w-3.5 h-3.5" />}
                        onClick={() => handlePrint(r)}
                      >
                        Print / PDF
                      </Button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Delete report"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Report Details */}
                  {isExpanded && rd && (
                    <div className="border-t border-slate-100 px-4 py-4 bg-slate-50/50 space-y-4">
                      {/* Metric cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        {[
                          { label: 'Crops Logged', value: rd.crops?.length ?? '—' },
                          { label: 'Pest Observations', value: rd.pestObservationsCount ?? '—' },
                          { label: 'IPM Interventions', value: rd.ipmRecordsCount ?? '—' },
                          { label: 'Sprays Recorded', value: rd.pesticideApplicationsCount ?? 0 },
                          { label: 'Organic Practices', value: rd.sustainabilityIndicators?.organicPracticesCount ?? 0 },
                          { label: 'Soil Tests', value: rd.soilTestsCount ?? '—' },
                          { label: 'Waste Recycled', value: `${rd.wasteRecycledKg ?? 0} kg` },
                          { label: 'Total Expenses', value: `₹${(rd.totalExpenses ?? 0).toLocaleString('en-IN')}` },
                        ].map(s => (
                          <div key={s.label} className="bg-white rounded-xl p-2.5 border border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">{s.label}</span>
                            <span className="font-bold text-slate-900">{s.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* If crop protection report, show outcomes summary */}
                      {rd.cropProtectionDetails?.outcomes && rd.cropProtectionDetails.outcomes.length > 0 && (
                        <div className="bg-white rounded-xl p-3 border border-slate-200">
                          <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center">
                            <Bug className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                            Pest Treatment Outcomes Register
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead>
                                <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase">
                                  <th className="py-1 px-2">Date</th>
                                  <th className="py-1 px-2">Pest</th>
                                  <th className="py-1 px-2">Initial</th>
                                  <th className="py-1 px-2">Action Taken</th>
                                  <th className="py-1 px-2">Outcome</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rd.cropProtectionDetails.outcomes.slice(0, 5).map((o, oIdx) => (
                                  <tr key={oIdx} className="border-b border-slate-50">
                                    <td className="py-1.5 px-2 text-slate-600">{o.date}</td>
                                    <td className="py-1.5 px-2 font-medium text-slate-800">{o.pestName}</td>
                                    <td className="py-1.5 px-2 capitalize">{o.initialSeverity}</td>
                                    <td className="py-1.5 px-2 text-slate-600 truncate max-w-xs">{o.actionTaken}</td>
                                    <td className="py-1.5 px-2 font-semibold text-emerald-700">{o.outcome}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default ReportsPage;
