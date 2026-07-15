"""
RAG service for querying filings with analysis mode context.
Real implementation with LCEL chain, Supabase pgvector, and OpenAI.
"""

import urllib.parse

from langchain_community.vectorstores import SupabaseVectorStore
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_classic.retrievers.multi_query import MultiQueryRetriever

import json

from app.models.schemas import AnalysisMode, Citation, Depth, StructuredAnswer
from app.core.config import settings
from app.core.database import get_supabase_client
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

LIVE_QUESTION_PATTERNS = [
    "news", "latest", "recent", "today", "this week", "this month", "current",
    "right now", "as of", "stock price", "share price", "analyst", "rating",
    "upgrade", "downgrade", "earnings call", "guidance", "forecast", "outlook",
    "quarter", "q1", "q2", "q3", "q4", "ttm", "trailing",
]

def _is_live_question(question: str) -> bool:
    """Return True if the question is primarily about current/recent data rather than filings."""
    q = question.lower()
    return any(p in q for p in LIVE_QUESTION_PATTERNS)


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

# XBRL series the frontend can chart from its own /xbrl data. The LLM may only
# request these keys; anything else is dropped during validation.
XBRL_CHART_KEYS = {
    "revenue", "net_income", "operating_cash_flow", "free_cash_flow",
    "gross_profit", "operating_income", "total_debt", "shareholders_equity",
    "eps_diluted",
}

