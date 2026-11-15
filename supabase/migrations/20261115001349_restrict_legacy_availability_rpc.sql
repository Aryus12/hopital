-- The combined get_available_slots RPC replaces these older helpers.
-- Keep their appointment/absence details inaccessible to public and signed-in API roles.
revoke execute on function public.get_booked_slots(text, date) from public, anon, authenticated;
revoke execute on function public.is_specialist_absent(text, date) from public, anon, authenticated;
