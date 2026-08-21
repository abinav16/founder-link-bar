-- Merge any existing duplicates by url_key
WITH ranked AS (
  SELECT id, url_key, total_cents,
         first_value(id) OVER (PARTITION BY url_key ORDER BY first_bid_at ASC) AS keep_id
  FROM public.bid_entries
), dupes AS (
  SELECT * FROM ranked WHERE id <> keep_id
)
UPDATE public.bid_entries e
SET total_cents = e.total_cents + agg.extra
FROM (SELECT keep_id, SUM(total_cents) AS extra FROM dupes GROUP BY keep_id) agg
WHERE e.id = agg.keep_id;

UPDATE public.bids b
SET entry_id = r.keep_id
FROM (
  SELECT id, first_value(id) OVER (PARTITION BY url_key ORDER BY first_bid_at ASC) AS keep_id
  FROM public.bid_entries
) r
WHERE b.entry_id = r.id AND r.id <> r.keep_id;

UPDATE public.bid_clicks c
SET entry_id = r.keep_id
FROM (
  SELECT id, first_value(id) OVER (PARTITION BY url_key ORDER BY first_bid_at ASC) AS keep_id
  FROM public.bid_entries
) r
WHERE c.entry_id = r.id AND r.id <> r.keep_id;

DELETE FROM public.bid_entries e
USING (
  SELECT id, first_value(id) OVER (PARTITION BY url_key ORDER BY first_bid_at ASC) AS keep_id
  FROM public.bid_entries
) r
WHERE e.id = r.id AND r.id <> r.keep_id;

CREATE UNIQUE INDEX IF NOT EXISTS bid_entries_url_key_uidx ON public.bid_entries (url_key);

CREATE OR REPLACE FUNCTION public.confirm_bid_payment(_bid_id uuid, _payment_id text, _email text DEFAULT NULL::text)
 RETURNS TABLE(entry_id uuid, total_cents bigint, rank integer, already boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  b public.bids%ROWTYPE;
  e_id uuid;
  e_total bigint;
  e_rank int;
  was boolean := false;
BEGIN
  SELECT * INTO b FROM public.bids WHERE id = _bid_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF b.status = 'paid' THEN
    was := true;
    e_id := b.entry_id;
  ELSE
    INSERT INTO public.bid_entries (url_key, display_url, target_url, name, total_cents, user_id, first_bid_at, last_bid_at)
    VALUES (b.url_key, b.display_url, b.target_url, b.name, b.amount_cents, b.user_id, now(), now())
    ON CONFLICT (url_key) DO UPDATE
      SET total_cents = public.bid_entries.total_cents + EXCLUDED.total_cents,
          last_bid_at = now(),
          user_id = COALESCE(public.bid_entries.user_id, EXCLUDED.user_id)
    RETURNING id INTO e_id;

    UPDATE public.bids bd
       SET status = 'paid', paid_at = now(), entry_id = e_id,
           dodo_payment_id = COALESCE(_payment_id, bd.dodo_payment_id),
           email = COALESCE(bd.email, _email)
     WHERE bd.id = _bid_id;
  END IF;

  SELECT be.total_cents INTO e_total FROM public.bid_entries be WHERE be.id = e_id;
  SELECT q.rnk INTO e_rank FROM (
    SELECT be.id AS id, (ROW_NUMBER() OVER (ORDER BY be.total_cents DESC, be.first_bid_at ASC))::int AS rnk
    FROM public.bid_entries be WHERE be.total_cents > 0
  ) q WHERE q.id = e_id;

  RETURN QUERY SELECT e_id, COALESCE(e_total, 0)::bigint, COALESCE(e_rank, 0), was;
END;
$function$;