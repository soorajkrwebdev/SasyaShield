-- Keep existing public articles visible while requiring new records to be published explicitly.
ALTER TABLE public.knowledge_articles
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;

ALTER TABLE public.knowledge_articles
  ALTER COLUMN is_published SET DEFAULT false;

COMMENT ON COLUMN public.knowledge_articles.is_published IS
  'Controls public Knowledge Hub visibility; new articles are unpublished by default.';

DROP POLICY IF EXISTS "Public can view knowledge articles" ON public.knowledge_articles;
DROP POLICY IF EXISTS "Public can view published knowledge articles" ON public.knowledge_articles;

CREATE POLICY "Public can view published knowledge articles"
  ON public.knowledge_articles FOR SELECT TO anon, authenticated
  USING (is_published = true);