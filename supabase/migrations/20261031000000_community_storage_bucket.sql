-- ============================================================================
-- SasyaShield Farmer Community - Storage bucket for community images
-- Migration: 20261031000000_community_storage_bucket.sql
-- ============================================================================
-- Creates a private Supabase Storage bucket `community-images` for images
-- attached to community posts and answers, with Storage RLS policies:
--
--   * Authenticated users can view objects in the bucket
--   * Users can upload objects only into their own {user_id}/ folder
--   * Users can delete only their own objects (owner_id = auth.uid()::text)
--   * No access for unauthenticated (anon) roles; the bucket is NOT public
--
-- Bucket-level limits (enforced by the Supabase Storage API):
--   * Allowed MIME types: image/jpeg, image/png, image/webp
--   * Max file size: 5 MiB (5,242,880 bytes)
--
-- Database-level image-count limits (enforced by CHECK constraints):
--   * Max 5 image paths in public.community_posts.image_urls
--   * Max 5 image paths in public.community_answers.image_urls
--
-- Path convention (folder ownership enforced by RLS; full path validated by app):
--   {user_id}/{post_id}/{image_id}.{extension}
--
-- Compatibility:
--   * Uses the existing Supabase auth schema (auth.uid(), auth.role()).
--   * Does NOT modify existing tables, columns, or RLS policies beyond adding
--     the two CHECK constraints above.
--   * Does NOT create, reference, or require Supabase service-role keys. The
--     frontend continues to use the anon/public key only
--     (see src/lib/supabase.ts and .env.example).
--   * Idempotent: safe to re-run. The bucket uses ON CONFLICT, policies use
--     DROP POLICY IF EXISTS, and constraints are guarded by DO blocks.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Private Storage bucket: community-images
--    Idempotent: re-running replaces the bucket settings with the required
--    private, 5 MiB, image-only configuration.
-- ----------------------------------------------------------------------------
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'community-images',
  'community-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 2. Storage RLS policies
--    Supabase manages RLS on storage.objects; we only create policies here.
-- ----------------------------------------------------------------------------

-- Authenticated farmers can view community images.
-- No policy is granted to `anon`, so unauthenticated requests are denied.
drop policy if exists "Authenticated farmers can view community images"
  on storage.objects;
create policy "Authenticated farmers can view community images"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'community-images');

-- Users can upload images only into their own user-ID folder:
--   * bucket must be community-images
--   * object owner_id is the uploading user (Storage sets owner_id automatically)
--   * first path segment must equal auth.uid()  -> {user_id}/{post_id}/...
--   * file extension must be an image extension (defense in depth; the bucket
--     allowed_mime_types already restricts MIME types at the API level)
drop policy if exists "Users can upload community images only into their own folder"
  on storage.objects;
create policy "Users can upload community images only into their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'community-images'
    and owner_id = (select auth.uid()::text)
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(coalesce(storage.extension(name), '')) in ('jpg', 'jpeg', 'png', 'webp')
  );

-- Users can delete only their own images (owner_id = auth.uid()::text).
drop policy if exists "Users can delete only their own community images"
  on storage.objects;
create policy "Users can delete only their own community images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'community-images'
    and owner_id = (select auth.uid()::text)
  );

-- ----------------------------------------------------------------------------
-- 4. Database-level max-5-images constraints on community tables
--    Idempotent: each constraint is added only if it does not already exist.
--    image_urls is text[] (default '{}', not null), so cardinality() counts
--    the stored paths. COALESCE guards against NULL.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.community_posts'::regclass
      and conname = 'community_posts_max_5_images'
  ) then
    alter table public.community_posts
      add constraint community_posts_max_5_images
      check (coalesce(cardinality(image_urls), 0) <= 5);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.community_answers'::regclass
      and conname = 'community_answers_max_5_images'
  ) then
    alter table public.community_answers
      add constraint community_answers_max_5_images
      check (coalesce(cardinality(image_urls), 0) <= 5);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Notes
-- ----------------------------------------------------------------------------
-- * No UPDATE policy is created: image metadata cannot be changed after upload.
--   Replace an image by uploading a new object and deleting the old one.
-- * The bucket is private (public = false). Objects are retrieved through the
--   Supabase client (download/signed URLs), which enforces the SELECT policy.
-- * Storage RLS cannot see posts/answers, so the per-post/per-answer image
--   count limit is enforced here via CHECK constraints on image_urls. The
--   application should still validate before writing for a better UX.
-- * owner_id exists on storage.objects (confirmed in the Supabase Storage
--   schema docs). Some deployments type it as text, hence
--   `auth.uid()::text` is used for the comparison.
-- ============================================================================
