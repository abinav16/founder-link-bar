ALTER TABLE public.startups
ADD COLUMN IF NOT EXISTS widget_placement text NOT NULL DEFAULT 'top';

ALTER TABLE public.startups
DROP CONSTRAINT IF EXISTS startups_widget_placement_check;

ALTER TABLE public.startups
ADD CONSTRAINT startups_widget_placement_check CHECK (widget_placement IN ('top','bottom'));