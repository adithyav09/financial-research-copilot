import type {
  HealthResponse,
  IngestRequest,
  IngestResponse,
  QueryRequest,
  QueryResponse,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
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
};
