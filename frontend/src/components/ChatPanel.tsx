import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, MessageSquare, ExternalLink, Building2, Pencil } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { ChatMessage, Citation, Depth, XBRLFinancials } from "../types";
import { api } from "../api/client";
import VisualizeBuilder from "./charts/VisualizeBuilder";
import TickerAutocomplete from "./TickerAutocomplete";
import ThesisMark from "./ThesisMark";

function buildHighlightUrl(baseUrl: string | undefined, text: string): string {
  if (!baseUrl) return "#";
  // Use a short verbatim phrase from the start of the chunk for reliable Text Fragment matching.
  // Strip markdown/special chars, take first ~8 words.
  const clean = text.replace(/[*_#>`\[\]]/g, "").replace(/\s+/g, " ").trim();
  const words = clean.split(" ").slice(0, 8).join(" ");
  return `${baseUrl}#:~:text=${encodeURIComponent(words)}`;
}

function CitationBadge({ num, citation }: { num: number; citation: Citation | undefined }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const open = pos !== null;

  const handleClick = () => {
    if (open) { setPos(null); return; }
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.top - 8, left: r.left + r.width / 2 });
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        popRef.current && !popRef.current.contains(e.target as Node)
      ) setPos(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const highlightUrl = citation ? buildHighlightUrl(citation.url, citation.text) : "#";

  return (
    <span className="relative inline-block mx-0.5 align-middle">
      <button
        ref={btnRef}
        onClick={handleClick}
        className={`inline-flex items-center justify-center min-w-4 h-4 px-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer leading-none ${
          open
            ? "bg-accent text-white border-accent"
            : "bg-accent/20 text-accent-hover hover:bg-accent/40 border-accent/35"
        }`}
      >
        {num}
      </button>

      {open && citation && pos && (
        <div
          ref={popRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, transform: "translate(-50%, -100%)", zIndex: 9999 }}
          className="w-80 rounded-xl border border-border bg-surface-secondary shadow-2xl shadow-black/70 text-left"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-border">
            <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">
              Source [{num}]
            </span>
            <a
              href={highlightUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-medium text-gray-300 hover:text-accent bg-surface px-2 py-1 rounded-md border border-border hover:border-accent/40 transition-all"
            >
              <ExternalLink className="w-3 h-3" />
              Open &amp; highlight in filing
            </a>
          </div>
          {/* Excerpt */}
          <div className="px-3 py-2.5">
            <p className="text-xs text-gray-300 leading-relaxed line-clamp-6">{citation.text}</p>
            <p className="text-[10px] text-gray-600 mt-2 truncate">{citation.source}</p>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-surface-secondary border-r border-b border-border rotate-45 -mt-[5px]" />
        </div>
      )}
    </span>
  );
}

function makeMarkdownComponents(citations: Citation[]) {
  return {
    h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-base font-bold text-white mt-4 mb-1.5">{children}</h1>,
    h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-sm font-semibold text-white mt-3 mb-1">{children}</h2>,
    h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-sm font-semibold text-gray-200 mt-2 mb-0.5">{children}</h3>,
    p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
    ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-outside ml-4 mb-2 space-y-0.5">{children}</ul>,
    ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-outside ml-4 mb-2 space-y-0.5">{children}</ol>,
    li: ({ children }: { children?: React.ReactNode }) => <li className="leading-relaxed">{children}</li>,
    strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-white">{children}</strong>,
    em: ({ children }: { children?: React.ReactNode }) => <em className="italic text-gray-300">{children}</em>,
    code: ({ children }: { children?: React.ReactNode }) => <code className="font-mono text-xs bg-surface px-1 py-0.5 rounded text-accent">{children}</code>,
    // Custom span handles our %%CIT_N%% placeholders
    span: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
      if (typeof className === "string" && className.startsWith("cit-")) {
        const num = parseInt(className.replace("cit-", ""));
        return <CitationBadge num={num} citation={citations[num - 1]} />;
      }
      return <span className={className}>{children}</span>;
    },
  };
}

