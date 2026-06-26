import React, { useState } from "react";
import { BarChart2, LogOut, CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const INVESTOR_TYPES = ["Individual investor", "Student / researcher", "Financial professional", "Other"];
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function RequestAccessPage() {
  const { user, session, signOut, refreshProfile } = useAuth();
  const [useCase, setUseCase] = useState("");
  const [investorType, setInvestorType] = useState(INVESTOR_TYPES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!useCase.trim() || !session?.access_token) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/request-access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ use_case: useCase, investor_type: investorType }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Submission failed.");
      }
      setSubmitted(true);
      // Poll for approval
      const poll = setInterval(async () => {
        await refreshProfile();
        clearInterval(poll);
      }, 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
          <h2 className="text-lg font-semibold text-white">Request submitted</h2>
          <p className="text-sm text-gray-400">
            You'll be notified when your access is approved. This is typically same-day.
          </p>
          <p className="text-xs text-gray-600">You're signed in as {user?.email}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 mx-auto">
            <BarChart2 className="w-6 h-6 text-accent" />
          </div>
          <h1 className="text-xl font-bold text-white">Request Access</h1>
          <p className="text-sm text-gray-400">
            Signed in as <span className="text-gray-300">{user?.email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">I am a</label>
            <select
              value={investorType}
              onChange={(e) => setInvestorType(e.target.value)}
              className="w-full px-3 py-2.5 bg-surface-secondary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent"
            >
              {INVESTOR_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              How will you use this tool? <span className="text-gray-600">(brief description)</span>
            </label>
            <textarea
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              rows={3}
              placeholder="e.g. Research semiconductor companies before earnings…"
              required
              className="w-full px-3 py-2.5 bg-surface-secondary border border-border rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !useCase.trim()}
            className="w-full py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-all"
          >
            {submitting ? "Submitting…" : "Submit request"}
          </button>
        </form>

        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          <LogOut className="w-3 h-3" /> Sign out
        </button>
      </div>
    </div>
  );
}
