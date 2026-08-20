## Computer Science > Artificial Intelligence

This paper has been withdrawn by Yang Shu

## Title:Agentic Retrieval-Augmented Generation for Financial Document Question Answering

Authors:[Yang Shu](https://arxiv.org/search/cs?searchtype=author&query=Shu,+Y), [Yingmin Liu](https://arxiv.org/search/cs?searchtype=author&query=Liu,+Y), [Zequn Xie](https://arxiv.org/search/cs?searchtype=author&query=Xie,+Z)

[No PDF available, click to view other formats](#other)

> Abstract:Financial document question answering (QA) demands complex multi-step numerical reasoning over heterogeneous evidence--structured tables, textual narratives, and footnotes--scattered across corporate filings. Existing retrieval-augmented generation (RAG) approaches adopt a single-pass retrieve-then-generate paradigm that struggles with the compositional reasoning chains prevalent in financial analysis. We propose FinAgent-RAG, an agentic RAG framework that orchestrates iterative retrieval-reasoning loops with self-verification, specifically engineered for the precision requirements of financial numerical reasoning. The framework integrates three domain-specific innovations: (1) a Contrastive Financial Retriever trained with hard negative mining to distinguish semantically similar but numerically distinct financial passages, (2) a Program-of-Thought reasoning module that generates executable Python code for precise arithmetic rather than relying on error-prone LLM-based mental computation, and (3) an Adaptive Strategy Router that dynamically allocates computational resources based on question complexity, reducing API costs by 41.3% on FinQA while preserving accuracy. Extensive experiments on three benchmark datasets--FinQA, ConvFinQA, and TAT-QA--demonstrate that FinAgent-RAG achieves 76.81%, 78.46%, and 74.96% execution accuracy respectively, outperforming the strongest baseline by 5.62--9.32 percentage points. Ablation studies, cross-backbone evaluation with four LLMs, and deployment cost analysis confirm the framework's robustness and practical viability for financial institutions.

| Comments: |  |
| --- | --- |
| Subjects: | Artificial Intelligence (cs.AI); Computation and Language (cs.CL) |
| ACM classes: | I.2.7; H.3.3 |
| Cite as: | [arXiv:2605.05409](https://arxiv.org/abs/2605.05409) \[cs.AI\] |
|  | (or [arXiv:2605.05409v2](https://arxiv.org/abs/2605.05409v2) \[cs.AI\] for this version) |
|  | [https://doi.org/10.48550/arXiv.2605.05409](https://doi.org/10.48550/arXiv.2605.05409) |

## Submission history

From: Yang Shu \[[view email](https://arxiv.org/show-email/b3328794/2605.05409)\]  
**[\[v1\]](https://arxiv.org/abs/2605.05409v1)** Wed, 6 May 2026 19:59:51 UTC (3,543 KB)  
**\[v2\]** Sun, 5 Jul 2026 14:58:21 UTC (1 KB) *(withdrawn)*

[Which authors of this paper are endorsers?](https://arxiv.org/auth/show-endorsers/2605.05409) | Disable MathJax ([What is MathJax?](https://info.arxiv.org/help/mathjax.html))