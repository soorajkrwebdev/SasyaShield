import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  Briefcase,
  MapPin,
  Building2,
  Clock,
  Users,
  Mail,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { PublicFarmJob } from '../../types';

interface JobDetailsModalProps {
  job: PublicFarmJob | null;
  isOpen: boolean;
  onClose: () => void;
  onApply: (job: PublicFarmJob) => void;
}

const NOT_SPECIFIED = 'Not specified';

const statusBadge = (status: PublicFarmJob['status']) => {
  switch (status) {
    case 'open':
      return <Badge variant="emerald" size="sm">Open</Badge>;
    case 'in-progress':
      return <Badge variant="blue" size="sm">In Progress</Badge>;
    case 'filled':
      return <Badge variant="indigo" size="sm">Filled</Badge>;
    case 'completed':
      return <Badge variant="slate" size="sm">Completed</Badge>;
    case 'cancelled':
    case 'closed':
    default:
      return <Badge variant="slate" size="sm">Closed</Badge>;
  }
};

const contactPreferenceLabel = (pref: PublicFarmJob['contact_preference']) => {
  switch (pref) {
    case 'both':
      return 'Phone & Online Inquiry';
    case 'phone':
      return 'Direct Phone Call Only';
    case 'inquiry':
      return 'Online Inquiry Only';
    default:
      return NOT_SPECIFIED;
  }
};

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return NOT_SPECIFIED;
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return NOT_SPECIFIED;
  }
};

const durationLabel = (job: PublicFarmJob) => {
  if (!job.start_date) return NOT_SPECIFIED;
  if (job.end_date) {
    return `${formatDate(job.start_date)} to ${formatDate(job.end_date)}`;
  }
  return `${formatDate(job.start_date)} onwards`;
};

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  isOpen,
  onClose,
  onApply,
}) => {
  if (!job) return null;

  const hasWage = job.wage_rate != null && job.wage_rate > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Job Details" maxWidth="2xl">
      <div className="space-y-6">
        {/* SECTION 1 — JOB OVERVIEW */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-600 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
              Job Overview
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
                Job title
              </p>
              <h3 className="text-lg font-bold text-slate-900 leading-snug">
                {job.title}
              </h3>
            </div>
            <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 flex items-end gap-2">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
                  Type of work
                </p>
                <span className="text-sm font-medium text-slate-600">
                  {job.work_type}
                </span>
              </div>
              {statusBadge(job.status)}
            </div>
          </div>

          <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-3">
              Job description
            </p>
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap break-words text-sm">
              {job.description || NOT_SPECIFIED}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 text-center">
              <Users className="w-4 h-4 text-emerald-600 mx-auto mb-1.5" />
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">
                Workers required
              </p>
              <p className="text-sm font-bold text-slate-900">
                {job.workers_needed}{' '}
                {job.workers_needed === 1 ? 'worker' : 'workers'}
              </p>
            </div>
            <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 text-center">
              <Clock className="w-4 h-4 text-slate-400 mx-auto mb-1.5" />
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">
                Work schedule
              </p>
              <p className="text-sm font-bold text-slate-900 leading-snug">
                {durationLabel(job)}
              </p>
            </div>
            <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 text-center">
              <ShieldCheck className="w-4 h-4 text-slate-400 mx-auto mb-1.5" />
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">
                Listing status
              </p>
              <span className="text-xs font-medium">{statusBadge(job.status)}</span>
            </div>
          </div>
        </section>


        {/* SECTION 2 — FARM AND LOCATION */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
              Farm &amp; Location
            </h2>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
                  Farm
                </p>
                <h3 className="text-lg font-bold text-slate-900">
                  {job.farm_display_name || NOT_SPECIFIED}
                </h3>
              </div>
            </div>

            <div className="mt-4 sm:mt-0 pt-4 border-t border-slate-100 sm:border-t-0 sm:border-l sm:border-l-slate-100 sm:pl-6 pl-0 sm:pt-0">
              <div className="flex items-start gap-3 mb-2">
                <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
                    Location
                  </p>
                  <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                    {job.location || NOT_SPECIFIED}
                  </p>
                </div>
              </div>
              {job.farm_display_name && (
                <p className="text-xs text-slate-500">
                  Farm displayed publicly as: <span className="font-medium">{job.farm_display_name}</span>
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center">
            Location shown is what the farmer provided when creating the job. No street address or
            GPS coordinates are stored unless the farmer included them in the location field.
          </p>
        </section>

        {/* SECTION 3 — PAYMENT AND DATES */}
        <section className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-50 border border-emerald-200/60 rounded-xl p-4">
              <p className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold mb-2">
                Offered payment
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-emerald-700">
                  {hasWage ? `₹${job.wage_rate}` : NOT_SPECIFIED}
                </span>
                <span className="text-sm font-medium text-emerald-600">
                  {hasWage ? ` / ${job.wage_unit}` : ''}
                </span>
              </div>
              <p className="text-xs text-emerald-500 mt-1">
                {hasWage ? 'Per ' + job.wage_unit : 'No wage was specified by the farmer.'}
              </p>
            </div>
            <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">
                Work start date
              </p>
              <p className="text-lg font-bold text-slate-900">{formatDate(job.start_date)}</p>
              {job.end_date && (
                <p className="text-xs text-slate-500 mt-1">
                  Expected to run until {formatDate(job.end_date)}.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 4 — REQUIREMENTS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
              Requirements
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
                Number of workers
              </p>
              <p className="text-sm font-bold text-slate-900">
                {job.workers_needed}{' '}
                {job.workers_needed === 1 ? 'worker' : 'workers'}
              </p>
            </div>
            <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
                Skills, experience &amp; facilities
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Specific skills, experience, accommodation, facilities, and equipment requirements
                (if any) are described in the full job description above. The farmer did not provide
                separate structured fields for these items.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 5 — ADDITIONAL INFORMATION */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-emerald-600 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
              Additional Information
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
                How to apply
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                {contactPreferenceLabel(job.contact_preference)}
              </p>
            </div>
            <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
                Posted
              </p>
              <p className="text-sm text-slate-600">{formatDate(job.created_at)}</p>
            </div>
          </div>
        </section>

        {/* Action */}
        <div className="pt-2 border-t border-slate-100">
          <Button
            variant="primary"
            size="sm"
            icon={<ArrowRight className="w-4 h-4" />}
            className="w-full sm:w-auto"
            onClick={() => onApply(job)}
          >
            Apply for This Job
          </Button>
        </div>
      </div>
    </Modal>
  );
};
