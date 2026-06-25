"""
RAG service for querying filings with analysis mode context.
Real implementation with LCEL chain, ChromaDB, and OpenAI.
"""

from langchain_chroma import Chroma
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

from app.models.schemas import AnalysisMode, Citation
from app.core.config import settings
from app.core.database import get_chroma_client, get_supabase_client


# ============================================================
# COURSE 4 UPGRADE: Advanced Retrievers
# Option A — Multi-Query:
#   from langchain.retrievers.multi_query import MultiQueryRetriever
#   retriever = MultiQueryRetriever.from_llm(retriever=base_retriever, llm=llm)
# Option B — Contextual Compression:
#   from langchain.retrievers import ContextualCompressionRetriever
#   from langchain.retrievers.document_compressors import LLMChainExtractor
#   compressor = LLMChainExtractor.from_llm(llm)
#   retriever = ContextualCompressionRetriever(base_compressor=compressor, base_retriever=base_retriever)
# ============================================================


MODE_SYSTEM_PROMPTS = {
    AnalysisMode.VALUE: (
        "You are a value-oriented financial analyst. Focus on margins, free cash flow, "
        "debt levels, risk factors, valuation signals, and downside concerns. "
        "Be conservative and highlight potential red flags."
    ),
    AnalysisMode.GROWTH: (
        "You are a growth-oriented financial analyst. Focus on revenue growth, R&D spending, "
        "segment expansion, product momentum, TAM, and future opportunities. "
        "Be forward-looking and highlight growth catalysts and risks to the growth thesis."
    ),
}


def format_docs(docs):
    """Format retrieved documents for the prompt."""
    return "\n\n".join(doc.page_content for doc in docs)


async def check_ticker_ingested(ticker: str) -> bool:
    """Check if a ticker has been ingested into ChromaDB."""
    try:
        chroma_client = get_chroma_client()
        collections = chroma_client.list_collections()
        
        # Look for collections that match the ticker pattern
        ticker_collections = [
            coll.name for coll in collections 
            if coll.name.startswith(f"{ticker.upper()}_10-K_")
        ]
        
        return len(ticker_collections) > 0
    except Exception:
        return False


async def query_filing(ticker: str, question: str, mode: AnalysisMode) -> dict:
    """
    Query the vector store and generate a mode-aware answer using LCEL chain.
    
    Args:
        ticker: Company ticker to scope the search
        question: User's question
        mode: Analysis mode (value or growth)
        
    Returns:
        dict with answer and citations
    """
    try:
        # Step 1: Query Supabase for the latest collection name
        supabase = get_supabase_client()
        response = supabase.table("ingestion_jobs").select("*").eq("ticker", ticker.upper()).eq("status", "ready").order("created_at", desc=True).limit(1).execute()
        
        if not response.data:
            raise ValueError(f"No ready ingestion found for ticker {ticker}")
        
        ingestion_job = response.data[0]
        collection_name = ingestion_job["chroma_collection"]
        
        # Step 2: Load the ChromaDB collection
        embeddings = OpenAIEmbeddings(
            model=settings.embedding_model,
            api_key=settings.openai_api_key
        )
        
        chroma_client = get_chroma_client()
        vectorstore = Chroma(
            client=chroma_client,
            collection_name=collection_name,
            embedding_function=embeddings
        )
        
        # Step 3: Create retriever
        retriever = vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={"k": settings.retrieval_k}
        )
        
        # Step 4: Build prompt template
        system_prompt = MODE_SYSTEM_PROMPTS[mode] + " Always cite specific sections and direct quotes from the filing."
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "Context from {ticker} 10-K filing:\n\n{context}\n\nQuestion: {question}")
        ])
        
        # Step 5: Initialize LLM
        llm = ChatOpenAI(
            model=settings.llm_model,
            temperature=0,
            api_key=settings.openai_api_key
        )
        
        # Step 6: Build LCEL chain
        chain = (
            {"context": retriever | format_docs, "question": RunnablePassthrough(), "ticker": lambda x: ticker.upper()}
            | prompt
            | llm
            | StrOutputParser()
        )
        
        # Step 7: Execute chain
        answer = await chain.ainvoke(question)
        
        # Step 8: Get retrieved documents for citations
        retrieved_docs = await retriever.ainvoke(question)
        citations = []
        
        for doc in retrieved_docs:
            metadata = doc.metadata
            citation = Citation(
                text=doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                source=f"{metadata['ticker']} {metadata['filing_type']} {metadata['filing_year']} — {metadata['source']}",
                page=str(metadata.get('chunk_index', 'N/A'))
            )
            citations.append(citation)
        
        return {"answer": answer, "citations": citations}
        
    except Exception as e:
        raise Exception(f"Failed to query filing for {ticker}: {str(e)}")
