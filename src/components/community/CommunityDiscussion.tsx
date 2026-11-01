import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CornerDownRight,
  Heart,
  Loader2,
  MessageCircle,
  Pencil,
  Send,
  Star,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  createAnswer,
  deleteAnswer,
  fetchAnswers,
  fetchLikeStatus,
  selectBestAnswer,
  toggleAnswerLike,
  updateAnswer,
  type LikeStatus,
} from '../../services/communityService';
import type { CommunityAnswer, CommunityPost } from '../../types/community';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

interface CommunityDiscussionProps {
  post: CommunityPost;
  onClose: () => void;
}

type ThreadAnswer = Omit<CommunityAnswer, 'replies'> & { replies: ThreadAnswer[] };

function buildAnswerTree(answers: CommunityAnswer[]): ThreadAnswer[] {
  const sortedAnswers = [...answers].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
  const nodes = new Map<string, ThreadAnswer>();

  sortedAnswers.forEach((answer) => {
    nodes.set(answer.id, { ...answer, replies: [] });
  });

  const roots: ThreadAnswer[] = [];
  sortedAnswers.forEach((answer) => {
    const node = nodes.get(answer.id);
    if (!node) return;

    const parent = answer.parent_answer_id
      ? nodes.get(answer.parent_answer_id)
      : undefined;
    if (parent && parent.id !== node.id) {
      parent.replies.push(node);
    } else {
      roots.push(node);
    }
  });

  const visited = new Set<string>();
  const stack = [...roots];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || visited.has(node.id)) continue;
    visited.add(node.id);
    stack.push(...node.replies);
  }

  sortedAnswers.forEach((answer) => {
    const node = nodes.get(answer.id);
    if (node && !visited.has(node.id)) roots.push(node);
  });

  return roots;
}

function safeDiscussionError(message: string | undefined, action: string): string {
  const value = message?.toLowerCase() ?? '';
  if (
    value.includes('permission') ||
    value.includes('row-level security') ||
    value.includes('not authorized') ||
    value.includes('jwt')
  ) {
    return `You may not have permission to ${action}. Please sign in again and retry.`;
  }
  if (value.includes('network') || value.includes('fetch') || value.includes('timeout')) {
    return `We couldn't reach the community service to ${action}. Check your connection and retry.`;
  }
  return `We couldn't ${action}. Please try again.`;
}

function formatAnswerDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
}

