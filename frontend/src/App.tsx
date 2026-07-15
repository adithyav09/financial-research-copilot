import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ChatPanel, { type CitationRef } from "./components/ChatPanel";
import ChatHistory from "./components/ChatHistory";
import FilingViewer from "./components/FilingViewer";
import LoginPage from "./components/LoginPage";
import PendingApprovalPage from "./components/PendingApprovalPage";
import { useAuth } from "./context/AuthContext";
import { api, needsIngestion } from "./api/client";
import type { AnalysisMode, ChatMessage, Depth, MarketData, QueryResponse, StatusResponse, XBRLFinancials } from "./types";

type IngestPhase = "idle" | "checking" | "ingesting" | "polling" | "ready" | "error";

interface ViewerState {
  current: CitationRef;
  filingCitations: CitationRef[];
}

export default function App() {
  const { session, profile, loading, refreshProfile } = useAuth();
  const [ticker, setTicker] = useState("");
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [depth, setDepth] = useState<Depth>("analyst");
  const [ingestPhase, setIngestPhase] = useState<IngestPhase>("idle");
  const [ingestMessage, setIngestMessage] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [xbrlData, setXbrlData] = useState<XBRLFinancials | null>(null);
  const [filingStatus, setFilingStatus] = useState<StatusResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [showHistory, setShowHistory] = useState(true);
  const [staleInfo, setStaleInfo] = useState<{ ingestedYear: number; latestYear: number } | null>(null);
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingQuestionRef = useRef<string | null>(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const assistantMessage = (res: QueryResponse, question: string): ChatMessage => ({
    id: crypto.randomUUID(),
    role: "assistant",
    content: res.answer,
    citations: res.citations,
    mode: res.mode,
    structured: res.structured ?? null,
    timestamp: new Date(),
    question,
  });

  // Load sidebar market + historical data and (best-effort) filing status for a ticker.
  const loadTickerData = (t: string) => {
    api.marketData(t).then(d => {
      setMarketData(d);
      if (d?.company_name) setCompanyName(d.company_name);
    }).catch(() => {});
    api.xbrl(t).then(setXbrlData).catch(() => {});
    api.status(t).then(s => {
      setFilingStatus(s ?? null);
      if (s?.status === "ready") {
        setIngestPhase(prev => (prev === "idle" ? "ready" : prev));
        setIngestMessage(`Annual report ready${s.filing_year ? ` · FY${s.filing_year}` : ""}`);
        if (s.is_stale && s.filing_year && s.latest_sec_year) {
          setStaleInfo({ ingestedYear: s.filing_year, latestYear: s.latest_sec_year });
        } else {
          setStaleInfo(null);
        }
      }
    }).catch(() => {});
  };

  // Selecting a company resets per-ticker state and eagerly loads its market data.
  const handleTickerChange = (t: string, name?: string) => {
    const up = t.trim().toUpperCase();
    setTicker(up);
    setCompanyName(name ?? null);
    setIngestPhase("idle");
    setIngestMessage(null);
    setMarketData(null);
    setXbrlData(null);
    setFilingStatus(null);
    setStaleInfo(null);
    setViewer(null);
    stopPolling();
    pendingQuestionRef.current = null;
    if (up) loadTickerData(up);
  };

  // The single query path. The backend decides live-vs-filing; when it signals a
  // filing must be ingested first (409 needs_ingestion), we ingest, poll, and retry
  // the same question once. No frontend keyword list — one source of truth.
  const submitQuery = async (question: string, t: string, retriedAfterIngest = false) => {
    setIsQuerying(true);
    try {
      const res = await api.query({ ticker: t, question, depth, session_id: sessionId });
      setMessages(prev => [...prev, assistantMessage(res, question)]);
      setIngestPhase("ready");
      refreshProfile().catch(() => {});
    } catch (err: unknown) {
      if (needsIngestion(err) && !retriedAfterIngest) {
        await ingestThenRetry(question, t);
        return;
      }
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: "assistant",
        content: `Error: ${msg}`, timestamp: new Date(), question,
      }]);
    } finally {
      setIsQuerying(false);
    }
  };

  const ingestThenRetry = async (question: string, t: string) => {
    pendingQuestionRef.current = question;
    setIngestMessage(`Loading ${t}'s annual report… this takes about 30 seconds the first time`);
    try {
      // If ingestion is already running (e.g. a prior question kicked it off), just poll.
      const existing = await api.status(t).catch(() => null);
      if (existing?.status !== "processing") {
        setIngestPhase("ingesting");
        await api.ingest({ ticker: t });
      }
      setIngestPhase("polling");
      startPolling(t);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setIngestPhase("error");
      setIngestMessage(`Couldn't load the filing: ${msg}`);
      pendingQuestionRef.current = null;
    }
  };

  const startPolling = (t: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const s = await api.status(t);
        if (s.status === "ready") {
          stopPolling();
          setIngestPhase("ready");
          setIngestMessage(`Annual report ready${s.filing_year ? ` · FY${s.filing_year}` : ""}`);
          loadTickerData(t);
          const q = pendingQuestionRef.current;
          pendingQuestionRef.current = null;
          if (q) await submitQuery(q, t, true);
        } else if (s.status === "failed") {
          stopPolling();
          setIngestPhase("error");
          setIngestMessage(`Couldn't load the filing: ${s.error_message ?? "unknown error"}`);
          pendingQuestionRef.current = null;
        }
      } catch { /* keep polling */ }
    }, 3000);
  };

  useEffect(() => stopPolling, []);

  const handleSend = async (question: string) => {
    const t = ticker.trim();
    if (!t || !question.trim()) return;
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(), role: "user", content: question, timestamp: new Date(),
    }]);
    await submitQuery(question, t);
  };

  // Auth gates — checked in order before showing the main app
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!session) return <LoginPage />;

  if (session && !profile) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (profile?.role === "pending") {
    return <PendingApprovalPage />;
  }

  if (profile?.role === "denied") {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-white font-semibold">Access denied</p>
          <p className="text-sm text-gray-400">Your access request was not approved.</p>
        </div>
      </div>
    );
  }

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(crypto.randomUUID());
    setTicker("");
    setCompanyName(null);
    setIngestPhase("idle");
    setIngestMessage(null);
    setMarketData(null);
    setXbrlData(null);
    setFilingStatus(null);
    setStaleInfo(null);
    setViewer(null);
    stopPolling();
    pendingQuestionRef.current = null;
  };

  const sessionStats = {
    questions: messages.filter(m => m.role === "user").length,
    citations: messages.reduce((n, m) => n + (m.citations?.length ?? 0), 0),
  };

  // profile.role === "approved" | "admin" — show the full app
  return (
    <div className="h-screen flex flex-col">
      <Navbar onToggleHistory={() => setShowHistory(h => !h)} showHistory={showHistory} />
      <div className="flex flex-1 overflow-hidden">
        {showHistory && (
          <div className="w-[232px] shrink-0 border-r border-border bg-surface-secondary flex flex-col overflow-hidden">
            <ChatHistory
              currentSessionId={sessionId}
              currentTicker={ticker}
              onNewChat={handleNewChat}
              onSelectSession={(session) => {
                setTicker(session.ticker);
                setIngestPhase("idle");
                setIngestMessage(null);
                setMarketData(null);
                setXbrlData(null);
                setFilingStatus(null);
                setStaleInfo(null);
                stopPolling();
                pendingQuestionRef.current = null;
                loadTickerData(session.ticker);
                // Restore Q&A pairs as chat messages, including their saved citations
                const restored: ChatMessage[] = [];
                for (const entry of session.entries) {
                  restored.push({
                    id: `h-user-${entry.id}`,
                    role: "user",
                    content: entry.question,
                    timestamp: new Date(entry.created_at),
                  });
                  if (entry.answer) {
                    restored.push({
                      id: `h-asst-${entry.id}`,
                      role: "assistant",
                      content: entry.answer,
                      citations: entry.citations ?? undefined,
                      mode: entry.mode as AnalysisMode,
                      timestamp: new Date(entry.created_at),
                      question: entry.question,
                    });
                  }
                }
                setMessages(restored);
                setSessionId(session.session_id);
              }}
            />
          </div>
        )}
        <Sidebar
          ticker={ticker}
          ingestPhase={ingestPhase}
          ingestMessage={ingestMessage}
          marketData={marketData}
          filingStatus={filingStatus}
          staleInfo={staleInfo}
          sessionStats={sessionStats}
          onReIngest={() => {
            setStaleInfo(null);
            setIngestPhase("ingesting");
            setIngestMessage(`Loading ${ticker}'s newest annual report…`);
            pendingQuestionRef.current = null;
            api.ingest({ ticker }).then(() => {
              setIngestPhase("polling");
              startPolling(ticker);
            }).catch((err: unknown) => {
              const msg = err instanceof Error ? err.message : "Unknown error";
              setIngestPhase("error");
              setIngestMessage(`Re-ingest failed: ${msg}`);
            });
          }}
        />
        <ChatPanel
          messages={messages}
          onSend={handleSend}
          isLoading={isQuerying || ingestPhase === "ingesting" || ingestPhase === "polling" || ingestPhase === "checking"}
          ticker={ticker}
          companyName={companyName}
          onTickerChange={handleTickerChange}
          ingestPhase={ingestPhase}
          depth={depth}
          onDepthChange={setDepth}
          xbrlData={xbrlData}
          onOpenCitation={(current, filingCitations) => setViewer({ current, filingCitations })}
        />
        {viewer && viewer.current.citation.chunk_index != null && (
          <FilingViewer
            ticker={ticker}
            companyName={companyName}
            citation={viewer.current.citation}
            citationNumber={viewer.current.number}
            filingCitations={viewer.filingCitations}
            onNavigate={(citation, number) => setViewer(v => v ? { ...v, current: { citation, number } } : v)}
            onAskAboutPassage={handleSend}
            onClose={() => setViewer(null)}
          />
        )}
      </div>
    </div>
  );
}
