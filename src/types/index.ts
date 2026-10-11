export type FarmingType = 'organic' | 'conventional' | 'transitioning' | 'mixed';

export type AreaUnit = 'acres' | 'hectares' | 'cents' | 'bigha' | 'guntha';

export type FarmingMethod = 'organic' | 'natural' | 'conventional' | 'regenerative' | 'integrated' | 'mixed';

export type OrganicStatus = 'certified_organic' | 'in_conversion' | 'non_certified_organic' | 'conventional';

export type GrowthStage = 
  | 'Nursery / Land Prep'
  | 'Vegetative'
  | 'Flowering'
  | 'Fruiting / Podding'
  | 'Maturity / Ripening'
  | 'Harvesting'
  | 'Post-Harvest';

export type CropStatus = 'active' | 'harvested' | 'fallow' | 'failed';

export type ActivityType = 
  | 'Planting'
  | 'Irrigation'
  | 'Fertilization'
  | 'Organic manure'
  | 'Biofertilizer application'
  | 'Weeding'
  | 'Mulching'
  | 'Pruning'
  | 'Pest monitoring'
  | 'Spraying'
  | 'Harvest'
  | 'Labour'
  | 'Custom activity';

export type InputCategory =
  | 'Seeds'
  | 'Fertilizers'
  | 'Organic manure'
  | 'Biofertilizers'
  | 'Biological inputs'
  | 'Botanical inputs'
  | 'Pesticides'
  | 'Other';

export type OrganicInputCategory =
  | 'Organic Manures'
  | 'Biofertilizers'
  | 'Biological / Biocontrol Inputs'
  | 'Botanical Inputs'
  | 'Soil Amendments';

export interface UserProfile {
  id: string;
  email?: string;
  full_name: string;
  phone?: string;
  state?: string;
  district?: string;
  village?: string;
  preferred_language: string;
  farming_type: FarmingType;
  created_at: string;
  updated_at: string;
}

