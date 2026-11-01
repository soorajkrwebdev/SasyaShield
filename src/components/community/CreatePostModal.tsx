import React, { useRef, useState } from 'react';
import { AlertCircle, Sprout } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  createPost,
  uploadPostImages,
} from '../../services/communityService';
import type { CommunityCategory } from '../../types/community';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { CommunityImageUpload } from './CommunityImageUpload';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

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

function getSafeServiceError(message: string | undefined, action: string): string {
  const normalizedMessage = message?.toLowerCase() ?? '';

  if (
    normalizedMessage.includes('not configured') ||
    normalizedMessage.includes('configuration missing') ||
    normalizedMessage.includes('database unavailable')
  ) {
    return 'Community publishing is currently unavailable. Please try again later.';
  }

  if (
    normalizedMessage.includes('permission') ||
    normalizedMessage.includes('not authorized') ||
    normalizedMessage.includes('row-level security') ||
    normalizedMessage.includes('jwt')
  ) {
    return 'Your session may have expired or may not have permission to publish. Please sign in again and retry.';
  }

  if (
    normalizedMessage.includes('network') ||
    normalizedMessage.includes('fetch') ||
    normalizedMessage.includes('timeout')
  ) {
    return `We couldn't reach the community service to ${action}. Check your connection and try again.`;
  }

  return `We couldn't ${action}. Please try again.`;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<CommunityCategory>('General Farming');
  const [crop, setCrop] = useState('');
  const [location, setLocation] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; content?: string }>({});
  const [pendingPostId, setPendingPostId] = useState<string | null>(null);
  const submissionInProgress = useRef(false);

  const handleClose = () => {
    if (submissionInProgress.current) return;

    if (pendingPostId && imageFiles.length > 0) {
      setFormError(
        'Your question has already been created. Retry attaching the selected photos, or remove all photos and publish without them before closing.'
      );
      return;
    }

    if (!pendingPostId) {
      setTitle('');
      setContent('');
      setCategory('General Farming');
      setCrop('');
      setLocation('');
      setImageFiles([]);
      setFieldErrors({});
    }
    setFormError(null);
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionInProgress.current) return;

    const nextFieldErrors: { title?: string; content?: string } = {};
    if (!title.trim()) nextFieldErrors.title = 'Enter a title for your question.';
    if (!content.trim()) nextFieldErrors.content = 'Describe your question or what help you need.';

    setFieldErrors(nextFieldErrors);
    setFormError(null);
    if (Object.keys(nextFieldErrors).length > 0) return;

    if (!user) {
      setFormError('Please sign in to ask the community a question.');
      return;
    }

    submissionInProgress.current = true;
    setLoading(true);
    let hasCreatedPost = Boolean(pendingPostId);
    const userId = user.id;

    try {
      let postId = pendingPostId;

      if (!postId) {
        const result = await createPost(userId, {
          title: title.trim(),
          content: content.trim(),
          category,
          crop: crop.trim() || null,
          location: location.trim() || null,
        });

        if (result.error || !result.data) {
          setFormError(getSafeServiceError(result.error, 'publish your question'));
          return;
        }

        postId = result.data.id;
        hasCreatedPost = true;
        setPendingPostId(postId);
      }

      if (imageFiles.length > 0) {
        const uploadResult = await uploadPostImages(postId, userId, imageFiles);
        if (!uploadResult.success) {
          setFormError(
            `Your question was created, but its photos were not attached. ${getSafeServiceError(uploadResult.errors[0], 'attach your photos')} Retry using the existing question, or remove all photos and publish without them. The question will not be duplicated.`
          );
          return;
        }
      }

      setTitle('');
      setContent('');
      setCategory('General Farming');
      setCrop('');
      setLocation('');
      setImageFiles([]);
      setPendingPostId(null);
      setFormError(null);
      setFieldErrors({});
      onClose();
      onSuccess?.();
    } catch {
      setFormError(
        hasCreatedPost
          ? 'Your question was created, but its photos could not be attached. Retry using the existing question, or remove all photos and publish without them. The question will not be duplicated.'
          : getSafeServiceError(undefined, 'publish your question')
      );
    } finally {
      submissionInProgress.current = false;
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Ask the Community"
      subtitle="Share your question with farmers and get practical advice."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {formError && (
          <div
            className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{formError}</p>
          </div>
        )}

        <div>
          <label htmlFor="community-post-title" className="mb-1.5 block text-xs font-bold text-slate-700">
            Question title <span className="text-rose-600">*</span>
          </label>
          <input
            id="community-post-title"
            type="text"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setFieldErrors((current) => ({ ...current, title: undefined }));
            }}
            placeholder="e.g. How can I prevent leaf spot in my pepper plants?"
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? 'community-post-title-error' : undefined}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {fieldErrors.title && (
            <p id="community-post-title-error" className="mt-1 text-xs text-rose-600">
              {fieldErrors.title}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="community-post-content" className="mb-1.5 block text-xs font-bold text-slate-700">
            Detailed question <span className="text-rose-600">*</span>
          </label>
          <textarea
            id="community-post-content"
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              setFieldErrors((current) => ({ ...current, content: undefined }));
            }}
            placeholder="Describe what you have observed, what you have tried, and any details that may help other farmers advise you."
            rows={5}
            aria-invalid={Boolean(fieldErrors.content)}
            aria-describedby={fieldErrors.content ? 'community-post-content-error' : undefined}
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {fieldErrors.content && (
            <p id="community-post-content-error" className="mt-1 text-xs text-rose-600">
              {fieldErrors.content}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="community-post-category" className="mb-1.5 block text-xs font-bold text-slate-700">
              Category
            </label>
            <select
              id="community-post-category"
              value={category}
              onChange={(event) => setCategory(event.target.value as CommunityCategory)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {COMMUNITY_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="community-post-crop" className="mb-1.5 block text-xs font-bold text-slate-700">
              Crop name <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="community-post-crop"
              type="text"
              value={crop}
              onChange={(event) => setCrop(event.target.value)}
              placeholder="e.g. Pepper, rice, tomato"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <div>
          <label htmlFor="community-post-location" className="mb-1.5 block text-xs font-bold text-slate-700">
            Location <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="community-post-location"
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Village, district, or region"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <CommunityImageUpload onImagesChange={setImageFiles} disabled={loading} />

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading}
            icon={<Sprout className="h-4 w-4" />}
            className="w-full sm:w-auto"
          >
            {loading ? 'Publishing...' : pendingPostId ? 'Retry publishing' : 'Publish question'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreatePostModal;
