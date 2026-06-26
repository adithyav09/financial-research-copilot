import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, BarChart2, User, MessageSquare, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { ChatMessage, Citation } from "../types";

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
        className={`inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold border transition-colors cursor-pointer leading-none ${
          open
            ? "bg-accent text-white border-accent"
            : "bg-accent/25 text-accent hover:bg-accent/45 border-accent/30"
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

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  isLoading: boolean;
  ticker: string;
  isIngested: boolean;
}

export default function ChatPanel({ messages, onSend, isLoading, ticker, isIngested }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
  };

  const modeLabels: Record<string, string> = {
    value: "Value", growth: "Growth", income: "Income",
    quality: "Quality", risk_averse: "Risk-Averse", esg: "ESG", activist: "Activist"
  };

  return (
    <div className="flex-1 flex flex-col bg-surface min-w-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-surface-secondary border border-border flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-gray-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-200">
                {!ticker ? "Select a company to begin"
                  : !isIngested ? `Load ${ticker}'s 10-K filing`
                  : `Analyze ${ticker}`}
              </h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                {isIngested
                  ? "Ask about revenue, risks, strategy, or any detail from the filing."
                  : !ticker ? "Enter a ticker in the sidebar, then load the latest 10-K."
                  : `Click "Load Latest 10-K" in the sidebar to process the filing.`}
              </p>
            </div>
            {isIngested && (
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {["What was revenue growth?", "What are the main risk factors?", "How is the balance sheet?"].map(q => (
                  <button key={q} onClick={() => onSend(q)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-accent/50 text-gray-400 hover:text-gray-200 transition-all bg-surface-secondary">
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 mt-1">
                <BarChart2 className="w-3.5 h-3.5 text-accent" />
              </div>
            )}
            <div className={`max-w-[78%] space-y-2 ${
              msg.role === "user" ? "items-end" : "items-start"
            } flex flex-col`}>
              {msg.role === "assistant" && msg.mode && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 uppercase tracking-wider">
                  {modeLabels[msg.mode] ?? msg.mode} Analysis
                </span>
              )}
              <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-accent/15 border border-accent/25 text-gray-100"
                  : "bg-surface-secondary border border-border text-gray-200"
              }`}>
                {msg.role === "assistant"
                  ? (msg.citations?.length
                      ? renderAnswerWithCitations(msg.content, msg.citations)
                      : <ReactMarkdown components={makeMarkdownComponents([]) as never}>{msg.content}</ReactMarkdown>)
                  : <p className="whitespace-pre-wrap">{msg.content}</p>}
              </div>
              <span className="text-[10px] text-gray-600 px-1">
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-lg bg-surface-tertiary border border-border flex items-center justify-center shrink-0 mt-1">
                <User className="w-3.5 h-3.5 text-gray-400" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
              <BarChart2 className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="bg-surface-secondary border border-border rounded-xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
              <span className="text-xs text-gray-500">Analyzing filing…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border p-4 bg-surface-secondary">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            placeholder={
              !ticker ? "Enter a ticker in the sidebar first…"
                : !isIngested ? `Load ${ticker}'s 10-K to start asking questions…`
                : `Ask anything about ${ticker}'s filing…`
            }
            disabled={!ticker || !isIngested}
            className="flex-1 px-4 py-2.5 bg-surface rounded-lg border border-border text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !ticker || !isIngested}
            className="p-2.5 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all active:scale-95 shadow-md shadow-accent/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {isIngested && (
          <p className="text-[10px] text-gray-600 mt-2 text-center">
            Responses are based solely on SEC filings · Not investment advice
          </p>
        )}
      </form>
    </div>
  );
}
