CREATE UNIQUE INDEX newsletter_one_active_booking_per_sunday ON public.newsletter_sponsorships (send_date) WHERE send_date IS NOT NULL AND status NOT IN ('cancelled', 'failed', 'refunded');
ALTER TABLE public.newsletter_sponsorships ADD CONSTRAINT newsletter_send_date_sunday CHECK (send_date IS NULL OR EXTRACT(ISODOW FROM send_date) = 7) NOT VALID;
ALTER TABLE public.newsletter_sponsorships VALIDATE CONSTRAINT newsletter_send_date_sunday;
CREATE OR REPLACE FUNCTION public.public_newsletter_booked_dates() RETURNS TABLE(send_date date) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT DISTINCT ns.send_date FROM public.newsletter_sponsorships ns WHERE ns.send_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date AND ns.status NOT IN ('cancelled', 'failed', 'refunded') AND ns.send_date IS NOT NULL ORDER BY ns.send_date;
$$;
REVOKE ALL ON FUNCTION public.public_newsletter_booked_dates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_newsletter_booked_dates() TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.public_newsletter_booked_dates() IS 'Public date-only availability; never exposes sponsor, owner, payment or price details. Pending, paid and sent issues occupy their date; cancelled, failed and refunded bookings release it.';