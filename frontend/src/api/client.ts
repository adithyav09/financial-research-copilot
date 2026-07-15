import type {
  FilingPassageResponse,
  HealthResponse,
  IngestRequest,
  IngestResponse,
  QueryRequest,
  QueryResponse,
  MarketData,
  StatusResponse,
  SuggestionsRequest,
  SuggestionsResponse,
  TickerSearchResponse,
  XBRLFinancials,
} from "../types";
import { supabase } from "../lib/supabase";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Error thrown for any non-2xx response. Carries the HTTP status and the parsed
 * response body so callers can branch on it — e.g. a 409 with
 * { detail: { needs_ingestion: true } } drives the ingest-then-retry flow.
 */
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** True when the backend signalled that this ticker needs a filing ingested first. */
export function needsIngestion(err: unknown): err is ApiError {
  if (!(err instanceof ApiError) || err.status !== 409) return false;
  const detail = (err.body as { detail?: { needs_ingestion?: boolean } } | undefined)?.detail;
  return detail?.needs_ingestion === true;
}

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
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = (body as { detail?: unknown }).detail;
    const message = typeof detail === "string" ? detail : `Request failed (${res.status})`;
    throw new ApiError(res.status, body, message);
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

  tickers: (q: string, limit = 8) =>
    request<TickerSearchResponse>(`/api/tickers?q=${encodeURIComponent(q)}&limit=${limit}`),

  filingPassage: (ticker: string, chunkIndex: number, filingType = "10-K") =>
    request<FilingPassageResponse>(
      `/api/filing/${ticker}/passage?chunk_index=${chunkIndex}&filing_type=${encodeURIComponent(filingType)}`
    ),
};
