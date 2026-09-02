-- Per-user isolation for retrieval (document_chunks).
--
-- Context / audit result:
--   * The backend connects with the SERVICE-ROLE key, which BYPASSES RLS. So the
--     real isolation boundary is the application-layer filter: every chunk now
--     carries metadata.user_id (set at ingestion), and every retrieval path
--     (vector search via match_document_chunks' `metadata @> filter`, and the
--     passage endpoint's `metadata->>user_id` filter) scopes to the caller's id.
--   * document_chunks already had RLS ENABLED with NO policies => deny-all for
--     anon/authenticated roles. That is already tight (no permissive cross-user
--     policy existed to remove). The policy below is DEFENSE-IN-DEPTH: if a
--     non-service-role client is ever granted direct access, it still only sees
--     its own rows. No other table's policies were permissive — profiles,
--     ingestion_jobs, query_logs, token_usage, access_requests are all scoped to
--     auth.uid() already.
--
-- Minimal by design: user_id lives inside the existing metadata jsonb, so there
-- is NO new column, NO change to match_document_chunks, and the existing GIN
-- index on metadata continues to serve the containment filter.

-- Defense-in-depth: authenticated users may read only their own chunks. Service
-- role continues to bypass RLS (unchanged), which is how the backend reads/writes.
drop policy if exists "Users can view own document chunks" on document_chunks;
create policy "Users can view own document chunks"
  on document_chunks for select
  using ((metadata->>'user_id')::uuid = auth.uid());

-- Optional performance aid for the passage endpoint's `metadata->>'user_id'`
-- equality (the GIN index already covers the RPC's `@>` containment path). Chunk
-- result sets per (user,ticker,filing_type) are small, so this is a nicety, not a
-- requirement — enable if the passage endpoint shows up in slow-query logs:
-- create index if not exists document_chunks_user_idx
--   on document_chunks ((metadata->>'user_id'));

-- NOTE (deploy): rows ingested before this change have no metadata.user_id and
-- will therefore match no user's scoped filter (they become invisible, not
-- leaked). Either let the on-demand re-ingest flow (409 needs_ingestion) rebuild
-- them per user, or truncate document_chunks once so everyone re-ingests cleanly:
--   truncate table document_chunks;
