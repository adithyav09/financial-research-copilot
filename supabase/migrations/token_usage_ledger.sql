-- Make token_usage the single source of truth for per-user token consumption.
--
-- Previously consumption lived in profiles.tokens_consumed (a running counter
-- bumped by increment_tokens_consumed). We now record one row per query in
-- token_usage (with the model used) and derive consumption as SUM(tokens_used).
-- The usage bar (/auth/me), admin dashboard (/auth/users), usage summary, and
-- the over-budget enforcement check all read from these functions.
--
-- profiles.tokens_consumed is left in place but is no longer written or read;
-- it is retained only so this change can be rolled back without data loss.

-- 1. Index for fast per-user aggregation (token_usage is now read on every
--    authenticated request via get_tokens_consumed).
create index if not exists idx_token_usage_user_id on token_usage(user_id);

-- 2. Backfill from query_logs so historical consumption survives the switch.
--    query_logs is purged after 30 days (see supabase_schema.sql), but
--    token_usage is not — so once backfilled, consumption is preserved
--    independently of log retention. The NOT EXISTS guard makes this re-runnable.
insert into token_usage (user_id, query_id, tokens_used, model, created_at)
select ql.user_id, ql.id::text, ql.tokens_used, 'legacy', ql.created_at
from query_logs ql
where ql.user_id is not null
  and coalesce(ql.tokens_used, 0) > 0
  and not exists (
    select 1 from token_usage tu where tu.query_id = ql.id::text
  );

-- 3. Per-user total — used by the over-budget check and /auth/me.
create or replace function get_tokens_consumed(p_user_id text)
returns bigint
language sql
stable
security definer
as $$
  select coalesce(sum(tokens_used), 0)::bigint
  from token_usage
  where user_id::text = p_user_id;
$$;

-- 4. All-user totals — used by the admin user list and usage summary so we
--    aggregate in one round trip instead of N per-user queries.
create or replace function get_all_token_totals()
returns table(user_id uuid, tokens_consumed bigint)
language sql
stable
security definer
as $$
  select tu.user_id, coalesce(sum(tu.tokens_used), 0)::bigint as tokens_consumed
  from token_usage tu
  where tu.user_id is not null
  group by tu.user_id;
$$;
