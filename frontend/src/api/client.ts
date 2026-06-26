import type {
  HealthResponse,
  IngestRequest,
  IngestResponse,
  QueryRequest,
  QueryResponse,
  MarketData,
  StatusResponse,
  SuggestionsRequest,
  SuggestionsResponse,
  XBRLFinancials,
} from "../types";
import { supabase } from "../lib/supabase";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers,
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "Request failed");
  }

  return res.json();
}

export const api = {
  health: () => request<HealthResponse>("/api/health"),

  ingest: (data: IngestRequest) =>
    request<IngestResponse>("/api/ingest", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  query: (data: QueryRequest) =>
    request<QueryResponse>("/api/query", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  marketData: (ticker: string) =>
    request<MarketData>(`/api/market-data/${ticker}`),

  status: (ticker: string) =>
    request<StatusResponse>(`/api/status/${ticker}`),

  suggestions: (data: SuggestionsRequest) =>
    request<SuggestionsResponse>("/api/query/suggestions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  xbrl: (ticker: string) =>
    request<XBRLFinancials>(`/api/financials/${ticker}`),
};
