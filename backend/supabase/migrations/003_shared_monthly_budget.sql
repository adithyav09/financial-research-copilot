-- Shared application-wide monthly dollar budget (replaces per-user token budgets).
--
-- Cost is recorded per model call in token_usage.cost_usd. The monthly budget is
-- DERIVED by summing cost_usd over the current calendar month (UTC) — it resets
-- automatically at the month boundary, no manual reset job. Per-user daily caps
-- are derived the same way over the current UTC day.
--
-- Concurrency safety: reserve_budget() takes a global advisory lock and, inside
-- it, sums current spend (including in-flight reservations) and inserts the new
-- reservation atomically. Concurrent callers therefore serialize and each sees
-- prior reservations, so simultaneous requests cannot overspend the budget.
--
-- RLS is unchanged: these functions are SECURITY DEFINER and the backend uses the
-- service-role key, so no per-user isolation policy is relaxed.

-- 1. Cost + reconciliation columns on the existing ledger.
alter table token_usage
  add column if not exists cost_usd     numeric(12,6) not null default 0,
  add column if not exists input_tokens  int,
  add column if not exists output_tokens int,
  -- 'reserved' = in-flight pre-charge; 'final' = reconciled actual cost.
  add column if not exists status text not null default 'final';

-- Fast month/day range scans for the budget sums.
create index if not exists idx_token_usage_created_at on token_usage(created_at);
create index if not exists idx_token_usage_user_created on token_usage(user_id, created_at);

-- UTC calendar-period boundaries as timestamptz (so the comparison is tz-safe).
create or replace function frc_month_start() returns timestamptz
  language sql immutable as $$ select date_trunc('month', now() at time zone 'utc') at time zone 'utc' $$;
create or replace function frc_day_start() returns timestamptz
  language sql immutable as $$ select date_trunc('day', now() at time zone 'utc') at time zone 'utc' $$;

-- 2. Reserve budget atomically. Returns {allowed, reason, reservation_id}.
create or replace function reserve_budget(
  p_user_id          text,
  p_est_cost         numeric,
  p_monthly_limit    numeric,
  p_user_daily_limit numeric,     -- <= 0 disables the daily dollar cap
  p_user_daily_tokens integer     -- <= 0 disables the daily token cap
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_month numeric;
  v_day   numeric;
  v_day_tokens bigint;
  v_id uuid;
begin
  -- Serialize all reservations so concurrent requests can't both pass the check.
  perform pg_advisory_xact_lock(hashtext('frc_global_budget')::bigint);

  select coalesce(sum(cost_usd), 0) into v_month
  from token_usage where created_at >= frc_month_start();

  if v_month + p_est_cost > p_monthly_limit then
    return jsonb_build_object('allowed', false, 'reason', 'monthly');
  end if;

  if p_user_daily_limit > 0 then
    select coalesce(sum(cost_usd), 0) into v_day
    from token_usage
    where user_id::text = p_user_id and created_at >= frc_day_start();
    if v_day + p_est_cost > p_user_daily_limit then
      return jsonb_build_object('allowed', false, 'reason', 'daily');
    end if;
  end if;

  if p_user_daily_tokens > 0 then
    select coalesce(sum(tokens_used), 0) into v_day_tokens
    from token_usage
    where user_id::text = p_user_id and created_at >= frc_day_start();
    if v_day_tokens >= p_user_daily_tokens then
      return jsonb_build_object('allowed', false, 'reason', 'daily');
    end if;
  end if;

  insert into token_usage (user_id, tokens_used, cost_usd, status)
  values (p_user_id::uuid, 0, p_est_cost, 'reserved')
  returning id into v_id;

  return jsonb_build_object('allowed', true, 'reservation_id', v_id);
end;
$$;

-- 3. Reconcile a reservation to the actual cost once the call completes.
create or replace function finalize_usage(
  p_reservation_id uuid,
  p_cost numeric,
  p_tokens int,
  p_input int,
  p_output int,
  p_model text,
  p_query_id text
) returns void
language sql
security definer
as $$
  update token_usage
  set cost_usd = p_cost, tokens_used = p_tokens, input_tokens = p_input,
      output_tokens = p_output, model = p_model, query_id = p_query_id, status = 'final'
  where id = p_reservation_id;
$$;

-- 4. Release a reservation if the model call failed (frees the pre-charge).
create or replace function release_reservation(p_reservation_id uuid) returns void
language sql
security definer
as $$
  delete from token_usage where id = p_reservation_id and status = 'reserved';
$$;

-- 5. Global budget status for the admin dashboard (current UTC month).
create or replace function get_budget_status() returns jsonb
language sql
stable
security definer
as $$
  select jsonb_build_object(
    'month_start', frc_month_start(),
    'month_spent_usd', coalesce((select sum(cost_usd) from token_usage where created_at >= frc_month_start()), 0),
    'month_requests', (select count(*) from token_usage where created_at >= frc_month_start() and status = 'final')
  );
$$;

-- 6. Per-user spend this month (admin visibility). Users with no rows are absent.
create or replace function get_user_month_spend()
returns table(user_id uuid, spent_usd numeric, requests bigint)
language sql
stable
security definer
as $$
  select tu.user_id,
         coalesce(sum(tu.cost_usd), 0) as spent_usd,
         count(*) filter (where tu.status = 'final') as requests
  from token_usage tu
  where tu.user_id is not null and tu.created_at >= frc_month_start()
  group by tu.user_id;
$$;

-- 7. SECURITY: these are SECURITY DEFINER (owner-privileged) and PostgREST exposes
-- them as RPC. They must NOT be callable by anon/authenticated clients — that would
-- let a client rewrite the usage ledger or read global/other users' spend, bypassing
-- RLS. Only the backend's service_role may call them. (Postgres grants EXECUTE to
-- PUBLIC by default, so the revoke is required.)
do $$
declare sig text;
begin
  foreach sig in array array[
    'reserve_budget(text, numeric, numeric, numeric, integer)',
    'finalize_usage(uuid, numeric, integer, integer, integer, text, text)',
    'release_reservation(uuid)',
    'get_budget_status()',
    'get_user_month_spend()',
    'frc_month_start()',
    'frc_day_start()'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated;', sig);
    execute format('grant execute on function public.%s to service_role;', sig);
    -- Pin search_path so a mutable path can't shadow unqualified references.
    execute format('alter function public.%s set search_path = public, pg_temp;', sig);
  end loop;
end $$;
