import { useState, useEffect, useRef, useCallback } from "react";
import { X, FileText, ExternalLink, Loader2, Copy, Check, MessageSquarePlus, ChevronLeft, ChevronRight } from "lucide-react";
import type { Citation, FilingPassageResponse } from "../types";
import { api } from "../api/client";

interface Props {
  ticker: string;
  companyName?: string | null;
  /** The citation being read. Must have chunk_index set. */
  citation: Citation;
  citationNumber: number;
  /** All filing citations of the same answer, for ‹ › navigation. */
  filingCitations: { citation: Citation; number: number }[];
  onNavigate: (citation: Citation, number: number) => void;
  onAskAboutPassage: (question: string) => void;
  onClose: () => void;
}

/**
 * Design 1c: the in-app filing viewer. Opens beside the chat when a citation
 * is clicked, scrolled to the cited passage with surrounding context, so
 * verifying a claim never means losing your place in the conversation.
 */
export default function FilingViewer({
  ticker, companyName, citation, citationNumber,
  filingCitations, onNavigate, onAskAboutPassage, onClose,
}: Props) {
  const [data, setData] = useState<FilingPassageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);

  const chunkIndex = citation.chunk_index;

  useEffect(() => {
    if (chunkIndex == null) return;
    setLoading(true);
    setError(null);
    api.filingPassage(ticker, chunkIndex, citation.filing_type ?? "10-K")
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Couldn't load the passage"))
      .finally(() => setLoading(false));
  }, [ticker, chunkIndex, citation.filing_type]);

  // Scroll the highlighted passage into view once loaded
  useEffect(() => {
    if (data) targetRef.current?.scrollIntoView({ block: "center" });
  }, [data]);

  // Esc closes — the panel is modal-ish but doesn't trap focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const pos = filingCitations.findIndex(fc => fc.number === citationNumber);
  const prev = pos > 0 ? filingCitations[pos - 1] : null;
  const next = pos >= 0 && pos < filingCitations.length - 1 ? filingCitations[pos + 1] : null;

  const copyQuote = useCallback(() => {
    const target = data?.passages.find(p => p.is_target);
    if (!target) return;
    navigator.clipboard.writeText(target.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [data]);

  const askAbout = () => {
    const target = data?.passages.find(p => p.is_target);
    if (!target) return;
    const snippet = target.content.replace(/\s+/g, " ").trim().slice(0, 160);
    onAskAboutPassage(`Explain the significance of this passage from the ${data?.filing_type}: "${snippet}…"`);
  };

  return (
    <div className="w-[520px] shrink-0 border-l border-rule bg-paper-raised flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-rule">
        <div className="flex gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-paper border border-rule flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-ink-soft" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink truncate">
              {companyName ?? ticker} — Form {data?.filing_type ?? citation.filing_type ?? "10-K"}
              {data?.filing_year ? ` · FY${data.filing_year}` : ""}
            </p>
            <p className="text-[11px] text-ink-soft truncate">
              {data?.filing_date ? `Filed ${data.filing_date} · ` : ""}SEC EDGAR
              {(data?.sec_url ?? citation.url) && (
                <>
                  {" · "}
                  <a
                    href={data?.sec_url ?? citation.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-ink hover:underline inline-flex items-center gap-0.5"
                  >
                    Open on SEC.gov <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </>
              )}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 text-ink-soft hover:text-ink transition-colors shrink-0" title="Close (esc)">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Cited-passage navigation */}
      {filingCitations.length > 1 && (
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-rule bg-accent-ink-soft">
          <span className="text-[11px] text-accent-ink">
            Cited passage <strong>{pos + 1} of {filingCitations.length}</strong> — supports source{" "}
            <span className="font-mono font-bold">[{citationNumber}]</span>
          </span>
          <div className="flex gap-1">
            <button
              disabled={!prev}
              onClick={() => prev && onNavigate(prev.citation, prev.number)}
              className="w-6 h-6 rounded-md border border-rule flex items-center justify-center text-ink-soft hover:text-ink hover:border-accent-ink disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              disabled={!next}
              onClick={() => next && onNavigate(next.citation, next.number)}
              className="w-6 h-6 rounded-md border border-accent-ink bg-accent-ink-soft flex items-center justify-center text-accent-ink hover:bg-accent-ink-soft disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-transparent disabled:border-rule disabled:text-ink-soft transition-all"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Passage body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 text-[13px] leading-[1.85] text-ink-soft">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-ink-faint" />
          </div>
        )}
        {error && (
          <p className="text-xs text-ledger-neg leading-relaxed">
            {error}. You can still{" "}
            {citation.url ? (
              <a href={citation.url} target="_blank" rel="noopener noreferrer" className="underline">read it on SEC.gov</a>
            ) : "try again later"}.
          </p>
        )}
        {data?.passages.map(p => (
          p.is_target ? (
            <div
              key={p.chunk_index}
              ref={targetRef}
              className="relative mb-3 px-3.5 py-2.5 border-l-[3px] text-ink"
              style={{ backgroundColor: "var(--hl)", borderLeftColor: "var(--hl-edge)" }}
            >
              <span className="absolute top-2 right-2.5 inline-flex items-center justify-center min-w-[17px] h-[17px] px-0.5 rounded bg-accent-ink text-paper text-[9px] font-bold">
                {citationNumber}
              </span>
              <p className="whitespace-pre-line">{p.content}</p>
            </div>
          ) : (
            <p key={p.chunk_index} className="mb-3 whitespace-pre-line">{p.content}</p>
          )
        ))}
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2 px-5 py-3 border-t border-rule">
        <button
          onClick={copyQuote}
          disabled={!data}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rule text-[11.5px] text-ink hover:border-accent-ink hover:text-ink disabled:opacity-40 transition-all"
        >
          {copied ? <Check className="w-3 h-3 text-ledger-pos" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy quote"}
        </button>
        <button
          onClick={askAbout}
          disabled={!data}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rule text-[11.5px] text-ink hover:border-accent-ink hover:text-ink disabled:opacity-40 transition-all"
        >
          <MessageSquarePlus className="w-3 h-3" />
          Ask about this passage
        </button>
        <span className="ml-auto text-[10.5px] text-ink-faint">esc closes</span>
      </div>
    </div>
  );
}
