import { useState } from "react";
import type { Citation, StructuredAnswer, XBRLFinancials, XBRLDataPoint } from "../types";
import AnswerMarkdown, { type CitationClickHandler } from "./AnswerMarkdown";
import MetricChart, { type ChartSeries } from "./charts/MetricChart";

// Series palette + labels for the auto chart. Keys mirror the backend's
// XBRL_CHART_KEYS allowlist; anything else was already dropped server-side.
const CHART_SERIES_META: Record<string, { label: string; color: string }> = {
  revenue: { label: "Revenue", color: "#3b82f6" },
  net_income: { label: "Net Income", color: "#34d399" },
  operating_cash_flow: { label: "Operating Cash Flow", color: "#a78bfa" },
  free_cash_flow: { label: "Free Cash Flow", color: "#fbbf24" },
  gross_profit: { label: "Gross Profit", color: "#60a5fa" },
  operating_income: { label: "Operating Income", color: "#f472b6" },
  total_debt: { label: "Total Debt", color: "#f87171" },
  shareholders_equity: { label: "Shareholders Equity", color: "#2dd4bf" },
  eps_diluted: { label: "EPS (Diluted)", color: "#c084fc" },
};

function xbrlSeries(xbrl: XBRLFinancials, key: string): XBRLDataPoint[] | undefined {
  return (xbrl as unknown as Record<string, XBRLDataPoint[] | undefined>)[`${key}_series`];
}

/** The chart the answer asked for, rendered from data we already trust (XBRL). */
function AutoChart({ spec, xbrl }: { spec: NonNullable<StructuredAnswer["chart"]>; xbrl: XBRLFinancials }) {
  const [hidden, setHidden] = useState(false);

  const series: ChartSeries[] = spec.metric_keys
    .map(key => {
      const data = xbrlSeries(xbrl, key);
      const meta = CHART_SERIES_META[key];
      if (!data?.length || !meta) return null;
      return { key, label: meta.label, color: meta.color, data };
    })
    .filter((s): s is ChartSeries => s !== null);

  if (!series.length || hidden) return null;

  // Last 5 fiscal years with any data, ascending — matches the design's FY21–FY25 span
  const years = [...new Set(series.flatMap(s => s.data.filter(d => d.value !== null).map(d => d.year)))]
    .sort((a, b) => a - b)
    .slice(-5);
  if (years.length < 2) return null; // a one-year "trend" chart is noise

  return (
    <div className="rounded-xl border border-border bg-surface-secondary px-[18px] pt-3.5 pb-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-300">{spec.title}</span>
        <span className="font-mono text-[10px] text-gray-600 border border-border rounded px-1.5 py-0.5">
          auto · SEC XBRL
        </span>
      </div>
      <div className="mt-1">
        <MetricChart series={series} years={years} type="bar" />
      </div>
      <p className="mt-1 text-[10.5px] text-gray-600">
        {spec.reason ? `Shown because ${spec.reason}` : "Chart generated from your question"}
        {" · "}
        <button onClick={() => setHidden(true)} className="underline hover:text-gray-400">Hide</button>
      </p>
    </div>
  );
}

interface Props {
  structured: StructuredAnswer;
  citations: Citation[];
  xbrlData?: XBRLFinancials | null;
  onCitationClick?: CitationClickHandler;
}

/**
 * The design-1b answer stack: takeaway → metric cards → narrative → auto chart.
 * Sources row and follow-ups stay in ChatPanel — they're conversation-level UI.
 */
export default function StructuredAnswerView({ structured, citations, xbrlData, onCitationClick }: Props) {
  const filingSources = new Set(
    citations.map(c => c.source.split("—")[0]?.trim()).filter(Boolean)
  );
  const deltaColor = (dir?: string | null) =>
    dir === "up" ? "text-emerald-400" : dir === "down" ? "text-red-400" : "text-gray-400";

  return (
    <div className="flex flex-col gap-2.5">
      {/* Takeaway */}
      <div className="rounded-xl border border-border bg-surface-secondary px-[18px] py-4">
        <p className="mb-1.5 text-[10px] font-bold text-accent-hover uppercase tracking-[.14em]">Takeaway</p>
        <p className="text-[15px] font-medium text-gray-100 leading-relaxed">{structured.takeaway}</p>
        {citations.length > 0 && (
          <p className="mt-2 text-[11px] text-gray-500">
            Based on {citations.length} source{citations.length !== 1 ? "s" : ""}
            {filingSources.size > 1 ? ` across ${filingSources.size} documents` : ""}
          </p>
        )}
      </div>

      {/* Metric cards */}
      {structured.metrics.length > 0 && (
        <div className={`grid gap-2.5 ${structured.metrics.length === 1 ? "grid-cols-1" : structured.metrics.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {structured.metrics.map((m, i) => {
            const cite = m.citation != null ? citations[m.citation - 1] : undefined;
            return (
              <div key={i} className="rounded-[10px] border border-border bg-surface-secondary px-3.5 py-3">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{m.label}</p>
                <div className="flex items-baseline gap-1.5 mt-1.5 flex-wrap">
                  <span className="font-mono text-[19px] font-bold text-white">{m.value}</span>
                  {m.delta && (
                    <span className={`text-[11px] font-semibold ${deltaColor(m.delta_direction)}`}>{m.delta}</span>
                  )}
                </div>
                {m.citation != null && (
                  <p className="mt-1.5 font-mono text-[9.5px] text-gray-600 truncate" title={cite?.source}>
                    [{m.citation}]{cite ? ` ${cite.source.split("—")[0]?.trim()}` : ""}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Narrative */}
      <div className="rounded-xl border border-border bg-surface-secondary px-[18px] py-4 text-sm leading-[1.7] text-gray-300">
        <AnswerMarkdown content={structured.narrative} citations={citations} onCitationClick={onCitationClick} />
      </div>

      {/* Auto chart — only when the answer asked for one and we hold the data */}
      {structured.chart && xbrlData && <AutoChart spec={structured.chart} xbrl={xbrlData} />}
    </div>
  );
}
