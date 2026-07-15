import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Plus, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Citation } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function fetchHistoryFromBackend(): Promise<QueryLogEntry[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return [];
  const res = await fetch(`${BASE_URL}/api/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.entries ?? []) as QueryLogEntry[];
}

interface QueryLogEntry {
  id: string;
  ticker: string;
  question: string;
  answer: string | null;
  mode: string;
  session_id: string | null;
  created_at: string;
  citations?: Citation[];
}

interface GroupedSession {
  session_id: string;
  ticker: string;
  firstQuestion: string;
  count: number;
  latest: string;
  entries: QueryLogEntry[];
}

interface Props {
  currentSessionId: string;
  currentTicker: string;
  onSelectSession: (session: GroupedSession) => void;
  onNewChat: () => void;
}

// Compact relative time for the rail: "2m", "3h", "1d", then a date.
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ChatHistory({ currentSessionId, currentTicker, onSelectSession, onNewChat }: Props) {
  const [sessions, setSessions] = useState<GroupedSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchHistoryFromBackend();

      if (!data.length) {
        setSessions([]);
        return;
      }

      // Group by session_id, fall back to ticker+date bucket if null
      const sessionMap = new Map<string, QueryLogEntry[]>();
      for (const row of data) {
        const key = row.session_id ?? `${row.ticker}_${row.created_at.slice(0, 10)}`;
        if (!sessionMap.has(key)) sessionMap.set(key, []);
        sessionMap.get(key)!.push(row as QueryLogEntry);
      }

      const grouped: GroupedSession[] = [];
      for (const [key, entries] of sessionMap) {
        const sorted = [...entries].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        grouped.push({
          session_id: key,
          ticker: sorted[0].ticker,
          firstQuestion: sorted[0].question,
          count: sorted.length,
          latest: entries[0].created_at,
          entries: sorted,
        });
      }

      grouped.sort((a, b) => new Date(b.latest).getTime() - new Date(a.latest).getTime());
      setSessions(grouped);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reload when a new message is sent (session changes or new query)
  useEffect(() => { load(); }, [currentSessionId]);

  return (
    <div className="flex flex-col h-full">
      {/* New research */}
      <div className="px-3.5 py-3 border-b border-border shrink-0">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-accent/35 bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/15 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          New research
        </button>
      </div>

      <div className="px-3.5 pt-3.5 pb-1.5 shrink-0">
        <span className="text-[10.5px] font-semibold text-gray-500 uppercase tracking-[.13em]">Recent</span>
      </div>

      {/* Flat recency-ordered session cards (design 1b — no ticker accordion) */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-2">
            <MessageSquare className="w-6 h-6 text-gray-700" />
            <p className="text-[11px] text-gray-600">No research yet.</p>
          </div>
        )}

        {!loading && sessions.map(session => {
          const isCurrent = session.session_id === currentSessionId;
          const isActiveTicker = session.ticker === currentTicker;
          return (
            <button
              key={session.session_id}
              onClick={() => onSelectSession(session)}
              className={`w-full flex flex-col gap-1 px-2.5 py-2 rounded-lg text-left transition-all ${
                isCurrent
                  ? "bg-accent/10 border border-accent/20"
                  : "border border-transparent hover:bg-surface"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`font-mono text-[10.5px] font-bold px-1.5 py-px rounded ${
                  isCurrent || isActiveTicker
                    ? "text-accent-hover bg-accent/15"
                    : "text-gray-400 bg-surface-tertiary"
                }`}>
                  {session.ticker}
                </span>
                <span className="text-[10px] text-gray-600">{relativeTime(session.latest)}</span>
              </div>
              <span className={`text-xs leading-snug line-clamp-2 ${isCurrent ? "text-gray-100" : "text-gray-400"}`}>
                {session.firstQuestion}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
