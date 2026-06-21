ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS consumed_at timestamptz;
CREATE INDEX IF NOT EXISTS payments_user_unconsumed_idx
  ON public.payments(user_id) WHERE status = 'succeeded' AND consumed_at IS NULL;

CREATE OR REPLACE FUNCTION public.consume_prepaid_listing(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.payments
    SET consumed_at = now()
    WHERE id = (
      SELECT id FROM public.payments
      WHERE user_id = _user_id
        AND status = 'succeeded'
        AND consumed_at IS NULL
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_prepaid_listing(uuid) TO authenticated;