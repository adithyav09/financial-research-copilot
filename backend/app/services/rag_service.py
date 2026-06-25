"""
RAG service for querying filings with analysis mode context.
Placeholder implementation.
"""

from app.models.schemas import AnalysisMode, Citation


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


async def query_filing(ticker: str, question: str, mode: AnalysisMode) -> dict:
    """
    Query the vector store and generate a mode-aware answer.
    
    Args:
        ticker: Company ticker to scope the search
        question: User's question
        mode: Analysis mode (value or growth)
        
    Returns:
        dict with answer and citations
    """
    # Placeholder: In production, this will:
    # 1. Retrieve relevant chunks from ChromaDB filtered by ticker
    # 2. Build prompt with mode-specific system prompt
    # 3. Call LLM with retrieved context
    # 4. Parse and return answer with citations
    t = ticker.upper()

    if mode == AnalysisMode.VALUE:
        answer = (
            f"{t}'s 10-K reveals a business with solid cash generation characteristics. "
            f"Free cash flow reached $99.5B, providing significant balance sheet flexibility. "
            f"Gross margins expanded 80bps to 44.1%, indicating improving unit economics. "
            f"However, long-term debt of $95.3B warrants attention — the net cash position of $49.0B "
            f"provides a moderate buffer. Key downside risks include regulatory headwinds and "
            f"macro-driven demand softness, both cited prominently in the Risk Factors section. "
            f"The $77.5B buyback program signals management confidence but also limits financial flexibility. "
            f"From a value perspective, the question is whether current multiples adequately price in these risks."
        )
        citations = [
            Citation(
                text="Free cash flow was $99.5 billion, an increase of $20.1 billion or 25% compared to the prior year.",
                source=f"{t} 10-K 2023 — Liquidity and Capital Resources",
                page="48",
            ),
            Citation(
                text="Long-term debt, net of issuance costs, totaled $95.3 billion as of December 31, 2023.",
                source=f"{t} 10-K 2023 — Consolidated Balance Sheet",
                page="61",
            ),
            Citation(
                text="Gross margin was 44.1% in 2023 compared to 43.3% in 2022, driven by favorable product mix and cost efficiencies.",
                source=f"{t} 10-K 2023 — Results of Operations",
                page="39",
            ),
        ]
    else:
        answer = (
            f"{t}'s 10-K paints a compelling growth picture. Net revenues grew 8% YoY, "
            f"outpacing the broader market. R&D spend of $29.9B — approximately 12% of revenue — "
            f"signals sustained investment in next-generation products and platforms. "
            f"Services revenue continues to diversify the top line, reducing hardware cyclicality. "
            f"International expansion and emerging market penetration represent meaningful TAM upside. "
            f"The primary growth risk is execution: maintaining innovation pace while scaling globally. "
            f"M&A optionality backed by the $49.0B net cash position could further accelerate growth vectors "
            f"in AI, health tech, or enterprise software."
        )
        citations = [
            Citation(
                text="Net revenues increased 8% year-over-year to $383.3 billion, with Services revenue reaching a record $85.2 billion.",
                source=f"{t} 10-K 2023 — Results of Operations",
                page="38",
            ),
            Citation(
                text="Research and development expense was $29.9 billion, reflecting continued investment in new technologies and product development.",
                source=f"{t} 10-K 2023 — Operating Expenses",
                page="41",
            ),
            Citation(
                text="The Company's goal is to offer products and services that continue to introduce compelling new technologies to the market.",
                source=f"{t} 10-K 2023 — Business Overview",
                page="2",
            ),
        ]

    return {"answer": answer, "citations": citations}
