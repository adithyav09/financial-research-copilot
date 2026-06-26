-- RPC function to atomically increment tokens_consumed for a user.
-- Run this in your Supabase SQL editor or as a migration.
create or replace function increment_tokens_consumed(p_user_id uuid, p_tokens int)
returns void
language plpgsql
security definer
as $$
begin
  update profiles
  set tokens_consumed = tokens_consumed + p_tokens
  where id = p_user_id;
end;
$$;
