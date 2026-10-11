-- Run with: supabase db query --linked --file supabase/tests/knowledge_publication_rls_tests.sql
-- Temporary article rows are rolled back at the end of the test.
BEGIN;

DO $test$
DECLARE
  published_article_id uuid := 'c1000000-0000-4000-8000-000000000001';
  draft_article_id uuid := 'c2000000-0000-4000-8000-000000000002';
  published_value boolean;
  visible_count integer;
  source_count_before integer;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.knowledge_articles
    WHERE id IN (published_article_id, draft_article_id)
  ) THEN
    RAISE EXCEPTION 'Knowledge publication test fixture IDs already exist.';
  END IF;

  SELECT count(*) INTO source_count_before FROM public.knowledge_sources;

  INSERT INTO public.knowledge_articles (
    id, title, category, summary, source_name, is_published
  ) VALUES (
    published_article_id,
    'Publication RLS Test - Published',
    'Soil Health',
    'Temporary row for public visibility verification.',
    'Knowledge publication RLS test',
    true
  );

  INSERT INTO public.knowledge_articles (
    id, title, category, summary, source_name
  ) VALUES (
    draft_article_id,
    'Publication RLS Test - Draft',
    'Soil Health',
    'Temporary row for default publication verification.',
    'Knowledge publication RLS test'
  );

  SELECT is_published INTO published_value
  FROM public.knowledge_articles
  WHERE id = draft_article_id;
  IF published_value IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'A newly inserted article did not default to unpublished.';
  END IF;

  PERFORM set_config('role', 'anon', true);

  SELECT count(*) INTO visible_count
  FROM public.knowledge_articles
  WHERE id = published_article_id;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'Anon could not read a published article.';
  END IF;

  SELECT count(*) INTO visible_count
  FROM public.knowledge_articles
  WHERE id = draft_article_id;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Anon could read an unpublished article.';
  END IF;

  SELECT count(*) INTO visible_count
  FROM public.knowledge_articles
  WHERE id IN (
    'e0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000004'
  ) AND is_published = true;
  IF visible_count <> 4 THEN
    RAISE EXCEPTION 'An existing article was not retained as published.';
  END IF;

  SELECT count(*) INTO visible_count FROM public.knowledge_sources;
  IF visible_count <> source_count_before THEN
    RAISE EXCEPTION 'Knowledge source records changed during publication testing.';
  END IF;
END;
$test$;

ROLLBACK;