"""
RAG service for querying filings with analysis mode context.
Real implementation with LCEL chain, ChromaDB, and OpenAI.
"""

from langchain_chroma import Chroma
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_classic.retrievers.multi_query import MultiQueryRetriever

from app.models.schemas import AnalysisMode, Citation
from app.core.config import settings
from app.core.database import get_chroma_client, get_supabase_client


DISCLAIMER = (
    "This tool provides research assistance based on public SEC filings. "
    "Nothing here is investment advice. Always verify information and consult "
    "a licensed professional before making investment decisions."
)

NO_ADVICE_INSTRUCTION = (
    "IMPORTANT: You are a research assistant only. Do NOT provide investment advice, "
    "recommendations, or opinions on whether to buy, sell, or hold any security. "
    "Do NOT predict future stock prices or earnings. Present only facts from the filings."
)

CONTEXT_ONLY_INSTRUCTION = (
    "Answer ONLY using the information in the provided context. "
    "If the filing does not directly answer the question, do NOT say you cannot find it — "
    "instead, present the most relevant financial data from the context that would help "
    "a user reason about the question themselves. "
    "Never use outside knowledge or make claims not supported by the filing."
)

CITATION_INSTRUCTION = (
    "When you use information from the context, insert an inline citation marker like [1], [2], etc. "
    "Each number corresponds to the source chunk it came from, in the order they appear. "
    "Example: 'Revenue grew 6% to $416B [1], driven by iPhone sales [2].' "
    "Use the same number if you reference the same source again."
)

EDUCATIONAL_INSTRUCTION = (
    "Write for someone who is new to investing. After presenting each financial metric or concept, "
    "add a brief plain-English explanation in parentheses of what it means and why it matters. "
    "For example: 'Free cash flow was $108B (this is the cash left over after the company pays "
    "for its operations and investments — more cash means more flexibility to grow or return "
    "money to shareholders).' Keep explanations short and jargon-free."
)

_PREFIX = f"{DISCLAIMER}\n\n{NO_ADVICE_INSTRUCTION}\n\n"


MODE_SYSTEM_PROMPTS = {
    AnalysisMode.VALUE: _PREFIX + (
        "You are a value-oriented financial analyst. When answering questions about valuation, "
        "extract and present the key metrics a value investor needs: revenue, net income, "
        "operating cash flow, free cash flow, total debt, book value, gross/operating margins, "
        "and any buyback or dividend activity mentioned in the filing. "
        "Do NOT render a buy/sell opinion — present the data and let the user decide. "
        "Highlight risk factors and any red flags from Item 1A."
    ),
    AnalysisMode.GROWTH: _PREFIX + (
        "You are a growth-oriented financial analyst. Focus on revenue growth, R&D spending, "
        "segment expansion, product momentum, TAM, and future opportunities. "
        "Be forward-looking and highlight growth catalysts and risks to the growth thesis."
    ),
    AnalysisMode.INCOME: _PREFIX + (
        "You are analyzing this SEC filing through the lens of an income investor. Focus on: "
        "dividend yield, payout ratio, operating cash flow coverage of dividends, dividend "
        "growth history, and the stability/predictability of earnings. Highlight any risks "
        "to dividend continuity."
    ),
    AnalysisMode.QUALITY: _PREFIX + (
        "You are analyzing this SEC filing through the lens of a quality investor. Focus on: "
        "return on equity (ROE), return on invested capital (ROIC), pricing power indicators, "
        "barriers to entry described in the 10-K narrative, and consistency of margins over time."
    ),
    AnalysisMode.RISK_AVERSE: _PREFIX + (
        "You are analyzing this SEC filing through the lens of a risk-averse investor. Focus on: "
        "interest coverage ratio, debt-to-equity, current and quick ratios, Item 1A risk factors, "
        "covenant terms, and any going-concern language."
    ),
    AnalysisMode.ESG: _PREFIX + (
        "You are analyzing this SEC filing through the lens of an ESG investor. Focus on: "
        "proxy statement (DEF 14A) disclosures, executive compensation structure, board "
        "diversity, environmental risk disclosures, and any sustainability commitments or "
        "controversies."
    ),
    AnalysisMode.ACTIVIST: _PREFIX + (
        "You are analyzing this SEC filing through the lens of an activist or short seller. "
        "Focus on: insider trading patterns (Form 4 references), related-party transactions, "
        "buyback quality and timing, accounting policy changes, and any discrepancies between "
        "GAAP earnings and cash flow."
    ),
}


def format_docs(docs):
    """Format retrieved documents with numbered citations for the prompt."""
    return "\n\n".join(
        f"[{i+1}] {doc.page_content}" for i, doc in enumerate(docs)
    )


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
        sec_url = ingestion_job.get("sec_url")
        
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
        
        # Step 3: Initialize LLM
        llm = ChatOpenAI(
            model=settings.llm_model,
            temperature=0,
            api_key=settings.openai_api_key
        )

        # Step 4: Create retriever (MultiQuery on top of similarity retriever)
        base_retriever = vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={"k": settings.retrieval_k}
        )
        retriever = MultiQueryRetriever.from_llm(retriever=base_retriever, llm=llm)

        # Step 5: Build prompt template
        system_prompt = (
            MODE_SYSTEM_PROMPTS[mode]
            + "\n\n" + CONTEXT_ONLY_INSTRUCTION
            + "\n\n" + CITATION_INSTRUCTION
            + "\n\n" + EDUCATIONAL_INSTRUCTION
        )

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", (
                "Context from {ticker} 10-K filing "
                "(each passage is numbered for inline citations):\n\n"
                "{context}\n\n"
                "Question: {question}"
            ))
        ])
        
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
        
        for i, doc in enumerate(retrieved_docs):
            metadata = doc.metadata
            cite_ticker = metadata.get('ticker', ticker.upper())
            filing_type = metadata.get('filing_type', 'N/A')
            year = metadata.get('filing_year', 'N/A')
            section = metadata.get('section', 'N/A')
            page = metadata.get('page', metadata.get('chunk_index', 'N/A'))
            citation = Citation(
                text=doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                source=f"{cite_ticker} {filing_type} {year} — chunk {i+1}",
                page=str(page),
                url=sec_url
            )
            citations.append(citation)
        
        return {"answer": answer, "citations": citations}
        
    except Exception as e:
        raise Exception(f"Failed to query filing for {ticker}: {str(e)}")
