import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, MessageSquare, Building2, Pencil, CheckCircle2, AlertCircle } from "lucide-react";
import type { EngineState } from "../App";
import type { ChatMessage, Citation, Depth, XBRLFinancials } from "../types";
import { api } from "../api/client";
import VisualizeBuilder from "./charts/VisualizeBuilder";
import TickerAutocomplete from "./TickerAutocomplete";
import ThesisMark from "./ThesisMark";
import AnswerMarkdown, { buildHighlightUrl } from "./AnswerMarkdown";
import StructuredAnswerView from "./StructuredAnswerView";

type IngestPhase = "idle" | "checking" | "ingesting" | "polling" | "ready" | "error";

export interface CitationRef {
  citation: Citation;
  number: number;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  isLoading: boolean;
  ticker: string;
  companyName?: string | null;
  onTickerChange: (ticker: string, companyName?: string) => void;
  ingestPhase: IngestPhase;
  depth: Depth;
  onDepthChange: (depth: Depth) => void;
  xbrlData?: XBRLFinancials | null;
  /** Opens the in-app filing viewer on a cited passage (design 1c). */
  onOpenCitation?: (ref: CitationRef, filingCitations: CitationRef[]) => void;
  engine?: EngineState;
}

/** Design 1j state 1: warm-up card shown while free hosting wakes up. */
function EngineWakingBanner({ engine }: { engine: EngineState }) {
  if (engine.status === "offline") {
    return (
      <div className="rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 flex items-center gap-3">
        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold text-gray-200">The research engine isn't responding</p>
          <p className="text-[11px] text-gray-500">Try refreshing in a minute — free hosting sometimes takes a while to wake.</p>
        </div>
      </div>
    );
  }
  // Design shows ~25s as the typical wake; cap the bar short of full so it
  // never claims "done" before the health check actually succeeds.
  const pct = Math.min(95, (engine.elapsed / 25) * 100);
  return (
    <div className="rounded-xl border border-border bg-surface-secondary px-4 py-3 flex items-center gap-3">
      <Loader2 className="w-4 h-4 text-accent-hover animate-spin shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold text-gray-200">Starting the research engine…</p>
        <p className="text-[11px] text-gray-500">
          Free hosting naps between visits — usually ready in ~25s. You can type now; your question sends the moment it wakes.
        </p>
      </div>
      <div className="w-[120px] shrink-0">
        <div className="h-1 rounded-full bg-surface-tertiary overflow-hidden">
          <div className="h-full rounded-full bg-accent transition-all duration-1000" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 font-mono text-[10px] text-gray-600 text-right">{engine.elapsed}s</p>
      </div>
    </div>
  );
}

