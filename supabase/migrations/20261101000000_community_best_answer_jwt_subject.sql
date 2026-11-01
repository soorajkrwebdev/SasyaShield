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
  if v_post_owner_id is distinct from COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid then
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
