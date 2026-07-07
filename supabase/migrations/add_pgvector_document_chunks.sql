create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  metadata jsonb not null default '{}',
  embedding extensions.vector(1536),
  created_at timestamptz default now()
);

create index document_chunks_embedding_idx
  on document_chunks using hnsw (embedding extensions.vector_cosine_ops);

create index document_chunks_metadata_idx
  on document_chunks using gin (metadata);

alter table document_chunks enable row level security;
-- no policies added: only the backend's service-role key (which bypasses RLS)
-- ever reads/writes this table; anon/authenticated clients get zero access.

grant select, insert, update, delete on public.document_chunks to service_role;

create function match_document_chunks (
  query_embedding extensions.vector(1536),
  match_count int default 5,
  filter jsonb default '{}'
) returns table (id uuid, content text, metadata jsonb, similarity float)
language plpgsql
as $$
begin
  return query
  select
    document_chunks.id,
    document_chunks.content,
    document_chunks.metadata,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where document_chunks.metadata @> filter
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;

grant execute on function public.match_document_chunks(vector, int, jsonb) to service_role;
