
CREATE TABLE public.bid_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url_key text NOT NULL UNIQUE,
  display_url text NOT NULL,
  target_url text NOT NULL,
  name text NOT NULL,
  description text,
  logo_url text,
  total_cents bigint NOT NULL DEFAULT 0,
  first_bid_at timestamptz NOT NULL DEFAULT now(),
  last_bid_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  startup_id uuid REFERENCES public.startups(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES public.bid_entries(id) ON DELETE SET NULL,
  url_key text NOT NULL,
  display_url text NOT NULL,
  target_url text NOT NULL,
  name text NOT NULL,
  amount_cents bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  dodo_payment_id text,
  email text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE TABLE public.bid_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES public.bid_entries(id) ON DELETE CASCADE,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bid_entries_total_idx ON public.bid_entries (total_cents DESC, first_bid_at ASC);
CREATE INDEX bids_url_key_idx ON public.bids (url_key);
CREATE INDEX bids_payment_idx ON public.bids (dodo_payment_id);
CREATE INDEX bid_clicks_entry_idx ON public.bid_clicks (entry_id, created_at DESC);

GRANT ALL ON public.bid_entries TO service_role;
GRANT ALL ON public.bids TO service_role;
GRANT ALL ON public.bid_clicks TO service_role;

ALTER TABLE public.bid_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_clicks ENABLE ROW LEVEL SECURITY;

-- Public board: safe columns only, ranked by total paid.
CREATE OR REPLACE FUNCTION public.public_bid_board()
RETURNS TABLE(
  id uuid, rank integer, url_key text, display_url text, target_url text,
  name text, description text, logo_url text, total_cents bigint,
  first_bid_at timestamptz, last_bid_at timestamptz,
  clicks bigint, on_network boolean, startup_slug text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id,
         (ROW_NUMBER() OVER (ORDER BY e.total_cents DESC, e.first_bid_at ASC))::int,
         e.url_key, e.display_url, e.target_url, e.name, e.description, e.logo_url,
         e.total_cents, e.first_bid_at, e.last_bid_at,
         COALESCE(c.cnt, 0)::bigint,
         (e.startup_id IS NOT NULL),
         s.slug
  FROM public.bid_entries e
  LEFT JOIN (SELECT entry_id, COUNT(*) cnt FROM public.bid_clicks GROUP BY entry_id) c
    ON c.entry_id = e.id
  LEFT JOIN public.startups s ON s.id = e.startup_id AND s.status = 'approved'
  WHERE e.total_cents > 0
  ORDER BY e.total_cents DESC, e.first_bid_at ASC;
$$;

-- Recent paid bids for the live activity feed.
CREATE OR REPLACE FUNCTION public.public_bid_activity(_limit integer DEFAULT 12)
RETURNS TABLE(
  entry_id uuid, name text, display_url text, logo_url text,
  amount_cents bigint, created_at timestamptz, rank integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH ranked AS (
    SELECT e.id, (ROW_NUMBER() OVER (ORDER BY e.total_cents DESC, e.first_bid_at ASC))::int AS rnk
    FROM public.bid_entries e WHERE e.total_cents > 0
  )
  SELECT b.entry_id, e.name, e.display_url, e.logo_url, b.amount_cents, b.paid_at, r.rnk
  FROM public.bids b
  JOIN public.bid_entries e ON e.id = b.entry_id
  LEFT JOIN ranked r ON r.id = e.id
  WHERE b.status = 'paid' AND b.paid_at IS NOT NULL
  ORDER BY b.paid_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 12), 1), 50);
$$;

-- Trending: most clicks in the last hour (falls back to 24h volume).
CREATE OR REPLACE FUNCTION public.public_bid_trending(_limit integer DEFAULT 5)
RETURNS TABLE(entry_id uuid, name text, display_url text, logo_url text, clicks_hour bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.name, e.display_url, e.logo_url, COUNT(c.id)::bigint
  FROM public.bid_entries e
  JOIN public.bid_clicks c ON c.entry_id = e.id AND c.created_at > now() - interval '24 hours'
  WHERE e.total_cents > 0
  GROUP BY e.id, e.name, e.display_url, e.logo_url
  ORDER BY COUNT(c.id) DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 5), 1), 10);
