## Computer Science > Information Retrieval

## Title:Optimizing Retrieval Strategies for Financial Question Answering Documents in Retrieval-Augmented Generation Systems

Authors:[Sejong Kim](https://arxiv.org/search/cs?searchtype=author&query=Kim,+S), [Hyunseo Song](https://arxiv.org/search/cs?searchtype=author&query=Song,+H), [Hyunwoo Seo](https://arxiv.org/search/cs?searchtype=author&query=Seo,+H), [Hyunjun Kim](https://arxiv.org/search/cs?searchtype=author&query=Kim,+H)

[View PDF](https://arxiv.org/pdf/2503.15191) [HTML (experimental)](https://arxiv.org/html/2503.15191v1)

> Abstract:Retrieval-Augmented Generation (RAG) has emerged as a promising framework to mitigate hallucinations in Large Language Models (LLMs), yet its overall performance is dependent on the underlying retrieval system. In the finance domain, documents such as 10-K reports pose distinct challenges due to domain-specific vocabulary and multi-hierarchical tabular data. In this work, we introduce an efficient, end-to-end RAG pipeline that enhances retrieval for financial documents through a three-phase approach: pre-retrieval, retrieval, and post-retrieval. In the pre-retrieval phase, various query and corpus preprocessing techniques are employed to enrich input data. During the retrieval phase, we fine-tuned state-of-the-art (SOTA) embedding models with domain-specific knowledge and implemented a hybrid retrieval strategy that combines dense and sparse representations. Finally, the post-retrieval phase leverages Direct Preference Optimization (DPO) training and document selection methods to further refine the results. Evaluations on seven financial question answering datasets-FinDER, FinQABench, FinanceBench, TATQA, FinQA, ConvFinQA, and MultiHiertt-demonstrate substantial improvements in retrieval performance, leading to more accurate and contextually appropriate generation. These findings highlight the critical role of tailored retrieval techniques in advancing the effectiveness of RAG systems for financial applications. A fully replicable pipeline is available on GitHub: [this https URL](https://github.com/seohyunwoo-0407/GAR).

| Comments: |  |
| --- | --- |
| Subjects: | Information Retrieval (cs.IR) |
| Cite as: | [arXiv:2503.15191](https://arxiv.org/abs/2503.15191) \[cs.IR\] |
|  | (or [arXiv:2503.15191v1](https://arxiv.org/abs/2503.15191v1) \[cs.IR\] for this version) |
|  | [https://doi.org/10.48550/arXiv.2503.15191](https://doi.org/10.48550/arXiv.2503.15191) |

## Submission history

From: Hyunjun Kim He \[[view email](https://arxiv.org/show-email/bcd5455d/2503.15191)\]  
**\[v1\]** Wed, 19 Mar 2025 13:21:49 UTC (283 KB)

[Which authors of this paper are endorsers?](https://arxiv.org/auth/show-endorsers/2503.15191) | Disable MathJax ([What is MathJax?](https://info.arxiv.org/help/mathjax.html))