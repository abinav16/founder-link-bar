ALTER TABLE public.startups ADD COLUMN category text;
ALTER TABLE public.startups ADD CONSTRAINT startups_category_valid CHECK (category IS NULL OR category IN ('AI', 'Developer Tools', 'Productivity', 'Marketing & Sales', 'Design', 'Creator & Media', 'E-commerce', 'Finance', 'Education', 'Health & Wellness', 'Community', 'Other'));
CREATE INDEX startups_category_idx ON public.startups (category) WHERE status = 'approved';
COMMENT ON COLUMN public.startups.category IS 'Founder-selected primary category; NULL means a legacy listing has not been categorized.';