// Sanitize schema: start from defaultSchema (allows standard markdown output elements),
// then additionally permit <span> tags but ONLY when the class matches our cit-N sentinel.
// All other HTML from the LLM (e.g. <script>, <img>, <a onclick=...>) is stripped.
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [
      [
        "className",
        // Only class values matching cit-<digits> are allowed through
        /^cit-\d+$/,
      ],
    ],
  },
  tagNames: [...(defaultSchema.tagNames ?? []), "span"],
};

function renderAnswerWithCitations(content: string, citations: Citation[]) {
  // Replace [N] markers with sentinel spans before markdown parsing.
  // rehype-raw re-parses the inline HTML; rehype-sanitize then strips
  // everything except our cit-N spans (and standard markdown output tags).
  const prepared = content.replace(/\[(\d+)\]/g, (_m, n) => `<span class="cit-${n}"></span>`);
  return (
    <ReactMarkdown
      components={makeMarkdownComponents(citations) as never}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
    >
      {prepared}
    </ReactMarkdown>
  );
}

type IngestPhase = "idle" | "checking" | "ingesting" | "polling" | "ready" | "error";

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
}

export default function ChatPanel({ messages, onSend, isLoading, ticker, companyName, onTickerChange, ingestPhase, depth, onDepthChange, xbrlData }: ChatPanelProps) {
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

        {messages.map((msg, msgIdx) => (
          msg.role === "user" ? (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[80%] rounded-[14px] px-4 py-3 text-sm leading-relaxed bg-accent/15 border border-accent/25 text-gray-100">
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ) : (
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

              <div className="rounded-xl border border-border bg-surface-secondary px-[18px] py-4 text-sm leading-[1.7] text-gray-300">
                {msg.citations?.length
                  ? renderAnswerWithCitations(msg.content, msg.citations)
                  : <ReactMarkdown components={makeMarkdownComponents([]) as never}>{msg.content}</ReactMarkdown>}
              </div>

              {/* Sources row — chips instead of a link list */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10.5px] font-semibold text-gray-500 uppercase tracking-wider mr-0.5">Sources</span>
                  {msg.citations.map((c, i) => (
                    <a
                      key={i}
                      href={c.url ? buildHighlightUrl(c.url, c.text) : "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-secondary border border-border text-[11px] text-gray-300 hover:border-accent/40 hover:text-white transition-all max-w-56"
                    >
                      <span className="font-mono font-bold text-accent-hover shrink-0">{i + 1}</span>
                      <span className="truncate">{c.source}</span>
                    </a>
                  ))}
                </div>
              )}

              {/* On-demand chart builder under the latest answer (no keyword guessing) */}
              {msgIdx === messages.length - 1 && xbrlData && (
                <VisualizeBuilder xbrl={xbrlData} ticker={ticker} />
              )}

              {/* Follow-up chips — only after last assistant message */}
              {msgIdx === messages.length - 1 && !isLoading && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {loadingSuggestions[msg.id] && (
                    <span className="text-[11px] text-gray-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Generating follow-ups…</span>
                  )}
                  {!suggestions[msg.id] && !loadingSuggestions[msg.id] && (
                    <button
                      onClick={() => fetchSuggestions(msg.id, msg.content)}
                      className="text-[11px] text-gray-500 hover:text-accent border border-border hover:border-accent/30 px-2.5 py-1 rounded-full transition-all"
                    >
                      + Suggest follow-ups
                    </button>
                  )}
                  {(suggestions[msg.id] ?? []).map(s => (
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
          )
        ))}

        {isLoading && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <ThesisMark size={22} />
              <span className="text-xs font-semibold text-gray-300">Thesis</span>
            </div>
            <div className="rounded-xl border border-border bg-surface-secondary px-4 py-3 flex items-center gap-2 self-start">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
              <span className="text-xs text-gray-500">Researching…</span>
            </div>
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
