import { supabase } from '../lib/supabase';
import { FarmJob, JobInquiry, PublicFarmJob } from '../types';

export interface CreateJobInput {
  farm_id: string;
  title: string;
  location: string;
  work_type: FarmJob['work_type'];
  start_date: string;
  end_date?: string;
  workers_needed: number;
  wage_rate?: number;
  wage_unit: FarmJob['wage_unit'];
  description: string;
  contact_preference: 'phone' | 'inquiry' | 'both';
  contact_phone?: string;
}

export interface SubmitInquiryInput {
  job_id: string;
  applicant_name: string;
  applicant_phone: string;
  applicant_email?: string;
  available_date?: string;
  workers_count?: number;
  message: string;
}

/**
 * Public & Farmer: Fetch list of open farm jobs for the public work board.
 * Throws on database/network failure so callers can distinguish
 * "zero jobs" (empty array) from "failed request" (exception).
 */
export async function getPublicFarmJobs(filters?: {
  workType?: string;
  search?: string;
}): Promise<PublicFarmJob[]> {
  if (!supabase) throw new Error('Database service is not configured.');

  let query = supabase
    .from('public_farm_jobs')
    .select('id, title, location, work_type, start_date, end_date, workers_needed, wage_rate, wage_unit, description, contact_preference, status, farm_display_name, created_at')
    .order('created_at', { ascending: false });

  if (filters?.workType && filters.workType !== 'all') {
    query = query.eq('work_type', filters.workType);
  }

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Could not load public farm jobs.');
  }

  return (data || []) as PublicFarmJob[];
}

/**
 * Farmer: Fetch jobs created by the authenticated farmer
 */
export async function getFarmerJobs(userId: string): Promise<FarmJob[]> {
  if (!supabase || !userId) return [];

  try {
    // DIAGNOSTIC: Log authenticated user ID
    console.log('[DIAG getFarmerJobs] userId:', userId);

    // 1. Fetch farmer's jobs without nested inquiries.
    const { data: jobs, error: jobsError } = await supabase
      .from('farm_jobs')
      .select('*, farms(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (jobsError) {
      console.warn('Notice loading farmer jobs:', jobsError.message);
      return [];
    }

    // DIAGNOSTIC: Log job IDs returned
    const jobIds = (jobs || []).map((j: any) => j.id);
    console.log('[DIAG getFarmerJobs] job IDs from farm_jobs:', jobIds);

    const jobList = (jobs || []).map((row: any) => ({
      ...row,
      farm_name: row.farms?.name || 'My Farm',
      inquiry_count: 0,
    }));

    if (jobList.length === 0) {
      console.log('[DIAG getFarmerJobs] no jobs found, returning empty');
      return jobList;
    }

    // 2. Fetch all inquiries for the farmer's jobs.
    const { data: inquiries, error: inquiriesError } = await supabase
      .from('job_inquiries')
      .select('job_id')
      .in('job_id', jobIds)
      .order('created_at', { ascending: false });

    // DIAGNOSTIC: Log inquiry query results
    if (inquiriesError) {
      console.log('[DIAG getFarmerJobs] inquiry query ERROR:', inquiriesError.message, 'code:', inquiriesError.code);
    } else {
      console.log('[DIAG getFarmerJobs] inquiry records returned:', (inquiries || []).length);
      (inquiries || []).forEach((inq: any) => {
        console.log('[DIAG getFarmerJobs] inquiry job_id:', inq.job_id);
      });
    }

    if (inquiriesError) {
      console.warn('Notice loading job inquiries:', inquiriesError.message);
      return jobList;
    }

    // 3. Count inquiries per job
    const inquiryCounts: Record<string, number> = {};
    (inquiries || []).forEach((inq: any) => {
      inquiryCounts[inq.job_id] = (inquiryCounts[inq.job_id] || 0) + 1;
    });

    // DIAGNOSTIC: Log calculated counts
    jobList.forEach((job: any) => {
      console.log('[DIAG getFarmerJobs] job', job.id, 'inquiry_count:', inquiryCounts[job.id] || 0);
    });

    // 4. Attach counts to jobs
    return jobList.map(job => ({
      ...job,
      inquiry_count: inquiryCounts[job.id] || 0,
    }));
  } catch (err) {
    console.error('Failed to get farmer jobs:', err);
    return [];
  }
}

/**
 * Farmer: Create a new farm work job listing
 */