STRUCTURED_OUTPUT_INSTRUCTION = (
    "Respond with a single JSON object (no code fences, no text outside it) with exactly "
    "these fields:\n"
    '  "takeaway": one or two sentences with the single most important answer to the question, '
    "including the key figures.\n"
    '  "metrics": array of at most 3 objects, each {"label", "value", "delta", "delta_direction", '
    '"citation"} — the headline numbers behind the takeaway. "value" is the formatted figure '
    '(e.g. "$109.2B"), "delta" a short change like "+11.9% YoY" or null, "delta_direction" one of '
    '"up"/"down"/"flat" or null, "citation" the 1-based [N] source number the figure came from, '
    "or null. Only include metrics whose values appear verbatim in the provided context.\n"
    '  "narrative": the full answer as markdown, following all the instructions above '
    "(inline [N] citations, plain-English explanations if asked for them).\n"
    '  "chart": null, unless the question is about a multi-year trend — then '
    '{"title", "metric_keys", "reason"} where "metric_keys" is 1-2 of: '
    + ", ".join(sorted(XBRL_CHART_KEYS)) + ". "
    '"reason" is a short clause like "your question covers a multi-year trend".\n'
    '  "follow_ups": array of 2-3 short follow-up questions a curious reader would ask next.\n'
    "Never invent numbers for metrics or the takeaway — every figure must come from the context."
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


# Depth replaces the 7 analysis-mode personas (Thesis redesign). Both depths
# must present the SAME data — depth changes register and explanation level
# only. This mirrors the old mode rule: framing may differ, data may not.
DEPTH_SYSTEM_PROMPTS = {
    Depth.ANALYST: _PREFIX + (
        "You are a financial research analyst summarizing SEC filings and market data "
        "for a professionally fluent reader. Present the key figures relevant to the "
        "question — revenue, margins, cash flow, debt, segment detail — with exact "
        "numbers and their periods. Assume the reader knows standard financial "
        "terminology; do not define common terms. "
        "Do NOT render a buy/sell opinion — present the data and let the user decide. "
        "Highlight risk factors from Item 1A when they bear on the question."
    ),
    Depth.SIMPLE: _PREFIX + (
        "You are a financial research assistant writing for someone who is new to "
        "reading SEC filings. Use the same complete, accurate figures an analyst would "
        "— never omit or round away information to simplify. "
        + EDUCATIONAL_INSTRUCTION
    ),
}


# Deprecated: superseded by DEPTH_SYSTEM_PROMPTS. Kept only so any code still
# importing it (or older data referencing mode names) doesn't break.
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


def _parse_structured_answer(raw: str) -> StructuredAnswer | None:
    """
    Parse the LLM's JSON reply into a StructuredAnswer, or None if unusable —
    the caller then falls back to treating the raw text as a plain answer.
    Hardening steps, in order:
      1. strip ``` fences the model sometimes adds despite instructions
      2. json.loads + pydantic validation
      3. reject empty takeaway/narrative (a husk isn't worth rendering)
      4. clamp metrics/follow_ups to design limits; drop chart keys we can't
         serve from XBRL, and the whole chart if none survive
    """
    try:
        text = raw.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text
            text = text.rsplit("```", 1)[0]
        structured = StructuredAnswer.model_validate(json.loads(text))
        if not structured.takeaway.strip() or not structured.narrative.strip():
            return None
        structured.metrics = structured.metrics[:3]
        structured.follow_ups = structured.follow_ups[:3]
        if structured.chart:
            structured.chart.metric_keys = [
                k for k in structured.chart.metric_keys if k in XBRL_CHART_KEYS
            ][:2]
            if not structured.chart.metric_keys:
                structured.chart = None
        return structured
    except Exception:
        return None


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
    """Check if a ticker has a ready 10-K ingested."""
    try:
        supabase = get_supabase_client()
        resp = (
            supabase.table("ingestion_jobs")
            .select("id")
            .eq("ticker", ticker.upper())
            .eq("filing_type", "10-K")
            .eq("status", "ready")
            .limit(1)
            .execute()
        )
        return bool(resp.data)
    except Exception:
        return False


async def query_filing(
    ticker: str,
    question: str,
    mode: AnalysisMode = AnalysisMode.VALUE,
    user_id: str | None = None,
    depth: Depth = Depth.ANALYST,
) -> dict:
    """
    Query the vector store and generate a depth-aware answer using LCEL chain.

    Args:
        ticker: Company ticker to scope the search
        question: User's question
        mode: Deprecated — accepted for backward compatibility, no longer
            used for prompt selection (depth replaced the 7 personas)
        user_id: Scopes retrieval to this user's ingested filings
        depth: Explanation depth (simple defines jargon inline; analyst
            assumes financial fluency). Framing only — data never differs.

    Returns:
        dict with answer and citations
    """
    try:
        is_live = _is_live_question(question)

        sec_url = None
        retriever = None
        tenq_retriever = None

        if not is_live:
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
            sec_url = primary_job.get("sec_url")

            # Step 2: Set up the pgvector-backed vector store, filtered per filing type
            embeddings = OpenAIEmbeddings(
                model=settings.embedding_model,
                api_key=settings.openai_api_key
            )

            vectorstore = SupabaseVectorStore(
                client=supabase,
                embedding=embeddings,
                table_name="document_chunks",
                query_name="match_document_chunks",
            )

            # Also load 10-Q vectorstore if available
            tenq_vectorstore = vectorstore if "10-Q" in jobs_by_type else None

        # Step 3: Initialize LLM
        llm = ChatOpenAI(
            model=settings.llm_model,
            temperature=0,
            api_key=settings.openai_api_key
        )

        # Step 4: Create retrievers only for filing questions
        if not is_live:
            base_retriever = vectorstore.as_retriever(
                search_type="similarity",
                search_kwargs={
                    "k": settings.retrieval_k,
                    "filter": {"ticker": ticker.upper(), "filing_type": "10-K"},
                }
            )
            retriever = MultiQueryRetriever.from_llm(retriever=base_retriever, llm=llm)

            if tenq_vectorstore:
                try:
                    tenq_base = tenq_vectorstore.as_retriever(
                        search_type="similarity",
                        search_kwargs={
                            "k": max(2, settings.retrieval_k // 2),
                            "filter": {"ticker": ticker.upper(), "filing_type": "10-Q"},
                        }
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

        # Step 6: Build prompt (is_live already determined at top of function)
        # Simple depth already folds in EDUCATIONAL_INSTRUCTION; analyst must
        # not get it (its whole point is skipping the inline definitions).
        system_prompt = (
            DEPTH_SYSTEM_PROMPTS[depth]
            + "\n\n" + CONTEXT_ONLY_INSTRUCTION
            + "\n\n" + CITATION_INSTRUCTION
            + "\n\n" + STRUCTURED_OUTPUT_INSTRUCTION
        )

        if is_live:
            # For current/news questions: answer entirely from live data, skip filing retrieval
            live_prompt = ChatPromptTemplate.from_messages([
                ("system",
                    DEPTH_SYSTEM_PROMPTS[depth]
                    + "\n\nYou are answering a question about CURRENT or RECENT information. "
                    "Use ONLY the Live Market & Financial Data block below. "
                    "Do NOT reference old filings or fabricate anything not in the data block. "
                    "For news questions, list headlines with their dates and publishers. "
                    + "\n\n" + NO_ADVICE_INSTRUCTION
                    + "\n\n" + STRUCTURED_OUTPUT_INSTRUCTION
                    # Live answers have no numbered filing passages — the [N]
                    # citation system doesn't apply on this path.
                    + '\n\nFor this question there are no numbered sources: set every "citation" '
                    "to null and do not use [N] markers in the narrative."
                ),
                ("human", "{live_context}\n\nQuestion: {question}")
            ])
            prompt_value = await live_prompt.ainvoke({
                "live_context": live_context,
                "question": question,
            })
            retrieved_docs = []  # no filing citations for live questions
        else:
            # Filing question: retrieve from 10-K + 10-Q, put live data after the question
            filing_prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                ("human", (
                    "Context from {ticker} SEC filings (10-K annual + 10-Q quarterly where available) "
                    "(each passage is numbered for inline citations):\n\n"
                    "{context}\n\n"
                    "Question: {question}\n\n"
                    "For any numbers not found in the filing context, "
                    "you may use the live data below as a supplement:\n"
                    "{live_context}"
                ))
            ])

            # Step 7: Retrieve docs from 10-K + 10-Q
            retrieved_docs = await retriever.ainvoke(question)
            if tenq_retriever:
                try:
                    tenq_docs = await tenq_retriever.ainvoke(question)
                    seen_content = {d.page_content[:100] for d in retrieved_docs}
                    new_tenq = [d for d in tenq_docs if d.page_content[:100] not in seen_content]
                    retrieved_docs = new_tenq + retrieved_docs
                except Exception:
                    pass

            context_str = format_docs(retrieved_docs)
            prompt_value = await filing_prompt.ainvoke({
                "context": context_str,
                "question": question,
                "ticker": ticker.upper(),
                "live_context": live_context,
            })

        # Step 8: Call LLM directly to capture usage_metadata.
        # JSON mode makes the structured reply near-deterministic, but some
        # models reject the response_format kwarg — fall back to a plain call;
        # the prompt still asks for JSON and the parser tolerates failure.
        try:
            llm_response = await llm.bind(
                response_format={"type": "json_object"}
            ).ainvoke(prompt_value)
        except Exception:
            llm_response = await llm.ainvoke(prompt_value)
        raw_answer = llm_response.content

        structured = _parse_structured_answer(raw_answer)
        if structured:
            # query_logs/history persist only `answer` text — compose takeaway +
            # narrative so restored sessions read well without the structured payload.
            answer = f"**{structured.takeaway}**\n\n{structured.narrative}"
        else:
            answer = raw_answer

        # Extract actual token counts from response metadata
        usage = getattr(llm_response, "usage_metadata", None) or {}
        tokens_used = (
            usage.get("total_tokens")
            or usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
            or max(len(answer) // 4, 1)
        )

        citations = []

        if is_live:
            # For live questions: cite the data sources used
            today = __import__("datetime").date.today().isoformat()
            if market_data:
                price = market_data.get("current_price")
                mcap = market_data.get("market_cap")
                rec = market_data.get("analyst_recommendation")
                ttm = market_data.get("ttm") or {}
                period = ttm.get("ttm_period") or ttm.get("mrq_period") or today
                citations.append(Citation(
                    text=(
                        f"Live market data as of {today}. "
                        + (f"Price: ${price:.2f}. " if price else "")
                        + (f"Market Cap: ${mcap/1e9:.1f}B. " if mcap else "")
                        + (f"Analyst consensus: {rec}. " if rec else "")
                        + (f"TTM/MRQ financials period ending {period}." if period else "")
                    ),
                    source=f"{ticker.upper()} — Yahoo Finance (live)",
                    page="live",
                    url=f"https://finance.yahoo.com/quote/{ticker.upper()}",
                ))
                # Add TTM financials as a second citation if available
                ttm_lines = [v for k, v in ttm.items() if v and k not in ("ttm_period", "mrq_period")]
                if ttm_lines:
                    citations.append(Citation(
                        text="; ".join(f"{k.replace('ttm_','').replace('mrq_','').replace('_',' ').title()}: {v}"
                                       for k, v in ttm.items() if v and k not in ("ttm_period", "mrq_period")),
                        source=f"{ticker.upper()} — Yahoo Finance TTM/MRQ Financials (period: {period})",
                        page="ttm",
                        url=f"https://finance.yahoo.com/quote/{ticker.upper()}/financials",
                    ))
            if market_data and market_data.get("news"):
                # One citation per headline, linking to the actual article (not the
                # generic /news page). A text fragment makes the browser scroll to and
                # highlight the headline on the article page.
                fallback_news = f"https://finance.yahoo.com/quote/{ticker.upper()}/news"
                for n in market_data["news"][:5]:
                    title = n.get("title", "")
                    if not title:
                        continue
                    date = n.get("date", "")
                    publisher = n.get("publisher", "")
                    art_url = n.get("url")
                    if art_url:
                        frag = urllib.parse.quote(" ".join(title.split()[:8]))
                        art_url = f"{art_url}#:~:text={frag}"
                    else:
                        art_url = fallback_news
                    citations.append(Citation(
                        text=f"[{date}] {title}" + (f" ({publisher})" if publisher else ""),
                        source=f"{publisher or 'Yahoo Finance'} — news article",
                        page="news",
                        url=art_url,
                    ))
            if xbrl_data:
                citations.append(Citation(
                    text=f"Historical annual financials from SEC EDGAR XBRL data for {ticker.upper()}.",
                    source=f"{ticker.upper()} — SEC EDGAR XBRL",
                    page="xbrl",
                    url=f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&ticker={ticker.upper()}&type=10-K",
                ))
        else:
            # For filing questions: include all retrieved doc citations
            for i, doc in enumerate(retrieved_docs):
                metadata = doc.metadata
                cite_ticker = metadata.get('ticker', ticker.upper())
                filing_type = metadata.get('filing_type', '10-K')
                year = metadata.get('filing_year', 'N/A')
                chunk_index = metadata.get('chunk_index')
                page = metadata.get('page', chunk_index if chunk_index is not None else 'N/A')
                citations.append(Citation(
                    text=doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                    source=f"{cite_ticker} {filing_type} {year} — chunk {i+1}",
                    page=str(page),
                    url=sec_url,
                    # chunk_index + filing_type let the frontend open this
                    # passage in the in-app filing viewer (design 1c).
                    chunk_index=chunk_index if isinstance(chunk_index, int) else None,
                    filing_type=filing_type,
                ))

        return {
            "answer": answer,
            "citations": citations,
            "tokens_used": tokens_used,
            "structured": structured,
        }
        
    except Exception as e:
        raise Exception(f"Failed to query filing for {ticker}: {str(e)}")
