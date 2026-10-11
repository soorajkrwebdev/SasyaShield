BEGIN;

-- Add FarmNexa-compatible ingestion fields without disturbing the existing SmartFarm schema.
ALTER TABLE public.market_prices
  ADD COLUMN IF NOT EXISTS variety text,
  ADD COLUMN IF NOT EXISTS grade text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS fetched_at timestamptz;

-- Backfill usage for rows already in the table while preserving created_at as the row-creation timestamp.
UPDATE public.market_prices
SET fetched_at = COALESCE(fetched_at, created_at, now())
WHERE fetched_at IS NULL;

ALTER TABLE public.market_prices
  ALTER COLUMN fetched_at SET DEFAULT now(),
  ALTER COLUMN fetched_at SET NOT NULL;

-- Missing query indexes for ingestion and operational freshness checks.
CREATE INDEX IF NOT EXISTS idx_market_prices_fetched_at
  ON public.market_prices (fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_prices_district
  ON public.market_prices (district);

CREATE INDEX IF NOT EXISTS idx_market_prices_market
  ON public.market_prices (market);

-- Safe dedupe step before uniqueness is enforced.
-- Keep the newest row per exact duplicate signature. This preserves current valid data
-- and drops only true duplicates that match on the natural key and all price payload values.
WITH exact_dupes AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY
             crop,
             state,
             district,
             market,
             price_date,
             COALESCE(variety, ''),
             COALESCE(grade, ''),
             min_price,
             max_price,
             modal_price,
             unit,
             source_name,
             COALESCE(source_url, '')
           ORDER BY
             COALESCE(fetched_at, created_at, '1970-01-01'::timestamptz) DESC,
             created_at DESC,
             id DESC
         ) AS rn
  FROM public.market_prices
)
DELETE FROM public.market_prices p
USING exact_dupes d
WHERE p.id = d.id
  AND d.rn > 1;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT
        crop,
        state,
        district,
        market,
        price_date,
        COALESCE(variety, '') AS variety_key,
        COALESCE(grade, '') AS grade_key
      FROM public.market_prices
      GROUP BY
        crop,
        state,
        district,
        market,
        price_date,
        COALESCE(variety, ''),
        COALESCE(grade, '')
      HAVING COUNT(*) > 1
    ) dup
  ) THEN
    RAISE EXCEPTION 'Conflicting market_prices duplicates remain on the natural key; resolve them manually before creating the unique index.';
  END IF;
END $$;

-- Natural uniqueness strategy for government market records.
-- This keeps SmartFarm's current crop column while matching the core ingestion identity
-- used by government price feeds: commodity + market + district + state + date + variety + grade.
CREATE UNIQUE INDEX IF NOT EXISTS idx_market_prices_natural_key_unique
  ON public.market_prices (
    crop,
    state,
    district,
    market,
    price_date,
    COALESCE(variety, ''),
    COALESCE(grade, '')
  );

COMMENT ON COLUMN public.market_prices.variety IS 'Optional variety/cultivar descriptor; future FarmNexa ingestion can populate it without renaming the existing crop field.';
COMMENT ON COLUMN public.market_prices.grade IS 'Optional quality/grade field stored separately from variety; keeps grade provenance distinct from commodity naming.';
COMMENT ON COLUMN public.market_prices.source_url IS 'Canonical source page or dataset URL for government market data ingestion.';
COMMENT ON COLUMN public.market_prices.fetched_at IS 'When this row was fetched from the upstream market dataset; created_at remains row creation time.';

COMMIT;
