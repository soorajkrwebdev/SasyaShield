import { supabase } from '../lib/supabase';
import {
  Farm,
  UserProfile,
  FarmCrop,
  CropActivity,
  FarmInput,
  PestObservation,
  IPMRecord,
  PesticideApplication,
  PestFollowUp,
  SoilTest,
  WaterTest,
  FarmWaste,
  CompostBatch,
  FarmExpense,
  CropHarvest,
  FarmReportRecord,
  FarmReportData,
  ReportType,
  CropProtectionOutcome,
} from '../types';

export interface GenerateReportParams {
  userId: string;
  farm: Farm;
  farmer: UserProfile | null;
  reportType?: ReportType;
  crops: FarmCrop[];
  activities: CropActivity[];
  inputs: FarmInput[];
  expenses: FarmExpense[];
  pestObservations: PestObservation[];
  ipmRecords: IPMRecord[];
  pesticideApplications: PesticideApplication[];
  pestFollowUps: PestFollowUp[];
  soilTests: SoilTest[];
  waterTests: WaterTest[];
  waste: FarmWaste[];
  compost: CompostBatch[];
  harvests: CropHarvest[];
}

export function compileFarmReportData(params: GenerateReportParams): FarmReportData {
  const farmId = params.farm.id;
  const reportType = params.reportType || 'farm_operations';

  const farmCrops = params.crops.filter(c => c.farm_id === farmId);
  const farmActivities = params.activities.filter(a => a.farm_id === farmId);
  const farmInputs = params.inputs.filter(i => i.farm_id === farmId);
  const farmExpenses = params.expenses.filter(e => e.farm_id === farmId);
  const farmPests = params.pestObservations.filter(p => p.farm_id === farmId);
  const farmIpm = params.ipmRecords.filter(r => r.farm_id === farmId);
  const farmApps = params.pesticideApplications.filter(a => a.farm_id === farmId);
  const farmFollowUps = params.pestFollowUps.filter(f => f.farm_id === farmId);
  const farmSoil = params.soilTests.filter(s => s.farm_id === farmId);
  const farmWater = params.waterTests.filter(w => w.farm_id === farmId);
  const farmWaste = params.waste.filter(w => w.farm_id === farmId);
  const farmCompost = params.compost.filter(c => c.farm_id === farmId);
  const farmHarvests = params.harvests.filter(h => h.farm_id === farmId);

  const organicActs = farmActivities.filter(a =>
    ['Organic manure', 'Biofertilizer application', 'Mulching', 'Weeding', 'Compost application'].includes(a.activity_type)
  );

  const organicInps = farmInputs.filter(i =>
    ['Organic manure', 'Biofertilizers', 'Biological inputs', 'Botanical inputs'].includes(i.category)
  );

  const totalExpenseAmount = farmExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalWasteRecycled = farmWaste
    .filter(w => w.status === 'composted' || w.status === 'applied')
    .reduce((s, w) => s + (Number(w.quantity) || 0), 0);

  const totalCompostProduced = farmCompost
    .filter(c => c.status === 'finished')
    .reduce((s, c) => s + (Number(c.finished_quantity) || 0), 0);

  const totalHarvestAmount = farmHarvests.reduce((s, h) => s + (Number(h.quantity) || 0), 0);

  // Derive outcomes for crop protection
  const cropMap = new Map<string, string>();
  farmCrops.forEach(c => cropMap.set(c.id, c.crop_name));

  const outcomes: CropProtectionOutcome[] = farmPests.map(obs => {
    const cropName = obs.crop_id ? (cropMap.get(obs.crop_id) || 'Crop') : 'Crop';
    const relatedFollowUp = farmFollowUps.find(f => f.pest_observation_id === obs.id);
    const relatedIpm = farmIpm.find(i => i.pest_observation_id === obs.id);
    const relatedApp = farmApps.find(a => a.pest_observation_id === obs.id);

    let actionTaken = 'Monitored / Cultural Control';
    if (relatedApp) {
      actionTaken = `Chemical / Botanical Spray: ${relatedApp.product_name || 'Treatment'}`;
    } else if (relatedIpm) {
      actionTaken = `IPM Intervention: ${relatedIpm.advisory_level} (${relatedIpm.recommendation})`;
    }

    let outcomeStr = 'Monitoring Ongoing';
    if (relatedFollowUp) {
      outcomeStr = relatedFollowUp.outcome || `Post-check: ${relatedFollowUp.severity_after_treatment || 'Assessed'}`;
    }

    return {
      pestName: obs.pest_name,
      cropName,
      initialSeverity: obs.severity,
      finalSeverity: relatedFollowUp?.severity_after_treatment,
      outcome: outcomeStr,
      actionTaken,
      date: obs.observation_date,
    };
  });

  return {
    report_type: reportType,
    farmer: {
      name: params.farmer?.full_name || 'Farmer',
      phone: params.farmer?.phone,
      location: [params.farmer?.village, params.farmer?.district, params.farmer?.state]
        .filter(Boolean)
        .join(', '),
      farmingType: params.farmer?.farming_type || 'Sustainable Agriculture',
    },
    farm: {
      name: params.farm.name,
      area: params.farm.area,
      areaUnit: params.farm.area_unit,
      location: params.farm.location,
      farmingMethod: params.farm.farming_method,
      organicStatus: params.farm.organic_status,
    },
    crops: farmCrops,
    activitiesCount: farmActivities.length,
    inputsCount: farmInputs.length,
    totalExpenses: totalExpenseAmount,
    pestObservationsCount: farmPests.length,
    ipmRecordsCount: farmIpm.length,
    pesticideApplicationsCount: farmApps.length,
    pestFollowUpsCount: farmFollowUps.length,
    soilTestsCount: farmSoil.length,
    waterTestsCount: farmWater.length,
    wasteRecycledKg: totalWasteRecycled,
    compostProducedKg: totalCompostProduced,
    harvestsCount: farmHarvests.length,
    totalHarvestQty: totalHarvestAmount,
    sustainabilityIndicators: {
      organicPracticesCount: organicActs.length,
      organicInputUsagePercent:
        farmInputs.length > 0
          ? Math.round((organicInps.length / farmInputs.length) * 100)
          : 100,
      wasteRecycledKg: totalWasteRecycled,
      ipmDecisionsCount: farmIpm.length,
      soilTestCount: farmSoil.length,
    },
    cropProtectionDetails: {
      observations: farmPests,
      ipmActions: farmIpm,
      applications: farmApps,
      followUps: farmFollowUps,
      outcomes,
    },
    organicSummaryDetails: {
      organicPractices: organicActs,
      organicInputs: organicInps,
      compostBatches: farmCompost,
      wasteRecycled: farmWaste,
      soilTests: farmSoil,
    },
    farmOperationsDetails: {
      activities: farmActivities,
      inputs: farmInputs,
      expenses: farmExpenses,
      harvests: farmHarvests,
    },
  };
}

