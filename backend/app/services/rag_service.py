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
from app.services.market_service import fetch_market_data
from app.services.xbrl_service import fetch_xbrl_financials


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
    "Answer using the Live Market & Financial Data block AND the 10-K filing context provided. "
    "Data priority order:\n"
    "1. 'Latest Financials (Yahoo Finance)' TTM/MRQ block — use this as the PRIMARY source for any "
    "   current or recent financial figures (revenue, net income, cash flow, debt, etc.). "
    "   Always state the period (e.g. 'as of [date]') when citing these numbers.\n"
    "2. 'Historical Financials (SEC EDGAR XBRL)' — use for multi-year trends and year-over-year comparisons.\n"
    "3. 'Recent News Headlines' — use to reference recent events, catalysts, or developments.\n"
    "4. 10-K filing chunks — use for qualitative detail, risk factors, strategy, and management commentary. "
    "   Cite these with [N] inline markers.\n"
    "Never fabricate numbers or use outside knowledge beyond what is provided in the data blocks."
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


def _format_market_context(ticker: str, market: dict | None, xbrl: dict | None) -> str:
    """Build a concise live-data context block to prepend to the RAG context."""
    lines = [f"=== Live Market & Financial Data for {ticker} ==="]

    if market:
        def _f(v): return f"{v:,.2f}" if isinstance(v, float) else str(v)
        fields = [
            ("Company", market.get("company_name")),
            ("Sector", market.get("sector")),
            ("Current Price", f"${_f(market['current_price'])}" if market.get("current_price") else None),
            ("Market Cap", f"${market['market_cap']/1e9:.1f}B" if market.get("market_cap") else None),
            ("P/E Ratio", _f(market["pe_ratio"]) if market.get("pe_ratio") else None),
            ("Forward P/E", _f(market["forward_pe"]) if market.get("forward_pe") else None),
            ("EV/EBITDA", _f(market["ev_to_ebitda"]) if market.get("ev_to_ebitda") else None),
            ("Price/Book", _f(market["price_to_book"]) if market.get("price_to_book") else None),
            ("52w High", f"${_f(market['fifty_two_week_high'])}" if market.get("fifty_two_week_high") else None),
            ("52w Low", f"${_f(market['fifty_two_week_low'])}" if market.get("fifty_two_week_low") else None),
            ("Beta", _f(market["beta"]) if market.get("beta") else None),
            ("Dividend Yield", f"{market['dividend_yield']*100:.2f}%" if market.get("dividend_yield") else None),
            ("Analyst Rec.", market.get("analyst_recommendation")),
        ]
        for label, val in fields:
            if val:
                lines.append(f"  {label}: {val}")

    def _series_summary(name: str, series: list | None) -> str | None:
        if not series:
            return None
        pts = [f"{p['year']}: ${p['value']/1e9:.2f}B" if abs(p['value']) >= 1e9
               else f"{p['year']}: ${p['value']/1e6:.0f}M"
               for p in series if p.get('value') is not None]
        return f"  {name}: " + ", ".join(pts) if pts else None

    # --- TTM financials from Yahoo Finance (most recent annual/quarterly) ---
    if market:
        ttm = market.get("ttm") or {}
        ttm_lines = []
        period = ttm.get("ttm_period") or ttm.get("mrq_period")
        if period:
            ttm_lines.append(f"\n--- Latest Financials (Yahoo Finance, period ending {period}) ---")
        pairs = [
            ("TTM Revenue", "ttm_revenue"),
            ("TTM Gross Profit", "ttm_gross_profit"),
            ("TTM Operating Income", "ttm_operating_income"),
            ("TTM Net Income", "ttm_net_income"),
            ("TTM EBITDA", "ttm_ebitda"),
            ("TTM Operating Cash Flow", "ttm_operating_cashflow"),
            ("TTM Free Cash Flow", "ttm_free_cashflow"),
            ("TTM CapEx", "ttm_capex"),
            ("MRQ Total Assets", "mrq_total_assets"),
            ("MRQ Total Debt", "mrq_total_debt"),
            ("MRQ Cash", "mrq_cash"),
            ("MRQ Stockholders Equity", "mrq_stockholders_equity"),
        ]
        for label, key in pairs:
            val = ttm.get(key)
            if val:
                ttm_lines.append(f"  {label}: {val}")
        if len(ttm_lines) > 1:
            lines.extend(ttm_lines)

    if xbrl:
        series_map = [
            ("Revenue", xbrl.get("revenue_series")),
            ("Net Income", xbrl.get("net_income_series")),
            ("Operating Cash Flow", xbrl.get("operating_cash_flow_series")),
            ("Free Cash Flow", xbrl.get("free_cash_flow_series")),
            ("Gross Profit", xbrl.get("gross_profit_series")),
            ("Operating Income", xbrl.get("operating_income_series")),
            ("Total Debt", xbrl.get("total_debt_series")),
            ("Shareholders Equity", xbrl.get("shareholders_equity_series")),
            ("EPS (Diluted)", xbrl.get("eps_diluted_series")),
        ]
        xbrl_lines = [s for _, series in series_map for s in [_series_summary(_, series)] if s]
        if xbrl_lines:
            lines.append("\n--- Historical Financials (from SEC EDGAR XBRL, annual) ---")
            lines.extend(xbrl_lines)

    # --- Recent news headlines ---
    if market:
        news = market.get("news") or []
        if news:
            lines.append("\n--- Recent News Headlines (Yahoo Finance) ---")
            for item in news[:6]:
                date = item.get("date", "")
                pub = item.get("publisher", "")
                title = item.get("title", "")
                lines.append(f"  [{date}] {title} ({pub})")

    lines.append("=== End Live Data ===")
    return "\n".join(lines)


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


