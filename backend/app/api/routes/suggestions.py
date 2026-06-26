from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from langchain_openai import ChatOpenAI

from app.core.config import settings
from app.core.auth import require_approved, AuthenticatedUser

router = APIRouter()


class SuggestionsRequest(BaseModel):
    ticker: str
    previous_answer: str
    mode: str = "value"


class SuggestionsResponse(BaseModel):
    suggestions: List[str]


@router.post("/query/suggestions", response_model=SuggestionsResponse)
async def get_suggestions(
    request: SuggestionsRequest,
    _user: AuthenticatedUser = Depends(require_approved),
):
    try:
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.4,
            max_tokens=200,
            api_key=settings.openai_api_key,
        )
        prompt = (
            f"You are a financial research assistant analyzing {request.ticker} SEC 10-K filings.\n"
            f"The analyst is using the '{request.mode}' lens.\n\n"
            f"Given this answer excerpt:\n\"\"\"\n{request.previous_answer[:1200]}\n\"\"\"\n\n"
            "Generate exactly 3 concise follow-up questions a financial researcher would naturally ask next. "
            "Each question must be on its own line, no numbering, no bullets, no extra text."
        )
        response = await llm.ainvoke(prompt)
        lines = [l.strip() for l in response.content.strip().split("\n") if l.strip()]
        suggestions = lines[:3]
        if len(suggestions) < 3:
            suggestions += ["What are the key risk factors?", "How does this compare to prior year?", "What is the capital allocation strategy?"][len(suggestions):]
        return SuggestionsResponse(suggestions=suggestions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {str(e)}")
