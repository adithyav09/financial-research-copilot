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
}

export interface HealthResponse {
  status: string;
  version: string;
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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  mode?: AnalysisMode;
  timestamp: Date;
}
