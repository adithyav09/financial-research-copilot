import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, BarChart2, User, MessageSquare } from "lucide-react";
import type { ChatMessage, Citation } from "../types";
import CitationCard from "./CitationCard";

function renderAnswerWithCitations(content: string, citations: Citation[], msgId: string) {
  const parts = content.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      const num = parseInt(match[1]);
      const citation = citations[num - 1];
      const anchor = `citation-${msgId}-${num - 1}`;
      return (
        <a
          key={i}
          href={citation?.url || "#"}
          target={citation?.url ? "_blank" : "_self"}
          rel="noopener noreferrer"
          onClick={(e) => {
            if (!citation?.url) {
              e.preventDefault();
              document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
          }}
          className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold bg-accent/30 text-accent hover:bg-accent/50 transition-colors cursor-pointer mx-0.5 align-middle"
          title={citation ? citation.text.slice(0, 100) : ""}
        >
          {num}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
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
                <p className="whitespace-pre-wrap">
                  {msg.role === "assistant" && msg.citations?.length
                    ? renderAnswerWithCitations(msg.content, msg.citations, msg.id)
                    : msg.content}
                </p>
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border space-y-2">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Sources</p>
                    {msg.citations.map((citation, i) => (
                      <div key={i} id={`citation-${msg.id}-${i}`}>
                        <CitationCard citation={citation} index={i} />
                      </div>
                    ))}
                  </div>
                )}
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
