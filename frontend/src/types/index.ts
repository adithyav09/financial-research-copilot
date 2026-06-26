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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  mode?: AnalysisMode;
  timestamp: Date;
}