export const CommunityDiscussion: React.FC<CommunityDiscussionProps> = ({
  post,
  onClose,
}) => {
  const { user } = useAuth();
  const [answers, setAnswers] = useState<ThreadAnswer[]>([]);
  const [answerCount, setAnswerCount] = useState(0);
  const [likes, setLikes] = useState<Record<string, LikeStatus>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likeError, setLikeError] = useState<string | null>(null);
  const [composerParentId, setComposerParentId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [bestAnswerBusy, setBestAnswerBusy] = useState(false);
  const pendingLikeIds = useRef(new Set<string>());
  const loadRequestId = useRef(0);

  const loadDiscussion = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setError('Sign in to view and participate in this discussion.');
      return;
    }

    const requestId = ++loadRequestId.current;
    setLoading(true);
    setError(null);
    setLikeError(null);

    const result = await fetchAnswers(post.id);
    if (requestId !== loadRequestId.current) return;
    if (result.error || !result.data) {
      setError(safeDiscussionError(result.error, 'load answers'));
      setLoading(false);
      return;
    }

    setAnswerCount(result.data.length);
    setAnswers(buildAnswerTree(result.data));
    const answerIds = result.data.map((answer) => answer.id);
    if (answerIds.length > 0) {
      const likeResult = await fetchLikeStatus([], answerIds, user.id);
      if (requestId !== loadRequestId.current) return;
      if (likeResult.error) {
        setLikeError(safeDiscussionError(likeResult.error, 'load answer likes'));
      } else {
        setLikes(likeResult.answerLikes);
      }
    } else {
      setLikes({});
    }

    if (requestId === loadRequestId.current) setLoading(false);
  }, [post.id, user]);

  useEffect(() => {
    void loadDiscussion();
    return () => {
      loadRequestId.current += 1;
    };
  }, [loadDiscussion]);

  const handleCreateAnswer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || submitting || !draft.trim()) return;

    setSubmitting(true);
    setError(null);
    const result = await createAnswer(user.id, {
      post_id: post.id,
      parent_answer_id: composerParentId,
      content: draft.trim(),
    });

    if (result.error || !result.data) {
      setError(safeDiscussionError(result.error, 'publish your answer'));
      setSubmitting(false);
      return;
    }

    setDraft('');
    setComposerParentId(null);
    await loadDiscussion();
    setSubmitting(false);
  };

  const handleSaveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingAnswerId || !editDraft.trim()) return;

    const result = await updateAnswer(editingAnswerId, { content: editDraft.trim() });
    if (result.error || !result.data) {
      setError(safeDiscussionError(result.error, 'update this answer'));
      return;
    }

    setEditingAnswerId(null);
    setEditDraft('');
    await loadDiscussion();
  };

  const handleDelete = async (answer: CommunityAnswer) => {
    const confirmed = window.confirm(
      'Delete this answer? Any replies to it will also be deleted.'
    );
    if (!confirmed) return;

    const result = await deleteAnswer(answer.id);
    if (result.error) {
      setError(safeDiscussionError(result.error, 'delete this answer'));
      return;
    }

    await loadDiscussion();
  };

  const handleToggleLike = async (answer: CommunityAnswer) => {
    if (!user || pendingLikeIds.current.has(answer.id)) return;

    pendingLikeIds.current.add(answer.id);
    setLikeError(null);
    try {
      const currentLike = likes[answer.id] ?? { count: 0, userLiked: false };
      const result = await toggleAnswerLike(answer.id, user.id, currentLike.userLiked);
      if (result.error) {
        setLikeError(safeDiscussionError(result.error, 'update your like'));
        return;
      }

      setLikes((current) => ({
        ...current,
        [answer.id]: {
          count: Math.max(0, currentLike.count + (result.liked ? 1 : -1)),
          userLiked: result.liked,
        },
      }));
    } finally {
      pendingLikeIds.current.delete(answer.id);
    }
  };

  const handleSelectBest = async (answerId: string) => {
    if (bestAnswerBusy || user?.id !== post.user_id) return;

    setBestAnswerBusy(true);
    setError(null);
    const result = await selectBestAnswer(answerId);
    if (!result.success) {
      setError(safeDiscussionError(result.error, 'select the best answer'));
      setBestAnswerBusy(false);
      return;
    }

    await loadDiscussion();
    setBestAnswerBusy(false);
  };

  const renderComposer = (parentAnswer: CommunityAnswer | null, compact = false) => (
    <form
      onSubmit={handleCreateAnswer}
      className={`space-y-2 ${compact ? 'mt-3' : 'mt-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4'}`}
    >
      <label className="block text-xs font-semibold text-slate-700">
        {parentAnswer
          ? `Replying to ${parentAnswer.author?.full_name ?? 'this answer'}`
          : 'Add your answer'}
      </label>
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={compact ? 2 : 3}
        maxLength={10000}
        disabled={!user || submitting}
        placeholder={parentAnswer ? 'Write a helpful reply…' : 'Share your advice or experience…'}
        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50"
      />
      <div className="flex justify-end gap-2">
        {parentAnswer && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={submitting}
            onClick={() => {
              setComposerParentId(null);
              setDraft('');
            }}
          >
            Cancel reply
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={!user || submitting || !draft.trim()}
          loading={submitting}
          icon={<Send className="h-3.5 w-3.5" />}
        >
          {parentAnswer ? 'Send reply' : 'Post answer'}
        </Button>
      </div>
    </form>
  );

  const renderAnswer = (answer: ThreadAnswer, depth: number, ancestors: Set<string>) => {
    if (ancestors.has(answer.id)) return null;
    const nextAncestors = new Set(ancestors);
    nextAncestors.add(answer.id);
    const isOwner = user?.id === answer.user_id;
    const like = likes[answer.id] ?? { count: 0, userLiked: false };
    const likePending = pendingLikeIds.current.has(answer.id);

    return (
      <article
        key={answer.id}
        className={`rounded-xl border p-4 ${
          answer.is_best
            ? 'border-emerald-300 bg-emerald-50/60'
            : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
              {answer.author?.full_name?.charAt(0) ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {answer.author?.full_name ?? 'Profile unavailable'}
              </p>
              <p className="text-[11px] text-slate-500">{formatAnswerDate(answer.created_at)}</p>
            </div>
          </div>
          {answer.is_best && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Best answer
            </span>
          )}
        </div>

        {editingAnswerId === answer.id ? (
          <form onSubmit={handleSaveEdit} className="mt-3 space-y-2">
            <textarea
              value={editDraft}
              onChange={(event) => setEditDraft(event.target.value)}
              rows={3}
              maxLength={10000}
              className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              aria-label="Edit answer"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingAnswerId(null)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!editDraft.trim()}>
                Save changes
              </Button>
            </div>
          </form>
        ) : (
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
            {answer.content}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!user || likePending}
            onClick={() => void handleToggleLike(answer)}
            icon={<Heart className={`h-3.5 w-3.5 ${like.userLiked ? 'fill-rose-500 text-rose-500' : ''}`} />}
            aria-pressed={like.userLiked}
          >
            {like.count}
          </Button>
          {user && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setComposerParentId(answer.id);
                setDraft('');
              }}
              icon={<CornerDownRight className="h-3.5 w-3.5" />}
            >
              Reply
            </Button>
          )}
          {isOwner && editingAnswerId !== answer.id && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingAnswerId(answer.id);
                  setEditDraft(answer.content);
                  setError(null);
                }}
                icon={<Pencil className="h-3.5 w-3.5" />}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void handleDelete(answer)}
                icon={<Trash2 className="h-3.5 w-3.5 text-rose-600" />}
              >
                Delete
              </Button>
            </>
          )}
          {user?.id === post.user_id && !answer.is_best && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={bestAnswerBusy}
              loading={bestAnswerBusy}
              onClick={() => void handleSelectBest(answer.id)}
              icon={<Star className="h-3.5 w-3.5" />}
            >
              Mark best
            </Button>
          )}
        </div>

        {composerParentId === answer.id && renderComposer(answer, true)}

        {answer.replies.length > 0 && (
          <div className={`mt-3 space-y-3 border-l-2 border-emerald-100 pl-3 sm:pl-4 ${depth >= 3 ? 'ml-1 sm:ml-2' : 'ml-2 sm:ml-4'}`}>
            {answer.replies.map((reply) => renderAnswer(reply, depth + 1, nextAncestors))}
          </div>
        )}
      </article>
    );
  };

  const postedDate = formatAnswerDate(post.created_at);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Community discussion"
      subtitle={`${answerCount} answer${answerCount === 1 ? '' : 's'}`}
      maxWidth="3xl"
    >
      <div className="space-y-5">
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
              {post.category}
            </span>
            {post.crop && (
              <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600">
                {post.crop}
              </span>
            )}
          </div>
          <h2 className="mt-3 text-lg font-bold leading-snug text-slate-900">{post.title}</h2>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
            {post.content}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-emerald-100 pt-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              {post.author?.full_name ?? 'Profile unavailable'}
            </span>
            <span>{postedDate}</span>
            {post.location && <span>{post.location}</span>}
          </div>
        </section>

        {error && (
          <div
            className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}
        {likeError && (
          <p className="text-xs text-rose-600" role="status">
            {likeError}
          </p>
        )}

        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-emerald-600" />
            <p className="text-sm text-slate-500">Loading discussion…</p>
          </div>
        ) : (
          <section aria-label="Answers" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Answers <span className="text-slate-400">({answerCount})</span>
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void loadDiscussion()}
                icon={<MessageCircle className="h-3.5 w-3.5" />}
              >
                Refresh
              </Button>
            </div>

            {answers.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                <MessageCircle className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">No answers yet</p>
                <p className="mt-1 text-xs text-slate-500">Share the first helpful response.</p>
              </div>
            )}

            {answers.map((answer) => renderAnswer(answer, 0, new Set()))}
            {!composerParentId && renderComposer(null)}
          </section>
        )}
      </div>
    </Modal>
  );
};

export default CommunityDiscussion;
