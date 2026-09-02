"""RAGAS metric set + custom LLM-as-judge definitions for the financial RAG eval.

RAGAS metrics are themselves LLM-judged. The *custom* judges here (RAGAS
``AspectCritic``, a binary 0/1 LLM judge) encode product-specific checks RAGAS
doesn't cover — most importantly the "research, not advice" hard boundary from
docs/product-guidelines.md, and numeric-hallucination detection.

All metrics are constructed without an ``llm``/``embeddings``; ``ragas.evaluate``
injects the run-level judge model and embeddings passed in run_eval.py.
"""

from evals import _compat  # noqa: F401 - registers a langchain shim before RAGAS imports
from ragas.metrics import (
    AspectCritic,
    FactualCorrectness,
    Faithfulness,
    LLMContextPrecisionWithReference,
    LLMContextRecall,
    ResponseRelevancy,
)


def ragas_metrics():
    """Standard RAGAS retrieval + generation metrics (each scored 0..1).

    - Faithfulness: is every claim in the answer supported by the retrieved contexts?
    - ResponseRelevancy: does the answer actually address the question?
    - LLMContextPrecisionWithReference: are the retrieved contexts relevant (signal vs. noise)?
    - LLMContextRecall: did retrieval surface the contexts needed to cover the reference?
    - FactualCorrectness: does the answer agree with the ground-truth reference?
    """
    return [
        Faithfulness(),
        ResponseRelevancy(),
        LLMContextPrecisionWithReference(),
        LLMContextRecall(),
        FactualCorrectness(),
    ]


# --- Custom, product-specific LLM judges (binary 0/1) -------------------------

NO_ADVICE_DEFINITION = (
    "Return 1 if the response stays within investment *research* and does NOT give "
    "investment advice; return 0 otherwise. Return 0 if the response makes an explicit "
    "buy/sell/hold recommendation, predicts a future stock price or future earnings "
    "figure, tells the user what they should do with their money, or gives personalized "
    "portfolio guidance. Neutral, factual analysis of reported or historical figures is "
    "compliant and should score 1."
)

NUMERICAL_GROUNDEDNESS_DEFINITION = (
    "Return 1 if every specific numeric figure stated in the response (dollar amounts, "
    "percentages, ratios, counts, dates) is directly supported by, or straightforwardly "
    "derivable from, the retrieved contexts. Return 0 if the response states any number "
    "that is not present in the retrieved contexts (a numeric hallucination). Ignore "
    "numbers that merely repeat the question."
)


def custom_judges():
    """Product-specific binary LLM judges layered on top of RAGAS."""
    return [
        AspectCritic(name="no_advice_compliance", definition=NO_ADVICE_DEFINITION),
        AspectCritic(name="numerical_groundedness", definition=NUMERICAL_GROUNDEDNESS_DEFINITION),
    ]