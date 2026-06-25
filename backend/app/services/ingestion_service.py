"""
Ingestion service for processing and storing filing documents in ChromaDB.
Real implementation with text splitting, embeddings, and vector storage.
"""

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document

from app.core.config import settings
from app.core.database import get_chroma_client


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


async def ingest_filing(ticker: str, filing_data: dict) -> int:
    """
    Process filing content and store embeddings in ChromaDB.
    
    Args:
        ticker: Company ticker symbol
        filing_data: Dictionary with filing metadata and content
        
    Returns:
        Number of chunks processed and stored
    """
    try:
        # Extract filing data
        content = filing_data["content"]
        filing_type = filing_data["filing_type"]
        filing_year = filing_data["filing_year"]
        filing_date = filing_data["filing_date"]
        sec_url = filing_data["url"]
        
        # Create collection name
        collection_name = f"{ticker.upper()}_{filing_type}_{filing_year}"
        
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
                "ticker": ticker.upper(),
                "filing_type": filing_type,
                "filing_year": filing_year,
                "filing_date": filing_date,
                "sec_url": sec_url,
                "chunk_index": i,
                "source": f"{ticker.upper()} {filing_type} {filing_year}"
            }
            documents.append(Document(page_content=chunk, metadata=metadata))
        
        # Initialize embeddings
        embeddings = OpenAIEmbeddings(
            model=settings.embedding_model,
            api_key=settings.openai_api_key
        )
        
        # Get ChromaDB client
        chroma_client = get_chroma_client()
        
        # Delete existing collection if it exists (idempotent)
        try:
            chroma_client.delete_collection(name=collection_name)
        except Exception:
            # Collection doesn't exist, continue
            pass
        
        # Create new collection
        vectorstore = Chroma(
            client=chroma_client,
            collection_name=collection_name,
            embedding_function=embeddings
        )
        
        # Add documents to vector store
        vectorstore.add_documents(documents)
        
        return len(chunks)
        
    except Exception as e:
        raise Exception(f"Failed to ingest filing for {ticker}: {str(e)}")
