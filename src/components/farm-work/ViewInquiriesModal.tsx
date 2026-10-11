import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { JobInquiry } from '../../types';
import { getInquiriesForFarmerJobs, updateInquiryStatus } from '../../services/farmJobService';
import { Mail, Phone, Calendar, Users, MessageSquare, Check, X } from 'lucide-react';

interface ViewInquiriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId?: string;
  jobTitle?: string;
}

export const ViewInquiriesModal: React.FC<ViewInquiriesModalProps> = ({
  isOpen,
  onClose,
  jobId,
  jobTitle,
}) => {
  const [inquiries, setInquiries] = useState<JobInquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadInquiries = useCallback(async () => {
    setLoading(true);
    const data = await getInquiriesForFarmerJobs(jobId);
    setInquiries(data);
    setLoading(false);
  }, [jobId]);

  useEffect(() => {
    if (isOpen) {
      loadInquiries();
    }
  }, [isOpen, loadInquiries]);

  const handleStatusChange = async (inquiryId: string, status: JobInquiry['status']) => {
    setActionLoading(inquiryId);
    setActionError(null);
    const result = await updateInquiryStatus(inquiryId, status);
    if (result.error) {
      setActionError(result.error);
    } else {
      setInquiries(prev =>
        prev.map(item => (item.id === inquiryId ? { ...item, status } : item))
      );
    }
    setActionLoading(null);
  };

  const getStatusBadge = (status: JobInquiry['status']) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="emerald" size="sm">Accepted</Badge>;
      case 'declined':
        return <Badge variant="rose" size="sm">Declined</Badge>;
      case 'reviewed':
        return <Badge variant="blue" size="sm">Reviewed</Badge>;
      case 'pending':
      default:
        return <Badge variant="amber" size="sm">Pending</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={jobTitle ? `Inquiries: ${jobTitle}` : 'Applicant Inquiries'}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Review worker and community member contacts who expressed interest in your farm work listings.
        </p>

        {actionError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {actionError}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading applicant inquiries...
          </div>
        ) : inquiries.length === 0 ? (
          <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
            <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">No Inquiries Yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              When community workers view your listing and send their details, they will appear here directly.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {inquiries.map(inq => (
              <div
                key={inq.id}
                className="bg-white border rounded-xl p-4 hover:border-emerald-200 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-800">
                        {inq.applicant_name}
                      </span>
                      {getStatusBadge(inq.status)}
                    </div>
                    {inq.job_title && !jobId && (
                      <span className="text-xs text-emerald-700 font-medium block mt-0.5">
                        For listing: {inq.job_title}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(inq.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <a
                      href={`tel:${inq.applicant_phone}`}
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {inq.applicant_phone}
                    </a>
                  </div>
                  {inq.applicant_email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{inq.applicant_email}</span>
                    </div>
                  )}
                  {inq.available_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Available from: {inq.available_date}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Group size: {inq.workers_count} worker(s)</span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 bg-emerald-50/40 border border-emerald-100/60 p-2.5 rounded-lg">
                  <p className="font-medium text-slate-500 text-[10px] uppercase tracking-wider mb-1">
                    Message from applicant:
                  </p>
                  <p className="whitespace-pre-wrap">{inq.message}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                  {inq.status !== 'accepted' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-xs py-1"
                      onClick={() => handleStatusChange(inq.id, 'accepted')}
                      disabled={actionLoading === inq.id}
                    >
                      <Check className="w-3 h-3 mr-1" /> Accept & Contact
                    </Button>
                  )}
                  {inq.status !== 'declined' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-50 text-xs py-1"
                      onClick={() => handleStatusChange(inq.id, 'declined')}
                      disabled={actionLoading === inq.id}
                    >
                      <X className="w-3 h-3 mr-1" /> Decline
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
