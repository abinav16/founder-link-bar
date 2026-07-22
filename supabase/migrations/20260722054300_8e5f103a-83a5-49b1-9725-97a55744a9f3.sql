
-- Admin can read all payments (email-gated to match existing pattern).
CREATE POLICY "Admin can view all payments"
ON public.payments
FOR SELECT
TO authenticated
USING (COALESCE(auth.jwt() ->> 'email', '') = 'danielabinav16@gmail.com');

-- Return unconsumed successful payments with payer email; admin-only.
CREATE OR REPLACE FUNCTION public.admin_orphan_payments(_older_than_minutes int DEFAULT 10)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  dodo_payment_id text,
  created_at timestamptz,
  email text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.jwt() ->> 'email', '') <> 'danielabinav16@gmail.com' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
    SELECT p.id, p.user_id, p.dodo_payment_id, p.created_at, u.email::text
    FROM public.payments p
    LEFT JOIN auth.users u ON u.id = p.user_id
    WHERE p.status = 'succeeded'
      AND p.consumed_at IS NULL
      AND p.created_at < now() - make_interval(mins => _older_than_minutes)
    ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_orphan_payments(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_orphan_payments(int) TO authenticated;