/** Design 1j state 2: staged first-ingest progress instead of a spinner. */
function IngestStages({ ticker, companyName, phase }: { ticker: string; companyName?: string | null; phase: IngestPhase }) {
  const stages = [
    { label: "Engine awake", state: "done" },
    {
      label: `Finding ${companyName ?? ticker}'s latest filings on SEC EDGAR`,
      state: phase === "ingesting" ? "active" : "done",
    },
    {
      label: "Reading & indexing the filing",
      state: phase === "polling" ? "active" : "pending",
    },
    { label: "Writing your answer with citations", state: "pending" },
  ] as const;

  return (
    <div className="rounded-xl border border-border bg-surface-secondary px-[18px] py-4 max-w-[560px]">
      <div className="flex flex-col gap-2.5">
        {stages.map(s => (
          <div key={s.label} className="flex items-center gap-2.5">
            {s.state === "done" && <CheckCircle2 className="w-[13px] h-[13px] text-emerald-400 shrink-0" />}
            {s.state === "active" && <Loader2 className="w-[13px] h-[13px] text-accent-hover animate-spin shrink-0" />}
            {s.state === "pending" && <span className="w-[13px] h-[13px] rounded-full border border-dashed border-gray-700 shrink-0" />}
            <span className={`text-[12.5px] ${s.state === "active" ? "text-gray-200" : s.state === "done" ? "text-gray-400" : "text-gray-600"}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 pt-2.5 border-t border-border/60 text-[11px] text-gray-600 leading-relaxed">
        The first question on a company takes ~30s while the filing is indexed. After that,
        answers on {ticker} are near-instant — the index is cached.
      </p>
    </div>
  );
}

export default function ChatPanel({ messages, onSend, isLoading, ticker, companyName, onTickerChange, ingestPhase, depth, onDepthChange, xbrlData, onOpenCitation, engine }: ChatPanelProps) {
  const isIngested = ingestPhase === "ready";
  const isBusy = ingestPhase === "checking" || ingestPhase === "ingesting" || ingestPhase === "polling";
  const [input, setInput] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState<Record<string, boolean>>({});

  const selectCompany = (t: string, name?: string) => {
    onTickerChange(t, name);
    setPickerOpen(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // On-demand follow-ups — only used for answers that arrived without
  // structured follow_ups (fallback / restored-history messages).
  const fetchSuggestions = useCallback(async (msgId: string, answer: string) => {
    if (!ticker || suggestions[msgId]) return;
    setLoadingSuggestions(prev => ({ ...prev, [msgId]: true }));
    try {
      const res = await api.suggestions({ ticker, previous_answer: answer, mode: depth });
      setSuggestions(prev => ({ ...prev, [msgId]: res.suggestions }));
    } catch {
      setSuggestions(prev => ({ ...prev, [msgId]: [] }));
    } finally {
      setLoadingSuggestions(prev => ({ ...prev, [msgId]: false }));
    }
  }, [ticker, depth, suggestions]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
  };

  const depthLabel = depth === "simple" ? "Simple" : "Analyst";

  return (
    <div className="flex-1 flex flex-col bg-surface min-w-0">
      {/* Messages — one centered research column, like a note you're reading */}
      <div className="flex-1 overflow-y-auto px-8 py-7">
        <div className="max-w-[780px] mx-auto space-y-6">
        {engine && engine.status !== "ready" && <EngineWakingBanner engine={engine} />}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-surface-secondary border border-border flex items-center justify-center">
              {ticker ? <Building2 className="w-6 h-6 text-accent" /> : <MessageSquare className="w-6 h-6 text-gray-500" />}
            </div>
            {!ticker ? (
              <>
                <div>
                  <h3 className="text-base font-semibold text-gray-200">Ask about any public company</h3>
                  <p className="text-sm text-gray-500 mt-1 max-w-sm">
                    Search a company or ticker to begin — filings load automatically the first time you ask.
                  </p>
                </div>
                <div className="w-full max-w-sm">
                  <TickerAutocomplete value="" onChange={selectCompany} autoFocus size="lg" />
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                  {[["AAPL", "Apple"], ["MSFT", "Microsoft"], ["NVDA", "NVIDIA"], ["AMZN", "Amazon"]].map(([t, name]) => (
                    <button key={t} onClick={() => selectCompany(t, name)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-accent/50 text-gray-400 hover:text-gray-200 transition-all bg-surface-secondary">
                      {name}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-base font-semibold text-gray-200">
                    {isBusy ? `Loading ${companyName ?? ticker}…` : `Research ${companyName ?? ticker}`}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 max-w-sm">
                    Ask about revenue, risks, strategy, valuation, or the latest news.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                  {["What was revenue growth?", "What are the main risk factors?", "What's the latest news?"].map(q => (
                    <button key={q} onClick={() => onSend(q)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-accent/50 text-gray-400 hover:text-gray-200 transition-all bg-surface-secondary">
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {messages.map((msg, msgIdx) => {
          if (msg.role === "user") {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-[14px] px-4 py-3 text-sm leading-relaxed bg-accent/15 border border-accent/25 text-gray-100">
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          }

          const followUps = msg.structured?.follow_ups ?? suggestions[msg.id] ?? null;
          const isLast = msgIdx === messages.length - 1;

          // Citations that can open in the in-app viewer (have a chunk on file)
          const filingCitations: CitationRef[] = (msg.citations ?? [])
            .map((citation, i) => ({ citation, number: i + 1 }))
            .filter(ref => ref.citation.chunk_index != null);
          const handleCitationClick = onOpenCitation
            ? (num: number, citation: Citation) =>
                onOpenCitation({ citation, number: num }, filingCitations)
            : undefined;

          return (
            <div key={msg.id} className="flex flex-col gap-2.5">
              {/* Answer header: brand + depth + grounding meta */}
              <div className="flex items-center gap-2">
                <ThesisMark size={22} />
                <span className="text-xs font-semibold text-gray-300">Thesis</span>
                <span className="text-[11px] text-gray-600">
                  · {depthLabel} depth
                  {msg.citations?.length ? " · grounded in filings + live data" : " · live data"}
                </span>
              </div>

              {msg.structured ? (
                <StructuredAnswerView
                  structured={msg.structured}
                  citations={msg.citations ?? []}
                  xbrlData={xbrlData}
                  onCitationClick={handleCitationClick}
                />
              ) : (
                <div className="rounded-xl border border-border bg-surface-secondary px-[18px] py-4 text-sm leading-[1.7] text-gray-300">
                  <AnswerMarkdown content={msg.content} citations={msg.citations ?? []} onCitationClick={handleCitationClick} />
                </div>
              )}

              {/* Sources row — chips instead of a link list */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10.5px] font-semibold text-gray-500 uppercase tracking-wider mr-0.5">Sources</span>
                  {msg.citations.map((c, i) => {
                    const chipClass = "flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-secondary border border-border text-[11px] text-gray-300 hover:border-accent/40 hover:text-white transition-all max-w-56";
                    // Filing sources open in-app; live sources (news, quotes) link out
                    return c.chunk_index != null && handleCitationClick ? (
                      <button key={i} onClick={() => handleCitationClick(i + 1, c)} className={chipClass}>
                        <span className="font-mono font-bold text-accent-hover shrink-0">{i + 1}</span>
                        <span className="truncate">{c.source}</span>
                      </button>
                    ) : (
                      <a
                        key={i}
                        href={c.url ? buildHighlightUrl(c.url, c.text) : "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={chipClass}
                      >
                        <span className="font-mono font-bold text-accent-hover shrink-0">{i + 1}</span>
                        <span className="truncate">{c.source}</span>
                      </a>
                    );
                  })}
                  <span className="text-[10.5px] text-gray-600 ml-1">Click a filing source to read the passage here</span>
                </div>
              )}

              {/* On-demand chart builder under the latest answer (no keyword guessing) */}
              {isLast && xbrlData && (
                <VisualizeBuilder xbrl={xbrlData} ticker={ticker} />
              )}

              {/* Follow-up chips — structured answers carry their own; others can fetch */}
              {isLast && !isLoading && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {loadingSuggestions[msg.id] && (
                    <span className="text-[11px] text-gray-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Generating follow-ups…</span>
                  )}
                  {!followUps && !loadingSuggestions[msg.id] && (
                    <button
                      onClick={() => fetchSuggestions(msg.id, msg.content)}
                      className="text-[11px] text-gray-500 hover:text-accent border border-border hover:border-accent/30 px-2.5 py-1 rounded-full transition-all"
                    >
                      + Suggest follow-ups
                    </button>
                  )}
                  {(followUps ?? []).map(s => (
                    <button
                      key={s}
                      onClick={() => onSend(s)}
                      className="text-[11.5px] text-gray-300 hover:text-white bg-surface-secondary hover:bg-surface-tertiary border border-border hover:border-accent/30 px-3.5 py-[7px] rounded-full transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <ThesisMark size={22} />
              <span className="text-xs font-semibold text-gray-300">Thesis</span>
            </div>
            {/* First ingest gets the staged checklist (design 1j); ordinary
                queries keep the lightweight researching card */}
            {ingestPhase === "ingesting" || ingestPhase === "polling" ? (
              <IngestStages ticker={ticker} companyName={companyName} phase={ingestPhase} />
            ) : (
              <div className="rounded-xl border border-border bg-surface-secondary px-4 py-3 flex items-center gap-2 self-start">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                <span className="text-xs text-gray-500">Researching…</span>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Composer — ticker + depth controls live inside the input card */}
      <form onSubmit={handleSubmit} className="border-t border-border px-8 pt-3.5 pb-3 bg-surface flex flex-col items-center">
        <div className="w-full max-w-[780px] rounded-[14px] border border-border bg-surface-secondary p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            {/* Company pill */}
            {ticker && !pickerOpen ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/25 text-xs min-w-0">
                  <span className="font-mono font-semibold text-accent">{ticker}</span>
                  {companyName && <span className="text-gray-300 truncate">{companyName}</span>}
                </span>
                <button type="button" onClick={() => setPickerOpen(true)}
                  className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-accent transition-colors shrink-0">
                  <Pencil className="w-3 h-3" /> Change
                </button>
              </div>
            ) : (
              <div className="w-full max-w-xs">
                <TickerAutocomplete value={pickerOpen ? "" : ticker} onChange={selectCompany} autoFocus={pickerOpen} />
              </div>
            )}

            {/* Depth toggle — replaces the 7 analysis-mode pills */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10.5px] text-gray-500">Depth</span>
              <div className="flex border border-border rounded-full p-0.5 bg-surface">
                {(["simple", "analyst"] as Depth[]).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onDepthChange(d)}
                    title={d === "simple" ? "Defines jargon inline — for people learning to read filings" : "Professional register — assumes financial fluency"}
                    className={`px-3 py-1 rounded-full text-[11px] transition-all ${
                      depth === d
                        ? "font-semibold text-accent-hover bg-accent/15 border border-accent/30"
                        : "font-medium text-gray-500 hover:text-gray-300 border border-transparent"
                    }`}
                  >
                    {d === "simple" ? "Simple" : "Analyst"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Text input row */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              placeholder={
                !ticker ? "Pick a company above to start…"
                  : engine?.status === "waking" ? "Engine waking… your question sends the moment it's ready"
                  : isBusy ? `Loading ${companyName ?? ticker}… your question will send automatically`
                  : messages.length ? `Ask a follow-up about ${companyName ?? ticker}…`
                  : `Ask anything about ${companyName ?? ticker}…`
              }
              disabled={!ticker || isLoading}
              className="flex-1 px-3 py-2 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || !ticker}
              className="p-2.5 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed rounded-[9px] transition-all active:scale-95"
            >
              {isLoading && !isIngested ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
        <p className="mt-2 text-[10.5px] text-gray-600 text-center">
          Answers cite SEC filings · Can make mistakes — check the sources · Not investment advice
        </p>
      </form>
    </div>
  );
}
