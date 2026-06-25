import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ChatPanel from "./components/ChatPanel";
import { api } from "./api/client";
import type { AnalysisMode, ChatMessage } from "./types";

export default function App() {
  const [backendStatus, setBackendStatus] = useState<"healthy" | "offline" | "checking">("checking");
  const [ticker, setTicker] = useState("");
  const [mode, setMode] = useState<AnalysisMode>("value");
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<"idle" | "success" | "error">("idle");
  const [ingestMessage, setIngestMessage] = useState<string | null>(null);
  const [isIngested, setIsIngested] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);

  useEffect(() => {
    api
      .health()
      .then(() => setBackendStatus("healthy"))
      .catch(() => setBackendStatus("offline"));
  }, []);

  const handleIngest = async () => {
    if (!ticker.trim()) return;
    setIsIngesting(true);
    setIngestMessage(null);
    setIngestStatus("idle");
    try {
      const res = await api.ingest({ ticker });
      setIngestStatus("success");
      setIngestMessage(`${res.filing_type} ingested · ${res.chunks_processed} chunks processed`);
      setIsIngested(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setIngestStatus("error");
      setIngestMessage(`Failed to ingest: ${msg}`);
      setIsIngested(false);
    } finally {
      setIsIngesting(false);
    }
  }

  const handleSend = async (question: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev: ChatMessage[]) => [...prev, userMsg]);
    setIsQuerying(true);

    try {
      const res = await api.query({ ticker, question, mode });
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res.answer,
        citations: res.citations,
        mode: res.mode,
        timestamp: new Date(),
      };
      setMessages((prev: ChatMessage[]) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Error: ${msg}`,
        timestamp: new Date(),
      };
      setMessages((prev: ChatMessage[]) => [...prev, errorMsg]);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <Navbar backendStatus={backendStatus} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          ticker={ticker}
          onTickerChange={(t) => { setTicker(t); setIsIngested(false); setIngestMessage(null); setIngestStatus("idle"); }}
          onIngest={handleIngest}
          isIngesting={isIngesting}
          ingestStatus={ingestStatus}
          ingestMessage={ingestMessage}
          mode={mode}
          onModeChange={setMode}
        />
        <ChatPanel
          messages={messages}
          onSend={handleSend}
          isLoading={isQuerying}
          ticker={ticker}
          isIngested={isIngested}
        />
      </div>
    </div>
  );
}
