REVOKE EXECUTE ON FUNCTION public.consume_prepaid_listing(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_prepaid_listing(uuid) TO authenticated;