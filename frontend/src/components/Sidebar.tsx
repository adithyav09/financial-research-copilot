import { Database, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { AnalysisMode } from "../types";
import ModeSelector from "./ModeSelector";

interface SidebarProps {
  ticker: string;
  onTickerChange: (ticker: string) => void;
  onIngest: () => void;
  isIngesting: boolean;
  ingestStatus: "idle" | "success" | "error";
  ingestMessage: string | null;
  mode: AnalysisMode;
  onModeChange: (mode: AnalysisMode) => void;
}

export default function Sidebar({
  ticker,
  onTickerChange,
  onIngest,
  isIngesting,
  ingestStatus,
  ingestMessage,
  mode,
  onModeChange,
}: SidebarProps) {
  return (
    <aside className="w-72 border-r border-border bg-surface-secondary flex flex-col">
      <div className="p-4 space-y-6 flex-1">
        {/* Ticker Input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Company Ticker
          </label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => onTickerChange(e.target.value.toUpperCase())}
            placeholder="e.g. AAPL"
            className="w-full px-3 py-2 bg-surface rounded-lg border border-border text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Ingest Button */}
        <button
          onClick={onIngest}
          disabled={!ticker.trim() || isIngesting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
        >
          {isIngesting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Database className="w-4 h-4" />
          )}
          {isIngesting ? "Ingesting..." : "Ingest Latest 10-K"}
        </button>

        {ingestMessage && (
          <div
            className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
              ingestStatus === "success"
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {ingestStatus === "success" ? (
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            )}
            <span>{ingestMessage}</span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Mode Selector */}
        <ModeSelector mode={mode} onChange={onModeChange} />
      </div>

      <div className="p-4 border-t border-border">
        <p className="text-xs text-gray-500 text-center">
          Powered by LangChain + ChromaDB
        </p>
      </div>
    </aside>
  );
}