async def query_filing(ticker: str, question: str, mode: AnalysisMode, user_id: str | None = None) -> dict:
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
        # Step 1: Query Supabase for all ready collections for this ticker (10-K + 10-Q)
        supabase = get_supabase_client()
        q = supabase.table("ingestion_jobs").select("*").eq("ticker", ticker.upper()).eq("status", "ready")
        if user_id:
            q = q.eq("user_id", user_id)
        all_jobs_resp = q.order("created_at", desc=True).limit(10).execute()

        if not all_jobs_resp.data:
            raise ValueError(f"No ready ingestion found for ticker {ticker}")

        # Pick the primary (most recent 10-K) for sec_url; also find latest 10-Q if present
        jobs_by_type: dict = {}
        for job in all_jobs_resp.data:
            ft = job.get("filing_type", "10-K")
            if ft not in jobs_by_type:
                jobs_by_type[ft] = job

        primary_job = jobs_by_type.get("10-K") or all_jobs_resp.data[0]
        collection_name = primary_job["chroma_collection"]
        sec_url = primary_job.get("sec_url")

        # Step 2: Load ChromaDB collections
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

        # Also load 10-Q vectorstore if available
        tenq_vectorstore = None
        if "10-Q" in jobs_by_type:
            tenq_col = jobs_by_type["10-Q"].get("chroma_collection")
            if tenq_col:
                try:
                    tenq_vectorstore = Chroma(
                        client=chroma_client,
                        collection_name=tenq_col,
                        embedding_function=embeddings,
                    )
                except Exception:
                    tenq_vectorstore = None
        
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

        # Also create a 10-Q retriever if available
        tenq_retriever = None
        if tenq_vectorstore:
            try:
                tenq_base = tenq_vectorstore.as_retriever(
                    search_type="similarity",
                    search_kwargs={"k": max(2, settings.retrieval_k // 2)}
                )
                tenq_retriever = MultiQueryRetriever.from_llm(retriever=tenq_base, llm=llm)
            except Exception:
                tenq_retriever = None

        # Step 5: Fetch live market + XBRL data (best-effort, never fail the query)
        market_data = None
        xbrl_data = None
        try:
            market_data = await fetch_market_data(ticker)
        except Exception:
            pass
        try:
            xbrl_data = await fetch_xbrl_financials(ticker)
        except Exception:
            pass

        live_context = _format_market_context(ticker, market_data, xbrl_data)

        # Step 6: Build prompt template
        system_prompt = (
            MODE_SYSTEM_PROMPTS[mode]
            + "\n\n" + CONTEXT_ONLY_INSTRUCTION
            + "\n\n" + CITATION_INSTRUCTION
            + "\n\n" + EDUCATIONAL_INSTRUCTION
        )

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", (
                "{live_context}\n\n"
                "Context from {ticker} SEC filings (10-K annual + 10-Q quarterly where available) "
                "(each passage is numbered for inline citations):\n\n"
                "{context}\n\n"
                "Question: {question}"
            ))
        ])

        # Step 7: Retrieve docs from 10-K; merge with 10-Q docs if available
        retrieved_docs = await retriever.ainvoke(question)
        if tenq_retriever:
            try:
                tenq_docs = await tenq_retriever.ainvoke(question)
                # Deduplicate by content and prepend 10-Q docs (more recent)
                seen_content = {d.page_content[:100] for d in retrieved_docs}
                new_tenq = [d for d in tenq_docs if d.page_content[:100] not in seen_content]
                retrieved_docs = new_tenq + retrieved_docs
            except Exception:
                pass
        context_str = format_docs(retrieved_docs)

        prompt_value = await prompt.ainvoke({
            "context": context_str,
            "question": question,
            "ticker": ticker.upper(),
            "live_context": live_context,
        })

        # Step 8: Call LLM directly to capture usage_metadata
        llm_response = await llm.ainvoke(prompt_value)
        answer = llm_response.content

        # Extract actual token counts from response metadata
        usage = getattr(llm_response, "usage_metadata", None) or {}
        tokens_used = (
            usage.get("total_tokens")
            or usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
            or max(len(answer) // 4, 1)
        )

        citations = []
        for i, doc in enumerate(retrieved_docs):
            metadata = doc.metadata
            cite_ticker = metadata.get('ticker', ticker.upper())
            filing_type = metadata.get('filing_type', 'N/A')
            year = metadata.get('filing_year', 'N/A')
            page = metadata.get('page', metadata.get('chunk_index', 'N/A'))
            citation = Citation(
                text=doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                source=f"{cite_ticker} {filing_type} {year} — chunk {i+1}",
                page=str(page),
                url=sec_url
            )
            citations.append(citation)

        return {"answer": answer, "citations": citations, "tokens_used": tokens_used}
        
    except Exception as e:
        raise Exception(f"Failed to query filing for {ticker}: {str(e)}")
