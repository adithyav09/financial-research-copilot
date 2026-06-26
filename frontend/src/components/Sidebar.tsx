import { Loader2, CheckCircle2, AlertCircle, Clock, RefreshCw } from "lucide-react";
import type { MarketData } from "../types";
import MarketDataPanel from "./MarketDataPanel";
import TickerAutocomplete from "./TickerAutocomplete";

type IngestPhase = "idle" | "checking" | "ingesting" | "polling" | "ready" | "error";

interface SidebarProps {
  ticker: string;
  onTickerChange: (ticker: string) => void;
  ingestPhase: IngestPhase;
  ingestMessage: string | null;
  marketData?: MarketData | null;
  staleInfo?: { ingestedYear: number; latestYear: number } | null;
  onReIngest?: () => void;
}

export default function Sidebar({
  ticker,
  onTickerChange,
  ingestPhase,
  ingestMessage,
  marketData,
  staleInfo,
  onReIngest,
}: SidebarProps) {
  return (
    <aside className="w-72 border-r border-border bg-surface-secondary flex flex-col shrink-0">
      <div className="flex-1 overflow-y-auto">

        {/* Filing Loader */}
        <div className="p-4 border-b border-border space-y-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
            Company
          </p>
          <TickerAutocomplete
            value={ticker}
            onChange={(t) => onTickerChange(t)}
          />
          {ingestPhase === "idle" && ticker && (
            <p className="text-[11px] text-gray-500">Ask a question to load the 10-K automatically.</p>
          )}
          {(ingestPhase === "checking" || ingestPhase === "ingesting" || ingestPhase === "polling") && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs border bg-blue-500/5 border-blue-500/20 text-blue-300">
              <Loader2 className="w-3.5 h-3.5 mt-0.5 shrink-0 animate-spin" />
              <span className="leading-relaxed">{ingestMessage ?? "Loading filing…"}</span>
            </div>
          )}
          {ingestPhase === "ready" && ingestMessage && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs border bg-emerald-500/5 border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="leading-relaxed">{ingestMessage}</span>
            </div>
          )}
          {staleInfo && ingestPhase === "ready" && (
            <div className="flex flex-col gap-2 rounded-lg px-3 py-2.5 text-xs border bg-amber-500/5 border-amber-500/20 text-amber-300">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
                <span className="leading-relaxed">
                  You're using the <strong>{staleInfo.ingestedYear}</strong> 10-K. A newer <strong>{staleInfo.latestYear}</strong> filing is available on SEC EDGAR.
                </span>
              </div>
              <button
                onClick={onReIngest}
                className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-medium transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                Re-ingest {staleInfo.latestYear} filing
              </button>
            </div>
          )}
          {ingestPhase === "error" && ingestMessage && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs border bg-red-500/5 border-red-500/20 text-red-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="leading-relaxed">{ingestMessage}</span>
            </div>
          )}
          {ingestPhase === "polling" && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <Clock className="w-3 h-3" />
              <span>Polling for completion…</span>
            </div>
          )}
        </div>

        {/* Market Data */}
        {marketData && <MarketDataPanel data={marketData} />}

      </div>

      <div className="p-3 border-t border-border">
        <p className="text-[10px] text-gray-600 text-center">
          LangChain · ChromaDB · OpenAI · SEC EDGAR
        </p>
      </div>
    </aside>
  );
}
