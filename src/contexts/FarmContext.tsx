import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Farm,
  FarmCrop,
  CropActivity,
  FarmInput,
  OrganicInput,
  CropOrganicInput,
  PestObservation,
  IPMRecord,
  PesticideApplication,
  PestAdvisory,
  PestFollowUp,
  SoilTest,
  WaterTest,
  LabReport,
  FarmWaste,
  CompostBatch,
  FarmExpense,
  CropHarvest,
} from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------
interface FarmContextType {
  // State
  farms: Farm[];
  crops: FarmCrop[];
  activities: CropActivity[];
  inputs: FarmInput[];
  organicInputs: OrganicInput[];
  cropOrganicInputs: CropOrganicInput[];
  pestObservations: PestObservation[];
  ipmRecords: IPMRecord[];
  pesticideApplications: PesticideApplication[];
  pesticideAdvisories: PestAdvisory[];
  pestFollowUps: PestFollowUp[];
  soilTests: SoilTest[];
  waterTests: WaterTest[];
  labReports: LabReport[];
  farmWaste: FarmWaste[];
  compostBatches: CompostBatch[];
  expenses: FarmExpense[];
  harvests: CropHarvest[];
  selectedFarmId: string | null;
  selectedFarm: Farm | null;
  loading: boolean;
  error: string | null;

  setSelectedFarmId: (id: string | null) => void;
  refreshData: () => Promise<void>;

  // Farm CRUD
  addFarm: (data: Omit<Farm, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ data?: Farm; error?: string }>;
  updateFarm: (id: string, data: Partial<Farm>) => Promise<{ data?: Farm; error?: string }>;
  deleteFarm: (id: string) => Promise<{ error?: string }>;

  // Crop CRUD
  addCrop: (data: Omit<FarmCrop, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ data?: FarmCrop; error?: string }>;
  updateCrop: (id: string, data: Partial<FarmCrop>) => Promise<{ data?: FarmCrop; error?: string }>;
  deleteCrop: (id: string) => Promise<{ error?: string }>;

  // Activity CRUD
  addActivity: (data: Omit<CropActivity, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ data?: CropActivity; error?: string }>;
  updateActivity: (id: string, data: Partial<CropActivity>) => Promise<{ data?: CropActivity; error?: string }>;
  deleteActivity: (id: string) => Promise<{ error?: string }>;

  // Input CRUD
  addInput: (data: Omit<FarmInput, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ data?: FarmInput; error?: string }>;
  updateInput: (id: string, data: Partial<FarmInput>) => Promise<{ data?: FarmInput; error?: string }>;
  deleteInput: (id: string) => Promise<{ error?: string }>;

  // Pest Observation CRUD
  addPestObservation: (data: Omit<PestObservation, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ data?: PestObservation; error?: string }>;
  updatePestObservation: (id: string, data: Partial<PestObservation>) => Promise<{ data?: PestObservation; error?: string }>;
  deletePestObservation: (id: string) => Promise<{ error?: string }>;

  // IPM Record
  addIPMRecord: (data: Omit<IPMRecord, 'id' | 'user_id' | 'created_at'>) => Promise<{ data?: IPMRecord; error?: string }>;
  deleteIPMRecord: (id: string) => Promise<{ error?: string }>;

  // Pesticide Application
  addPesticideApplication: (data: Omit<PesticideApplication, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ data?: PesticideApplication; error?: string }>;
  deletePesticideApplication: (id: string) => Promise<{ error?: string }>;

  // Pest Follow-up CRUD
  addPestFollowUp: (data: Omit<PestFollowUp, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ data?: PestFollowUp; error?: string }>;
  updatePestFollowUp: (id: string, data: Partial<PestFollowUp>) => Promise<{ data?: PestFollowUp; error?: string }>;
  deletePestFollowUp: (id: string) => Promise<{ error?: string }>;

  // Soil Test CRUD
  addSoilTest: (data: Omit<SoilTest, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ data?: SoilTest; error?: string }>;
  updateSoilTest: (id: string, data: Partial<SoilTest>) => Promise<{ data?: SoilTest; error?: string }>;
  deleteSoilTest: (id: string) => Promise<{ error?: string }>;

  // Water Test CRUD
  addWaterTest: (data: Omit<WaterTest, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ data?: WaterTest; error?: string }>;
  updateWaterTest: (id: string, data: Partial<WaterTest>) => Promise<{ data?: WaterTest; error?: string }>;
  deleteWaterTest: (id: string) => Promise<{ error?: string }>;

  // Lab Report CRUD
  addLabReport: (data: Omit<LabReport, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ data?: LabReport; error?: string }>;
  updateLabReport: (id: string, data: Partial<LabReport>) => Promise<{ data?: LabReport; error?: string }>;
  deleteLabReport: (id: string) => Promise<{ error?: string }>;

  // Farm Waste CRUD
  addFarmWaste: (data: Omit<FarmWaste, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ data?: FarmWaste; error?: string }>;
  updateFarmWaste: (id: string, data: Partial<FarmWaste>) => Promise<{ data?: FarmWaste; error?: string }>;
  deleteFarmWaste: (id: string) => Promise<{ error?: string }>;

