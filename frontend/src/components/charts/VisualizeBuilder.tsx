import { useMemo, useState } from "react";
import { BarChart2, LineChart as LineIcon, ChevronDown, ChevronUp } from "lucide-react";
import type { XBRLFinancials, XBRLDataPoint } from "../../types";
import MetricChart, { type ChartSeries } from "./MetricChart";

interface MetricDef {
  key: string;
  label: string;
  color: string;
  get: (x: XBRLFinancials) => XBRLDataPoint[] | undefined;
}

// Every universal metric the XBRL layer can supply, with a distinct color.
const METRICS: MetricDef[] = [
  { key: "revenue", label: "Revenue", color: "#3b82f6", get: x => x.revenue_series },
  { key: "net_income", label: "Net Income", color: "#22c55e", get: x => x.net_income_series },
  { key: "gross_profit", label: "Gross Profit", color: "#f59e0b", get: x => x.gross_profit_series },
  { key: "operating_income", label: "Operating Income", color: "#ec4899", get: x => x.operating_income_series },
  { key: "operating_cash_flow", label: "Operating Cash Flow", color: "#06b6d4", get: x => x.operating_cash_flow_series },
  { key: "free_cash_flow", label: "Free Cash Flow", color: "#a855f7", get: x => x.free_cash_flow_series },
  { key: "total_assets", label: "Total Assets", color: "#14b8a6", get: x => x.total_assets_series },
  { key: "total_liabilities", label: "Total Liabilities", color: "#f97316", get: x => x.total_liabilities_series },
  { key: "total_debt", label: "Total Debt", color: "#ef4444", get: x => x.total_debt_series },
  { key: "shareholders_equity", label: "Shareholders' Equity", color: "#8b5cf6", get: x => x.shareholders_equity_series },
  { key: "eps_diluted", label: "EPS (Diluted)", color: "#eab308", get: x => x.eps_diluted_series },
];

interface Props {
  xbrl: XBRLFinancials;
  ticker: string;
}

function hasData(s: XBRLDataPoint[] | undefined): s is XBRLDataPoint[] {
  return !!s && s.some(d => d.value !== null);
}

/**
 * On-demand chart builder. The user picks which metrics to plot, the year range,
 * and bar vs. line — nothing renders from keyword-guessing. Data comes from the
 * XBRL series already loaded for the ticker.
 */
export default function VisualizeBuilder({ xbrl, ticker }: Props) {
  const available = useMemo(() => METRICS.filter(m => hasData(m.get(xbrl))), [xbrl]);

  const allYears = useMemo(() => {
    const ys = new Set<number>();
    for (const m of available) for (const d of m.get(xbrl) ?? []) if (d.value !== null) ys.add(d.year);
    return [...ys].sort((a, b) => a - b);
  }, [available, xbrl]);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(() =>
    available.slice(0, 2).map(m => m.key) // sensible default: first two available metrics
  );
  const [type, setType] = useState<"bar" | "line">("bar");
  const [fromYear, setFromYear] = useState<number>(() => allYears[0] ?? 0);
  const [toYear, setToYear] = useState<number>(() => allYears[allYears.length - 1] ?? 0);

  if (!available.length || !allYears.length) return null;

  const toggle = (key: string) =>
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const years = allYears.filter(y => y >= fromYear && y <= toYear);
  const series: ChartSeries[] = available
    .filter(m => selected.includes(m.key))
    .map(m => ({ key: m.key, label: m.label, color: m.color, data: m.get(xbrl) ?? [] }));

  return (
    <div className="mt-3 w-full max-w-2xl rounded-xl border border-border bg-surface-secondary overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-surface transition-colors"
      >
        <span className="flex items-center gap-2">
          <BarChart2 className="w-3.5 h-3.5 text-accent" />
          Visualize {ticker} financials
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-border">
          {/* Metric multi-select */}
          <div className="pt-3">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Metrics</p>
            <div className="flex flex-wrap gap-1.5">
              {available.map(m => {
                const on = selected.includes(m.key);
                return (
                  <button
                    key={m.key}
                    onClick={() => toggle(m.key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                      on ? "border-transparent text-white" : "border-border text-gray-500 hover:text-gray-300"
                    }`}
                    style={on ? { backgroundColor: `${m.color}22`, borderColor: `${m.color}66`, color: m.color } : undefined}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls: year range + chart type */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Years</span>
              <select value={fromYear} onChange={e => setFromYear(Number(e.target.value))}
                className="bg-surface border border-border rounded-md px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent">
                {allYears.filter(y => y <= toYear).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <span className="text-gray-600 text-xs">→</span>
              <select value={toYear} onChange={e => setToYear(Number(e.target.value))}
                className="bg-surface border border-border rounded-md px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent">
                {allYears.filter(y => y >= fromYear).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
              <button onClick={() => setType("bar")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-all ${type === "bar" ? "bg-accent/15 text-accent" : "text-gray-500 hover:text-gray-300"}`}>
                <BarChart2 className="w-3 h-3" /> Bar
              </button>
              <button onClick={() => setType("line")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-all ${type === "line" ? "bg-accent/15 text-accent" : "text-gray-500 hover:text-gray-300"}`}>
                <LineIcon className="w-3 h-3" /> Line
              </button>
            </div>
          </div>

          {/* Chart */}
          {series.length === 0 ? (
            <p className="text-xs text-gray-600 py-8 text-center">Pick at least one metric to plot.</p>
          ) : (
            <MetricChart series={series} years={years} type={type} />
          )}
        </div>
      )}
    </div>
  );
}
