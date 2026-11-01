import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CommunityFeed } from '../components/community/CommunityFeed';
import { CreatePostModal } from '../components/community/CreatePostModal';
import { Loader2 } from 'lucide-react';

export const CommunityPage: React.FC = () => {
  const { user, loading } = useAuth();
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading Farmer Community…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
          Farmer Community
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Global discussions from farmers across all regions — ask questions, share knowledge,
          and connect with fellow farmers.
        </p>
      </div>

      <CommunityFeed
        onAskCommunity={user ? () => setIsCreatePostOpen(true) : undefined}
        refreshKey={feedRefreshKey}
      />

      {user && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
              <span aria-hidden="true">✓</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Signed in
              </p>
              <p className="text-[10px] text-slate-500">Verified account</p>
            </div>
          </div>
        </div>
      )}

      {user && (
        <CreatePostModal
          isOpen={isCreatePostOpen}
          onClose={() => setIsCreatePostOpen(false)}
          onSuccess={() => setFeedRefreshKey((current) => current + 1)}
        />
      )}
    </div>
  );
};

export default CommunityPage;
