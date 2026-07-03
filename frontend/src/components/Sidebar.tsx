import { Loader2, CheckCircle2, AlertCircle, RefreshCw, Building2 } from "lucide-react";
import type { MarketData } from "../types";
import MarketDataPanel from "./MarketDataPanel";

type IngestPhase = "idle" | "checking" | "ingesting" | "polling" | "ready" | "error";

interface SidebarProps {
  ticker: string;
  ingestPhase: IngestPhase;
  ingestMessage: string | null;
  marketData?: MarketData | null;
  staleInfo?: { ingestedYear: number; latestYear: number } | null;
  onReIngest?: () => void;
}

export default function Sidebar({
  ticker,
  ingestPhase,
  ingestMessage,
  marketData,
  staleInfo,
  onReIngest,
}: SidebarProps) {
  const isLoading = ingestPhase === "checking" || ingestPhase === "ingesting" || ingestPhase === "polling";

  return (
    <aside className="w-72 border-r border-border bg-surface-secondary flex flex-col shrink-0">
      <div className="flex-1 overflow-y-auto">

        {/* Selected company (read-only — companies are chosen in the chat composer) */}
        <div className="p-4 border-b border-border space-y-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
            Company
          </p>
          {ticker ? (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold text-white leading-tight">{ticker}</p>
                {marketData?.company_name && (
                  <p className="text-[11px] text-gray-400 truncate">{marketData.company_name}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-gray-500">Search a company in the chat box to begin.</p>
          )}

          {isLoading && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs border bg-blue-500/5 border-blue-500/20 text-blue-300">
              <Loader2 className="w-3.5 h-3.5 mt-0.5 shrink-0 animate-spin" />
              <span className="leading-relaxed">{ingestMessage ?? "Loading the annual report…"}</span>
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
                  You're reading the <strong>{staleInfo.ingestedYear}</strong> annual report. A newer <strong>{staleInfo.latestYear}</strong> filing is now available.
                </span>
              </div>
              <button
                onClick={onReIngest}
                className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-medium transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                Load the {staleInfo.latestYear} report
              </button>
            </div>
          )}
          {ingestPhase === "error" && ingestMessage && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs border bg-red-500/5 border-red-500/20 text-red-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="leading-relaxed">{ingestMessage}</span>
            </div>
          )}
        </div>

        {/* Market Data */}
        {marketData && <MarketDataPanel data={marketData} />}

      </div>
    </aside>
  );
}
