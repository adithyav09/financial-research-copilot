## Computer Science > Computation and Language

## Title:MultiFinRAG: An Optimized Multimodal Retrieval-Augmented Generation (RAG) Framework for Financial Question Answering

Authors:[Chinmay Gondhalekar](https://arxiv.org/search/cs?searchtype=author&query=Gondhalekar,+C), [Urjitkumar Patel](https://arxiv.org/search/cs?searchtype=author&query=Patel,+U), [Fang-Chun Yeh](https://arxiv.org/search/cs?searchtype=author&query=Yeh,+F)

[View PDF](https://arxiv.org/pdf/2506.20821) [HTML (experimental)](https://arxiv.org/html/2506.20821v1)

> Abstract:Financial documents--such as 10-Ks, 10-Qs, and investor presentations--span hundreds of pages and combine diverse modalities, including dense narrative text, structured tables, and complex figures. Answering questions over such content often requires joint reasoning across modalities, which strains traditional large language models (LLMs) and retrieval-augmented generation (RAG) pipelines due to token limitations, layout loss, and fragmented cross-modal context. We introduce MultiFinRAG, a retrieval-augmented generation framework purpose-built for financial QA. MultiFinRAG first performs multimodal extraction by grouping table and figure images into batches and sending them to a lightweight, quantized open-source multimodal LLM, which produces both structured JSON outputs and concise textual summaries. These outputs, along with narrative text, are embedded and indexed with modality-aware similarity thresholds for precise retrieval. A tiered fallback strategy then dynamically escalates from text-only to text+table+image contexts when necessary, enabling cross-modal reasoning while reducing irrelevant context. Despite running on commodity hardware, MultiFinRAG achieves 19 percentage points higher accuracy than ChatGPT-4o (free-tier) on complex financial QA tasks involving text, tables, images, and combined multimodal reasoning.

| Comments: |  |
| --- | --- |
| Subjects: | Computation and Language (cs.CL); Artificial Intelligence (cs.AI); Computational Engineering, Finance, and Science (cs.CE) |
| MSC classes: | 68T50, 68T07 (Primary) 68P20, 91G15, 91G70, 68U10 (Secondary) |
| ACM classes: | I.2.7; I.2.10; H.3.3; H.2.8; I.5.4; J.1 |
| Cite as: | [arXiv:2506.20821](https://arxiv.org/abs/2506.20821) \[cs.CL\] |
|  | (or [arXiv:2506.20821v1](https://arxiv.org/abs/2506.20821v1) \[cs.CL\] for this version) |
|  | [https://doi.org/10.48550/arXiv.2506.20821](https://doi.org/10.48550/arXiv.2506.20821) |
| Journal reference: | 2025 IEEE International Conference on Big Data (BigData), Macau, China |
| Related DOI: | [https://doi.org/10.1109/BigData66926.2025.11401444](https://doi.org/10.1109/BigData66926.2025.11401444) |

## Submission history

From: Urjitkumar Patel \[[view email](https://arxiv.org/show-email/9e4dbab0/2506.20821)\]  
**\[v1\]** Wed, 25 Jun 2025 20:37:20 UTC (2,203 KB)

[Which authors of this paper are endorsers?](https://arxiv.org/auth/show-endorsers/2506.20821) | Disable MathJax ([What is MathJax?](https://info.arxiv.org/help/mathjax.html))