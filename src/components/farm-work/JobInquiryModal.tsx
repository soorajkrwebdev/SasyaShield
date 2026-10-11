import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { submitJobInquiry } from '../../services/farmJobService';
import { PublicFarmJob } from '../../types';
import { CheckCircle2 } from 'lucide-react';

interface JobInquiryModalProps {
  job: PublicFarmJob | null;
  isOpen: boolean;
  onClose: () => void;
}

export const JobInquiryModal: React.FC<JobInquiryModalProps> = ({ job, isOpen, onClose }) => {
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [workersCount, setWorkersCount] = useState<number>(1);
  const [availableDate, setAvailableDate] = useState(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!job) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName.trim() || !applicantPhone.trim() || !message.trim()) {
      setError('Please provide your name, phone number, and a message.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await submitJobInquiry({
      job_id: job.id,
      applicant_name: applicantName.trim(),
      applicant_phone: applicantPhone.trim(),
      applicant_email: applicantEmail.trim() || undefined,
      workers_count: Number(workersCount),
      available_date: availableDate,
      message: message.trim(),
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Failed to submit inquiry.');
    } else {
      setSubmitted(true);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setApplicantName('');
    setApplicantPhone('');
    setApplicantEmail('');
    setMessage('');
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Submit Work Inquiry / Application">
      {submitted ? (
        <div className="text-center py-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Inquiry Submitted Successfully!</h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">
            Your contact information and message have been sent directly to the farm owner for "{job.title}". They will reach out to you via phone or in-app message.
          </p>
          <div className="pt-4">
            <Button variant="primary" size="sm" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1">
            <p className="font-bold text-slate-800">{job.title}</p>
            <p className="text-slate-500">
              {job.farm_display_name} • {job.location} • Starts: {job.start_date}
            </p>
            {job.wage_rate ? (
              <p className="font-semibold text-emerald-700">
                Offered wage: Rs {job.wage_rate} / {job.wage_unit}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Your Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Suresh Kumar"
                value={applicantName}
                onChange={e => setApplicantName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone Number *</label>
              <input
                type="tel"
                placeholder="e.g. +91 98450 12345"
                value={applicantPhone}
                onChange={e => setApplicantPhone(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address (Optional)</label>
            <input
              type="email"
              placeholder="e.g. suresh@example.com"
              value={applicantEmail}
              onChange={e => setApplicantEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Number of Workers</label>
              <input
                type="number"
                min="1"
                max="50"
                value={workersCount}
                onChange={e => setWorkersCount(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Available From Date</label>
              <input
                type="date"
                value={availableDate}
                onChange={e => setAvailableDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Message / Experience *</label>
            <textarea
              placeholder="Tell the farmer about your team's experience with this crop, previous work, or ask any questions..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
              rows={3}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Send Inquiry to Farmer'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
