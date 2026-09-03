-- Lock down two pre-existing SECURITY DEFINER functions that were callable by
-- anon/authenticated via PostgREST RPC (flagged by the Supabase security advisor).
-- Permission-only + search_path pin — no data change, no body change.
--
--   * handle_new_user() is a TRIGGER on auth.users (on_auth_user_created).
--     Revoking direct EXECUTE does NOT affect trigger firing (Postgres does not
--     check EXECUTE for trigger invocation), so signup keeps working. Its body
--     uses fully-qualified public.profiles, so pinning search_path is safe.
--   * increment_tokens_consumed(...) is legacy and no longer called by the app
--     (token_usage is the source of truth); both overloads are locked down.
do $$
declare sig text;
begin
  foreach sig in array array[
    'handle_new_user()',
    'increment_tokens_consumed(text, integer)',
    'increment_tokens_consumed(uuid, integer)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated;', sig);
    execute format('grant execute on function public.%s to service_role;', sig);
    execute format('alter function public.%s set search_path = public, pg_temp;', sig);
  end loop;
end $$;
