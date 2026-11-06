CREATE OR REPLACE FUNCTION public.grant_supporter_newsletter(_startup_id uuid, _user_id uuid, _subscription_id text, _payment_id text, _amount_cents integer, _currency text, _notification jsonb DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE granted uuid; copy_email text; copy_payload jsonb;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF _amount_cents < 99900 OR _currency <> 'USD' OR _payment_id IS NULL OR _subscription_id IS NULL THEN RAISE EXCEPTION 'not a paid annual charge'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.startups WHERE id=_startup_id AND user_id=_user_id AND supporter_subscription_id=_subscription_id AND membership_mode='supporter') THEN RAISE EXCEPTION 'membership mismatch'; END IF;
 INSERT INTO public.supporter_newsletter_entitlements(startup_id,user_id,subscription_id,payment_id,amount_cents,currency)
 VALUES (_startup_id,_user_id,_subscription_id,_payment_id,_amount_cents,_currency) ON CONFLICT DO NOTHING RETURNING id INTO granted;
 IF granted IS NOT NULL AND _notification IS NOT NULL THEN
  PERFORM public.enqueue_email('transactional_emails', _notification - 'cc');
  copy_email := _notification->>'cc';
  IF copy_email IS NOT NULL AND copy_email <> _notification->>'to' THEN
   copy_payload := (_notification - 'cc') || jsonb_build_object('to',copy_email,'message_id',(_notification->>'message_id') || '/copy','idempotency_key',(_notification->>'idempotency_key') || '/copy');
   PERFORM public.enqueue_email('transactional_emails',copy_payload);
  END IF;
 END IF;
 RETURN granted IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.grant_supporter_newsletter(uuid,uuid,text,text,integer,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_supporter_newsletter(uuid,uuid,text,text,integer,text,jsonb) TO service_role;