export async function saveFarmReport(
  userId: string,
  farmId: string,
  title: string,
  reportData: FarmReportData
): Promise<{ data?: FarmReportRecord; error?: string }> {
  if (!supabase || !userId) return { error: 'Authentication required' };

  try {
    const { data, error } = await supabase
      .from('farm_reports')
      .insert({
        user_id: userId,
        farm_id: farmId,
        report_title: title,
        report_data: reportData as any,
      })
      .select('*, farms(name)')
      .single();

    if (error) return { error: error.message };
    return {
      data: {
        ...data,
        farm_name: data.farms?.name || 'Farm',
      },
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function fetchFarmReports(userId: string): Promise<FarmReportRecord[]> {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('farm_reports')
      .select('*, farms(name)')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false });

    if (error) {
      console.warn('Notice fetching farm_reports:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      ...row,
      farm_name: row.farms?.name || 'Farm',
    }));
  } catch (err) {
    console.error('Failed to load farm reports:', err);
    return [];
  }
}

/**
 * Triggers standard browser PDF printable document layout for farm report export
 */
export function exportReportToPdf(report: FarmReportData, reportTitle: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export the report PDF.');
    return;
  }

  const reportType = report.report_type || 'farm_operations';

  let specificSectionsHtml = '';

  if (reportType === 'crop_protection') {
    const details = report.cropProtectionDetails;
    specificSectionsHtml = `
      <div class="section">
        <div class="section-title">Plant Protection & IPM Performance Ledger</div>
        <div class="grid">
          <div class="card"><div class="card-label">Pest Observations</div><div class="card-value">${report.pestObservationsCount}</div></div>
          <div class="card"><div class="card-label">IPM Decisions Taken</div><div class="card-value">${report.ipmRecordsCount}</div></div>
          <div class="card"><div class="card-label">Pesticide Sprays Logged</div><div class="card-value">${report.pesticideApplicationsCount || 0}</div></div>
          <div class="card"><div class="card-label">Follow-up Audits</div><div class="card-value">${report.pestFollowUpsCount || 0}</div></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">1. Pest Observations & Diagnostic Register (${details?.observations.length || 0})</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Pest / Disease</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Symptoms</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${
              !details?.observations || details.observations.length === 0
                ? '<tr><td colspan="6" class="empty">No pest observations recorded.</td></tr>'
                : details.observations.map(o => `
                  <tr>
                    <td>${o.observation_date}</td>
                    <td><strong>${o.pest_name}</strong></td>
                    <td style="text-transform: capitalize;">${o.pest_type}</td>
                    <td><span class="badge badge-${o.severity}">${o.severity}</span></td>
                    <td>${o.symptoms || '-'}</td>
                    <td>${o.notes || '-'}</td>
                  </tr>
                `).join('')
            }
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">2. IPM Decision & Cultural/Bio Interventions (${details?.ipmActions.length || 0})</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Advisory Level</th>
              <th>Recommendation</th>
              <th>Target Pest</th>
              <th>Source / Guidance</th>
            </tr>
          </thead>
          <tbody>
            ${
              !details?.ipmActions || details.ipmActions.length === 0
                ? '<tr><td colspan="5" class="empty">No IPM actions recorded.</td></tr>'
                : details.ipmActions.map(i => `
                  <tr>
                    <td>${i.created_at ? i.created_at.slice(0, 10) : '-'}</td>
                    <td><strong style="text-transform: capitalize;">${i.advisory_level}</strong></td>
                    <td>${i.recommendation}</td>
                    <td>${i.pest_name || '-'}</td>
                    <td>${i.source_name || '-'}</td>
                  </tr>
                `).join('')
            }
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">3. Pesticide & Biopesticide Applications (${details?.applications.length || 0})</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Product / Active</th>
              <th>Quantity & Area</th>
              <th>PHI (Days)</th>
              <th>REI (Hours)</th>
              <th>Target Pest</th>
            </tr>
          </thead>
          <tbody>
            ${
              !details?.applications || details.applications.length === 0
                ? '<tr><td colspan="6" class="empty">No pesticide spray records logged.</td></tr>'
                : details.applications.map(a => `
                  <tr>
                    <td>${a.application_date}</td>
                    <td><strong>${a.product_name}</strong>${a.active_ingredient ? ` (${a.active_ingredient})` : ''}</td>
                    <td>${a.quantity} ${a.unit} over ${a.area} ${a.area_unit || 'acres'}</td>
                    <td>${a.pre_harvest_interval_days ?? '-'}</td>
                    <td>${a.re_entry_interval_hours ?? '-'}</td>
                    <td>${a.pest_name || '-'}</td>
                  </tr>
                `).join('')
            }
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">4. Treatment Outcomes & Follow-up Assessments (${details?.outcomes.length || 0})</div>
        <table>
          <thead>
            <tr>
              <th>Observation Date</th>
              <th>Pest / Disease</th>
              <th>Crop</th>
              <th>Initial Severity</th>
              <th>Action Taken</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            ${
              !details?.outcomes || details.outcomes.length === 0
                ? '<tr><td colspan="6" class="empty">No follow-up outcome data available.</td></tr>'
                : details.outcomes.map(out => `
                  <tr>
                    <td>${out.date}</td>
                    <td><strong>${out.pestName}</strong></td>
                    <td>${out.cropName}</td>
                    <td><span class="badge badge-${out.initialSeverity}">${out.initialSeverity}</span></td>
                    <td>${out.actionTaken}</td>
                    <td><strong>${out.outcome}</strong></td>
                  </tr>
                `).join('')
            }
          </tbody>
        </table>
      </div>
    `;
  } else if (reportType === 'organic_summary') {
    const details = report.organicSummaryDetails;
    specificSectionsHtml = `
      <div class="section">
        <div class="section-title">Organic & Ecological Compliance Metrics</div>
        <div class="grid">
          <div class="card"><div class="card-label">Organic Practices</div><div class="card-value">${report.sustainabilityIndicators.organicPracticesCount}</div></div>
          <div class="card"><div class="card-label">Organic Input Ratio</div><div class="card-value">${report.sustainabilityIndicators.organicInputUsagePercent}%</div></div>
          <div class="card"><div class="card-label">Compost Produced</div><div class="card-value">${report.compostProducedKg} kg</div></div>
          <div class="card"><div class="card-label">Waste Recycled</div><div class="card-value">${report.wasteRecycledKg} kg</div></div>
          <div class="card"><div class="card-label">Soil Health Tests</div><div class="card-value">${report.soilTestsCount}</div></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">1. Natural & Organic Practices Register (${details?.organicPractices.length || 0})</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Activity Type</th>
              <th>Notes / Operations</th>
              <th>Cost (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${
              !details?.organicPractices || details.organicPractices.length === 0
                ? '<tr><td colspan="4" class="empty">No organic practices logged.</td></tr>'
                : details.organicPractices.map(p => `
                  <tr>
                    <td>${p.activity_date}</td>
                    <td><strong>${p.activity_type}</strong></td>
                    <td>${p.notes || '-'}</td>
                    <td>₹${(Number(p.cost) || 0).toLocaleString()}</td>
                  </tr>
                `).join('')
            }
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">2. Organic Inputs & Biofertilizers Utilized (${details?.organicInputs.length || 0})</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Input Name</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Supplier / Source</th>
            </tr>
          </thead>
          <tbody>
            ${
              !details?.organicInputs || details.organicInputs.length === 0
                ? '<tr><td colspan="5" class="empty">No organic inputs logged.</td></tr>'
                : details.organicInputs.map(i => `
                  <tr>
                    <td>${i.purchase_date || i.created_at?.slice(0, 10) || '-'}</td>
                    <td><strong>${i.product_name}</strong></td>
                    <td>${i.category}</td>
                    <td>${i.quantity} ${i.unit}</td>
                    <td>${i.supplier_or_source || 'Farm prepared'}</td>
                  </tr>
                `).join('')
            }
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">3. Compost & Vermicompost Batches (${details?.compostBatches.length || 0})</div>
        <table>
          <thead>
            <tr>
              <th>Compost Type</th>
              <th>Method</th>
              <th>Start Date</th>
              <th>Status</th>
              <th>Output Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${
              !details?.compostBatches || details.compostBatches.length === 0
                ? '<tr><td colspan="5" class="empty">No compost batches recorded.</td></tr>'
                : details.compostBatches.map(b => `
                  <tr>
                    <td><strong style="text-transform: capitalize;">${b.compost_type.replace('_', ' ')}</strong></td>
                    <td>${b.processing_method || 'Standard aerobic'}</td>
                    <td>${b.start_date}</td>
                    <td style="text-transform: capitalize;">${b.status}</td>
                    <td>${b.finished_quantity ? b.finished_quantity + ' ' + b.unit : 'In process'}</td>
                  </tr>
                `).join('')
            }
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">4. Soil Health Diagnostic History (${details?.soilTests.length || 0})</div>
        <table>
          <thead>
            <tr>
              <th>Test Date</th>
              <th>Lab Name</th>
              <th>pH</th>
              <th>Organic Carbon (OC %)</th>
              <th>Nitrogen (N)</th>
              <th>Phosphorus (P)</th>
              <th>Potassium (K)</th>
            </tr>
          </thead>
          <tbody>
            ${
              !details?.soilTests || details.soilTests.length === 0
                ? '<tr><td colspan="7" class="empty">No soil test records uploaded.</td></tr>'
                : details.soilTests.map(s => `
                  <tr>
                    <td>${s.test_date}</td>
                    <td>${s.lab_name || 'Govt Soil Lab'}</td>
                    <td>${s.ph ?? '-'}</td>
                    <td><strong>${s.organic_carbon ? s.organic_carbon + '%' : '-'}</strong></td>
                    <td>${s.nitrogen ? s.nitrogen + ' kg/ha' : '-'}</td>
                    <td>${s.phosphorus ? s.phosphorus + ' kg/ha' : '-'}</td>
                    <td>${s.potassium ? s.potassium + ' kg/ha' : '-'}</td>
                  </tr>
                `).join('')
            }
          </tbody>
        </table>
      </div>
    `;
  } else {
    // Farm Operations Summary
    specificSectionsHtml = `
      <div class="section">
        <div class="section-title">Operations & Ledger Metrics</div>
        <div class="grid">
          <div class="card"><div class="card-label">Active Crops</div><div class="card-value">${report.crops.length}</div></div>
          <div class="card"><div class="card-label">Total Activities</div><div class="card-value">${report.activitiesCount}</div></div>
          <div class="card"><div class="card-label">Recorded Expenses</div><div class="card-value">₹${report.totalExpenses.toLocaleString()}</div></div>
          <div class="card"><div class="card-label">Total Harvest Logged</div><div class="card-value">${report.totalHarvestQty} kg</div></div>
          <div class="card"><div class="card-label">Soil & Water Tests</div><div class="card-value">${report.soilTestsCount + report.waterTestsCount}</div></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">1. Registered Crops on Farm (${report.crops.length})</div>
        <table>
          <thead>
            <tr>
              <th>Crop Name</th>
              <th>Variety</th>
              <th>Growth Stage</th>
              <th>Planted Date</th>
              <th>Area</th>
            </tr>
          </thead>
          <tbody>
            ${
              report.crops.length === 0
                ? '<tr><td colspan="5" class="empty">No crops currently registered on this farm.</td></tr>'
                : report.crops.map(c => `
                  <tr>
                    <td><strong>${c.crop_name}</strong></td>
                    <td>${c.variety || 'Local'}</td>
                    <td>${c.growth_stage}</td>
                    <td>${c.planting_date}</td>
                    <td>${c.area || '-'} ${c.area_unit || ''}</td>
                  </tr>
                `).join('')
            }
          </tbody>
        </table>
      </div>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${reportTitle} - Sasyashield</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; padding: 10px; line-height: 1.4; font-size: 11px; }
          .header { border-bottom: 2px solid #059669; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; }
          .subtitle { font-size: 10px; color: #64748b; margin: 2px 0 0 0; }
          .disclaimer { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 8px 12px; border-radius: 6px; font-size: 9.5px; color: #166534; margin-bottom: 14px; }
          .section { margin-bottom: 16px; }
          .section-title { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #059669; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; }
          .card-label { font-size: 8.5px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .card-value { font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 1px; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px; }
          th { background: #f1f5f9; text-align: left; padding: 5px 8px; font-size: 9px; font-weight: 700; color: #475569; border: 1px solid #cbd5e1; }
          td { padding: 5px 8px; border: 1px solid #cbd5e1; }
          .empty { text-align: center; color: #94a3b8; font-style: italic; }
          .badge { padding: 1px 5px; border-radius: 4px; font-size: 8.5px; font-weight: 600; text-transform: uppercase; }
          .badge-low { background: #ecfdf5; color: #065f46; }
          .badge-medium { background: #fffbeb; color: #92400e; }
          .badge-high, .badge-critical { background: #fef2f2; color: #991b1b; }
          .badge-none { background: #f3f4f6; color: #374151; }
          .signatures { display: flex; justify-content: space-between; margin-top: 25px; padding-top: 20px; border-top: 1px dashed #cbd5e1; font-size: 10px; }
          .sig-box { text-align: center; width: 180px; }
          .sig-line { border-bottom: 1px solid #94a3b8; margin-bottom: 4px; height: 30px; }
          .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${reportTitle}</h1>
            <p class="subtitle">Generated by Sasyashield Crop Protection Intelligence Platform on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
          <div style="text-align: right;">
            <strong>${report.farm.name}</strong><br/>
            <span>${report.farm.area} ${report.farm.areaUnit} • ${report.farm.location}</span><br/>
            <span style="color: #64748b; font-size: 9px;">Method: ${report.farm.farmingMethod}</span>
          </div>
        </div>

        <div class="disclaimer">
          <strong>Official Records Notice:</strong> This document represents a compiled farm operations ledger verified against authenticated database records. Pesticide dosages, waiting periods (PHI), and organic nutrition records reflect internal farm management logs and do not constitute independent laboratory certification or NPOP/APEDA organic certification without third-party accredited auditing.
        </div>

        <div class="section">
          <div class="section-title">Farm & Farmer Overview</div>
          <div class="grid">
            <div class="card"><div class="card-label">Farmer Name</div><div class="card-value">${report.farmer.name}</div></div>
            <div class="card"><div class="card-label">Location</div><div class="card-value" style="font-size: 11px;">${report.farmer.location || report.farm.location}</div></div>
            <div class="card"><div class="card-label">Farming Method</div><div class="card-value" style="text-transform: capitalize;">${report.farm.farmingMethod}</div></div>
            <div class="card"><div class="card-label">Organic Status</div><div class="card-value" style="text-transform: capitalize;">${report.farm.organicStatus.replace('_', ' ')}</div></div>
          </div>
        </div>

        ${specificSectionsHtml}

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line"></div>
            <strong>${report.farmer.name}</strong><br/>
            <span>Farmer / Farm Manager</span>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <strong>Agricultural Officer / Verifier</strong><br/>
            <span>Seal & Signature</span>
          </div>
        </div>

        <div class="footer">
          Sasyashield Platform • Grounded Farm Intelligence & Digital Records • Page 1 of 1
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
