import { useState, useEffect, useCallback } from "react";
import { MessageSquare, ChevronDown, ChevronRight, Plus, Clock, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";

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

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ChatHistory({ currentSessionId, currentTicker, onSelectSession, onNewChat }: Props) {
  const [sessions, setSessions] = useState<GroupedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set());

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

      // Auto-expand ticker of current session
      if (currentTicker) setExpandedTickers(prev => new Set([...prev, currentTicker]));
    } finally {
      setLoading(false);
    }
  }, [currentTicker]);

  useEffect(() => { load(); }, [load]);

  // Reload when a new message is sent (session changes or new query)
  useEffect(() => { load(); }, [currentSessionId]);

  // Group sessions by ticker
  const byTicker = new Map<string, GroupedSession[]>();
  for (const s of sessions) {
    if (!byTicker.has(s.ticker)) byTicker.set(s.ticker, []);
    byTicker.get(s.ticker)!.push(s);
  }

  const toggleTicker = (t: string) =>
    setExpandedTickers(prev => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">History</span>
        <button
          onClick={onNewChat}
          title="New chat"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border border-border text-gray-400 hover:text-white hover:border-accent/40 transition-all"
        >
          <Plus className="w-3 h-3" />
          New
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-2">
            <MessageSquare className="w-6 h-6 text-gray-700" />
            <p className="text-[11px] text-gray-600">No past sessions yet.</p>
          </div>
        )}

        {!loading && [...byTicker.entries()].map(([t, tickerSessions]) => {
          const isOpen = expandedTickers.has(t);
          const isActive = t === currentTicker;
          return (
            <div key={t}>
              {/* Ticker group header */}
              <button
                onClick={() => toggleTicker(t)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-surface transition-colors ${isActive ? "bg-accent/5" : ""}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`font-mono text-xs font-bold shrink-0 ${isActive ? "text-accent" : "text-gray-300"}`}>{t}</span>
                  <span className="text-[10px] text-gray-600 shrink-0">{tickerSessions.length} session{tickerSessions.length !== 1 ? "s" : ""}</span>
                </div>
                {isOpen
                  ? <ChevronDown className="w-3 h-3 text-gray-600 shrink-0" />
                  : <ChevronRight className="w-3 h-3 text-gray-600 shrink-0" />}
              </button>

              {/* Sessions under ticker */}
              {isOpen && tickerSessions.map(session => {
                const isCurrent = session.session_id === currentSessionId;
                return (
                  <button
                    key={session.session_id}
                    onClick={() => onSelectSession(session)}
                    className={`w-full flex flex-col gap-0.5 px-5 py-2.5 text-left border-l-2 transition-all hover:bg-surface ${
                      isCurrent
                        ? "border-accent bg-accent/5"
                        : "border-transparent hover:border-gray-700"
                    }`}
                  >
                    <span className="text-xs text-gray-200 line-clamp-2 leading-snug">
                      {session.firstQuestion}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="w-2.5 h-2.5 text-gray-600 shrink-0" />
                      <span className="text-[10px] text-gray-600">{relativeTime(session.latest)}</span>
                      <span className="text-[10px] text-gray-700">· {session.count} msg{session.count !== 1 ? "s" : ""}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