  // Compost Batch CRUD
  addCompostBatch: (data: Omit<CompostBatch, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ data?: CompostBatch; error?: string }>;
  updateCompostBatch: (id: string, data: Partial<CompostBatch>) => Promise<{ data?: CompostBatch; error?: string }>;
  deleteCompostBatch: (id: string) => Promise<{ error?: string }>;

  // Expenses CRUD
  addExpense: (data: Omit<FarmExpense, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ data?: FarmExpense; error?: string }>;
  updateExpense: (id: string, data: Partial<FarmExpense>) => Promise<{ data?: FarmExpense; error?: string }>;
  deleteExpense: (id: string) => Promise<{ error?: string }>;

  // Harvests CRUD
  addHarvest: (data: Omit<CropHarvest, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ data?: CropHarvest; error?: string }>;
  updateHarvest: (id: string, data: Partial<CropHarvest>) => Promise<{ data?: CropHarvest; error?: string }>;
  deleteHarvest: (id: string) => Promise<{ error?: string }>;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Helper: safe Supabase query – returns [] on table-not-found (42P01)
// ---------------------------------------------------------------------------
async function safeSelect<T>(
  query: PromiseLike<{ data: T[] | null; error: { code?: string; message: string } | null }>
): Promise<T[]> {
  const { data, error } = await query;
  if (error) {
    if (error.code === '42P01') {
      // Table does not exist yet (migration pending) – return empty array
      console.warn('[FarmContext] Table not found:', error.message);
      return [];
    }
    throw new Error(error.message);
  }
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const FarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [crops, setCrops] = useState<FarmCrop[]>([]);
  const [activities, setActivities] = useState<CropActivity[]>([]);
  const [inputs, setInputs] = useState<FarmInput[]>([]);
  const [organicInputs, setOrganicInputs] = useState<OrganicInput[]>([]);
  const [cropOrganicInputs, setCropOrganicInputs] = useState<CropOrganicInput[]>([]);
  const [pestObservations, setPestObservations] = useState<PestObservation[]>([]);
  const [ipmRecords, setIpmRecords] = useState<IPMRecord[]>([]);
  const [pesticideApplications, setPesticideApplications] = useState<PesticideApplication[]>([]);
  const [pesticideAdvisories, setPesticideAdvisories] = useState<PestAdvisory[]>([]);
  const [pestFollowUps, setPestFollowUps] = useState<PestFollowUp[]>([]);
  const [soilTests, setSoilTests] = useState<SoilTest[]>([]);
  const [waterTests, setWaterTests] = useState<WaterTest[]>([]);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [farmWaste, setFarmWaste] = useState<FarmWaste[]>([]);
  const [compostBatches, setCompostBatches] = useState<CompostBatch[]>([]);
  const [expenses, setExpenses] = useState<FarmExpense[]>([]);
  const [harvests, setHarvests] = useState<CropHarvest[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ------------------------------------------------------------------
  // refreshData — fetch all user data from Supabase.
  // If the user is not logged in or Supabase is null, clear state.
  // NEVER falls back to demo/mock data for authenticated users.
  // ------------------------------------------------------------------
  const refreshData = useCallback(async () => {    if (!supabase || !user) {
      setFarms([]);
      setCrops([]);
      setActivities([]);
      setInputs([]);
      setPestObservations([]);
      setIpmRecords([]);
      setPesticideApplications([]);
      setPestFollowUps([]);
      setSoilTests([]);
      setWaterTests([]);
      setLabReports([]);
      setFarmWaste([]);
      setCompostBatches([]);
      setExpenses([]);
      setHarvests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ---- Private farmer data ----
      const [
        farmsData,
        cropsData,
        actsData,
        inpsData,
        pestData,
        ipmData,
        pestAppData,
        pestFollowUpsData,
        soilData,
        waterData,
        labData,
        wasteData,
        compostData,
        expensesData,
        harvestsData,
      ] = await Promise.all([
        // farms
        safeSelect<Farm>(
          supabase.from('farms').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        ),
        // farm_crops
        safeSelect<any>(
          supabase.from('farm_crops').select('*, farms(name)').eq('user_id', user.id).order('planting_date', { ascending: false })
        ),
        // crop_activities
        safeSelect<any>(
          supabase.from('crop_activities').select('*, farms(name), farm_crops(crop_name)').eq('user_id', user.id).order('activity_date', { ascending: false })
        ),
        // farm_inputs
        safeSelect<any>(
          supabase.from('farm_inputs').select('*, farms(name), farm_crops(crop_name)').eq('user_id', user.id).order('purchase_date', { ascending: false })
        ),
        // pest_observations
        safeSelect<any>(
          supabase.from('pest_observations').select('*, farms(name), farm_crops(crop_name)').eq('user_id', user.id).order('observation_date', { ascending: false })
        ),
        // ipm_records
        safeSelect<any>(
          supabase.from('ipm_records').select('*, farms(name), farm_crops(crop_name)').eq('user_id', user.id).order('created_at', { ascending: false })
        ),
        // pesticide_applications
        safeSelect<any>(
          supabase.from('pesticide_applications').select('*, farms(name), farm_crops(crop_name), pest_observations(pest_name)').eq('user_id', user.id).order('application_date', { ascending: false })
        ),
        // pest_follow_ups
        safeSelect<any>(
          supabase.from('pest_follow_ups').select('*, farms(name), farm_crops(crop_name), pest_observations(pest_name)').eq('user_id', user.id).order('follow_up_date', { ascending: false })
        ),
        // soil_tests
        safeSelect<any>(
          supabase.from('soil_tests').select('*, farms(name)').eq('user_id', user.id).order('test_date', { ascending: false })
        ),
        // water_tests
        safeSelect<any>(
          supabase.from('water_tests').select('*, farms(name)').eq('user_id', user.id).order('test_date', { ascending: false })
        ),
        // lab_reports
        safeSelect<any>(
          supabase.from('lab_reports').select('*, farms(name)').eq('user_id', user.id).order('issue_date', { ascending: false })
        ),
        // farm_waste
        safeSelect<any>(
          supabase.from('farm_waste').select('*, farms(name), farm_crops(crop_name)').eq('user_id', user.id).order('collection_date', { ascending: false })
        ),
        // compost_batches
        safeSelect<any>(
          supabase.from('compost_batches').select('*, farms(name), farm_crops(crop_name)').eq('user_id', user.id).order('start_date', { ascending: false })
        ),
        // farm_expenses
        safeSelect<any>(
          supabase.from('farm_expenses').select('*, farms(name), farm_crops(crop_name)').eq('user_id', user.id).order('expense_date', { ascending: false })
        ),
        // crop_harvests
        safeSelect<any>(
          supabase.from('crop_harvests').select('*, farms(name), farm_crops(crop_name)').eq('user_id', user.id).order('harvest_date', { ascending: false })
        ),
      ]);

      // ---- Public knowledge data ----
      const [orgData, coiData, advisoriesData] = await Promise.all([
        safeSelect<OrganicInput>(
          supabase.from('organic_inputs').select('*').order('name')
        ),
        safeSelect<any>(
          supabase.from('crop_organic_inputs').select('*, organic_inputs(*)')
        ),
        // pesticide_advisories (include new provenance + phi/rei columns)
        safeSelect<PestAdvisory>(
          supabase
            .from('pesticide_advisories')
            .select(`
              id,crop,pest_or_disease,control_category,recommendation,active_ingredient,product_information,application_information,safety_information,source_name,source_url,last_verified,verification_status,source_document_title,source_document_date,source_page,source_reference,verified_by,verified_at,phi_days,rei_hours,created_at,updated_at
            `)
            .order('crop')
        ),
      ]);

      // Flatten joined fields
      const flatCrops: FarmCrop[] = cropsData.map((c: any) => ({
        ...c,
        farm_name: c.farms?.name ?? '',
        farms: undefined,
      }));

      const flatActs: CropActivity[] = actsData.map((a: any) => ({
        ...a,
        farm_name: a.farms?.name ?? '',
        crop_name: a.farm_crops?.crop_name ?? '',
        farms: undefined,
        farm_crops: undefined,
      }));

      const flatInps: FarmInput[] = inpsData.map((i: any) => ({
        ...i,
        farm_name: i.farms?.name ?? '',
        crop_name: i.farm_crops?.crop_name ?? '',
        farms: undefined,
        farm_crops: undefined,
      }));

      const flatPest: PestObservation[] = pestData.map((p: any) => ({
        ...p,
        farm_name: p.farms?.name ?? '',
        crop_name: p.farm_crops?.crop_name ?? '',
        farms: undefined,
        farm_crops: undefined,
      }));

      const flatIpm: IPMRecord[] = ipmData.map((r: any) => ({
        ...r,
        farm_name: r.farms?.name ?? '',
        crop_name: r.farm_crops?.crop_name ?? '',
        farms: undefined,
        farm_crops: undefined,
      }));

      const flatPestApp: PesticideApplication[] = pestAppData.map((a: any) => ({
        ...a,
        farm_name: a.farms?.name ?? '',
        crop_name: a.farm_crops?.crop_name ?? '',
        pest_name: a.pest_observations?.pest_name ?? '',
        farms: undefined,
        farm_crops: undefined,
        pest_observations: undefined,
      }));

      const flatPestFollowUps: PestFollowUp[] = pestFollowUpsData.map((f: any) => ({
        ...f,
        farm_name: f.farms?.name ?? '',
        crop_name: f.farm_crops?.crop_name ?? '',
        pest_name: f.pest_observations?.pest_name ?? '',
        farms: undefined,
        farm_crops: undefined,
        pest_observations: undefined,
      }));

      const flatSoil: SoilTest[] = soilData.map((s: any) => ({
        ...s,
        farm_name: s.farms?.name ?? '',
        farms: undefined,
      }));

      const flatWater: WaterTest[] = waterData.map((w: any) => ({
        ...w,
        farm_name: w.farms?.name ?? '',
        farms: undefined,
      }));

      const flatLabReports: LabReport[] = labData.map((r: any) => ({
        ...r,
        farm_name: r.farms?.name ?? '',
        farms: undefined,
      }));

      const flatWaste: FarmWaste[] = wasteData.map((w: any) => ({
        ...w,
        farm_name: w.farms?.name ?? '',
        crop_name: w.farm_crops?.crop_name ?? '',
        farms: undefined,
        farm_crops: undefined,
      }));

      const flatCompost: CompostBatch[] = compostData.map((c: any) => ({
        ...c,
        farm_name: c.farms?.name ?? '',
        crop_name: c.farm_crops?.crop_name ?? '',
        farms: undefined,
        farm_crops: undefined,
      }));

      const flatExpenses: FarmExpense[] = expensesData.map((e: any) => ({
        ...e,
        farm_name: e.farms?.name ?? '',
        crop_name: e.farm_crops?.crop_name ?? '',
        farms: undefined,
        farm_crops: undefined,
      }));

      const flatHarvests: CropHarvest[] = harvestsData.map((h: any) => ({
        ...h,
        farm_name: h.farms?.name ?? '',
        crop_name: h.farm_crops?.crop_name ?? '',
        farms: undefined,
        farm_crops: undefined,
      }));

      // Set state — empty arrays are correct for a new farmer
      setFarms(farmsData);
      setCrops(flatCrops);
      setActivities(flatActs);
      setInputs(flatInps);
      setPestObservations(flatPest);
      setIpmRecords(flatIpm);
      setPesticideApplications(flatPestApp);
      setPestFollowUps(flatPestFollowUps);
      setSoilTests(flatSoil);
      setWaterTests(flatWater);
      setLabReports(flatLabReports);
      setFarmWaste(flatWaste);
      setCompostBatches(flatCompost);
      setExpenses(flatExpenses);
      setHarvests(flatHarvests);
      setOrganicInputs(orgData);
      setCropOrganicInputs(coiData);
      setPesticideAdvisories(advisoriesData);

      // Auto-select first farm on initial load (only if no farm is currently selected)
      setSelectedFarmId(prev => {
        if (!prev && farmsData.length > 0) return farmsData[0].id;
        // If the previously-selected farm was deleted, switch to the first available
        if (prev && !farmsData.find(f => f.id === prev)) {
          return farmsData.length > 0 ? farmsData[0].id : null;
        }
        return prev;
      });
    } catch (err: any) {
      console.error('[FarmContext] Error fetching farm data:', err);
      setError(err.message ?? 'Failed to load farm data.');
    } finally {
      setLoading(false);
    }
  }, [user]); // selectedFarmId intentionally excluded — refresh fetches all user-owned data

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const selectedFarm = farms.find(f => f.id === selectedFarmId) ?? farms[0] ?? null;

  // ------------------------------------------------------------------
  // Generic helpers
  // ------------------------------------------------------------------
  const assertSupabase = (): typeof supabase & object => {
    if (!supabase || !user) throw new Error('Not authenticated.');
    return supabase;
  };

  // ------------------------------------------------------------------
  // Farm CRUD
  // ------------------------------------------------------------------
  const addFarm = async (data: Omit<Farm, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb.from('farms').insert({ ...data, user_id: user!.id }).select().single();
      if (error) return { error: error.message };
      setFarms(prev => [row, ...prev]);
      setSelectedFarmId(row.id);
      return { data: row };
    } catch (e: any) { return { error: e.message }; }
  };

  const updateFarm = async (id: string, data: Partial<Farm>) => {
    try {
      const sb = assertSupabase();
      // Defense-in-depth: never allow the caller to re-assign ownership or
      // overwrite server-managed columns, even if the type surface is open.
      const { id: _id, user_id: _uid, created_at: _ca, ...changes } = data;
      const { data: row, error } = await sb.from('farms').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) return { error: error.message };
      setFarms(prev => prev.map(f => f.id === id ? row : f));
      return { data: row };
    } catch (e: any) { return { error: e.message }; }
  };