export async function createFarmJob(
  userId: string,
  input: CreateJobInput
): Promise<{ data?: FarmJob; error?: string }> {
  if (!supabase || !userId) return { error: 'Authentication required to post job.' };

  try {
    const { data, error } = await supabase
      .from('farm_jobs')
      .insert({
        user_id: userId,
        farm_id: input.farm_id,
        title: input.title,
        location: input.location,
        work_type: input.work_type,
        start_date: input.start_date,
        end_date: input.end_date || null,
        workers_needed: input.workers_needed,
        wage_rate: input.wage_rate || 0,
        wage_unit: input.wage_unit,
        description: input.description,
        contact_preference: input.contact_preference,
        contact_phone: input.contact_phone || null,
        status: 'open',
      })
      .select('*, farms(name)')
      .single();

    if (error) return { error: error.message };
    return {
      data: {
        ...data,
        farm_name: data.farms?.name || 'My Farm',
      },
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to create job.' };
  }
}

/**
 * Farmer: Update job status or details
 */
export async function updateFarmJob(
  jobId: string,
  updates: Partial<FarmJob>
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Database not available' };

  try {
    const { error } = await supabase
      .from('farm_jobs')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) return { error: error.message };
    return {};
  } catch (err: any) {
    return { error: err.message };
  }
}

/**
 * Farmer: Delete a job
 */
export async function deleteFarmJob(jobId: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Database not available' };

  try {
    const { error } = await supabase.from('farm_jobs').delete().eq('id', jobId);
    if (error) return { error: error.message };
    return {};
  } catch (err: any) {
    return { error: err.message };
  }
}

/**
 * Public User: Submit an inquiry to an open job without requiring an account
 */
export async function submitJobInquiry(
  input: SubmitInquiryInput
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Service temporarily unavailable' };

  if (!input.applicant_name || !input.applicant_phone || !input.message) {
    return { success: false, error: 'Please provide your name, phone number, and a message.' };
  }

  try {
    const { error } = await supabase.from('job_inquiries').insert({
      job_id: input.job_id,
      applicant_name: input.applicant_name.trim(),
      applicant_phone: input.applicant_phone.trim(),
      applicant_email: input.applicant_email?.trim() || null,
      available_date: input.available_date || null,
      workers_count: input.workers_count || 1,
      message: input.message.trim(),
      // status is omitted intentionally: the column defaults to 'pending' and the
      // column-scoped INSERT grant for public applicants does not cover status.
    });

    if (error) return { success: false, error: formatInquiryError(error) };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: formatInquiryError(err) };
  }
}

/**
 * Converts a database error into a user-safe message. Raw Postgres errors can
 * leak SQL internals (table names, privileges, constraint details) which must
 * never be shown to public applicants. Trigger validation errors (check_violation)
 * are already user-friendly and are passed through; everything else is genericised.
 * The raw error is always logged to the console for development troubleshooting.
 */
function formatInquiryError(error: any): string {
  console.error('[FarmJobService] inquiry submission error:', error);

  const code = error?.code;
  const message = error?.message || '';

  // User-friendly validation raised by the database trigger (e.g. job not open,
  // invalid phone, duplicate recent submission).
  if (code === '23514') {
    return message || 'Failed to submit inquiry.';
  }

  // Permission / relation / column errors must not be exposed to public users.
  if (
    code === '42501' || // insufficient_privilege
    code === '42P01' || // undefined_table
    code === '42703' || // undefined_column
    /permission denied/i.test(message)
  ) {
    return 'Unable to submit your inquiry right now. Please try again later.';
  }

  return message || 'Failed to submit inquiry.';
}

/**
 * Farmer: Fetch inquiries for their jobs
 */
export async function getInquiriesForFarmerJobs(jobId?: string): Promise<JobInquiry[]> {
  if (!supabase) return [];

  try {
    let query = supabase
      .from('job_inquiries')
      .select('*, farm_jobs(title, farms(name))')
      .order('created_at', { ascending: false });

    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Notice loading job inquiries:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      ...row,
      job_title: row.farm_jobs?.title || 'Farm Job',
      farm_name: row.farm_jobs?.farms?.name || 'Farm',
    }));
  } catch (err) {
    console.error('Failed to get job inquiries:', err);
    return [];
  }
}

/**
 * Farmer: Update inquiry status (accept, decline, review)
 */
export async function updateInquiryStatus(
  inquiryId: string,
  status: JobInquiry['status']
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Database not available' };

  try {
    const { data, error } = await supabase
      .from('job_inquiries')
      .update({ status })
      .eq('id', inquiryId)
      .select('id')
      .maybeSingle();

    if (error) return { error: error.message };
    if (!data) return { error: 'Inquiry not found or access denied.' };
    return {};
  } catch (err: any) {
    return { error: err.message };
  }
}
