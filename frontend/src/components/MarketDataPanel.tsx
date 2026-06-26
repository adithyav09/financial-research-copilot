import { TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import type { MarketData } from "../types";

interface MarketDataPanelProps {
  data: MarketData;
}

function fmt(val?: number, prefix = "", decimals = 2): string {
  if (val == null) return "—";
  if (Math.abs(val) >= 1e12) return `${prefix}${(val / 1e12).toFixed(1)}T`;
  if (Math.abs(val) >= 1e9) return `${prefix}${(val / 1e9).toFixed(1)}B`;
  if (Math.abs(val) >= 1e6) return `${prefix}${(val / 1e6).toFixed(1)}M`;
  return `${prefix}${val.toFixed(decimals)}`;
}

function pct(val?: number): string {
  if (val == null) return "—";
  return `${(val * 100).toFixed(2)}%`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className="text-[11px] text-gray-200 font-mono">{value}</span>
    </div>
  );
}

export default function MarketDataPanel({ data }: MarketDataPanelProps) {
  const priceVs52High = data.current_price && data.fifty_two_week_high
    ? ((data.current_price / data.fifty_two_week_high) - 1) * 100
    : null;

  return (
    <div className="p-4 border-b border-border space-y-3">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
        <BarChart2 className="w-3 h-3" /> Market Data
      </p>

      {/* Price header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xl font-bold text-white font-mono">
            {data.current_price != null ? `$${data.current_price.toFixed(2)}` : "—"}
          </p>
          <p className="text-[11px] text-gray-500">{data.company_name ?? data.ticker}</p>
        </div>
        {priceVs52High != null && (
          <div className={`flex items-center gap-1 text-xs font-mono ${priceVs52High >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {priceVs52High >= 0
              ? <TrendingUp className="w-3.5 h-3.5" />
              : <TrendingDown className="w-3.5 h-3.5" />}
            {priceVs52High.toFixed(1)}% vs 52w high
          </div>
        )}
      </div>

      {/* Analyst rec badge */}
      {data.analyst_recommendation && (
        <div className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-accent/10 text-accent border border-accent/20">
          {data.analyst_recommendation}
        </div>
      )}

      <div className="divide-y divide-border/50">
        <div className="pb-2 space-y-0.5">
          <Row label="Market Cap" value={fmt(data.market_cap, "$")} />
          <Row label="P/E Ratio" value={fmt(data.pe_ratio, "", 1)} />
          <Row label="Fwd P/E" value={fmt(data.forward_pe, "", 1)} />
          <Row label="P/B" value={fmt(data.price_to_book, "", 2)} />
          <Row label="EV/EBITDA" value={fmt(data.ev_to_ebitda, "", 1)} />
        </div>
        <div className="pt-2 space-y-0.5">
          <Row label="52w High" value={fmt(data.fifty_two_week_high, "$")} />
          <Row label="52w Low" value={fmt(data.fifty_two_week_low, "$")} />
          <Row label="Beta" value={fmt(data.beta, "", 2)} />
          <Row label="Div Yield" value={pct(data.dividend_yield)} />
          <Row label="Short %" value={pct(data.short_float_percent)} />
        </div>
        {(data.sector || data.industry) && (
          <div className="pt-2 space-y-0.5">
            {data.sector && <Row label="Sector" value={data.sector} />}
            {data.industry && <Row label="Industry" value={data.industry} />}
          </div>
        )}
      </div>
    </div>
  );
}