  const deleteFarm = async (id: string) => {
    try {
      const sb = assertSupabase();
      const { error } = await sb.from('farms').delete().eq('id', id);
      if (error) return { error: error.message };
      setFarms(prev => prev.filter(f => f.id !== id));
      setCrops(prev => prev.filter(c => c.farm_id !== id));
      setActivities(prev => prev.filter(a => a.farm_id !== id));
      setInputs(prev => prev.filter(i => i.farm_id !== id));
      if (selectedFarmId === id) {
        const remaining = farms.filter(f => f.id !== id);
        setSelectedFarmId(remaining.length > 0 ? remaining[0].id : null);
      }
      return {};
    } catch (e: any) { return { error: e.message }; }
  };

  // ------------------------------------------------------------------
  // Crop CRUD
  // ------------------------------------------------------------------
  const addCrop = async (data: Omit<FarmCrop, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb.from('farm_crops').insert({ ...data, user_id: user!.id }).select('*, farms(name)').single();
      if (error) return { error: error.message };
      const formatted: FarmCrop = { ...row, farm_name: row.farms?.name ?? '', farms: undefined };
      setCrops(prev => [formatted, ...prev]);
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const updateCrop = async (id: string, data: Partial<FarmCrop>) => {
    try {
      const sb = assertSupabase();
      // Defense-in-depth: immutable identity / ownership fields must never be
      // reassigned via a client UPDATE spread, even if the type surface is
      // open. RLS UPDATE WITH CHECK already guards farm_id cross-user moves;
      // this ensures we never send id/user_id/created_at in the UPDATE body.
      const { id: _id, user_id: _uid, created_at: _ca, ...changes } = data;
      const { data: row, error } = await sb.from('farm_crops').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id).select('*, farms(name)').single();
      if (error) return { error: error.message };
      const formatted: FarmCrop = { ...row, farm_name: row.farms?.name ?? '', farms: undefined };
      setCrops(prev => prev.map(c => c.id === id ? formatted : c));
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const deleteCrop = async (id: string) => {
    try {
      const sb = assertSupabase();
      const { error } = await sb.from('farm_crops').delete().eq('id', id);
      if (error) return { error: error.message };
      setCrops(prev => prev.filter(c => c.id !== id));
      return {};
    } catch (e: any) { return { error: e.message }; }
  };

  // ------------------------------------------------------------------
  // Activity CRUD
  // ------------------------------------------------------------------
  const addActivity = async (data: Omit<CropActivity, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb.from('crop_activities').insert({ ...data, user_id: user!.id }).select('*, farms(name), farm_crops(crop_name)').single();
      if (error) return { error: error.message };
      const formatted: CropActivity = { ...row, farm_name: row.farms?.name ?? '', crop_name: row.farm_crops?.crop_name ?? '', farms: undefined, farm_crops: undefined };
      setActivities(prev => [formatted, ...prev]);
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const updateActivity = async (id: string, data: Partial<CropActivity>) => {
    try {
      const sb = assertSupabase();
      // Defense-in-depth: strip immutable ownership columns from the UPDATE
      // spread. RLS UPDATE WITH CHECK guards cross-user moves of farm_id;
      // additionally prevent a direct user_id reassignment or id/created_at
      // overwrite even if the type surface permits it.
      const { id: _id, user_id: _uid, created_at: _ca, ...changes } = data;
      const { data: row, error } = await sb.from('crop_activities').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id).select('*, farms(name), farm_crops(crop_name)').single();
      if (error) return { error: error.message };
      const formatted: CropActivity = { ...row, farm_name: row.farms?.name ?? '', crop_name: row.farm_crops?.crop_name ?? '', farms: undefined, farm_crops: undefined };
      setActivities(prev => prev.map(a => a.id === id ? formatted : a));
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const deleteActivity = async (id: string) => {
    try {
      const sb = assertSupabase();
      const { error } = await sb.from('crop_activities').delete().eq('id', id);
      if (error) return { error: error.message };
      setActivities(prev => prev.filter(a => a.id !== id));
      return {};
    } catch (e: any) { return { error: e.message }; }
  };

  // ------------------------------------------------------------------
  // Input CRUD
  // ------------------------------------------------------------------
  const addInput = async (data: Omit<FarmInput, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb.from('farm_inputs').insert({ ...data, user_id: user!.id }).select('*, farms(name), farm_crops(crop_name)').single();
      if (error) return { error: error.message };
      const formatted: FarmInput = { ...row, farm_name: row.farms?.name ?? '', crop_name: row.farm_crops?.crop_name ?? '', farms: undefined, farm_crops: undefined };
      setInputs(prev => [formatted, ...prev]);
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const updateInput = async (id: string, data: Partial<FarmInput>) => {
    try {
      const sb = assertSupabase();
      // Defense-in-depth: strip immutable identity and ownership fields.
      // user_id, id, and created_at are server-managed and must not be
      // reassigned via a generic Partial<T> update call.
      const { id: _id, user_id: _uid, created_at: _ca, ...changes } = data;
      const { data: row, error } = await sb.from('farm_inputs').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id).select('*, farms(name), farm_crops(crop_name)').single();
      if (error) return { error: error.message };
      const formatted: FarmInput = { ...row, farm_name: row.farms?.name ?? '', crop_name: row.farm_crops?.crop_name ?? '', farms: undefined, farm_crops: undefined };
      setInputs(prev => prev.map(i => i.id === id ? formatted : i));
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const deleteInput = async (id: string) => {
    try {
      const sb = assertSupabase();
      const { error } = await sb.from('farm_inputs').delete().eq('id', id);
      if (error) return { error: error.message };
      setInputs(prev => prev.filter(i => i.id !== id));
      return {};
    } catch (e: any) { return { error: e.message }; }
  };

  // ------------------------------------------------------------------
  // Pest Observation CRUD
  // ------------------------------------------------------------------
  const addPestObservation = async (data: Omit<PestObservation, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb.from('pest_observations').insert({ ...data, user_id: user!.id }).select('*, farms(name), farm_crops(crop_name)').single();
      if (error) return { error: error.message };
      const formatted: PestObservation = { ...row, farm_name: row.farms?.name ?? '', crop_name: row.farm_crops?.crop_name ?? '', farms: undefined, farm_crops: undefined };
      setPestObservations(prev => [formatted, ...prev]);
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const updatePestObservation = async (id: string, data: Partial<PestObservation>) => {
    try {
      const sb = assertSupabase();
      const { id: _id, user_id: _user_id, farm_id: _farm_id, created_at: _created_at, updated_at: _updated_at, ...stripped } = data;
      const { data: row, error } = await sb.from('pest_observations').update({ ...stripped, updated_at: new Date().toISOString() }).eq('id', id).select('*, farms(name), farm_crops(crop_name)').single();
      if (error) return { error: error.message };
      const formatted: PestObservation = { ...row, farm_name: row.farms?.name ?? '', crop_name: row.farm_crops?.crop_name ?? '', farms: undefined, farm_crops: undefined };
      setPestObservations(prev => prev.map(o => o.id === id ? formatted : o));
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const deletePestObservation = async (id: string) => {
    try {
      const sb = assertSupabase();
      const { error } = await sb.from('pest_observations').delete().eq('id', id);
      if (error) return { error: error.message };
      setPestObservations(prev => prev.filter(o => o.id !== id));
      return {};
    } catch (e: any) { return { error: e.message }; }
  };

  // ------------------------------------------------------------------
  // IPM Record
  // ------------------------------------------------------------------
  const addIPMRecord = async (data: Omit<IPMRecord, 'id' | 'user_id' | 'created_at'>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb.from('ipm_records').insert({ ...data, user_id: user!.id }).select('*, farms(name), farm_crops(crop_name)').single();
      if (error) return { error: error.message };
      const formatted: IPMRecord = { ...row, farm_name: row.farms?.name ?? '', crop_name: row.farm_crops?.crop_name ?? '', farms: undefined, farm_crops: undefined };
      setIpmRecords(prev => [formatted, ...prev]);
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const deleteIPMRecord = async (id: string) => {
    try {
      const sb = assertSupabase();
      const { error } = await sb.from('ipm_records').delete().eq('id', id);
      if (error) return { error: error.message };
      setIpmRecords(prev => prev.filter(r => r.id !== id));
      return {};
    } catch (e: any) { return { error: e.message }; }
  };

  // ------------------------------------------------------------------
  // Pesticide Application
  // ------------------------------------------------------------------
  const addPesticideApplication = async (data: Omit<PesticideApplication, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb.from('pesticide_applications').insert({ ...data, user_id: user!.id }).select('*, farms(name), farm_crops(crop_name), pest_observations(pest_name)').single();
      if (error) return { error: error.message };
      const formatted: PesticideApplication = { ...row, farm_name: row.farms?.name ?? '', crop_name: row.farm_crops?.crop_name ?? '', pest_name: row.pest_observations?.pest_name ?? '', farms: undefined, farm_crops: undefined, pest_observations: undefined };
      setPesticideApplications(prev => [formatted, ...prev]);
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const deletePesticideApplication = async (id: string) => {
    try {
      const sb = assertSupabase();
      const { error } = await sb.from('pesticide_applications').delete().eq('id', id);
      if (error) return { error: error.message };
      setPesticideApplications(prev => prev.filter(a => a.id !== id));
      return {};
    } catch (e: any) { return { error: e.message }; }
  };

  // ------------------------------------------------------------------
  // Pest Follow-up CRUD
  // ------------------------------------------------------------------
  const addPestFollowUp = async (data: Omit<PestFollowUp, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb
        .from('pest_follow_ups')
        .insert({ ...data, user_id: user!.id })
        .select('*, farms(name), farm_crops(crop_name), pest_observations(pest_name)')
        .single();
      if (error) return { error: error.message };
      const formatted: PestFollowUp = {
        ...row,
        farm_name: row.farms?.name ?? '',
        crop_name: row.farm_crops?.crop_name ?? '',
        pest_name: row.pest_observations?.pest_name ?? '',
        farms: undefined,
        farm_crops: undefined,
        pest_observations: undefined,
      };
      setPestFollowUps(prev => [formatted, ...prev]);
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const updatePestFollowUp = async (id: string, data: Partial<PestFollowUp>) => {
    try {
      const sb = assertSupabase();
      const { id: _id, user_id: _user_id, farm_id: _farm_id, created_at: _created_at, updated_at: _updated_at, ...stripped } = data;
      const { data: row, error } = await sb
        .from('pest_follow_ups')
        .update({ ...stripped, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, farms(name), farm_crops(crop_name), pest_observations(pest_name)')
        .single();
      if (error) return { error: error.message };
      const formatted: PestFollowUp = {
        ...row,
        farm_name: row.farms?.name ?? '',
        crop_name: row.farm_crops?.crop_name ?? '',
        pest_name: row.pest_observations?.pest_name ?? '',
        farms: undefined,
        farm_crops: undefined,
        pest_observations: undefined,
      };
      setPestFollowUps(prev => prev.map(f => f.id === id ? formatted : f));
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const deletePestFollowUp = async (id: string) => {
    try {
      const sb = assertSupabase();
      const { error } = await sb.from('pest_follow_ups').delete().eq('id', id);
      if (error) return { error: error.message };
      setPestFollowUps(prev => prev.filter(f => f.id !== id));
      return {};
    } catch (e: any) { return { error: e.message }; }
  };

  // ------------------------------------------------------------------
  // Soil Test CRUD
  // ------------------------------------------------------------------
  const addSoilTest = async (data: Omit<SoilTest, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb.from('soil_tests').insert({ ...data, user_id: user!.id }).select('*, farms(name)').single();
      if (error) return { error: error.message };
      const formatted: SoilTest = { ...row, farm_name: row.farms?.name ?? '', farms: undefined };
      setSoilTests(prev => [formatted, ...prev]);
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const updateSoilTest = async (id: string, data: Partial<SoilTest>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb.from('soil_tests').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select('*, farms(name)').single();
      if (error) return { error: error.message };
      const formatted: SoilTest = { ...row, farm_name: row.farms?.name ?? '', farms: undefined };
      setSoilTests(prev => prev.map(s => s.id === id ? formatted : s));
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const deleteSoilTest = async (id: string) => {
    try {
      const sb = assertSupabase();
      const { error } = await sb.from('soil_tests').delete().eq('id', id);
      if (error) return { error: error.message };
      setSoilTests(prev => prev.filter(s => s.id !== id));
      return {};
    } catch (e: any) { return { error: e.message }; }
  };

  // ------------------------------------------------------------------
  // Water Test CRUD
  // ------------------------------------------------------------------
  const addWaterTest = async (data: Omit<WaterTest, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb.from('water_tests').insert({ ...data, user_id: user!.id }).select('*, farms(name)').single();
      if (error) return { error: error.message };
      const formatted: WaterTest = { ...row, farm_name: row.farms?.name ?? '', farms: undefined };
      setWaterTests(prev => [formatted, ...prev]);
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const updateWaterTest = async (id: string, data: Partial<WaterTest>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb.from('water_tests').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select('*, farms(name)').single();
      if (error) return { error: error.message };
      const formatted: WaterTest = { ...row, farm_name: row.farms?.name ?? '', farms: undefined };
      setWaterTests(prev => prev.map(w => w.id === id ? formatted : w));
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const deleteWaterTest = async (id: string) => {
    try {
      const sb = assertSupabase();
      const { error } = await sb.from('water_tests').delete().eq('id', id);
      if (error) return { error: error.message };
      setWaterTests(prev => prev.filter(w => w.id !== id));
      return {};
    } catch (e: any) { return { error: e.message }; }
  };

  // ------------------------------------------------------------------
  // Lab Report CRUD
  // ------------------------------------------------------------------
  const addLabReport = async (data: Omit<LabReport, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb.from('lab_reports').insert({ ...data, user_id: user!.id }).select('*, farms(name)').single();
      if (error) return { error: error.message };
      const formatted: LabReport = { ...row, farm_name: row.farms?.name ?? '', farms: undefined };
      setLabReports(prev => [formatted, ...prev]);
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const updateLabReport = async (id: string, data: Partial<LabReport>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb.from('lab_reports').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select('*, farms(name)').single();
      if (error) return { error: error.message };
      const formatted: LabReport = { ...row, farm_name: row.farms?.name ?? '', farms: undefined };
      setLabReports(prev => prev.map(r => r.id === id ? formatted : r));
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const deleteLabReport = async (id: string) => {
    try {
      const sb = assertSupabase();
      const { error } = await sb.from('lab_reports').delete().eq('id', id);
      if (error) return { error: error.message };
      setLabReports(prev => prev.filter(r => r.id !== id));
      return {};
    } catch (e: any) { return { error: e.message }; }
  };

  // ------------------------------------------------------------------
  // Farm Waste CRUD
  // ------------------------------------------------------------------
  const addFarmWaste = async (data: Omit<FarmWaste, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb.from('farm_waste').insert({ ...data, user_id: user!.id }).select('*, farms(name), farm_crops(crop_name)').single();
      if (error) return { error: error.message };
      const formatted: FarmWaste = { ...row, farm_name: row.farms?.name ?? '', crop_name: row.farm_crops?.crop_name ?? '', farms: undefined, farm_crops: undefined };
      setFarmWaste(prev => [formatted, ...prev]);
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const updateFarmWaste = async (id: string, data: Partial<FarmWaste>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb.from('farm_waste').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select('*, farms(name), farm_crops(crop_name)').single();
      if (error) return { error: error.message };
      const formatted: FarmWaste = { ...row, farm_name: row.farms?.name ?? '', crop_name: row.farm_crops?.crop_name ?? '', farms: undefined, farm_crops: undefined };
      setFarmWaste(prev => prev.map(w => w.id === id ? formatted : w));
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const deleteFarmWaste = async (id: string) => {
    try {
      const sb = assertSupabase();
      const { error } = await sb.from('farm_waste').delete().eq('id', id);
      if (error) return { error: error.message };
      setFarmWaste(prev => prev.filter(w => w.id !== id));
      return {};
    } catch (e: any) { return { error: e.message }; }
  };

  // ------------------------------------------------------------------
  // Compost Batch CRUD
  // ------------------------------------------------------------------
  const addCompostBatch = async (data: Omit<CompostBatch, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb.from('compost_batches').insert({ ...data, user_id: user!.id }).select('*, farms(name), farm_crops(crop_name)').single();
      if (error) return { error: error.message };
      const formatted: CompostBatch = { ...row, farm_name: row.farms?.name ?? '', crop_name: row.farm_crops?.crop_name ?? '', farms: undefined, farm_crops: undefined };
      setCompostBatches(prev => [formatted, ...prev]);
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const updateCompostBatch = async (id: string, data: Partial<CompostBatch>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb.from('compost_batches').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select('*, farms(name), farm_crops(crop_name)').single();
      if (error) return { error: error.message };
      const formatted: CompostBatch = { ...row, farm_name: row.farms?.name ?? '', crop_name: row.farm_crops?.crop_name ?? '', farms: undefined, farm_crops: undefined };
      setCompostBatches(prev => prev.map(c => c.id === id ? formatted : c));
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const deleteCompostBatch = async (id: string) => {
    try {
      const sb = assertSupabase();
      const { error } = await sb.from('compost_batches').delete().eq('id', id);
      if (error) return { error: error.message };
      setCompostBatches(prev => prev.filter(c => c.id !== id));
      return {};
    } catch (e: any) { return { error: e.message }; }
  };

  // ------------------------------------------------------------------
  // Expenses CRUD
  // ------------------------------------------------------------------
  const addExpense = async (data: Omit<FarmExpense, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb.from('farm_expenses').insert({ ...data, user_id: user!.id }).select('*, farms(name), farm_crops(crop_name)').single();
      if (error) return { error: error.message };
      const formatted: FarmExpense = { ...row, farm_name: row.farms?.name ?? '', crop_name: row.farm_crops?.crop_name ?? '', farms: undefined, farm_crops: undefined };
      setExpenses(prev => [formatted, ...prev]);
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const updateExpense = async (id: string, data: Partial<FarmExpense>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb.from('farm_expenses').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select('*, farms(name), farm_crops(crop_name)').single();
      if (error) return { error: error.message };
      const formatted: FarmExpense = { ...row, farm_name: row.farms?.name ?? '', crop_name: row.farm_crops?.crop_name ?? '', farms: undefined, farm_crops: undefined };
      setExpenses(prev => prev.map(e => e.id === id ? formatted : e));
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const deleteExpense = async (id: string) => {
    try {
      const sb = assertSupabase();
      const { error } = await sb.from('farm_expenses').delete().eq('id', id);
      if (error) return { error: error.message };
      setExpenses(prev => prev.filter(e => e.id !== id));
      return {};
    } catch (e: any) { return { error: e.message }; }
  };

  // ------------------------------------------------------------------
  // Harvests CRUD
  // ------------------------------------------------------------------
  const addHarvest = async (data: Omit<CropHarvest, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb.from('crop_harvests').insert({ ...data, user_id: user!.id }).select('*, farms(name), farm_crops(crop_name)').single();
      if (error) return { error: error.message };
      const formatted: CropHarvest = { ...row, farm_name: row.farms?.name ?? '', crop_name: row.farm_crops?.crop_name ?? '', farms: undefined, farm_crops: undefined };
      setHarvests(prev => [formatted, ...prev]);
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const updateHarvest = async (id: string, data: Partial<CropHarvest>) => {
    try {
      const sb = assertSupabase();
      const { data: row, error } = await sb.from('crop_harvests').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select('*, farms(name), farm_crops(crop_name)').single();
      if (error) return { error: error.message };
      const formatted: CropHarvest = { ...row, farm_name: row.farms?.name ?? '', crop_name: row.farm_crops?.crop_name ?? '', farms: undefined, farm_crops: undefined };
      setHarvests(prev => prev.map(h => h.id === id ? formatted : h));
      return { data: formatted };
    } catch (e: any) { return { error: e.message }; }
  };

  const deleteHarvest = async (id: string) => {
    try {
      const sb = assertSupabase();
      const { error } = await sb.from('crop_harvests').delete().eq('id', id);
      if (error) return { error: error.message };
      setHarvests(prev => prev.filter(h => h.id !== id));
      return {};
    } catch (e: any) { return { error: e.message }; }
  };

  // ------------------------------------------------------------------
  // Provider value
  // ------------------------------------------------------------------
  return (
    <FarmContext.Provider
      value={{
        farms,
        crops,
        activities,
        inputs,
        organicInputs,
        cropOrganicInputs,
        pestObservations,
        ipmRecords,
        pesticideApplications,
        pesticideAdvisories,
        pestFollowUps,
        soilTests,
        waterTests,
        labReports,
        farmWaste,
        compostBatches,
        expenses,
        harvests,
        selectedFarmId,
        selectedFarm,
        loading,
        error,
        setSelectedFarmId,
        refreshData,
        addFarm, updateFarm, deleteFarm,
        addCrop, updateCrop, deleteCrop,
        addActivity, updateActivity, deleteActivity,
        addInput, updateInput, deleteInput,
        addPestObservation, updatePestObservation, deletePestObservation,
        addIPMRecord, deleteIPMRecord,
        addPesticideApplication, deletePesticideApplication,
        addPestFollowUp, updatePestFollowUp, deletePestFollowUp,
        addSoilTest, updateSoilTest, deleteSoilTest,
        addWaterTest, updateWaterTest, deleteWaterTest,
        addLabReport, updateLabReport, deleteLabReport,
        addFarmWaste, updateFarmWaste, deleteFarmWaste,
        addCompostBatch, updateCompostBatch, deleteCompostBatch,
        addExpense, updateExpense, deleteExpense,
        addHarvest, updateHarvest, deleteHarvest,
      }}
    >
      {children}
    </FarmContext.Provider>
  );
};

export const useFarmData = () => {
  const context = useContext(FarmContext);
  if (!context) throw new Error('useFarmData must be used within a FarmProvider');
  return context;
};
