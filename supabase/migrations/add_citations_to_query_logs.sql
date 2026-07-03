-- Persist the citations returned with each answer so they survive a page refresh
-- and full session restore (previously query_logs stored only the answer text and
-- a citations_count number, so restored history rendered with no sources).
-- Safe to re-run.
alter table query_logs
  add column if not exists citations jsonb;
