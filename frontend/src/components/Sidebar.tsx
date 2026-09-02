import { Loader2, CheckCircle2, AlertCircle, RefreshCw, FileText, TrendingUp, TrendingDown } from "lucide-react";
import type { MarketData, StatusResponse } from "../types";

type IngestPhase = "idle" | "checking" | "ingesting" | "polling" | "ready" | "error";

interface SidebarProps {
  ticker: string;
  ingestPhase: IngestPhase;
  ingestMessage: string | null;
  marketData?: MarketData | null;
  filingStatus?: StatusResponse | null;
  staleInfo?: { ingestedYear: number; latestYear: number } | null;
  onReIngest?: () => void;
  /** "This session" stats — computed from the live chat, not persisted. */
  sessionStats?: { questions: number; citations: number };
}

function fmtCap(v?: number): string | null {
  if (!v) return null;
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  return `$${(v / 1e6).toFixed(0)}M`;
}

/** 6-month closing-price sparkline with area fill, green/red by direction. */
function PriceSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 246, h = 44, pad = 2;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const rising = values[values.length - 1] >= values[0];
  const color = rising ? "#34d399" : "#f87171";
  const fill = rising ? "rgba(52,211,153,.07)" : "rgba(248,113,113,.07)";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-2 block max-w-full">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" />
      <polyline points={`${pts.join(" ")} ${w - pad},${h} ${pad},${h}`} fill={fill} stroke="none" />
    </svg>
  );
}

