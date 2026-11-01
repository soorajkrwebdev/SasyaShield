import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  deletePost,
  fetchPosts,
  fetchAnswerCounts,
  getCommunityImageSignedUrl,
  updatePost,
  type CommunityPost,
  type CommunityCategory,
} from '../../services/communityService';
import { useAuth } from '../../contexts/AuthContext';
import { EmptyState } from '../common/EmptyState';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { CommunityDiscussion } from './CommunityDiscussion';
import {
  MessageCircle,
  Search,
  Filter,
  X,
  Clock,
  MapPin,
  AlertCircle,
  RefreshCw,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

const PAGE_SIZE = 10;

const CATEGORY_LABELS: Record<CommunityCategory, string> = {
  'Pest & Diseases': 'Pest & Diseases',
  'Organic Farming': 'Organic Farming',
  'Fertilizers & Manure': 'Fertilizers & Manure',
  'Pesticide Safety': 'Pesticide Safety',
  'Crop Management': 'Crop Management',
  'Irrigation & Soil Health': 'Irrigation & Soil Health',
  'Market & Pricing': 'Market & Pricing',
  'General Farming': 'General Farming',
};

const COMMUNITY_CATEGORIES: CommunityCategory[] = [
  'Pest & Diseases',
  'Organic Farming',
  'Fertilizers & Manure',
  'Pesticide Safety',
  'Crop Management',
  'Irrigation & Soil Health',
  'Market & Pricing',
  'General Farming',
];

const CATEGORY_COLORS: Record<CommunityCategory, string> = {
  'Pest & Diseases': 'bg-rose-50 text-rose-700 border-rose-200',
  'Organic Farming': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Fertilizers & Manure': 'bg-amber-50 text-amber-700 border-amber-200',
  'Pesticide Safety': 'bg-orange-50 text-orange-700 border-orange-200',
  'Crop Management': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Irrigation & Soil Health': 'bg-sky-50 text-sky-700 border-sky-200',
  'Market & Pricing': 'bg-purple-50 text-purple-700 border-purple-200',
  'General Farming': 'bg-slate-50 text-slate-700 border-slate-200',
};

interface CommunityFeedProps {
  onAskCommunity?: () => void;
  refreshKey?: number;
}

interface PostImageState {
  url?: string;
  loading: boolean;
  failed?: boolean;
  refreshAttempted?: boolean;
}

const PostImageGallery: React.FC<{ post: CommunityPost }> = ({ post }) => {
  const imagePaths = post.image_urls ?? [];
  const [images, setImages] = useState<Record<string, PostImageState>>({});
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setImages(Object.fromEntries(imagePaths.map((path) => [path, { loading: true }])));

    void Promise.all(
      imagePaths.map(async (path) => {
        const result = await getCommunityImageSignedUrl(path);
        return [
          path,
          result.url
            ? { url: result.url, loading: false, refreshAttempted: false }
            : { loading: false, failed: true, refreshAttempted: false },
        ] as const;
      })
    ).then((results) => {
      if (active) setImages(Object.fromEntries(results));
    });

    return () => {
      active = false;
    };
  }, [imagePaths]);

  useEffect(() => {
    if (selectedImage === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage]);

  const refreshImage = async (path: string) => {
    const currentImage = images[path];
    if (!currentImage || currentImage.refreshAttempted) {
      setImages((current) => ({
        ...current,
        [path]: { ...current[path], loading: false, failed: true },
      }));
      return;
    }

    setImages((current) => ({
      ...current,
      [path]: { ...current[path], loading: true, refreshAttempted: true },
    }));
    const result = await getCommunityImageSignedUrl(path, true);
    setImages((current) => ({
      ...current,
      [path]: result.url
        ? { url: result.url, loading: false, refreshAttempted: true }
        : { loading: false, failed: true, refreshAttempted: true },
    }));
  };

  if (imagePaths.length === 0) return null;

  return (
    <>
      <div
        className={`mt-4 grid w-full gap-2 ${
          imagePaths.length === 1 ? 'grid-cols-1 sm:max-w-lg' : 'grid-cols-2 sm:grid-cols-3'
        }`}
      >
        {imagePaths.map((path, index) => {
          const image = images[path];
          return (
            <button
              key={path}
              type="button"
              onClick={() => setSelectedImage(index)}
              disabled={!image?.url}
              aria-label={`View image ${index + 1} of ${imagePaths.length}`}
              className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-left focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-default"
            >
              {image?.url && (
                <img
                  src={image.url}
                  alt={`Community post image ${index + 1}`}
                  loading="lazy"
                  onLoad={() =>
                    setImages((current) => ({
                      ...current,
                      [path]: { ...current[path], loading: false },
                    }))
                  }
                  onError={() => void refreshImage(path)}
                  className="h-full w-full object-cover"
                />
              )}
              {image?.loading && (
                <span className="absolute inset-0 flex items-center justify-center text-emerald-600">
                  <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading image" />
                </span>
              )}
              {image?.failed && (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center text-xs text-slate-500">
                  <AlertCircle className="h-5 w-5" />
                  Image unavailable
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedImage !== null && images[imagePaths[selectedImage]]?.url && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Community image preview"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            aria-label="Close image preview"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={images[imagePaths[selectedImage]].url}
            alt={`Community post image ${selectedImage + 1}`}
            onError={() => void refreshImage(imagePaths[selectedImage])}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[88vh] max-w-[94vw] rounded-xl object-contain"
          />
        </div>
      )}
    </>
  );
};

interface EditCommunityPostModalProps {
  post: CommunityPost;
  onClose: () => void;
  onSaved: (post: CommunityPost) => void;
}

const EditCommunityPostModal: React.FC<EditCommunityPostModalProps> = ({
  post,
  onClose,
  onSaved,
}) => {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [category, setCategory] = useState<CommunityCategory>(post.category);
  const [crop, setCrop] = useState(post.crop ?? '');
  const [location, setLocation] = useState(post.location ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    if (!title.trim() || !content.trim()) {
      setError('Enter both a title and a description before saving.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await updatePost(post.id, {
        title: title.trim(),
        content: content.trim(),
        category,
        crop: crop.trim() || null,
        location: location.trim() || null,
      });

      if (result.error || !result.data) {
        setError(result.error || 'The post could not be updated. Please try again.');
        return;
      }

      onSaved(result.data);
    } catch {
      setError('The post could not be updated. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={() => {
        if (!saving) onClose();
      }}
      title="Edit your post"
      subtitle="Update your question for the farming community."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="edit-community-title" className="mb-1.5 block text-xs font-bold text-slate-700">
            Title <span className="text-rose-600">*</span>
          </label>
          <input
            id="edit-community-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            required
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div>
          <label htmlFor="edit-community-content" className="mb-1.5 block text-xs font-bold text-slate-700">
            Description <span className="text-rose-600">*</span>
          </label>
          <textarea
            id="edit-community-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={5}
            required
            className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div>
          <label htmlFor="edit-community-category" className="mb-1.5 block text-xs font-bold text-slate-700">
            Category
          </label>
          <select
            id="edit-community-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as CommunityCategory)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            {COMMUNITY_CATEGORIES.map((item) => (
              <option key={item} value={item}>{CATEGORY_LABELS[item]}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="edit-community-crop" className="mb-1.5 block text-xs font-bold text-slate-700">
              Crop (optional)
            </label>
            <input
              id="edit-community-crop"
              value={crop}
              onChange={(event) => setCrop(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label htmlFor="edit-community-location" className="mb-1.5 block text-xs font-bold text-slate-700">
              Location (optional)
            </label>
            <input
              id="edit-community-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" loading={saving}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export const CommunityFeed: React.FC<CommunityFeedProps> = ({
  onAskCommunity,
  refreshKey = 0,
}) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [selectedDiscussionPost, setSelectedDiscussionPost] = useState<CommunityPost | null>(null);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [filters, setFilters] = useState<{
    search: string;
    category: CommunityCategory | null;
    crop: string;
    location: string;
  }>({
    search: '',
    category: null,
    crop: '',
    location: '',
  });

  const [answerCounts, setAnswerCounts] = useState<Record<string, number>>({});
  const requestId = useRef(0);
  const previousRefreshKey = useRef(refreshKey);

  const isLoadingMore = page > 1 && loading;

  // --------------------------------------------------------------------------
  // Load posts
  // --------------------------------------------------------------------------
  const loadPosts = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const { data, error: err, hasMore: more } = await fetchPosts(
        {
          category: filters.category || undefined,
          crop: filters.crop || undefined,
          location: filters.location || undefined,
          search: filters.search || undefined,
        },
        page,
        PAGE_SIZE
      );

      if (currentRequestId !== requestId.current) return;

      if (err) {
        setError(err);
        return;
      }

      const newPosts = data || [];

      // Fetch answer counts for the new posts
      const postIds = newPosts.map((p) => p.id);
      if (postIds.length > 0) {
        const { data: counts } = await fetchAnswerCounts(postIds);
        if (counts && currentRequestId === requestId.current) {
          setAnswerCounts((prev) => ({ ...prev, ...counts }));
        }
      }

      if (currentRequestId !== requestId.current) return;

      if (page === 1) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }

      setHasMore(!!more);
    } catch (err: any) {
      if (currentRequestId === requestId.current) {
        setError(err.message || 'Failed to load posts');
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    setPage(1);
    setPosts([]);
    setAnswerCounts({});
    setHasMore(true);
  }, [filters.search, filters.category, filters.crop, filters.location]);

  useEffect(() => {
    if (previousRefreshKey.current === refreshKey) return;
    previousRefreshKey.current = refreshKey;
    setPage(1);
    setPosts([]);
    setAnswerCounts({});
    setHasMore(true);
  }, [refreshKey]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts, refreshKey]);

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------
  const clearFilters = () => {
    setFilters({
      search: '',
      category: null,
      crop: '',
      location: '',
    });
  };

  const hasActiveFilters =
    filters.search.length > 0 ||
    filters.category !== null ||
    filters.crop.length > 0 ||
    filters.location.length > 0;

  const loadMore = () => {
    if (!hasMore || loading) return;
    setPage((prev) => prev + 1);
  };

  const retry = () => {
    setError(null);
    loadPosts();
  };

  const handleDeletePost = async (post: CommunityPost) => {
    if (!user || user.id !== post.user_id || deletingPostId) return;
    if (!window.confirm('Delete this post? This action cannot be undone.')) return;

    setDeletingPostId(post.id);
    setActionError(null);
    try {
      const result = await deletePost(post.id);
      if (result.error) {
        setActionError(`We couldn't delete your post: ${result.error}`);
        return;
      }

      setPosts((current) => current.filter((item) => item.id !== post.id));
      setAnswerCounts((current) => {
        const next = { ...current };
        delete next[post.id];
        return next;
      });
      if (selectedDiscussionPost?.id === post.id) setSelectedDiscussionPost(null);
    } catch {
      setActionError('We couldn’t delete your post. Check your connection and try again.');
    } finally {
      setDeletingPostId(null);
    }
  };

  const handlePostSaved = (updatedPost: CommunityPost) => {
    setPosts((current) =>
      current.map((post) => (post.id === updatedPost.id ? updatedPost : post))
    );
    if (selectedDiscussionPost?.id === updatedPost.id) {
      setSelectedDiscussionPost(updatedPost);
    }
    setEditingPost(null);
  };

  // --------------------------------------------------------------------------
  // Render post card
  // --------------------------------------------------------------------------
  const renderPost = (post: CommunityPost) => {
    const answerCount = answerCounts[post.id] ?? 0;
    const categoryColor = CATEGORY_COLORS[post.category] ?? 'bg-slate-50 text-slate-700 border-slate-200';
    const postedDate = new Date(post.created_at).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <article
        key={post.id}
        className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer group"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4 gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${categoryColor}`}
              >
                {CATEGORY_LABELS[post.category] ?? post.category}
              </span>
              {post.crop && (
                <span className="text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                  {post.crop}
                </span>
              )}
            </div>

            <h3 className="text-sm font-semibold text-slate-900 leading-tight mb-1 group-hover:text-emerald-600 transition-colors">
              {post.title}
            </h3>

            <p className="text-sm text-slate-600 leading-relaxed mb-3 line-clamp-2">
              {post.content}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-3">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{postedDate}</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedDiscussionPost(post)}
                aria-label={`Open discussion, ${answerCount} answer${answerCount === 1 ? '' : 's'}`}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <MessageCircle className="w-3 h-3" />
                <span>{answerCount} answer{answerCount !== 1 ? 's' : ''}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                {post.author?.full_name?.charAt(0) || 'C'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 leading-tight">
                  {post.author?.full_name || 'Community member'}
                </p>
                <p className="text-[10px] text-slate-500 capitalize truncate">
                  {[post.author?.village, post.author?.district, post.author?.state]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
              {user?.id === post.user_id && (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setOpenMenuPostId((current) => current === post.id ? null : post.id)}
                    aria-label={`Post options for ${post.title}`}
                    aria-haspopup="menu"
                    aria-expanded={openMenuPostId === post.id}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {openMenuPostId === post.id && (
                    <div
                      role="menu"
                      aria-label="Post options"
                      className="absolute right-0 top-full z-20 mt-1 min-w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setEditingPost(post);
                          setOpenMenuPostId(null);
                          setActionError(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={deletingPostId === post.id}
                        onClick={() => {
                          setOpenMenuPostId(null);
                          void handleDeletePost(post);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      >
                        {deletingPostId === post.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />}
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
        <PostImageGallery post={post} />
      </article>
    );
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  if (loading && posts.length === 0) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading community posts…</p>
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Unable to load posts</h3>
        <p className="text-xs text-slate-500 mb-6 max-w-xs mx-auto">{error}</p>
        <Button variant="outline" size="sm" onClick={retry} icon={<RefreshCw className="w-3 h-3" />}>
          Try again
        </Button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<Search className="w-10 h-10 text-slate-300" />}
        title={hasActiveFilters ? 'No posts found' : 'No posts yet'}
        description={
          hasActiveFilters
            ? 'Try adjusting your search or filters to find discussions.'
            : 'Be the first to start a conversation with the farming community.'
        }
        actionText={onAskCommunity ? 'Ask the Community' : undefined}
        onAction={onAskCommunity}
        actionIcon={<Plus className="w-4 h-4" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Farmer Community
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Global discussions from farmers across all regions
          </p>
        </div>
        {onAskCommunity && (
          <Button
            variant="primary"
            size="sm"
            onClick={onAskCommunity}
            icon={<Plus className="w-4 h-4" />}
          >
            Ask the Community
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search posts…"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ['Pest & Diseases', 'Pest & Diseases'],
                ['Organic Farming', 'Organic Farming'],
                ['Fertilizers & Manure', 'Fertilizers & Manure'],
                ['Pesticide Safety', 'Pesticide Safety'],
                ['Crop Management', 'Crop Management'],
                ['Irrigation & Soil Health', 'Irrigation & Soil Health'],
                ['Market & Pricing', 'Market & Pricing'],
                ['General Farming', 'General Farming'],
              ] as [CommunityCategory, string][]
            ).map(([value, label]) => (
              <Button
                key={value}
                variant="outline"
                size="sm"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    category: prev.category === value ? null : value,
                  }))
                }
                className={`
                  text-xs px-3 py-1.5 rounded-xl border transition-all
                  ${filters.category === value
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'text-slate-600 hover:bg-slate-50 border-slate-200'}
                `}
              >
                {label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Filter className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Filter by crop…"
                value={filters.crop}
                onChange={(e) => setFilters((prev) => ({ ...prev, crop: e.target.value }))}
                className="w-40 pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="relative">
              <MapPin className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Filter by location…"
                value={filters.location}
                onChange={(e) => setFilters((prev) => ({ ...prev, location: e.target.value }))}
                className="w-40 pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} icon={<X className="w-3 h-3" />}>
                Clear filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
          {actionError}
        </div>
      )}

      <div className="space-y-3">{posts.map((post) => renderPost(post))}</div>

      {hasMore && posts.length > 0 && (
        <div className="flex justify-center py-4">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={isLoadingMore} loading={isLoadingMore} icon={<Loader2 className="w-3 h-3" />}>
            Load more
          </Button>
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="flex justify-center py-4">
          <p className="text-xs text-slate-500">No more posts</p>
        </div>
      )}

      {selectedDiscussionPost && (
        <CommunityDiscussion
          post={selectedDiscussionPost}
          onClose={() => setSelectedDiscussionPost(null)}
        />
      )}
      {editingPost && (
        <EditCommunityPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSaved={handlePostSaved}
        />
      )}
    </div>
  );
};

export default CommunityFeed;
