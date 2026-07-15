export type AnalysisMode =
  | "value"
  | "growth"
  | "income"
  | "quality"
  | "risk_averse"
  | "esg"
  | "activist";

/**
 * Explanation depth for answers. Replaces the 7 analysis-mode personas in the UI:
 * "simple" defines jargon inline for people learning to read filings; "analyst"
 * is the professional register. Depth changes framing only — never the data.
 */
export type Depth = "simple" | "analyst";

export interface IngestRequest {
  ticker: string;
}

export interface IngestResponse {
  status: string;
  ticker: string;
  filing_type: string;
  message: string;
  chunks_processed: number;
}

export interface QueryRequest {
  ticker: string;
  question: string;
  /** Deprecated — backend ignores it; depth drives the prompt now. */
  mode?: AnalysisMode;
  depth?: Depth;
  session_id?: string;
}

export interface Citation {
  text: string;
  source: string;
  page?: string;
  url?: string;
  /** Set for filing citations only — enables the in-app filing viewer. */
  chunk_index?: number | null;
  filing_type?: string | null;
}

export interface FilingPassage {
  chunk_index: number;
  content: string;
  is_target: boolean;
}

export interface FilingPassageResponse {
  ticker: string;
  filing_type: string;
  filing_year?: number | null;
  filing_date?: string | null;
  sec_url?: string | null;
  chunk_index: number;
  chunk_count?: number | null;
  passages: FilingPassage[];
}

export interface MetricCardData {
  label: string;
  value: string;
  delta?: string | null;
  delta_direction?: "up" | "down" | "flat" | null;
  citation?: number | null;
}

export interface ChartSpec {
  title: string;
  metric_keys: string[];
  reason?: string | null;
}

export interface StructuredAnswer {
  takeaway: string;
  metrics: MetricCardData[];
  narrative: string;
  chart?: ChartSpec | null;
  follow_ups: string[];
}

export interface QueryResponse {
  answer: string;
  mode: AnalysisMode;
  ticker: string;
  citations: Citation[];
  tokens_used: number;
  structured?: StructuredAnswer | null;
}

export interface HealthResponse {
  status: string;
  version: string;
}

export interface StatusResponse {
  ticker: string;
  status: "pending" | "processing" | "ready" | "failed";
  filing_type?: string;
  filing_date?: string;
  filing_year?: number;
  chunk_count: number;
  chroma_collection?: string;
  error_message?: string;
  created_at?: string;
  is_stale?: boolean;
  latest_sec_year?: number;
}

export interface MarketData {
  ticker: string;
  company_name?: string;
  sector?: string;
  industry?: string;
  current_price?: number;
  market_cap?: number;
  pe_ratio?: number;
  forward_pe?: number;
  price_to_book?: number;
  price_to_sales?: number;
  ev_to_ebitda?: number;
  dividend_yield?: number;
  payout_ratio?: number;
  beta?: number;
  fifty_two_week_high?: number;
  fifty_two_week_low?: number;
  analyst_recommendation?: string;
  short_float_percent?: number;
  shares_outstanding?: number;
  day_change_percent?: number;
  price_history?: number[];
}

export interface XBRLDataPoint {
  year: number;
  value: number | null;
}

export interface XBRLFinancials {
  ticker: string;
  revenue_series?: XBRLDataPoint[];
  net_income_series?: XBRLDataPoint[];
  operating_cash_flow_series?: XBRLDataPoint[];
  free_cash_flow_series?: XBRLDataPoint[];
  total_debt_series?: XBRLDataPoint[];
  gross_profit_series?: XBRLDataPoint[];
  operating_income_series?: XBRLDataPoint[];
  total_assets_series?: XBRLDataPoint[];
  total_liabilities_series?: XBRLDataPoint[];
  shareholders_equity_series?: XBRLDataPoint[];
  eps_diluted_series?: XBRLDataPoint[];
}

export interface TickerCompany {
  ticker: string;
  title: string;
  cik_str: number;
}

export interface TickerSearchResponse {
  results: TickerCompany[];
}

export interface SuggestionsRequest {
  ticker: string;
  previous_answer: string;
  mode: string;
}

export interface SuggestionsResponse {
  suggestions: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  mode?: AnalysisMode;
  structured?: StructuredAnswer | null;
  timestamp: Date;
  question?: string;
}