export default function Sidebar({
  ticker,
  ingestPhase,
  ingestMessage,
  marketData,
  filingStatus,
  staleInfo,
  onReIngest,
  sessionStats,
}: SidebarProps) {
  const isLoading = ingestPhase === "checking" || ingestPhase === "ingesting" || ingestPhase === "polling";
  const m = marketData;
  const change = m?.day_change_percent;

  const keyFigures: [string, string | null][] = m ? [
    ["Mkt cap", fmtCap(m.market_cap)],
    ["P/E", m.pe_ratio ? m.pe_ratio.toFixed(1) : null],
    ["Fwd P/E", m.forward_pe ? m.forward_pe.toFixed(1) : null],
    ["Beta", m.beta ? m.beta.toFixed(2) : null],
    ["Div yield", m.dividend_yield ? `${(m.dividend_yield * 100).toFixed(2)}%` : null],
    ["52w range", m.fifty_two_week_low && m.fifty_two_week_high
      ? `${Math.round(m.fifty_two_week_low)}–${Math.round(m.fifty_two_week_high)}`
      : null],
  ] : [];

  return (
    <aside className="w-[280px] border-r border-rule bg-paper-raised flex flex-col shrink-0">
      <div className="flex-1 overflow-y-auto">

        {!ticker && (
          <div className="p-4">
            <p className="text-[11px] text-ink-soft">Search a company in the chat box to begin.</p>
          </div>
        )}

        {/* Company header — name, price, day move, 6-month sparkline */}
        {ticker && (
          <div className="p-4 border-b border-rule">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-paper-raised border border-rule-strong flex items-center justify-center font-mono text-sm font-bold text-ink shrink-0">
                {ticker[0]}
              </div>
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-ink leading-tight truncate">
                  {m?.company_name ?? ticker}
                </p>
                <p className="text-[11px] text-ink-soft truncate">
                  <span className="font-mono text-ink-soft">{ticker}</span>
                  {m?.sector && <> · {m.sector}</>}
                </p>
              </div>
            </div>

            {m?.current_price && (
              <div className="flex items-baseline gap-2 mt-3.5">
                <span className="font-mono text-[22px] font-bold text-ink">
                  ${m.current_price.toFixed(2)}
                </span>
                {change != null && (
                  <span className={`flex items-center gap-1 font-mono text-xs ${change >= 0 ? "text-ledger-pos" : "text-ledger-neg"}`}>
                    {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {change >= 0 ? "+" : ""}{change.toFixed(1)}% today
                  </span>
                )}
              </div>
            )}
            {m?.price_history && <PriceSparkline values={m.price_history} />}
            {m?.price_history && (
              <p className="mt-1.5 text-[10px] text-ink-faint">6 months · Yahoo Finance · delayed 15 min</p>
            )}
          </div>
        )}

        {/* Key figures */}
        {ticker && m && keyFigures.some(([, v]) => v) && (
          <div className="px-4 py-3.5 border-b border-rule">
            <p className="mb-2 text-[10.5px] font-semibold text-ink-soft uppercase tracking-[.13em]">Key figures</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {keyFigures.filter(([, v]) => v).map(([label, val]) => (
                <div key={label} className="flex justify-between py-0.5">
                  <span className="text-[11px] text-ink-soft">{label}</span>
                  <span className="text-[11px] text-ink font-mono">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filings on file */}
        {ticker && (
          <div className="px-4 py-3.5 border-b border-rule space-y-2">
            <p className="text-[10.5px] font-semibold text-ink-soft uppercase tracking-[.13em]">Filings on file</p>

            {filingStatus?.status === "ready" && (
              <div className="flex items-center gap-2 px-2.5 py-2 bg-paper border border-rule">
                <FileText className="w-3.5 h-3.5 text-ink-soft shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ink font-medium">
                    {filingStatus.filing_type ?? "10-K"}{filingStatus.filing_year ? ` · FY${filingStatus.filing_year}` : ""}
                  </p>
                  <p className="text-[10px] text-ink-faint">
                    {filingStatus.filing_date ? `Filed ${filingStatus.filing_date} · ` : ""}indexed
                  </p>
                </div>
                <CheckCircle2 className="w-3.5 h-3.5 text-ledger-pos shrink-0" />
              </div>
            )}

            {isLoading && (
              <div className="flex items-start gap-2 px-2.5 py-2 text-xs border bg-accent-ink-soft border-accent-ink text-accent-ink">
                <Loader2 className="w-3.5 h-3.5 mt-0.5 shrink-0 animate-spin" />
                <span className="leading-relaxed">{ingestMessage ?? "Loading the annual report…"}</span>
              </div>
            )}

            {ingestPhase === "idle" && filingStatus?.status !== "ready" && (
              <p className="text-[11px] text-ink-faint leading-relaxed">
                Filings load automatically the first time you ask a question about the annual report.
              </p>
            )}

            {staleInfo && ingestPhase === "ready" && (
              <div className="flex flex-col gap-2 px-2.5 py-2 text-xs border bg-amber-500/5 border-amber-500/20 text-stamp">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-stamp" />
                  <span className="leading-relaxed">
                    You're reading the <strong>{staleInfo.ingestedYear}</strong> report. The <strong>{staleInfo.latestYear}</strong> filing is now available.
                  </span>
                </div>
                <button
                  onClick={onReIngest}
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-stamp font-medium transition-all"
                >
                  <RefreshCw className="w-3 h-3" />
                  Load the {staleInfo.latestYear} report
                </button>
              </div>
            )}

            {ingestPhase === "error" && ingestMessage && (
              <div className="flex items-start gap-2 px-2.5 py-2 text-xs border bg-red-500/5 border-red-500/20 text-ledger-neg">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="leading-relaxed">{ingestMessage}</span>
              </div>
            )}

            {filingStatus?.status === "ready" && (
              <p className="text-[10px] text-ink-faint">Latest available on SEC EDGAR</p>
            )}
          </div>
        )}

        {/* This session */}
        {ticker && sessionStats && sessionStats.questions > 0 && (
          <div className="px-4 py-3.5">
            <p className="mb-2 text-[10.5px] font-semibold text-ink-soft uppercase tracking-[.13em]">This session</p>
            <p className="text-[11px] text-ink-soft leading-relaxed">
              {sessionStats.questions} question{sessionStats.questions !== 1 ? "s" : ""} · {sessionStats.citations} passage{sessionStats.citations !== 1 ? "s" : ""} cited
              <br />
              Answers grounded in SEC filings + live quotes
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
