-- ============================================================================
-- SasyaShield Farmer Community Schema
-- Migration: 20261030000000_community_schema.sql
-- ============================================================================
-- Creates community_posts, community_answers, community_likes, community_reports
-- with RLS, indexes, constraints, updated_at triggers, and best-answer security
-- backed by a dedicated NOLOGIN database role (community_best_answer_setter).
--
-- Does NOT modify existing tables or policies.
-- Does NOT weaken existing RLS policies.
-- Does NOT create storage buckets (handled separately via Supabase dashboard/CLI).
-- Does NOT implement notifications (existing schema supports new types as-is).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Dedicated authorization role for best-answer selection
-- Cannot log in. Only select_best_answer() runs as this role.
-- ----------------------------------------------------------------------------
create role community_best_answer_setter nologin;

-- Allow postgres to transfer function ownership to this role during migration
grant community_best_answer_setter to postgres;

-- ----------------------------------------------------------------------------
-- 1. COMMUNITY POSTS
--    Top-level agricultural questions/discussions created by farmers.
-- ----------------------------------------------------------------------------
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  content text not null,
  category text not null check (category in (
    'Pest & Diseases',
    'Organic Farming',
    'Fertilizers & Manure',
    'Pesticide Safety',
    'Crop Management',
    'Irrigation & Soil Health',
    'Market & Pricing',
    'General Farming'
  )),
  crop text,
  location text,
  image_urls text[] default '{}' not null,
  is_best_answer_selected boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ----------------------------------------------------------------------------
-- 2. COMMUNITY ANSWERS
--    Answers to posts, with threaded replies via parent_answer_id self-reference.
-- ----------------------------------------------------------------------------
create table if not exists public.community_answers (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  parent_answer_id uuid,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  image_urls text[] default '{}' not null,
  is_best boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (post_id, id)
);

-- Composite foreign key: a reply's parent_answer_id must belong to the same post.
-- MATCH SIMPLE (default): NULL parent_answer_id is allowed (top-level answer);
-- non-NULL parent_answer_id must reference an answer with the same post_id.
alter table public.community_answers
  add constraint community_answers_parent_same_post_fk
  foreign key (post_id, parent_answer_id)
  references public.community_answers(post_id, id)
  on delete cascade;

-- ----------------------------------------------------------------------------
-- 3. COMMUNITY LIKES
--    Exactly one target per like (post OR answer, enforced by CHECK constraint).
--    One like per user per target (enforced by partial unique indexes).
-- ----------------------------------------------------------------------------
create table if not exists public.community_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.community_posts(id) on delete cascade,
  answer_id uuid references public.community_answers(id) on delete cascade,
  created_at timestamptz default now() not null,
  constraint community_likes_one_target check (
    (post_id is not null) <> (answer_id is not null)
  )
);

-- ----------------------------------------------------------------------------
-- 4. COMMUNITY REPORTS
--    Reports of inappropriate/misleading content (posts or answers).
--    Moderation actions (UPDATE/DELETE) are NOT available yet — pending an
--    administrator authorization mechanism (no admin role exists in the project).
-- ----------------------------------------------------------------------------
create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.community_posts(id) on delete cascade,
  answer_id uuid references public.community_answers(id) on delete cascade,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz default now() not null,
  constraint community_reports_one_target check (
    (post_id is not null) <> (answer_id is not null)
  )
);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (all four tables)
-- ----------------------------------------------------------------------------
alter table public.community_posts enable row level security;
alter table public.community_answers enable row level security;
alter table public.community_likes enable row level security;
alter table public.community_reports enable row level security;

-- ----------------------------------------------------------------------------
-- community_posts policies
-- ----------------------------------------------------------------------------
-- Ordinary authenticated users
create policy "Authenticated farmers can view community posts"
  on public.community_posts for select
  to authenticated
  using (auth.role() = 'authenticated');

create policy "Farmers can insert own community posts"
  on public.community_posts for insert
  to authenticated
  with check (auth.uid() = user_id and is_best_answer_selected = false);

create policy "Authenticated farmers can update own community posts"
  on public.community_posts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Farmers can delete own community posts"
  on public.community_posts for delete
  to authenticated
  using (auth.uid() = user_id);

