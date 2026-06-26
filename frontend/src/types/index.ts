export type AnalysisMode =
  | "value"
  | "growth"
  | "income"
  | "quality"
  | "risk_averse"
  | "esg"
  | "activist";

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
  mode: AnalysisMode;
  session_id?: string;
}

export interface Citation {
  text: string;
  source: string;
  page?: string;
  url?: string;
}

export interface QueryResponse {
  answer: string;
  mode: AnalysisMode;
  ticker: string;
  citations: Citation[];
  tokens_used: number;
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
  timestamp: Date;
  question?: string;
}
