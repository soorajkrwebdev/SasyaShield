CREATE OR REPLACE FUNCTION public.upsert_market_prices_batch(p_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  affected_rows integer;
BEGIN
  IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'p_rows must be a JSON array';
  END IF;

  INSERT INTO public.market_prices (
    crop,
    state,
    district,
    market,
    price_date,
    min_price,
    max_price,
    modal_price,
    unit,
    source_name,
    source_url,
    variety,
    grade,
    fetched_at
  )
  SELECT
    entry.value ->> 'crop',
    entry.value ->> 'state',
    entry.value ->> 'district',
    entry.value ->> 'market',
    (entry.value ->> 'price_date')::date,
    (entry.value ->> 'min_price')::numeric,
    (entry.value ->> 'max_price')::numeric,
    (entry.value ->> 'modal_price')::numeric,
    entry.value ->> 'unit',
    entry.value ->> 'source_name',
    entry.value ->> 'source_url',
    NULLIF(entry.value ->> 'variety', ''),
    NULLIF(entry.value ->> 'grade', ''),
    (entry.value ->> 'fetched_at')::timestamptz
  FROM jsonb_array_elements(p_rows) AS entry(value)
  ON CONFLICT (
    crop,
    state,
    district,
    market,
    price_date,
    (COALESCE(variety, '')),
    (COALESCE(grade, ''))
  )
  DO UPDATE SET
    min_price = EXCLUDED.min_price,
    max_price = EXCLUDED.max_price,
    modal_price = EXCLUDED.modal_price,
    unit = EXCLUDED.unit,
    source_name = EXCLUDED.source_name,
    source_url = EXCLUDED.source_url,
    fetched_at = EXCLUDED.fetched_at;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$function$;

REVOKE ALL ON FUNCTION public.upsert_market_prices_batch(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_market_prices_batch(jsonb) TO service_role;