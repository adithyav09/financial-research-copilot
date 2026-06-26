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

export default function InlineCharts({ answer, question = "", xbrl, ticker }: Props) {
  const [showDashboard, setShowDashboard] = useState(false);

  const seen = new Set<string>();
  const charts: React.ReactNode[] = [];
  let chartCount = 0;

  // First pass: check user question for explicit chart requests — inject immediately
  const qLower = question.toLowerCase();
  const questionWantsRevenue = hasAny(qLower, "revenue", "sales", "net income");
  const questionWantsFCF    = hasAny(qLower, "free cash flow", "fcf", "cash flow");
  const questionWantsMargin = hasAny(qLower, "gross margin", "operating margin", "margin");
  const questionWantsDebt   = hasAny(qLower, "debt", "leverage", "equity", "balance sheet");
  const questionWantsEPS    = hasAny(qLower, "eps", "earnings per share", "diluted");
  const questionWantsChart  = hasAny(qLower, "chart", "graph", "show", "plot", "visuali");

  if ((questionWantsFCF || (questionWantsChart && hasAny(qLower, "cash"))) && xbrl.free_cash_flow_series && !seen.has("fcf")) {
    seen.add("fcf");
    charts.push(<FreeCashFlowChart key="fcf" data={xbrl.free_cash_flow_series} ticker={ticker} />);
    chartCount++;
  }
  if ((questionWantsRevenue || (questionWantsChart && hasAny(qLower, "revenue", "income"))) && xbrl.revenue_series && xbrl.net_income_series && !seen.has("revenue")) {
    seen.add("revenue");
    charts.push(<RevenueNetIncomeChart key="rev" revenue={xbrl.revenue_series} netIncome={xbrl.net_income_series} ticker={ticker} />);
    chartCount++;
  }
  if ((questionWantsMargin || (questionWantsChart && hasAny(qLower, "margin"))) && xbrl.revenue_series && xbrl.gross_profit_series && xbrl.operating_income_series && !seen.has("margin")) {
    seen.add("margin");
    charts.push(<MarginTrendsChart key="margin" revenue={xbrl.revenue_series} grossProfit={xbrl.gross_profit_series} operatingIncome={xbrl.operating_income_series} ticker={ticker} />);
    chartCount++;
  }
  if ((questionWantsDebt || (questionWantsChart && hasAny(qLower, "debt", "equity"))) && xbrl.total_debt_series && xbrl.shareholders_equity_series && !seen.has("debt")) {
    seen.add("debt");
    charts.push(<DebtEquityChart key="debt" totalDebt={xbrl.total_debt_series} equity={xbrl.shareholders_equity_series} ticker={ticker} />);
    chartCount++;
  }
  if ((questionWantsEPS || (questionWantsChart && hasAny(qLower, "eps", "earnings"))) && xbrl.eps_diluted_series && !seen.has("eps")) {
    seen.add("eps");
    charts.push(<EPSChart key="eps" data={xbrl.eps_diluted_series} ticker={ticker} />);
    chartCount++;
  }

  // Second pass: scan answer paragraphs for contextual chart injection
  const paragraphs = answer.split(/\n{2,}/);

  for (const para of paragraphs) {
    const isRevenue = hasAny(para, "revenue", "sales", "net income") && !seen.has("revenue");
    const isFCF = hasAny(para, "free cash flow", "FCF", "cash flow") && !seen.has("fcf");
    const isMargin = hasAny(para, "gross margin", "operating margin", "margins") && !seen.has("margin");
    const isDebt = hasAny(para, "debt", "leverage", "equity", "balance sheet") && !seen.has("debt");
    const isEPS = hasAny(para, "EPS", "earnings per share", "diluted") && !seen.has("eps");

    if (isRevenue && xbrl.revenue_series && xbrl.net_income_series) {
      seen.add("revenue");
      charts.push(
        <RevenueNetIncomeChart key="rev" revenue={xbrl.revenue_series} netIncome={xbrl.net_income_series} ticker={ticker} />
      );
      chartCount++;
    }
    if (isFCF && xbrl.free_cash_flow_series) {
      seen.add("fcf");
      charts.push(<FreeCashFlowChart key="fcf" data={xbrl.free_cash_flow_series} ticker={ticker} />);
      chartCount++;
    }
    if (isMargin && xbrl.revenue_series && xbrl.gross_profit_series && xbrl.operating_income_series) {
      seen.add("margin");
      charts.push(
        <MarginTrendsChart key="margin"
          revenue={xbrl.revenue_series}
          grossProfit={xbrl.gross_profit_series}
          operatingIncome={xbrl.operating_income_series}
          ticker={ticker}
        />
      );
      chartCount++;
    }
    if (isDebt && xbrl.total_debt_series && xbrl.shareholders_equity_series) {
      seen.add("debt");
      charts.push(<DebtEquityChart key="debt" totalDebt={xbrl.total_debt_series} equity={xbrl.shareholders_equity_series} ticker={ticker} />);
      chartCount++;
    }
    if (isEPS && xbrl.eps_diluted_series) {
      seen.add("eps");
      charts.push(<EPSChart key="eps" data={xbrl.eps_diluted_series} ticker={ticker} />);
      chartCount++;
    }

  }

  if (charts.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      {charts}
      {chartCount > 0 && (
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
