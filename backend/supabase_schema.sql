create table ingestion_jobs (
  id uuid default gen_random_uuid() primary key,
  ticker text not null,
  filing_type text default '10-K',
  filing_year int,
  filing_date text,
  status text not null default 'pending',
  chunk_count int default 0,
  error_message text,
  sec_url text,
  chroma_collection text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table query_logs (
  id uuid default gen_random_uuid() primary key,
  ticker text not null,
  question text not null,
  mode text not null,
  answer_length int,
  citations_count int,
  latency_ms int,
  created_at timestamptz default now()
);

create index idx_ingestion_jobs_ticker on ingestion_jobs(ticker);
create index idx_query_logs_ticker on query_logs(ticker);

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  token_budget int DEFAULT 50000,
  tokens_consumed int DEFAULT 0,
  role text DEFAULT 'pending', -- pending | approved | denied
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Access requests table
CREATE TABLE IF NOT EXISTS access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  use_case text,
  investor_type text,
  status text DEFAULT 'pending', -- pending | approved | denied
  created_at timestamptz DEFAULT now()
);

-- Token usage tracking
CREATE TABLE IF NOT EXISTS token_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  query_id text,
  tokens_used int,
  model text,
  created_at timestamptz DEFAULT now()
);

-- Add user_id columns to existing tables (required for per-user RLS)
ALTER TABLE ingestion_jobs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE query_logs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- RLS for access_requests
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own access request" ON access_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own access request" ON access_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS for token_usage
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own token usage" ON token_usage FOR SELECT USING (auth.uid() = user_id);

-- RLS for ingestion_jobs
ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ingestion jobs" ON ingestion_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ingestion jobs" ON ingestion_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ingestion jobs" ON ingestion_jobs FOR UPDATE USING (auth.uid() = user_id);

-- RLS for query_logs
ALTER TABLE query_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own query logs" ON query_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own query logs" ON query_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- GOVERNANCE: Query logs must be purged after 30 days.
-- Enable pg_cron extension in Supabase dashboard and run:
-- SELECT cron.schedule('purge-old-query-logs', '0 0 * * *', $$DELETE FROM query_logs WHERE created_at < now() - interval '30 days'$$);
