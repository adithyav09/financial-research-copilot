"""
Ingestion service for processing and storing filing documents in Supabase pgvector.
Real implementation with text splitting, embeddings, and vector storage.
"""

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore
from langchain_core.documents import Document

from app.core.config import settings
from app.core.database import get_supabase_client


# ============================================================
# COURSE 4 UPGRADE: Parent Document Retriever
# Replace RecursiveCharacterTextSplitter with:
#   parent_splitter = RecursiveCharacterTextSplitter(chunk_size=2000)
#   child_splitter = RecursiveCharacterTextSplitter(chunk_size=400)
#   retriever = ParentDocumentRetriever(
#       vectorstore=vectorstore,
#       docstore=InMemoryStore(),
#       child_splitter=child_splitter,
#       parent_splitter=parent_splitter,
#   )
# ============================================================


async def ingest_filing(ticker: str, filing_data: dict, user_id: str) -> int:
    """
    Process filing content and store embeddings in Supabase pgvector.

    Args:
        ticker: Company ticker symbol
        filing_data: Dictionary with filing metadata and content
        user_id: Authenticated owner of these chunks. Stamped into every chunk's
            metadata so retrieval can be scoped per user (the backend uses the
            service-role key, which bypasses RLS, so this app-layer tag is the
            actual isolation boundary). Must come from the verified session, never
            from client-supplied input.

    Returns:
        Number of chunks processed and stored
    """
    if not user_id:
        # Refuse to write unscoped chunks — an un-owned chunk would be visible to
        # every user's (ticker, filing_type) filter and leak across accounts.
        raise ValueError("ingest_filing requires a user_id to scope stored chunks")
    try:
        # Extract filing data
        content = filing_data["content"]
        filing_type = filing_data["filing_type"]
        filing_year = filing_data["filing_year"]
        filing_date = filing_data["filing_date"]
        sec_url = filing_data["url"]

        ticker_upper = ticker.upper()

        # Initialize text splitter
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            separators=["\n\n", "\n", ". ", " "]
        )

        # Split content into chunks
        chunks = text_splitter.split_text(content)

        # Create documents with metadata
        documents = []
        for i, chunk in enumerate(chunks):
            metadata = {
                "user_id": str(user_id),
                "ticker": ticker_upper,
                "filing_type": filing_type,
                "filing_year": filing_year,
                "filing_date": filing_date,
                "sec_url": sec_url,
                "chunk_index": i,
                "source": f"{ticker_upper} {filing_type} {filing_year}"
            }
            documents.append(Document(page_content=chunk, metadata=metadata))

        # Initialize embeddings
        embeddings = OpenAIEmbeddings(
            model=settings.embedding_model,
            api_key=settings.openai_api_key
        )

        supabase = get_supabase_client()

        # Delete any previously ingested chunks for THIS user + ticker + filing type
        # (idempotent re-ingest). Scoped by user_id so re-ingesting a ticker only
        # replaces the caller's own chunks — never another user's (a global delete
        # here would let one user wipe another's ingested filings).
        supabase.table("document_chunks").delete().eq(
            "metadata->>user_id", str(user_id)
        ).eq("metadata->>ticker", ticker_upper).eq(
            "metadata->>filing_type", filing_type
        ).execute()

        vectorstore = SupabaseVectorStore(
            client=supabase,
            embedding=embeddings,
            table_name="document_chunks",
            query_name="match_document_chunks",
        )

        # Add documents to vector store
        await vectorstore.aadd_documents(documents)

        return len(chunks)

    except Exception as e:
        raise Exception(f"Failed to ingest filing for {ticker}: {str(e)}")
