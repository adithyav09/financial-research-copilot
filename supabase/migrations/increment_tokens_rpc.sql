-- 1. Ensure columns exist and backfill nulls (safe to re-run)
alter table profiles
  add column if not exists tokens_consumed int default 0;

-- Backfill any existing null values to 0
update profiles set tokens_consumed = 0 where tokens_consumed is null;

alter table query_logs
  add column if not exists tokens_used int not null default 0,
  add column if not exists session_id text,
  add column if not exists answer text;

-- 2. RPC to atomically increment tokens_consumed.
--    Uses text cast so it works regardless of UUID storage format.
create or replace function increment_tokens_consumed(p_user_id text, p_tokens int)
returns void
language plpgsql
security definer
as $$
begin
  update profiles
  set tokens_consumed = coalesce(tokens_consumed, 0) + p_tokens
  where id::text = p_user_id;
end;
$$;
