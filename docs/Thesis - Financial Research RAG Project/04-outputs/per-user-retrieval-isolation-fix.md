---
type: output
title: "Security fix: end-to-end per-user retrieval isolation"
kind: engineering-log
produced: 2026-08-31
query: "Implement and document per-user isolation for retrieval — scope vector search, metadata, and passage endpoints by authenticated user id; audit RLS."
sources: ["[[src-observability-eval-implementation]]"]
tags: [security, multi-tenant, isolation, rls, supabase, pgvector, retrieval]
---

# Security fix: end-to-end per-user retrieval isolation

> Closes a cross-user data-exposure gap in the `financial-research-copilot` backend (branch `feature/arize-observability`, 2026-08-31). Users could reach **other users' ingested filing chunks** through the retrieval paths because chunks carried no owner and the queries didn't filter by user. Now every retrieval path is scoped to the authenticated user id, server-side. Follows the earlier `/status` endpoint scoping fix (`test_status_routes.py`) and the pipeline described in [[src-observability-eval-implementation]].

## 1. The vulnerability

The backend connects to Supabase with the **service-role key**, which **bypasses Row-Level Security**. So RLS was never the enforcement boundary on the server path — application-layer filters are. Three retrieval paths lacked a user filter, and `document_chunks` stored **no user identity at all**:

- **Vector search** (`query_filing`) filtered chunks by `{ticker, filing_type}` only → any user's chunks for a ticker were retrievable.
- **Passage endpoint** (`/api/filing/{ticker}/passage`) filtered by `{ticker, filing_type, chunk_index}` only → user A could read user B's cited passage text.
- **Ingestion** stored chunks with no `user_id`, and its idempotent delete was **global by ticker+filing_type** → user B re-ingesting a ticker **silently deleted user A's chunks** (isolation + data-integrity bug).

## 2. The fix (minimal, no schema/column change)

`user_id` is stamped into the existing `metadata` jsonb at ingestion and used as the filter on every read. This works with the existing `match_document_chunks` RPC (`metadata @> filter`) and the existing GIN index on `metadata` — **no new column, no RPC change**. The user id always comes from the verified session (`require_approved` dependency), never from client input.

### Files changed
| File | Change |
|---|---|
| `backend/app/services/ingestion_service.py` | `ingest_filing(ticker, filing_data, user_id)` — new required `user_id`; stamped into every chunk's `metadata`; **delete scoped** by `metadata->>user_id`; raises if `user_id` missing (refuses to write un-owned chunks). |
| `backend/app/api/routes/ingest.py` | Passes `user.user_id` into both (10-K, 10-Q) `ingest_filing` calls. |
| `backend/app/services/rag_service.py` | New `_chunk_filter(ticker, filing_type, user_id)` helper; both retrievers (10-K + 10-Q) now filter by the caller's `user_id`. |
| `backend/app/api/routes/filing.py` | Passage query scoped by `metadata->>user_id`; the `ingestion_jobs` chunk-count lookup scoped by `user_id`. |
| `backend/supabase/migrations/002_document_chunks_user_isolation.sql` | New migration (see below). |

### Policies updated (RLS audit)
- **`document_chunks`**: already had RLS **enabled with no policies** (= deny-all to anon/authenticated), so there was **no permissive cross-user policy to remove**. Added a **defense-in-depth** SELECT policy `(metadata->>'user_id')::uuid = auth.uid()` for any future non-service-role client. Service-role bypass is unchanged (that's how the backend reads/writes).
- **Other tables** (`profiles`, `ingestion_jobs`, `query_logs`, `token_usage`, `access_requests`): audited — all already scoped to `auth.uid()`. No permissive policies found.
- **Key finding logged**: because the server uses the service-role key, RLS is *defense-in-depth only*; the application-layer filters added here are the real isolation boundary.

## 3. Tests added — `backend/tests/unit/test_user_isolation.py`

Two users (A, B) ingest the **same ticker with the same chunk indices**; every path must return only the caller's chunks. Fakes enforce the same semantics as Postgres (`metadata @> filter` containment and `metadata->>key` equality).

- **Main query path**: `query_filing` as A returns only A's contexts/citations (`USER_A`, never `USER_B`), and vice-versa; a user with no ingestion of their own can't reach the other's chunks (raises "No ready ingestion").
- **Passage endpoint**: A gets only A's passages; B gets only B's; **404** when only the *other* user has chunks; unauthenticated → 401/403.
- **Ingestion**: chunks are stamped with the owner; the re-ingest delete is scoped by `metadata->>user_id`; missing `user_id` raises.
- **Status endpoint** isolation is covered in `test_status_routes.py` (prior fix).

Result: **65 backend tests pass** (9 new). New code + test file lint clean under `ruff`.

## 4. Risks, performance, follow-ups

- **⚠️ Existing chunks have no `user_id`** (ingested before this change). They now match **no** user's filter → they become **invisible, not leaked**. Deploy step required: either let the on-demand re-ingest flow (`409 needs_ingestion`) rebuild per user, or `truncate table document_chunks` once for a clean rebuild. Documented in the migration.
- **Performance**: negligible. The vector RPC path is unchanged (still one GIN-indexed `@>` containment). The passage endpoint adds one more `metadata->>user_id` equality on an already-tiny per-(ticker,filing) result set. An optional btree expression index on `(metadata->>'user_id')` is noted (commented) in the migration if the passage endpoint ever shows in slow-query logs.
- **Follow-up (defense-in-depth)**: promote `user_id` from jsonb metadata to a real `document_chunks.user_id` column + FK + btree index. Enables a column-based RLS policy and referential integrity on user deletion. Deferred to keep this change minimal.
- **Follow-up**: the offline eval harness (`evals/run_eval.py`) calls `query_filing` without a `user_id` (runs unscoped over single-owner data) — intentional and documented in `_chunk_filter`, but worth revisiting if evals ever run against multi-tenant data.
- **Scope note**: the backend still uses the service-role key by design; a larger future hardening would move data reads to a per-request user-JWT client so RLS becomes a real second layer.
