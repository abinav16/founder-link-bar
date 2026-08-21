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
    SELECT be.id INTO e_id FROM public.bid_entries be WHERE be.url_key = b.url_key;
    IF e_id IS NULL THEN
      INSERT INTO public.bid_entries (url_key, display_url, target_url, name, total_cents, user_id, first_bid_at, last_bid_at)
      VALUES (b.url_key, b.display_url, b.target_url, b.name, b.amount_cents, b.user_id, now(), now())
      RETURNING id INTO e_id;
    ELSE
      UPDATE public.bid_entries be
         SET total_cents = be.total_cents + b.amount_cents,
             last_bid_at = now(),
             user_id = COALESCE(be.user_id, b.user_id)
       WHERE be.id = e_id;
    END IF;

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

REVOKE ALL ON FUNCTION public.confirm_bid_payment(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_bid_payment(uuid, text, text) TO service_role;