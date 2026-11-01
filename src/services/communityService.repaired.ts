import { supabase, supabaseEnvIssue } from '../lib/supabase';
import {
  CommunityPost,
  CommunityAnswer,
  CommunityLike,
  CommunityReport,
  CommunityAuthor,
  CommunityCategory,
} from '../types/community';

// Re-export types used by the community module for convenience
export type { CommunityPost, CommunityCategory, CommunityAnswer, CommunityLike, CommunityReport };

/** Maximum number of images allowed per post or answer (enforced by DB CHECK constraint). */
export const MAX_IMAGES_PER_POST = 5;

/** Maximum image size in bytes (5 MiB). */
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/** Allowed image MIME types. */
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// ---------------------------------------------------------------------------
// Public author profile (via SECURITY DEFINER RPC)
// ---------------------------------------------------------------------------

const authorCache = new Map<string, Promise<CommunityAuthor>>();

/**
 * Fetch a public-safe author profile using the existing get_public_profile RPC.
 * Never returns email or phone. Results are cached per userId for the session.
 */
export async function fetchPublicProfile(userId: string): Promise<CommunityAuthor> {
  if (!supabase) {
    return {
      id: userId,
      full_name: 'Farmer',
      created_at: new Date().toISOString(),
    };
  }

  if (authorCache.has(userId)) {
    return authorCache.get(userId)!;
  }

  const promise = (async () => {
    const { data, error } = await supabase.rpc('get_public_profile', {
      target_profile_id: userId,
    });

    // RETURNS TABLE RPCs return an array from Supabase, not a single object.
    const profile = Array.isArray(data) ? data[0] : data;
    if (error || !profile) {
      console.warn('[communityService] get_public_profile failed:', error?.message ?? 'no data');
      return {
        id: userId,
        full_name: 'Farmer',
        created_at: new Date().toISOString(),
      };
    }

    return {
      id: profile.id,
      full_name: profile.full_name,
      state: profile.state ?? undefined,
      district: profile.district ?? undefined,
      village: profile.village ?? undefined,
      farming_type: profile.farming_type ?? undefined,
      created_at: profile.created_at,
    };
  })();

  authorCache.set(userId, promise);
  return promise;
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export async function fetchPosts(
  filters?: {
    category?: CommunityCategory | null;
    crop?: string | null;
    location?: string | null;
    search?: string | null;
  },
  page = 1,
  pageSize = 10
): Promise<{ data?: CommunityPost[]; error?: string; hasMore?: boolean }> {
  if (!supabase) return { error: 'Database unavailable' };

  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.crop) {
      query = query.ilike('crop', `%${filters.crop}%`);
    }
    if (filters?.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) return { error: error.message };

    const postsWithAuthors = await Promise.all(
      (data || []).map(async (row: any) => {
        const author = await fetchPublicProfile(row.user_id);
        return {
          ...row,
          author,
        } as CommunityPost;
      })
    );

    return {
      data: postsWithAuthors,
      hasMore: (data || []).length === pageSize,
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

/**
 * Fetch answer counts for a batch of post IDs.
 * Queries community_answers grouped by post_id.
 */
export async function fetchAnswerCounts(
  postIds: string[]
): Promise<{ data?: Record<string, number>; error?: string }> {
  if (!supabase) return { error: 'Database unavailable' };
  if (postIds.length === 0) return { data: {} };

  try {
    const { data, error } = await supabase
      .from('community_answers')
      .select('post_id')
      .in('post_id', postIds);

    if (error) return { error: error.message };

    const counts: Record<string, number> = {};
    (data || []).forEach((row: any) => {
      counts[row.post_id] = (counts[row.post_id] || 0) + 1;
    });

    return { data: counts };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function createPost(
  data: Omit<CommunityPost, 'id' | 'user_id' | 'image_urls' | 'is_best_answer_selected' | 'created_at' | 'updated_at' | 'author' | 'like_count' | 'user_liked'>
): Promise<{ data?: CommunityPost; error?: string }> {
  if (!supabase) return { error: 'Database unavailable' };

  try {
    const { data: row, error } = await supabase
      .from('community_posts')
      .insert({
        ...data,
        image_urls: [],
        is_best_answer_selected: false,
      })
      .select()
      .single();

    if (error) return { error: error.message };

    const author = await fetchPublicProfile(row.user_id);
    return { data: { ...row, author } as CommunityPost };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updatePost(
  id: string,
  data: Partial<Pick<CommunityPost, 'title' | 'content' | 'category' | 'crop' | 'location' | 'image_urls'>>
): Promise<{ data?: CommunityPost; error?: string }> {
  if (!supabase) return { error: 'Database unavailable' };

  try {
    const { data: row, error } = await supabase
      .from('community_posts')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return { error: error.message };

    const author = await fetchPublicProfile(row.user_id);
    return { data: { ...row, author } as CommunityPost };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deletePost(id: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Database unavailable' };

  try {
    const { error } = await supabase.from('community_posts').delete().eq('id', id);
    if (error) return { error: error.message };
    return {};
  } catch (err: any) {
    return { error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

export async function fetchAnswers(
  postId: string
): Promise<{ data?: CommunityAnswer[]; error?: string }> {
  if (!supabase) return { error: 'Database unavailable' };

  try {
    const { data, error } = await supabase
      .from('community_answers')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) return { error: error.message };

    const answersWithAuthors = await Promise.all(
      (data || []).map(async (row: any) => {
        const author = await fetchPublicProfile(row.user_id);
        return {
          ...row,
          author,
        } as CommunityAnswer;
      })
    );

    return { data: answersWithAuthors };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function createAnswer(
  data: Omit<CommunityAnswer, 'id' | 'user_id' | 'image_urls' | 'is_best' | 'created_at' | 'updated_at' | 'author' | 'like_count' | 'user_liked' | 'replies'>
): Promise<{ data?: CommunityAnswer; error?: string }> {
  if (!supabase) return { error: 'Database unavailable' };

  try {
    const { data: row, error } = await supabase
      .from('community_answers')
      .insert({
        ...data,
        image_urls: [],
        is_best: false,
      })
      .select()
      .single();

    if (error) return { error: error.message };

    const author = await fetchPublicProfile(row.user_id);
    return { data: { ...row, author } as CommunityAnswer };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updateAnswer(
  id: string,
  data: Partial<Pick<CommunityAnswer, 'content' | 'image_urls' | 'parent_answer_id'>>
): Promise<{ data?: CommunityAnswer; error?: string }> {
  if (!supabase) return { error: 'Database unavailable' };

  try {
    const { data: row, error } = await supabase
      .from('community_answers')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return { error: error.message };

    const author = await fetchPublicProfile(row.user_id);
    return { data: { ...row, author } as CommunityAnswer };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteAnswer(id: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Database unavailable' };

  try {
    const { error } = await supabase.from('community_answers').delete().eq('id', id);
    if (error) return { error: error.message };
    return {};
  } catch (err: any) {
    return { error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------

export interface LikeStatus {
  count: number;
  userLiked: boolean;
}

/**
 * Fetch like counts and current-user like status for a batch of posts and answers.
 * community_likes SELECT is open to all authenticated users, so this is a direct query.
 */
export async function fetchLikeStatus(
  postIds: string[],
  answerIds: string[],
  currentUserId: string
): Promise<{
  postLikes: Record<string, LikeStatus>;
  answerLikes: Record<string, LikeStatus>;
  error?: string;
}> {
  if (!supabase) return { postLikes: {}, answerLikes: {}, error: 'Database unavailable' };

  try {
    const [postLikesRaw, answerLikesRaw] = await Promise.all([
      postIds.length
        ? supabase.from('community_likes').select('post_id, user_id').in('post_id', postIds)
        : ({ data: [] as CommunityLike[], error: null } as any),
      answerIds.length
        ? supabase.from('community_likes').select('answer_id, user_id').in('answer_id', answerIds)
        : ({ data: [] as CommunityLike[], error: null } as any),
    ]);

    if (postLikesRaw.error) return { postLikes: {}, answerLikes: {}, error: postLikesRaw.error.message };
    if (answerLikesRaw.error) return { postLikes: {}, answerLikes: {}, error: answerLikesRaw.error.message };

    const postLikes: Record<string, LikeStatus> = {};
    postIds.forEach((pid) => {
      const likes = (postLikesRaw.data || []).filter((l: CommunityLike) => l.post_id === pid);
      postLikes[pid] = {
        count: likes.length,
        userLiked: likes.some((l: CommunityLike) => l.user_id === currentUserId),
      };
    });

    const answerLikes: Record<string, LikeStatus> = {};
    answerIds.forEach((aid) => {
      const likes = (answerLikesRaw.data || []).filter((l: CommunityLike) => l.answer_id === aid);
      answerLikes[aid] = {
        count: likes.length,
        userLiked: likes.some((l: CommunityLike) => l.user_id === currentUserId),
      };
    });

    return { postLikes, answerLikes };
  } catch (err: any) {
    return { postLikes: {}, answerLikes: {}, error: err.message };
  }
}

export async function togglePostLike(
  postId: string,
  currentUserId: string,
  currentlyLiked: boolean
): Promise<{ liked: boolean; error?: string }> {
  if (!supabase) return { liked: currentlyLiked, error: 'Database unavailable' };

  try {
    if (currentlyLiked) {
      const { error } = await supabase
        .from('community_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId);
      if (error) return { liked: currentlyLiked, error: error.message };
      return { liked: false };
    }

    const { error } = await supabase
      .from('community_likes')
      .insert({ user_id: currentUserId, post_id: postId });
    if (error) return { liked: currentlyLiked, error: error.message };
    return { liked: true };
  } catch (err: any) {
    return { liked: currentlyLiked, error: err.message };
  }
}

export async function toggleAnswerLike(
  answerId: string,
  currentUserId: string,
  currentlyLiked: boolean
): Promise<{ liked: boolean; error?: string }> {
  if (!supabase) return { liked: currentlyLiked, error: 'Database unavailable' };

  try {
    if (currentlyLiked) {
      const { error } = await supabase
        .from('community_likes')
        .delete()
        .eq('answer_id', answerId)
        .eq('user_id', currentUserId);
      if (error) return { liked: currentlyLiked, error: error.message };
      return { liked: false };
    }

    const { error } = await supabase
      .from('community_likes')
      .insert({ user_id: currentUserId, answer_id: answerId });
    if (error) return { liked: currentlyLiked, error: error.message };
    return { liked: true };
  } catch (err: any) {
    return { liked: currentlyLiked, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function createReport(
  data: Omit<CommunityReport, 'id' | 'reporter_id' | 'status' | 'created_at'>
): Promise<{ data?: CommunityReport; error?: string }> {
  if (!supabase) return { error: 'Database unavailable' };

  try {
    const { data: row, error } = await supabase
      .from('community_reports')
      .insert({
        ...data,
        status: 'pending',
      })
      .select()
      .single();

    if (error) return { error: error.message };
    return { data: row as CommunityReport };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function fetchMyReports(): Promise<{ data?: CommunityReport[]; error?: string }> {
  if (!supabase) return { error: 'Database unavailable' };

  try {
    const { data, error } = await supabase
      .from('community_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return { error: error.message };
    return { data: (data || []) as CommunityReport[] };
  } catch (err: any) {
    return { error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Upload post images to Storage and update image_urls
// ---------------------------------------------------------------------------
export async function uploadPostImages(
  postId: string,
  userId: string,
  imageFiles: File[]
): Promise<{ success: boolean; errors: string[] }> {
  const client = supabase;
  if (!client) {
    return {
      success: false,
      errors: [supabaseEnvIssue?.message ?? 'Supabase is not configured.'],
    };
  }

  const errors: string[] = [];
  const uploadedPaths: string[] = [];

  if (imageFiles.length > MAX_IMAGES_PER_POST) {
    return { success: false, errors: [`A maximum of ${MAX_IMAGES_PER_POST} images is allowed.`] };
  }

  const validationErrors = imageFiles
    .map((file) => ({ file, validation: validateImageFile(file) }))
    .filter((item) => !item.validation.valid)
    .map((item) => `${item.file.name}: ${item.validation.error}`);

  if (validationErrors.length > 0) {
    return { success: false, errors: validationErrors };
  }

  for (const file of imageFiles) {
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const storagePath = `${userId}/${postId}/${crypto.randomUUID()}.${ext}`;

      const { error } = await client.storage
        .from('community-images')
        .upload(storagePath, file, {
          upsert: false,
          contentType: file.type,
        });

      if (error) {
        errors.push(`Failed to upload ${file.name}: ${error.message}`);
      } else {
        uploadedPaths.push(storagePath);
      }
    } catch (err: any) {
      errors.push(`Failed to upload ${file.name}: ${err.message}`);
    }
  }

  // Update the post with successfully uploaded paths
  if (uploadedPaths.length > 0) {
    const { error: updateError } = await client
      .from('community_posts')
      .update({
        image_urls: uploadedPaths,
      })
      .eq('id', postId);

    if (updateError) {
      // Cleanup: delete uploaded files on failure
      await Promise.all(
        uploadedPaths.map((p) => client.storage.from('community-images').remove([p]))
      );
      return { success: false, errors: [updateError.message, ...errors] };
    }
  }

  return { success: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Storage helpers (paths only; upload performed in Stage 2)
// ---------------------------------------------------------------------------

export function buildImagePath(userId: string, targetId: string, imageId: string, extension: string): string {
  return `${userId}/${targetId}/${imageId}.${extension}`;
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed.' };
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { valid: false, error: 'Image must be 5 MB or smaller.' };
  }
  return { valid: true };
}
