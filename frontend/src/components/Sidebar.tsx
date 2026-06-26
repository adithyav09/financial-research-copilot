import { Search, Loader2, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import type { AnalysisMode, MarketData } from "../types";
import ModeSelector from "./ModeSelector";
import MarketDataPanel from "./MarketDataPanel";

interface SidebarProps {
  ticker: string;
  onTickerChange: (ticker: string) => void;
  onIngest: () => void;
  isIngesting: boolean;
  ingestStatus: "idle" | "success" | "error";
  ingestMessage: string | null;
  mode: AnalysisMode;
  onModeChange: (mode: AnalysisMode) => void;
  marketData?: MarketData | null;
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
  marketData,
}: SidebarProps) {
  return (
    <aside className="w-72 border-r border-border bg-surface-secondary flex flex-col shrink-0">
      <div className="flex-1 overflow-y-auto">

        {/* Filing Loader */}
        <div className="p-4 border-b border-border space-y-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
            Load Filing
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={ticker}
              onChange={(e) => onTickerChange(e.target.value.toUpperCase())}
              placeholder="Ticker — AAPL, MSFT, MU…"
              maxLength={10}
              className="w-full pl-8 pr-3 py-2 bg-surface rounded-lg border border-border text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all font-mono tracking-wider"
            />
          </div>
          <button
            onClick={onIngest}
            disabled={!ticker.trim() || isIngesting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all bg-accent hover:bg-accent-hover active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-accent/10"
          >
            {isIngesting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span>Fetching from SEC…</span></>
            ) : (
              <><FileText className="w-4 h-4" /><span>Load Latest 10-K</span></>
            )}
          </button>
          {ingestMessage && (
            <div className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs border ${
              ingestStatus === "success"
                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/5 border-red-500/20 text-red-400"
            }`}>
              {ingestStatus === "success"
                ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                : <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
              <span className="leading-relaxed">{ingestMessage}</span>
            </div>
          )}
        </div>

        {/* Market Data */}
        {marketData && <MarketDataPanel data={marketData} />}

        {/* Analyst Lens */}
        <div className="p-4 space-y-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
            Analyst Lens
          </p>
          <ModeSelector mode={mode} onChange={onModeChange} />
        </div>
      </div>

      <div className="p-3 border-t border-border">
        <p className="text-[10px] text-gray-600 text-center">
          LangChain · ChromaDB · OpenAI · SEC EDGAR
        </p>
      </div>
    </aside>
  );
}
