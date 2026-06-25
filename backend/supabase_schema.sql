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