$$;

CREATE OR REPLACE FUNCTION public.public_bid_stats()
RETURNS TABLE(entries bigint, total_cents bigint, top_cents bigint, total_clicks bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT COUNT(*) FROM public.bid_entries WHERE total_cents > 0)::bigint,
    (SELECT COALESCE(SUM(total_cents), 0) FROM public.bid_entries)::bigint,
    (SELECT COALESCE(MAX(total_cents), 0) FROM public.bid_entries)::bigint,
    (SELECT COUNT(*) FROM public.bid_clicks)::bigint;
$$;

-- Existing total for a URL, so the bid box can show "you are at #N with $X".
CREATE OR REPLACE FUNCTION public.public_bid_lookup(_url_key text)
RETURNS TABLE(id uuid, name text, display_url text, total_cents bigint, rank integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH ranked AS (
    SELECT e.*, (ROW_NUMBER() OVER (ORDER BY e.total_cents DESC, e.first_bid_at ASC))::int AS rnk
    FROM public.bid_entries e WHERE e.total_cents > 0
  )
  SELECT r.id, r.name, r.display_url, r.total_cents, r.rnk
  FROM ranked r WHERE r.url_key = lower(trim(_url_key)) LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.public_bid_click(_entry_id uuid, _session text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.bid_entries WHERE id = _entry_id) THEN
    RETURN;
  END IF;
  INSERT INTO public.bid_clicks (entry_id, session_id) VALUES (_entry_id, left(COALESCE(_session, ''), 64));
END;
$$;

-- A signed-in member's own bids.
CREATE OR REPLACE FUNCTION public.my_bids()
RETURNS TABLE(
  id uuid, name text, display_url text, amount_cents bigint,
  status text, created_at timestamptz, entry_total_cents bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.name, b.display_url, b.amount_cents, b.status, b.created_at,
         COALESCE(e.total_cents, 0)::bigint
  FROM public.bids b
  LEFT JOIN public.bid_entries e ON e.id = b.entry_id
  WHERE b.user_id = auth.uid() AND auth.uid() IS NOT NULL
  ORDER BY b.created_at DESC
  LIMIT 50;
$$;

-- Backend-only fulfilment: marks a bid paid and folds it into its entry.
CREATE OR REPLACE FUNCTION public.confirm_bid_payment(_bid_id uuid, _payment_id text, _email text DEFAULT NULL)
RETURNS TABLE(entry_id uuid, total_cents bigint, rank integer, already boolean)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
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
    SELECT id INTO e_id FROM public.bid_entries WHERE url_key = b.url_key;
    IF e_id IS NULL THEN
      INSERT INTO public.bid_entries (url_key, display_url, target_url, name, total_cents, user_id, first_bid_at, last_bid_at)
      VALUES (b.url_key, b.display_url, b.target_url, b.name, b.amount_cents, b.user_id, now(), now())
      RETURNING id INTO e_id;
    ELSE
      UPDATE public.bid_entries
         SET total_cents = total_cents + b.amount_cents,
             last_bid_at = now(),
             user_id = COALESCE(user_id, b.user_id)
       WHERE id = e_id;
    END IF;

    UPDATE public.bids
       SET status = 'paid', paid_at = now(), entry_id = e_id,
           dodo_payment_id = COALESCE(_payment_id, dodo_payment_id),
           email = COALESCE(email, _email)
     WHERE id = _bid_id;
  END IF;

  SELECT total_cents INTO e_total FROM public.bid_entries WHERE id = e_id;
  SELECT rnk INTO e_rank FROM (
    SELECT id, (ROW_NUMBER() OVER (ORDER BY total_cents DESC, first_bid_at ASC))::int rnk
    FROM public.bid_entries WHERE total_cents > 0
  ) q WHERE q.id = e_id;

  RETURN QUERY SELECT e_id, COALESCE(e_total, 0)::bigint, COALESCE(e_rank, 0), was;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_bid_payment(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_bid_payment(uuid, text, text) TO service_role;

GRANT EXECUTE ON FUNCTION public.public_bid_board() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_bid_activity(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_bid_trending(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_bid_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_bid_lookup(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_bid_click(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_bids() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.my_bids() FROM PUBLIC, anon;
