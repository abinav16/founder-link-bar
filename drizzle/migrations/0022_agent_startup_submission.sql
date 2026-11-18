CREATE OR REPLACE FUNCTION public.mcp_submit_startup(_startup_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); d public.application_drafts%ROWTYPE; s public.startups%ROWTYPE; credit uuid;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 0));
 SELECT * INTO s FROM public.startups WHERE id = _startup_id AND user_id = uid;
 IF FOUND THEN RETURN jsonb_build_object('status','already_submitted','startup_id',s.id); END IF;
 SELECT * INTO d FROM public.application_drafts WHERE startup_id = _startup_id AND user_id = uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Application draft not found'; END IF;
 IF length(trim(d.name)) NOT BETWEEN 2 AND 60 OR length(trim(d.description)) NOT BETWEEN 10 AND 100 OR length(d.website_url) > 200 OR d.website_url !~ '^https?://' OR d.category IS NULL OR d.category NOT IN ('AI','Developer Tools','Productivity','Marketing & Sales','Design','Creator & Media','E-commerce','Finance','Education','Health & Wellness','Community','Other') THEN RAISE EXCEPTION 'Invalid startup details'; END IF;
 SELECT * INTO s FROM public.startups WHERE user_id = uid AND website_url = d.website_url LIMIT 1;
 IF FOUND THEN RETURN jsonb_build_object('status','already_submitted','startup_id',s.id); END IF;
 IF EXISTS (SELECT 1 FROM public.startups WHERE user_id = uid) THEN
  credit := public.consume_prepaid_listing(uid);
  IF credit IS NULL THEN RETURN jsonb_build_object('status','payment_required','startup_id',d.startup_id); END IF;
 END IF;
 INSERT INTO public.startups (id,user_id,name,website_url,description,category,widget_placement,status)
 VALUES (d.startup_id,uid,trim(d.name),d.website_url,trim(d.description),d.category,COALESCE(d.placement,'top'),'pending');
 UPDATE public.application_drafts SET submitted_at=now() WHERE startup_id=d.startup_id AND user_id=uid;
 RETURN jsonb_build_object('status','pending','startup_id',d.startup_id);
END;
$$;
REVOKE ALL ON FUNCTION public.mcp_submit_startup(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mcp_submit_startup(uuid) TO authenticated;