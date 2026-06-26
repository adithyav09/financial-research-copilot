import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, MessageSquare } from "lucide-react";
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

  return (
    <div className="flex-1 flex flex-col bg-surface">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-12 h-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-300">
              {!ticker
                ? "Enter a ticker to get started"
                : !isIngested
                ? `Ingest ${ticker}'s 10-K to begin`
                : `Ask questions about ${ticker}'s 10-K`}
            </h3>
            <p className="text-sm text-gray-500 mt-2 max-w-md">
              {isIngested
                ? "Switch between Value and Growth mode to change the analysis perspective."
                : "Click \"Ingest Latest 10-K\" in the sidebar to process the filing."}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-accent/20 text-white"
                  : "bg-surface-secondary border border-border text-gray-200"
              }`}
            >
              {msg.role === "assistant" && msg.mode && (
                <span className="inline-block text-xs font-medium text-accent mb-1.5 uppercase">
                  {msg.mode} mode
                </span>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.role === "assistant" && msg.citations?.length
                  ? renderAnswerWithCitations(msg.content, msg.citations, msg.id)
                  : msg.content}
              </p>

              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.citations.map((citation, i) => (
                    <div key={i} id={`citation-${msg.id}-${i}`}>
                      <CitationCard citation={citation} index={i} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface-secondary border border-border rounded-xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-border p-4 bg-surface-secondary"
      >
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            placeholder={
              !ticker
                ? "Enter a ticker first..."
                : !isIngested
                ? "Ingest a 10-K first..."
                : `Ask about ${ticker}'s filing...`
            }
            disabled={!ticker || !isIngested}
            className="flex-1 px-4 py-2.5 bg-surface rounded-lg border border-border text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !ticker || !isIngested}
            className="p-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