-- Dedicated best-answer setter role: narrowly scoped SELECT/UPDATE on flag columns only
create policy "community_best_answer_setter can read community posts for best-answer logic"
  on public.community_posts for select
  to community_best_answer_setter
  using (true);

create policy "community_best_answer_setter can update best-answer-selected flag on community posts"
  on public.community_posts for update
  to community_best_answer_setter
  using (true)
  with check (true);
-- ----------------------------------------------------------------------------
-- community_answers policies
-- ----------------------------------------------------------------------------
-- Ordinary authenticated users
create policy "Authenticated farmers can view community answers"
  on public.community_answers for select
  to authenticated
  using (auth.role() = 'authenticated');

create policy "Farmers can insert own community answers"
  on public.community_answers for insert
  to authenticated
  with check (auth.uid() = user_id and is_best = false);

create policy "Authenticated farmers can update own community answers"
  on public.community_answers for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Farmers can delete own community answers"
  on public.community_answers for delete
  to authenticated
  using (auth.uid() = user_id);

-- Dedicated best-answer setter role: narrowly scoped SELECT/UPDATE on flag columns only
create policy "community_best_answer_setter can read community answers for best-answer logic"
  on public.community_answers for select
  to community_best_answer_setter
  using (true);

create policy "community_best_answer_setter can update best-answer flag on community answers"
  on public.community_answers for update
  to community_best_answer_setter
  using (true)
  with check (true);

-- ----------------------------------------------------------------------------
-- community_likes policies
-- ----------------------------------------------------------------------------
create policy "Authenticated farmers can view community likes"
  on public.community_likes for select
  to authenticated
  using (auth.role() = 'authenticated');

create policy "Authenticated farmers can insert own community likes"
  on public.community_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Authenticated farmers can delete own community likes"
  on public.community_likes for delete
  to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- community_reports policies
--    SELECT: reporters see only their own reports (authenticated only).
--    INSERT: only the reporter can create a report.
--    UPDATE/DELETE: NO policies — moderation actions pending admin mechanism.
--    No admin role is invented or hardcoded.
-- ----------------------------------------------------------------------------
create policy "Authenticated farmers can view own community reports"
  on public.community_reports for select
  to authenticated
  using (auth.role() = 'authenticated' and auth.uid() = reporter_id);

create policy "Authenticated farmers can insert own community reports"
  on public.community_reports for insert
  to authenticated
  with check (auth.uid() = reporter_id
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null);

-- ----------------------------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------------------------
create index idx_community_posts_user_id on public.community_posts(user_id);
create index idx_community_posts_category on public.community_posts(category);
create index idx_community_posts_created_at on public.community_posts(created_at desc);
create index idx_community_posts_category_created_at on public.community_posts(category, created_at desc);
create index idx_community_posts_crop on public.community_posts(crop);
create index idx_community_posts_location on public.community_posts(location);

create index idx_community_answers_post_id on public.community_answers(post_id);
create index idx_community_answers_parent_answer_id on public.community_answers(parent_answer_id);
create index idx_community_answers_user_id on public.community_answers(user_id);
create index idx_community_answers_post_created_at on public.community_answers(post_id, created_at);

create index idx_community_likes_user_id on public.community_likes(user_id);
create index idx_community_likes_post_id on public.community_likes(post_id);
create index idx_community_likes_answer_id on public.community_likes(answer_id);
create unique index idx_community_likes_one_per_user_post on public.community_likes(user_id, post_id) where (post_id is not null);
create unique index idx_community_likes_one_per_user_answer on public.community_likes(user_id, answer_id) where (answer_id is not null);

create index idx_community_reports_reporter_id on public.community_reports(reporter_id);
create index idx_community_reports_status on public.community_reports(status);

-- Database-enforced safety net: only one best answer per post
create unique index idx_community_answers_one_best_per_post on public.community_answers(post_id) where (is_best = true);

-- ----------------------------------------------------------------------------
-- UPDATED_AT TRIGGERS (uses existing public.set_updated_at() function)
-- ----------------------------------------------------------------------------
create trigger tr_community_posts_updated_at before update on public.community_posts
  for each row execute procedure public.set_updated_at();

create trigger tr_community_answers_updated_at before update on public.community_answers
  for each row execute procedure public.set_updated_at();

