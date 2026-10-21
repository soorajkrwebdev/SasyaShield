import React, { useState, useEffect, useCallback } from 'react';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  Briefcase,
  Search,
  Users,
  Clock,
  Plus,
  Filter,
  Share2,
  Phone,
  MessageSquare,
  Eye,
  Trash2,
  SearchX,
  Home,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { FarmJob, PublicFarmJob } from '../../types';
import {
  getPublicFarmJobs,
  getFarmerJobs,
  deleteFarmJob,
  updateFarmJob,
} from '../../services/farmJobService';
import { CreateJobModal } from '../../components/farm-work/CreateJobModal';
import { JobInquiryModal } from '../../components/farm-work/JobInquiryModal';
import { JobDetailsModal } from '../../components/farm-work/JobDetailsModal';
import { ViewInquiriesModal } from '../../components/farm-work/ViewInquiriesModal';

export interface FarmWorkBoardPageProps {
  onGoToAuth?: (mode: 'login' | 'register') => void;
  onBackToHome?: () => void;
}

export const FarmWorkBoardPage: React.FC<FarmWorkBoardPageProps> = ({ onGoToAuth, onBackToHome }) => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'public' | 'my-jobs'>('public');
  const [q, setQ] = useState('');
  const [workTypeFilter, setWorkTypeFilter] = useState('all');

  const [publicJobs, setPublicJobs] = useState<PublicFarmJob[]>([]);
  const [myJobs, setMyJobs] = useState<FarmJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedJobForInquiry, setSelectedJobForInquiry] = useState<PublicFarmJob | null>(null);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<PublicFarmJob | null>(null);
  const [selectedJobForInquiries, setSelectedJobForInquiries] = useState<FarmJob | null>(null);
  const [showAllInquiriesModal, setShowAllInquiriesModal] = useState(false);

  const workTypes = [
    'all',
    'Harvesting',
    'Pruning',
    'Weeding',
    'Planting',
    'Irrigation',
    'Processing',
    'Transport',
    'Other',
  ];

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const pub = await getPublicFarmJobs();
      setPublicJobs(pub);

      if (user) {
        try {
          const mine = await getFarmerJobs(user.id);
          setMyJobs(mine);
        } catch (mineErr: any) {
          // Farmer-tab failure must not blank the public board.
          console.warn('[FarmWorkBoard] farmer jobs failed:', mineErr?.message);
          setMyJobs([]);
        }
      } else {
        setMyJobs([]);
      }
    } catch (err: any) {
      // Genuine fetch failure — distinct from "zero jobs".
      setPublicJobs([]);
      setLoadError(err?.message || 'Could not load farm jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const hasActiveFilters = q.trim() !== '' || workTypeFilter !== 'all';
  const clearFilters = () => {
    setQ('');
    setWorkTypeFilter('all');
  };

  const displayedJobs = activeTab === 'public' ? publicJobs : myJobs;

  const filteredJobs = displayedJobs.filter(job => {
    const farmName = ('farm_name' in job && job.farm_name)
      || ('farm_display_name' in job && job.farm_display_name);
    const matchesSearch =
      job.title.toLowerCase().includes(q.toLowerCase()) ||
      job.description.toLowerCase().includes(q.toLowerCase()) ||
      (job.location && job.location.toLowerCase().includes(q.toLowerCase())) ||
      (farmName && farmName.toLowerCase().includes(q.toLowerCase()));
    const matchesType = workTypeFilter === 'all' || job.work_type === workTypeFilter;
    return matchesSearch && matchesType;
  });

  const handleCloseJob = async (jobId: string) => {
    if (confirm('Are you sure you want to mark this position as closed?')) {
      await updateFarmJob(jobId, { status: 'cancelled' });
      fetchJobs();
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (confirm('Are you sure you want to delete this job listing?')) {
      await deleteFarmJob(jobId);
      fetchJobs();
    }
  };

  const getStatusBadge = (status: FarmJob['status']) => {
    switch (status) {
      case 'open':
        return <Badge variant="emerald" size="sm">Open</Badge>;
      case 'in-progress':
        return <Badge variant="amber" size="sm">In Progress</Badge>;
      case 'filled':
        return <Badge variant="blue" size="sm">Filled</Badge>;
      case 'cancelled':
      case 'closed':
      default:
        return <Badge variant="slate" size="sm">Closed</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">Farm Work Board</h1>
            <Badge variant="emerald" size="sm">
              Public Community Board
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Discover community agricultural tasks, connect directly with farms, or post labor opportunities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllInquiriesModal(true)}
              className="text-xs"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              All Inquiries
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => {
              if (!user) {
                if (onGoToAuth) {
                  onGoToAuth('login');
                } else {
                  alert('Please sign in as a farmer to post a job listing.');
                }
                return;
              }
              setIsCreateModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Post Farm Work
          </Button>
        </div>
      </div>

      {/* Tabs */}
      {user && (
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('public')}
            className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === 'public'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Open Community Listings ({publicJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('my-jobs')}
            className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === 'my-jobs'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            My Posted Listings ({myJobs.length})
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 rounded-xl">
              <Briefcase className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{publicJobs.length}</p>
              <p className="text-xs text-slate-500">Active Work Openings</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-xl">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {publicJobs.reduce((sum, j) => sum + (j.workers_needed || 1), 0)}
              </p>
              <p className="text-xs text-slate-500">Total Workers Needed</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-xl">
              <MessageSquare className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">Direct Inquiries</p>
              <p className="text-xs text-slate-500">No Worker Account Required</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout: Filters + Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Filter Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-800">Work Category</h3>
              <Filter className="w-4 h-4 text-slate-400" />
            </div>
            <div className="space-y-1">
              {workTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setWorkTypeFilter(type)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                    workTypeFilter === type
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <span>{type === 'all' ? 'All Categories' : type}</span>
                </button>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">
                Public Worker Access
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Agricultural workers and helpers can browse open opportunities and contact farmers directly without creating an account or storing personal logins.
              </p>
            </div>
          </div>
        </div>

        {/* Right Listings Column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by job title, location, or crop..."
                value={q}
                onChange={e => setQ(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm bg-white rounded-xl border border-slate-200 w-full focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm"
              />
            </div>
          </div>

          {/* Job listings */}
          {loading ? (
            <div className="py-16 text-center text-slate-500" role="status" aria-live="polite">
              <LoadingSpinner message="Loading farm work listings..." />
            </div>
          ) : loadError ? (
            <ErrorState
              title="Could not load farm jobs"
              description="We couldn't reach the farm work board. Check your connection and try again."
              details={loadError}
              onRetry={fetchJobs}
              retryText="Retry"
            />
          ) : filteredJobs.length > 0 ? (
            <div className="space-y-4">
              {filteredJobs.map(job => (
                <div
                  key={job.id}
                  className="bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedJobForDetails(job)}
                  role="button"
                  onKeyDown={e => e.key === 'Enter' && setSelectedJobForDetails(job)}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {getStatusBadge(job.status)}
                        <Badge variant="slate" size="sm">
                          {job.work_type}
                        </Badge>
                        {job.wage_rate && job.wage_rate > 0 && (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center">
                            ₹{job.wage_rate}/{job.wage_unit}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-slate-800">{job.title}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {('farm_name' in job && job.farm_name)
                          || ('farm_display_name' in job && job.farm_display_name)
                          || 'Verified Farm'} • {job.location}
                      </p>
                    </div>

                    <button
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600"
                      title="Share job"
                      onClick={e => {
                        e.stopPropagation();
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(window.location.href);
                          alert('Job link copied to clipboard!');
                        }
                      }}
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-3 pt-2 text-xs text-slate-500 border-t border-slate-100">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-600" />
                        <span className="font-medium text-slate-700">
                          {job.workers_needed} {job.workers_needed === 1 ? 'worker' : 'workers'} needed
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>
                          {job.start_date}
                          {job.end_date ? ` to ${job.end_date}` : ' onwards'}
                        </span>
                      </div>
                      {job.contact_phone && (
                        <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                          <Phone className="w-3.5 h-3.5" />
                          <a href={`tel:${job.contact_phone}`} className="hover:underline">
                            {job.contact_phone}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {activeTab === 'my-jobs' || (user && myJobs.some(ownedJob => ownedJob.id === job.id)) ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedJobForInquiries(myJobs.find(ownedJob => ownedJob.id === job.id) || null);
                            }}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Inquiries ({('inquiry_count' in job ? job.inquiry_count : undefined) || 0})
                          </Button>
                          {job.status === 'open' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-rose-600 hover:bg-rose-50 text-xs"
                              onClick={e => {
                                e.stopPropagation();
                                handleCloseJob(job.id);
                              }}
                            >
                              Close
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-400 hover:text-rose-600 text-xs"
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteJob(job.id);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedJobForDetails(job);
                          }}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700"
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1" />
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : hasActiveFilters ? (
            <EmptyState
              icon={<SearchX className="w-10 h-10 text-slate-400" />}
              title="No jobs match your search."
              description="Try a different keyword or category, or clear the filters to see all available work."
              actionText="Clear Filters"
              onAction={clearFilters}
            />
          ) : activeTab === 'my-jobs' ? (
            <EmptyState
              icon={<Briefcase className="w-10 h-10 text-slate-400" />}
              title="No jobs posted yet"
              description='Click "Post Farm Work" to create an opening for seasonal helpers or specialists.'
            />
          ) : (
            <EmptyState
              icon={<Briefcase className="w-10 h-10 text-slate-400" />}
              title="No Farm Jobs Listed Yet"
              description="There are currently no farm work opportunities available. Please check again later."
              actionText={onBackToHome ? 'Back to Home' : undefined}
              onAction={onBackToHome}
              actionIcon={onBackToHome ? <Home className="w-3.5 h-3.5" /> : undefined}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {user && (
        <CreateJobModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onJobCreated={fetchJobs}
        />
      )}

      {selectedJobForDetails && (
        <JobDetailsModal
          job={selectedJobForDetails}
          isOpen={!!selectedJobForDetails}
          onClose={() => setSelectedJobForDetails(null)}
          onApply={job => {
            setSelectedJobForDetails(null);
            setSelectedJobForInquiry(job);
          }}
        />
      )}

      {selectedJobForInquiry && (
        <JobInquiryModal
          isOpen={!!selectedJobForInquiry}
          onClose={() => setSelectedJobForInquiry(null)}
          job={selectedJobForInquiry}
        />
      )}

      {selectedJobForInquiries && (
        <ViewInquiriesModal
          isOpen={!!selectedJobForInquiries}
          onClose={() => setSelectedJobForInquiries(null)}
          jobId={selectedJobForInquiries.id}
          jobTitle={selectedJobForInquiries.title}
        />
      )}

      {showAllInquiriesModal && (
        <ViewInquiriesModal
          isOpen={showAllInquiriesModal}
          onClose={() => setShowAllInquiriesModal(false)}
        />
      )}
    </div>
  );
};
