---
type: technique
title: "Financial Document Chunking"
aliases: [chunking, structural chunking, element-type chunking, contextual-chunks]
status: draft
sources: ["[[src-financial-report-chunking]]", "[[src-metadata-driven-financial-rag]]"]
updated: 2026-08-20
---

How a filing is split into retrievable units — a pre-retrieval step in the [[three-phase-rag-pipeline]] and, per the literature, one of the highest-leverage choices in financial [[financial-document-qa|RAG]].

## Structural / element-type chunking
"Chunking information is a key step in RAG," yet current research "primarily centers on paragraph-level chunking," which "treats all texts as equal and neglects the information contained in the structure of documents" ([[src-financial-report-chunking]]). The alternative is to chunk "primarily by structural element components of documents," with element types annotated by **document-understanding models** ([[src-financial-report-chunking]]). This "yields the best chunk size without tuning" and "element type based chunking largely improve[s] RAG results on financial reporting" ([[src-financial-report-chunking]]).

## Contextual chunks
A complementary idea from the metadata work: embed chunk metadata **directly with the text** ("contextual chunks"). Across the benchmarked enhancements, "the most significant performance gains come from embedding chunk metadata directly with text" ([[src-metadata-driven-financial-rag]]) — see [[metadata-driven-rag]].

## Synthesis
Both papers point the same way: **preserve and inject structure at index time.** For 10-K/10-Q filings, the item/section/table hierarchy and metadata carry meaning that flat paragraph chunking discards — a direct, testable upgrade to this repo's current text-chunking step.
Draws on: [[src-financial-report-chunking]], [[src-metadata-driven-financial-rag]].

## See also
[[metadata-driven-rag]] · [[multimodal-financial-rag]] · [[three-phase-rag-pipeline]]