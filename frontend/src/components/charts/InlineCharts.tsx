import { useState } from "react";
import { X, BarChart2 } from "lucide-react";
import type { XBRLFinancials } from "../../types";
import RevenueNetIncomeChart from "./RevenueNetIncomeChart";
import FreeCashFlowChart from "./FreeCashFlowChart";
import MarginTrendsChart from "./MarginTrendsChart";
import DebtEquityChart from "./DebtEquityChart";
import EPSChart from "./EPSChart";

interface Props {
  answer: string;
  question?: string;
  xbrl: XBRLFinancials;
  ticker: string;
}

function hasAny(text: string, ...patterns: string[]): boolean {
  const lower = text.toLowerCase();
  return patterns.some(p => lower.includes(p.toLowerCase()));
}

function DashboardModal({ xbrl, ticker, onClose }: { xbrl: XBRLFinancials; ticker: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8 px-4">
      <div className="w-full max-w-5xl bg-surface rounded-2xl border border-border shadow-2xl shadow-black/80">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-accent" />
            <span className="font-semibold text-white">{ticker} · Full Financial Dashboard</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-secondary transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {xbrl.revenue_series && xbrl.net_income_series && (
            <RevenueNetIncomeChart revenue={xbrl.revenue_series} netIncome={xbrl.net_income_series} ticker={ticker} />
          )}
          {xbrl.free_cash_flow_series && (
            <FreeCashFlowChart data={xbrl.free_cash_flow_series} ticker={ticker} />
          )}
          {xbrl.revenue_series && xbrl.gross_profit_series && xbrl.operating_income_series && (
            <MarginTrendsChart
              revenue={xbrl.revenue_series}
              grossProfit={xbrl.gross_profit_series}
              operatingIncome={xbrl.operating_income_series}
              ticker={ticker}
            />
          )}
          {xbrl.total_debt_series && xbrl.shareholders_equity_series && (
            <DebtEquityChart totalDebt={xbrl.total_debt_series} equity={xbrl.shareholders_equity_series} ticker={ticker} />
          )}
          {xbrl.eps_diluted_series && (
            <EPSChart data={xbrl.eps_diluted_series} ticker={ticker} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function InlineCharts({ answer: _answer, question = "", xbrl, ticker }: Props) {
  const [showDashboard, setShowDashboard] = useState(false);

  const charts: React.ReactNode[] = [];

  // Only render charts when the user EXPLICITLY asks for one via chart/graph/show/plot keywords
  const qLower = question.toLowerCase();
  const wantsChart = hasAny(qLower, "chart", "graph", "show me", "plot", "visuali", "display");

  if (!wantsChart) {
    // No chart keywords in question — render nothing inline
  } else {
    const seen = new Set<string>();

    if (hasAny(qLower, "free cash flow", "fcf", "cash flow") && xbrl.free_cash_flow_series && !seen.has("fcf")) {
      seen.add("fcf");
      charts.push(<FreeCashFlowChart key="fcf" data={xbrl.free_cash_flow_series} ticker={ticker} />);
    }
    if (hasAny(qLower, "revenue", "sales", "net income") && xbrl.revenue_series && xbrl.net_income_series && !seen.has("revenue")) {
      seen.add("revenue");
      charts.push(<RevenueNetIncomeChart key="rev" revenue={xbrl.revenue_series} netIncome={xbrl.net_income_series} ticker={ticker} />);
    }
    if (hasAny(qLower, "margin", "gross profit", "operating income") && xbrl.revenue_series && xbrl.gross_profit_series && xbrl.operating_income_series && !seen.has("margin")) {
      seen.add("margin");
      charts.push(<MarginTrendsChart key="margin" revenue={xbrl.revenue_series} grossProfit={xbrl.gross_profit_series} operatingIncome={xbrl.operating_income_series} ticker={ticker} />);
    }
    if (hasAny(qLower, "debt", "leverage", "equity", "balance sheet") && xbrl.total_debt_series && xbrl.shareholders_equity_series && !seen.has("debt")) {
      seen.add("debt");
      charts.push(<DebtEquityChart key="debt" totalDebt={xbrl.total_debt_series} equity={xbrl.shareholders_equity_series} ticker={ticker} />);
    }
    if (hasAny(qLower, "eps", "earnings per share", "diluted earnings") && xbrl.eps_diluted_series && !seen.has("eps")) {
      seen.add("eps");
      charts.push(<EPSChart key="eps" data={xbrl.eps_diluted_series} ticker={ticker} />);
    }
    // "show all" / "dashboard" / "full" — show everything
    if (charts.length === 0 || hasAny(qLower, "all", "dashboard", "full", "overview", "everything")) {
      seen.clear();
      charts.length = 0;
      if (xbrl.free_cash_flow_series) charts.push(<FreeCashFlowChart key="fcf" data={xbrl.free_cash_flow_series} ticker={ticker} />);
      if (xbrl.revenue_series && xbrl.net_income_series) charts.push(<RevenueNetIncomeChart key="rev" revenue={xbrl.revenue_series} netIncome={xbrl.net_income_series} ticker={ticker} />);
      if (xbrl.revenue_series && xbrl.gross_profit_series && xbrl.operating_income_series) charts.push(<MarginTrendsChart key="margin" revenue={xbrl.revenue_series} grossProfit={xbrl.gross_profit_series} operatingIncome={xbrl.operating_income_series} ticker={ticker} />);
      if (xbrl.total_debt_series && xbrl.shareholders_equity_series) charts.push(<DebtEquityChart key="debt" totalDebt={xbrl.total_debt_series} equity={xbrl.shareholders_equity_series} ticker={ticker} />);
      if (xbrl.eps_diluted_series) charts.push(<EPSChart key="eps" data={xbrl.eps_diluted_series} ticker={ticker} />);
    }
  }

  if (charts.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      {charts}
      {charts.length > 0 && (
        <>
          <button
            onClick={() => setShowDashboard(true)}
            className="flex items-center gap-2 text-xs text-accent hover:text-accent-hover border border-accent/20 hover:border-accent/40 px-3 py-1.5 rounded-lg transition-all bg-accent/5"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            View Full Dashboard →
          </button>
          {showDashboard && (
            <DashboardModal xbrl={xbrl} ticker={ticker} onClose={() => setShowDashboard(false)} />
          )}
        </>
      )}
    </div>
  );
}