export interface Farm {
  id: string;
  user_id: string;
  name: string;
  location: string;
  area: number;
  area_unit: AreaUnit;
  soil_type?: string;
  irrigation_type?: string;
  farming_method: FarmingMethod;
  organic_status: OrganicStatus;
  current_season: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

export interface FarmCrop {
  id: string;
  farm_id: string;
  user_id: string;
  crop_name: string;
  variety?: string;
  area?: number;
  area_unit?: AreaUnit;
  planting_date: string;
  expected_harvest_date?: string;
  growth_stage: GrowthStage;
  soil_type?: string;
  irrigation?: string;
  farming_method?: FarmingMethod;
  status: CropStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined or helper fields
  farm_name?: string;
}

export interface CropActivity {
  id: string;
  farm_id: string;
  crop_id?: string;
  user_id: string;
  activity_type: ActivityType;
  activity_date: string;
  quantity?: number;
  unit?: string;
  cost: number;
  area?: number;
  area_unit?: AreaUnit;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined or helper fields
  farm_name?: string;
  crop_name?: string;
}

export interface FarmInput {
  id: string;
  user_id: string;
  farm_id: string;
  crop_id?: string;
  product_name: string;
  category: InputCategory;
  purchase_date: string;
  quantity: number;
  unit: string;
  cost: number;
  purpose?: string;
  application_method?: string;
  batch_or_lot_no?: string;
  supplier_or_source?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined or helper fields
  farm_name?: string;
  crop_name?: string;
}

export interface OrganicInput {
  id: string;
  name: string;
  category: OrganicInputCategory;
  description: string;
  purpose: string;
  benefits: string[];
  suitable_crops: string[];
  application_information: string;
  precautions?: string;
  organic_relevance?: string;
  source_name: string;
  source_url?: string;
  last_verified_date: string;
  verification_status: string;
  /**
   * Chunk 3: how strongly this row may be worded in the UI. Seeded rows default
   * to `not-established` because a knowledge article about a material never
   * proves that a material is listed in a standard or that a product is certified.
   */
  npop_relevance_class?: OrganicClassification;
  source_document_title?: string;
  /** Explicit statement of what the cited source does NOT prove. */
  source_limitation?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CropOrganicInput {
  id: string;
  crop_name: string;
  organic_input_id: string;
  recommended_stage: string;
  dosage_guide: string;
  application_notes?: string;
  source_reference?: string;
  /** Chunk 3: crop-level guidance is a claim and must carry its own grade. */
  verification_status?: string;
  created_at?: string;
  // Joined or helper fields
  organic_input?: OrganicInput;
}

/** Row of `public.organic_practices` - source-attributed on-farm preparation guides. */
export interface OrganicPractice {
  id: string;
  title: string;
  category: 'Soil & Composting' | 'Bio-stimulants & Teas' | 'Biological Pest Control' | 'Cropping & Mulch';
  summary: string;
  scientific_rationale: string;
  preparation_steps: string[];
  application_rate: string;
  dosage_timing: string;
  cautions: string;
  source: string;
  source_url?: string;
  verification_status?: string;
  last_verified?: string;
  /**
   * Chunk 3 audit trail. `claim_basis` states in plain words what the cited
   * source actually supports; `unverified_claims_removed` records the specific
   * numbers/ratios/quantities that were deleted because no retrievable source
   * could be linked to them.
   */
  claim_basis?: string;
  unverified_claims_removed?: string[];
}

/**
 * Chunk 3 — Organic awareness & knowledge-engine vocabulary.
 *
 * The vocabulary is deliberately narrow: the UI must never present an organic
 * claim that is stronger than the grade stored here.
 */
export type OrganicVerificationStatus =
  /** Re-checked against a named, retrievable source on `last_verified`. */
  | 'Verified'
  /** Restates a specific published statement; the link sits with the claim. */
  | 'Source-backed'
  /** General agronomic teaching; carries no specific figure. */
  | 'Educational'
  /** A specific that we could not link to a source — a question, not a fact. */
  | 'Needs Verification'
  /** Legacy seed grade, presented with the same care as 'Educational'. */
  | 'General Agricultural Information'
  /** Default grade for anything the audit has not reviewed yet. */
  | 'Unverified / For Review';

/**
 * What a record is allowed to assert about organic status. The four terms are
 * NOT interchangeable — see ORGANIC_TERMINOLOGY in lib/organicCompliance.ts.
 */
export type OrganicClassification =
  /** The word "natural" — descriptive only, no certification meaning. */
  | 'natural'
  /** "Organic input" = a material used in organic-style farming. */
  | 'organic-input'
  /** A material named in an applicable standard's input list, subject to conditions. */
  | 'listed-in-standard'
  /** A product/consignment covered by a valid certificate issued by a certification body. */
  | 'certified-product'
  /** Nothing established — general educational content only. */
  | 'not-established';

export type OrganicSourceKind =
  | 'Government Portal'
  | 'University Portal'
  | 'Certification Body'
  | 'Research Institute'
  | 'Internal Audit';

/** Curated (code-maintained) row of the Organic Input Knowledge Library. */
export interface OrganicInputKnowledgeRecord {
  id: string;
  name: string;
  category: OrganicInputCategory;
  /** What the material is. */
  summary: string;
  purpose: string;
  benefits: string[];
  /** Qualitative mode of action — no invented quantities. */
  mode_of_action: string;
  suitable_crops: string[];
  application_guidance: string;
  precautions: string;
  classification: OrganicClassification;
  classification_note: string;
  source_name: string;
  source_kind: OrganicSourceKind;
  source_url?: string;
  verification_status: OrganicVerificationStatus;
  last_verified: string;
  /** What the cited source does NOT prove. */
  limitation: string;
  related_practice_ids: string[];
}

/** Relationship row: which crop/stage a curated input is discussed for. */
export interface OrganicInputCropLink {
  id: string;
  organic_input_id: string;
  crop_name: string;
  stage: string;
  guidance: string;
  source_name: string;
  verification_status: OrganicVerificationStatus;
}

/**
 * Normalised library row: a Supabase `organic_inputs` row or a curated record,
 * plus the crop matches computed from the crop→input relationship.
 */
export interface OrganicInputViewItem {
  id: string;
  name: string;
  category: OrganicInputCategory;
  summary: string;
  purpose: string;
  benefits: string[];
  mode_of_action?: string;
  suitable_crops: string[];
  application_guidance: string;
  precautions?: string;
  classification: OrganicClassification;
  classification_note?: string;
  source_name: string;
  source_kind?: OrganicSourceKind;
  source_url?: string;
  verification_status: string;
  last_verified?: string;
  limitation?: string;
  related_practice_ids: string[];
  provenance: 'database' | 'curated-knowledge';
  matched_crops: string[];
  crop_guidance: OrganicInputCropLink[];
}

export interface WeatherData {
  /** Air temperature at 2 m (°C) */
  temperature: number;
  /** Relative humidity (%) */
  humidity: number;
  /** Precipitation in the current interval (mm) */
  precipitation: number;
  /** Rain component of the current precipitation (mm) */
  rain: number;
  /** Maximum precipitation probability in the current day (%) */
  rainProbability: number;
  /** Wind speed at 10 m (km/h) */
  windSpeed: number;
  condition: string;
  isDay: boolean;
  /** Data source actually used (never invented by the UI) */
  source: string;
  /** ISO timestamp of the API response used for the display */
  fetchedAt: string;
  /** Coordinates the forecast belongs to */
  coordinates?: { latitude: number; longitude: number };
  dailyForecast: {
    date: string;
    dayName: string;
    maxTemp: number;
    minTemp: number;
    condition: string;
    rainProb: number;
    precipitationSum?: number;
  }[];
}


export interface ActivityFilterOptions {
  farmId?: string;
  cropId?: string;
  activityType?: string;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

// Phase 3: Pest & IPM Types
export type PestSeverity = 'low' | 'medium' | 'high' | 'critical';
export type PestStatus = 'observed' | 'monitoring' | 'treated' | 'controlled' | 'failed';
export type AdvisoryLevel = 'monitoring' | 'prevention' | 'cultural' | 'mechanical' | 'biological' | 'botanical' | 'chemical';

export type AdvisoryVerificationStatus =
  | 'Registered Formulation'
  | 'Registered Use (Crop/Pest)'
  | 'General Agricultural Information'
  | 'Non-chemical IPM Practice'
  | 'Unverified / For Review';

export type PestFollowUpOutcome = 'improved' | 'unchanged' | 'worsened' | 'unknown';

export type PestType = 'insect' | 'disease' | 'nematode' | 'weed' | 'mammal' | 'bird' | 'other';

export interface PestObservation {
  id: string;
  user_id: string;
  farm_id: string;
  crop_id?: string;
  pest_name: string;
  pest_type: PestType;
  symptoms: string;
  growth_stage: string;
  severity: PestSeverity;
  affected_area_percent: number;
  observation_date: string;
  photos?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  farm_name?: string;
  crop_name?: string;
}

export interface IPMRecord {
  id: string;
  user_id: string;
  farm_id: string;
  crop_id?: string;
  pest_observation_id?: string;
  pest_name: string;
  advisory_level: AdvisoryLevel;
  recommendation: string;
  rationale: string;
  source_name: string;
  source_url?: string;
  created_at: string;
  // Joined fields
  farm_name?: string;
  crop_name?: string;
}

export interface PesticideApplication {
  id: string;
  user_id: string;
  farm_id: string;
  crop_id?: string;
  pest_observation_id?: string;
  product_name: string;
  active_ingredient?: string;
  application_date: string;
  quantity: number;
  unit: string;
  area: number;
  area_unit: string;
  application_method: string;
  source_reference?: string;
  pre_harvest_interval_days?: number;
  re_entry_interval_hours?: number;
  notes?: string;
  follow_up_date?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  farm_name?: string;
  crop_name?: string;
  pest_name?: string;
}

/**
 * Post-treatment pest monitoring follow-up. Records the observed severity/outcome
 * after an IPM or chemical intervention. NEVER auto-claims "treatment was effective"
 * — only stores what the farmer actually observed.
 */
export interface PestFollowUp {
  id: string;
  user_id: string;
  farm_id: string;
  crop_id?: string;
  pest_observation_id?: string;
  pesticide_application_id?: string;
  follow_up_date: string;
  severity_after_treatment: PestSeverity;
  affected_area_after_percent?: number;
  outcome: PestFollowUpOutcome;
  notes?: string;
  photos?: string[];
  created_at: string;
  updated_at: string;
  // Joined fields
  farm_name?: string;
  crop_name?: string;
  pest_name?: string;
}

/**
 * Pesticide / IPM advisory knowledge base row (`public.pesticide_advisories`).
 * This is AGRICULTURAL ADVISORY KNOWLEDGE and is deliberately different from
 * `PesticideApplication`, which records what a farmer actually applied on a farm.
 */
export type AdvisoryControlCategory =
  | 'prevention'
  | 'cultural'
  | 'mechanical'
  | 'biological'
  | 'botanical'
  | 'chemical';

export interface PestAdvisory {
  id: string;
  crop: string;
  pest_or_disease: string;
  control_category: AdvisoryControlCategory;
  recommendation: string;
  active_ingredient?: string;
  product_information?: string;
  application_information?: string;
  safety_information?: string;
  source_name: string;
  source_url?: string;
  last_verified?: string;
  verification_status: AdvisoryVerificationStatus;
  source_document_title?: string;
  source_document_date?: string;
  source_page?: string;
  source_reference?: string;
  verified_by?: string;
  verified_at?: string;
  phi_days?: number;
  rei_hours?: number;
  created_at?: string;
  updated_at?: string;
}


// Phase 4: Soil & Water Testing Types
/** Row of `public.soil_tests` - a farmer-entered laboratory soil analysis record. */
export interface SoilTest {
  id: string;
  user_id: string;
  farm_id: string;
  test_date: string;
  lab_name?: string;
  ph?: number;
  nitrogen?: number; // kg/ha or ppm
  phosphorus?: number; // kg/ha or ppm
  potassium?: number; // kg/ha or ppm
  organic_carbon?: number; // %
  electrical_conductivity?: number; // dS/m
  micronutrients?: string; // JSON or text description
  texture?: string;
  moisture?: number; // %
  other_parameters?: string;
  notes?: string;
  report_url?: string; // File upload reference
  created_at: string;
  updated_at: string;
  // Joined fields
  farm_name?: string;
}

export interface WaterTest {
  id: string;
  user_id: string;
  farm_id: string;
  test_date: string;
  lab_name?: string;
  ph?: number;
  ec?: number; // dS/m or mS/cm
  hardness?: number; // mg/L or ppm
  alkalinity?: number; // mg/L CaCO3
  sodium?: number; // mg/L
  calcium?: number; // mg/L
  magnesium?: number; // mg/L
  chloride?: number; // mg/L
  sulfate?: number; // mg/L
  nitrate?: number; // mg/L
  boron?: number; // mg/L
  iron?: number; // mg/L
  other_parameters?: string;
  suitability?: 'excellent' | 'good' | 'marginal' | 'poor' | 'unsuitable';
  notes?: string;
  report_url?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  farm_name?: string;
}

// Phase 4: Waste & Compost Types
export type WasteType = 'crop_residue' | 'leaves' | 'weeds' | 'animal_waste' | 'organic_waste' | 'other';
export type WasteStatus = 'collected' | 'processing' | 'composted' | 'applied' | 'disposed';
export type CompostStatus = 'preparing' | 'active' | 'curing' | 'finished' | 'used' | 'failed';

export interface FarmWaste {
  id: string;
  user_id: string;
  farm_id: string;
  waste_type: WasteType;
  quantity: number;
  unit: string;
  collection_date: string;
  source_location?: string;
  status: WasteStatus;
  processed_crop_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  farm_name?: string;
  crop_name?: string;
}

/** Row of `public.compost_batches` - waste stream -> compost -> field application. */
export interface CompostBatch {
  id: string;
  user_id: string;
  farm_id: string;
  compost_type: 'vermicompost' | 'farmyard_manure' | 'green_manure' | 'compost' | 'biological_strain' | 'other';
  starting_quantity: number;
  unit: string;
  start_date: string;
  processing_method?: string;
  status: CompostStatus;
  finished_quantity?: number;
  completion_date?: string;
  applied_to_crop_id?: string;
  quality_rating?: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  farm_name?: string;
  crop_name?: string;
}


// Phase 4: Lab Reports
export type LabReportType = 'soil' | 'water' | 'input_analysis' | 'residue_report' | 'certification' | 'other';

export interface LabReport {
  id: string;
  user_id: string;
  farm_id: string;
  report_type: LabReportType;
  title: string;
  lab_name?: string;
  issue_date: string;
  document_url?: string;
  certification_disclaimer: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  farm_name?: string;
}

// Phase 5: Farm Work & Jobs
export type WorkType = 'Harvesting' | 'Pruning' | 'Weeding' | 'Planting' | 'Irrigation' | 'Processing' | 'Transport' | 'Labour' | 'Other';
export type JobStatus = 'open' | 'filled' | 'completed' | 'cancelled' | 'closed' | 'in-progress';
export type WageUnit = 'day' | 'hour' | 'piece' | 'acre' | 'contract';
export type InquiryStatus = 'pending' | 'reviewed' | 'accepted' | 'declined';

export interface FarmJob {
  id: string;
  user_id: string;
  farm_id: string;
  title: string;
  location: string;
  work_type: WorkType;
  start_date: string;
  end_date?: string;
  workers_needed: number;
  wage_rate?: number;
  wage_unit: WageUnit;
  description: string;
  contact_preference: 'phone' | 'inquiry' | 'both';
  contact_phone?: string;
  status: JobStatus;
  /** Whether the listing may appear on the public work board. */
  is_public?: boolean;
  created_at: string;
  updated_at: string;
  farm_name?: string;
  inquiry_count?: number;
}

/**
 * Public projection of an open farm job (`public.public_farm_jobs` view).
 * Contains ONLY the fields a farmer chose to publish - no farm id, no farmer id
 * and no private contact number.
 */
export interface PublicFarmJob {
  id: string;
  title: string;
  location: string;
  work_type: WorkType;
  start_date: string;
  end_date?: string;
  workers_needed: number;
  wage_rate?: number;
  wage_unit: WageUnit;
  description: string;
  contact_preference: 'phone' | 'inquiry' | 'both';
  contact_phone?: string;
  status: JobStatus;
  farm_display_name?: string;
  created_at: string;
}


export interface JobInquiry {
  id: string;
  job_id: string;
  applicant_name: string;
  applicant_phone: string;
  applicant_email?: string;
  available_date?: string;
  workers_count: number;
  message: string;
  status: InquiryStatus;
  created_at: string;
  job_title?: string;
  farm_name?: string;
}

// Phase 5: Expenses & Harvests
export type ExpenseCategory = 'seeds' | 'manure' | 'fertilizer' | 'pesticide' | 'labour' | 'irrigation' | 'machinery' | 'transport' | 'other';

export interface FarmExpense {
  id: string;
  user_id: string;
  farm_id: string;
  crop_id?: string;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  description: string;
  vendor_or_source?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  farm_name?: string;
  crop_name?: string;
}

export type HarvestQuality = 'grade_a' | 'grade_b' | 'grade_c' | 'premium' | 'standard';

export interface CropHarvest {
  id: string;
  user_id: string;
  farm_id: string;
  crop_id: string;
  harvest_date: string;
  quantity: number;
  unit: string;
  quality: HarvestQuality;
  sale_price?: number;
  revenue?: number;
  market_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  farm_name?: string;
  crop_name?: string;
}

// Phase 5: Market Intelligence
export interface MarketPriceRecord {
  id: string;
  crop: string;
  canonical_crop?: string;
  state: string;
  district: string;
  market: string;
  price_date: string;
  min_price?: number;
  max_price?: number;
  modal_price: number;
  unit: string;
  source_name: string;
  source_url?: string | null;
  variety?: string | null;
  grade?: string | null;
  fetched_at?: string | null;
  created_at?: string;
}

// Knowledge Hub Records
export type KnowledgeArticleCategory =
  | 'Organic Farming'
  | 'Pest & IPM'
  | 'Soil Health'
  | 'Waste Management'
  | 'Crop Management'
  | 'Climate & Weather'
  | 'Market Awareness'
  | 'Sustainable Agriculture';

export interface KnowledgeSectionItem {
  heading: string;
  points: string[];
}

export interface KnowledgeArticleRecord {
  id: string;
  title: string;
  category: KnowledgeArticleCategory;
  summary: string;
  content: KnowledgeSectionItem[];
  tags: string[];
  read_minutes: number;
  source_name: string;
  source_url?: string;
  last_verified: string;
  verification_status: string;
  created_at?: string;
  updated_at?: string;
}

export interface KnowledgeSourceRecord {
  id: string;
  name: string;
  organization: string;
  website_url?: string;
  authority_type: string;
  description?: string;
}

// Notifications
export type NotificationType =
  | 'activity_reminder'
  | 'pest_follow_up'
  | 'harvest_reminder'
  | 'scheduled_activity'
  | 'weather_indicator'
  | 'advisory_update'
  | 'job_inquiry';

export interface NotificationItem {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_record_id?: string;
  related_record_type?: string;
  scheduled_time?: string;
  is_read: boolean;
  created_at: string;
}

export type AiResponseType =
  | 'Farm Record'
  | 'Agricultural Knowledge'
  | 'Weather Context'
  | 'Market Data'
  | 'General Explanation'
  | 'Uncertain / Insufficient Evidence';

export interface AiSourceItem {
  organization: string;
  document: string;
  reference?: string;
  date?: string;
  url?: string;
  name?: string; // backwards compatibility
}

// AI Conversation
export interface AiMessageItem {
  role: 'user' | 'assistant';
  content: string;
  title?: string;
  response_type?: AiResponseType;
  source_level?: 1 | 2 | 3 | 4;
  sections?: { heading: string; points: string[] }[];
  sources?: AiSourceItem[];
  farm_context?: string;
  timestamp: string;
}

export interface AiConversationRecord {
  id: string;
  user_id: string;
  title: string;
  messages: AiMessageItem[];
  context_metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Farm Reports
export type ReportType = 'crop_protection' | 'organic_summary' | 'farm_operations';

export interface CropProtectionOutcome {
  pestName: string;
  cropName: string;
  initialSeverity: string;
  finalSeverity?: string;
  outcome: string;
  actionTaken: string;
  date: string;
}

export interface FarmReportData {
  report_type?: ReportType;
  farmer: {
    name: string;
    phone?: string;
    location?: string;
    farmingType: string;
  };
  farm: {
    name: string;
    area: number;
    areaUnit: string;
    location: string;
    farmingMethod: string;
    organicStatus: string;
  };
  crops: FarmCrop[];
  activitiesCount: number;
  inputsCount: number;
  totalExpenses: number;
  pestObservationsCount: number;
  ipmRecordsCount: number;
  pesticideApplicationsCount?: number;
  pestFollowUpsCount?: number;
  soilTestsCount: number;
  waterTestsCount: number;
  wasteRecycledKg: number;
  compostProducedKg: number;
  harvestsCount: number;
  totalHarvestQty: number;
  sustainabilityIndicators: {
    organicPracticesCount: number;
    organicInputUsagePercent: number;
    wasteRecycledKg: number;
    ipmDecisionsCount: number;
    soilTestCount: number;
  };
  // Detailed breakdowns for reports
  cropProtectionDetails?: {
    observations: PestObservation[];
    ipmActions: IPMRecord[];
    applications: PesticideApplication[];
    followUps: PestFollowUp[];
    outcomes: CropProtectionOutcome[];
  };
  organicSummaryDetails?: {
    organicPractices: CropActivity[];
    organicInputs: FarmInput[];
    compostBatches: CompostBatch[];
    wasteRecycled: FarmWaste[];
    soilTests: SoilTest[];
  };
  farmOperationsDetails?: {
    activities: CropActivity[];
    inputs: FarmInput[];
    expenses: FarmExpense[];
    harvests: CropHarvest[];
  };
}

export interface FarmReportRecord {
  id: string;
  user_id: string;
  farm_id: string;
  report_title: string;
  report_period_start?: string;
  report_period_end?: string;
  report_data: FarmReportData;
  generated_at: string;
  farm_name?: string;
}

