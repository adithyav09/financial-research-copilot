import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ChatPanel from "./components/ChatPanel";
import LoginPage from "./components/LoginPage";
import PendingApprovalPage from "./components/PendingApprovalPage";
import { useAuth } from "./context/AuthContext";
import { api } from "./api/client";
import type { AnalysisMode, ChatMessage, MarketData, XBRLFinancials } from "./types";

type IngestPhase = "idle" | "checking" | "ingesting" | "polling" | "ready" | "error";

export default function App() {
  const { session, profile, loading } = useAuth();
  const [backendStatus, setBackendStatus] = useState<"healthy" | "offline" | "checking">("checking");
  const [ticker, setTicker] = useState("");
  const [mode, setMode] = useState<AnalysisMode>("value");
  const [ingestPhase, setIngestPhase] = useState<IngestPhase>("idle");
  const [ingestMessage, setIngestMessage] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [xbrlData, setXbrlData] = useState<XBRLFinancials | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [sessionId] = useState<string>(() => crypto.randomUUID());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingQuestionRef = useRef<string | null>(null);

  useEffect(() => {
    api
      .health()
      .then(() => setBackendStatus("healthy"))
      .catch(() => setBackendStatus("offline"));
  }, []);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const fireQuery = async (question: string, t: string) => {
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: question, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsQuerying(true);
    try {
      const res = await api.query({ ticker: t, question, mode, session_id: sessionId });
      const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: res.answer, citations: res.citations, mode: res.mode, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", content: `Error: ${msg}`, timestamp: new Date() }]);
    } finally {
      setIsQuerying(false);
    }
  };

  const ensureIngestedThenQuery = async (question: string, t: string) => {
    setIngestMessage(null);

    // Step 1: Check current status
    setIngestPhase("checking");
    let statusData;
    try {
      statusData = await api.status(t);
    } catch {
      statusData = null;
    }

    if (statusData?.status === "ready") {
      setIngestPhase("ready");
      setIngestMessage(`${statusData.filing_type ?? "10-K"} · ${statusData.filing_year ?? ""} · ${statusData.chunk_count} chunks`);
      api.marketData(t).then(setMarketData).catch(() => {});
      api.xbrl(t).then(setXbrlData).catch(() => {});
      await fireQuery(question, t);
      return;
    }

    if (statusData?.status === "processing") {
      setIngestPhase("polling");
      setIngestMessage(`Fetching ${t}'s latest 10-K from SEC EDGAR… this takes ~30s the first time`);
      pendingQuestionRef.current = question;
      startPolling(t);
      return;
    }

    // status not found or failed — trigger ingest
    setIngestPhase("ingesting");
    setIngestMessage(`Fetching ${t}'s latest 10-K from SEC EDGAR… this takes ~30s the first time`);
    pendingQuestionRef.current = question;
    try {
      await api.ingest({ ticker: t });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setIngestPhase("error");
      setIngestMessage(`Failed to fetch filing: ${msg}`);
      pendingQuestionRef.current = null;
      return;
    }
    setIngestPhase("polling");
    startPolling(t);
  };

  const startPolling = (t: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const s = await api.status(t);
        if (s.status === "ready") {
          stopPolling();
          setIngestPhase("ready");
          setIngestMessage(`${s.filing_type ?? "10-K"} · ${s.filing_year ?? ""} · ${s.chunk_count} chunks`);
          api.marketData(t).then(setMarketData).catch(() => {});
          api.xbrl(t).then(setXbrlData).catch(() => {});
          const q = pendingQuestionRef.current;
          pendingQuestionRef.current = null;
          if (q) await fireQuery(q, t);
        } else if (s.status === "failed") {
          stopPolling();
          setIngestPhase("error");
          setIngestMessage(`Ingestion failed: ${s.error_message ?? "unknown error"}`);
          pendingQuestionRef.current = null;
        }
      } catch { /* keep polling */ }
    }, 3000);
  };

  useEffect(() => stopPolling, []);

  const handleSend = async (question: string) => {
    if (!ticker.trim()) return;
    if (ingestPhase === "ready") {
      const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: question, timestamp: new Date() };
      setMessages(prev => [...prev, userMsg]);
      setIsQuerying(true);
      try {
        const res = await api.query({ ticker, question, mode, session_id: sessionId });
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", content: res.answer, citations: res.citations, mode: res.mode, timestamp: new Date() }]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", content: `Error: ${msg}`, timestamp: new Date() }]);
      } finally {
        setIsQuerying(false);
      }
      return;
    }
    await ensureIngestedThenQuery(question, ticker);
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

  // profile.role === "approved" | "admin" — show the full app
  return (
    <div className="h-screen flex flex-col">
      <Navbar backendStatus={backendStatus} />
      <div className="flex items-start gap-2 px-6 py-2 bg-amber-500/15 border-b border-amber-500/40 text-amber-200 text-xs">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
        <span>
          This tool provides research assistance based on public SEC filings. Nothing here
          is investment advice. Always verify information and consult a licensed professional
          before making investment decisions.
        </span>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          ticker={ticker}
          onTickerChange={(t) => { setTicker(t); setIngestPhase("idle"); setIngestMessage(null); setMarketData(null); setXbrlData(null); stopPolling(); pendingQuestionRef.current = null; }}
          ingestPhase={ingestPhase}
          ingestMessage={ingestMessage}
          marketData={marketData}
        />
        <ChatPanel
          messages={messages}
          onSend={handleSend}
          isLoading={isQuerying || ingestPhase === "ingesting" || ingestPhase === "polling" || ingestPhase === "checking"}
          ticker={ticker}
          ingestPhase={ingestPhase}
          mode={mode}
          onModeChange={(m) => setMode(m as AnalysisMode)}
          xbrlData={xbrlData}
        />
      </div>
    </div>
  );
}