-- ============================================================================
-- BEST-ANSWER SECURITY FUNCTION
-- ============================================================================
-- Only the question owner can select a best answer. Implemented as a
-- SECURITY DEFINER function so it can update is_best flags (which RLS
-- restricts for direct client updates) while verifying ownership server-side.
-- The function never modifies answer content — only is_best on answers and
-- is_best_answer_selected on the post.
-- ============================================================================
create or replace function public.select_best_answer(target_answer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post_id uuid;
  v_post_owner_id uuid;
begin
  -- Lock the post row to serialize concurrent best-answer selections
  select p.id, p.user_id
    into v_post_id, v_post_owner_id
    from public.community_posts p
    join public.community_answers a on a.post_id = p.id
    where a.id = target_answer_id
    for update of p;

  if not found then
    raise exception 'Answer not found';
  end if;

  -- Only the question owner can select a best answer
  if v_post_owner_id is distinct from auth.uid() then
    raise exception 'Only the question owner can select the best answer';
  end if;

  -- Unset any existing best answer for this post (ensures exactly one)
  update public.community_answers
    set is_best = false
    where post_id = v_post_id and is_best = true;

  -- Set the target answer as best
  update public.community_answers
    set is_best = true
    where id = target_answer_id;

  -- Mark the post as having a best answer selected
  update public.community_posts
    set is_best_answer_selected = true
    where id = v_post_id;
end;
$$;

revoke all on function public.select_best_answer(uuid) from public;
revoke all on function public.select_best_answer(uuid) from anon;
grant execute on function public.select_best_answer(uuid) to authenticated;

-- Grant temporary CREATE on schema public so community_best_answer_setter can own functions
grant create on schema public to community_best_answer_setter;

-- Transfer ownership to the dedicated role so the function runs as community_best_answer_setter
alter function public.select_best_answer(uuid) owner to community_best_answer_setter;

-- ----------------------------------------------------------------------------
-- FIELD PROTECTION TRIGGERS
--    Best-answer fields (is_best, is_best_answer_selected) are protected by
--    RLS with-check clauses on UPDATE policies and by BEFORE UPDATE triggers.
--    Ordinary users cannot directly set these flags. Public.select_best_answer()
--    (SECURITY DEFINER) bypasses RLS and is authorized to set them.
-- ----------------------------------------------------------------------------
create or replace function public.protect_community_posts_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Dedicated role: authorized for best-answer flag changes only
  if current_user = 'community_best_answer_setter' then
    -- Allow is_best_answer_selected changes; block user_id changes
    if new.user_id is distinct from old.user_id then
      raise exception 'user_id cannot be modified';
    end if;
    return new;
  end if;

  -- Ordinary user: block flag changes and ownership changes
  if new.is_best_answer_selected is distinct from old.is_best_answer_selected then
    raise exception 'is_best_answer_selected cannot be modified directly — set only by public.select_best_answer()';
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'user_id cannot be modified';
  end if;

  return new;
end;
$$;

create trigger tr_protect_community_posts_fields
  before update on public.community_posts
  for each row execute procedure public.protect_community_posts_fields();

-- ----------------------------------------------------------------------------
-- Posts INSERT protection: always force is_best_answer_selected = false
--    No GUC bypass on INSERT. Ordinary users can never set this field directly.
-- ----------------------------------------------------------------------------
create or replace function public.protect_community_posts_fields_on_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.is_best_answer_selected = false;
  return new;
end;
$$;

create trigger tr_protect_community_posts_fields_on_insert
  before insert on public.community_posts
  for each row execute procedure public.protect_community_posts_fields_on_insert();

create or replace function public.protect_community_answers_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Dedicated role: authorized for is_best changes only
  if current_user = 'community_best_answer_setter' then
    -- Allow is_best changes; block relationship fields
    if new.user_id is distinct from old.user_id then
      raise exception 'user_id cannot be modified';
    end if;
    if new.post_id is distinct from old.post_id then
      raise exception 'post_id cannot be modified';
    end if;
    if new.parent_answer_id is distinct from old.parent_answer_id then
      raise exception 'parent_answer_id cannot be modified';
    end if;
    return new;
  end if;

  -- Ordinary user: block all protected fields including is_best
  if new.is_best is distinct from old.is_best then
    raise exception 'is_best cannot be modified directly — set only by public.select_best_answer()';
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'user_id cannot be modified';
  end if;
  if new.post_id is distinct from old.post_id then
    raise exception 'post_id cannot be modified';
  end if;
  if new.parent_answer_id is distinct from old.parent_answer_id then
    raise exception 'parent_answer_id cannot be modified';
  end if;

  return new;
end;
$$;

create trigger tr_protect_community_answers_fields
  before update on public.community_answers
  for each row execute procedure public.protect_community_answers_fields();

-- ----------------------------------------------------------------------------
-- Answers INSERT protection: always force is_best = false
--    No GUC bypass on INSERT. Ordinary users can never set this field directly.
-- ----------------------------------------------------------------------------
create or replace function public.protect_community_answers_fields_on_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.is_best = false;
  return new;
end;
$$;

create trigger tr_protect_community_answers_fields_on_insert
  before insert on public.community_answers
  for each row execute procedure public.protect_community_answers_fields_on_insert();

-- ----------------------------------------------------------------------------
-- Reports INSERT protection: force moderation fields to safe defaults
--    Users cannot forge status, reviewed_by, or reviewed_at on insert.
-- ----------------------------------------------------------------------------
create or replace function public.protect_community_reports_fields_on_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.status = 'pending';
  new.reviewed_by = null;
  new.reviewed_at = null;
  return new;
end;
$$;

create trigger tr_protect_community_reports_fields_on_insert
  before insert on public.community_reports
  for each row execute procedure public.protect_community_reports_fields_on_insert();

-- ----------------------------------------------------------------------------
-- Answers DELETE protection: reset is_best_answer_selected on post when
--    the selected best answer is deleted. Only resets if no other best
--    answer remains (guaranteed by partial unique index).
-- ----------------------------------------------------------------------------
create or replace function public.protect_community_answers_on_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.is_best then
    update public.community_posts
      set is_best_answer_selected = false
    where id = old.post_id
      and is_best_answer_selected = true;
  end if;
  return old;
end;
$$;

create trigger tr_protect_community_answers_on_delete
  before delete on public.community_answers
  for each row execute procedure public.protect_community_answers_on_delete();

-- Transfer ownership to the dedicated role
alter function public.protect_community_answers_on_delete() owner to community_best_answer_setter;

-- Revoke role membership from postgres after both ownership transfers
revoke community_best_answer_setter from postgres;

-- Revoke temporary CREATE on schema public from the dedicated role
revoke create on schema public from community_best_answer_setter;

--    Returns only safe public profile fields for community author display.
--    SECURITY DEFINER so it can read any profile row (existing RLS on profiles
--    restricts direct SELECT to own row only), but projects only non-private
--    columns: id, full_name, state, district, village, farming_type, created_at.
--    Email and phone are never exposed.
-- ----------------------------------------------------------------------------
create or replace function public.get_public_profile(target_profile_id uuid)
returns table (
  id uuid,
  full_name text,
  state text,
  district text,
  village text,
  farming_type text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select p.id, p.full_name, p.state, p.district, p.village, p.farming_type, p.created_at
  from public.profiles p
  where p.id = target_profile_id;
end;
$$;

revoke all on function public.get_public_profile(uuid) from public;
revoke all on function public.get_public_profile(uuid) from anon;
grant execute on function public.get_public_profile(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Privileges for the dedicated best-answer role
-- Column-level UPDATE only on best-answer flag columns; SELECT for reads.
-- No INSERT, DELETE, or BYPASSRLS.
-- ----------------------------------------------------------------------------
grant select on public.community_posts to community_best_answer_setter;
grant update (is_best_answer_selected) on public.community_posts to community_best_answer_setter;
grant select on public.community_answers to community_best_answer_setter;
grant update (is_best) on public.community_answers to community_best_answer_setter;

-- Schema and function usage for the dedicated role
grant usage on schema public to community_best_answer_setter;
grant usage on schema auth to community_best_answer_setter;
grant execute on function auth.uid() to community_best_answer_setter;

-- Ensure authenticated and anon are NOT members of the dedicated role
revoke community_best_answer_setter from authenticated;
revoke community_best_answer_setter from anon;

