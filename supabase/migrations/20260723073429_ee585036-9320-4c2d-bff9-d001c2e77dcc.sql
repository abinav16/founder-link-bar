
CREATE OR REPLACE FUNCTION public.startups_set_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE base text; cand text; n int := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base := lower(regexp_replace(regexp_replace(coalesce(NEW.name,'startup'), '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'));
    IF base = '' THEN base := 'startup'; END IF;
    cand := base;
    WHILE EXISTS (SELECT 1 FROM public.startups WHERE slug = cand AND id <> NEW.id) LOOP
      n := n + 1;
      cand := base || '-' || n;
    END LOOP;
    NEW.slug := cand;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_startups_set_slug ON public.startups;
CREATE TRIGGER trg_startups_set_slug BEFORE INSERT ON public.startups
FOR EACH ROW EXECUTE FUNCTION public.startups_set_slug();

ALTER TABLE public.startups ALTER COLUMN slug DROP NOT NULL;
