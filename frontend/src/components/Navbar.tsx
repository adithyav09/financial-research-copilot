import { useState, useRef, useEffect } from "react";
import { Info, LogOut, ChevronDown, History, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ThesisMark from "./ThesisMark";

interface NavbarProps {
  onToggleHistory?: () => void;
  showHistory?: boolean;
  /** Opens the "How answers are made" transparency panel (Phase 5). */
  onShowHowAnswersAreMade?: () => void;
  /** Opens the admin dashboard (admin role only). */
  onOpenAdmin?: () => void;
}

export default function Navbar({ onToggleHistory, showHistory, onShowHowAnswersAreMade, onOpenAdmin }: NavbarProps) {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initial = profile?.email?.[0]?.toUpperCase() ?? "?";
  const roleBadgeColor = profile?.role === "admin" ? "text-accent-ink bg-accent-ink-soft border-accent-ink"
    : profile?.role === "approved" ? "text-ledger-pos bg-ledger-pos/10 border-ledger-pos/30"
    : "text-ink-faint bg-ink-faint/10 border-rule";
  const budgetPct = profile ? Math.min(100, (profile.tokens_consumed / profile.token_budget) * 100) : 0;

  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b border-rule bg-paper-raised shrink-0">
      <div className="flex items-center gap-2.5">
        <ThesisMark size={30} />
        <div className="flex items-baseline gap-2.5">
          <span className="font-serif text-[15px] font-semibold text-ink">Thesis</span>
          <span className="text-xs text-ink-soft hidden sm:inline">
            Company research you can verify
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {onToggleHistory && (
          <button
            onClick={onToggleHistory}
            title={showHistory ? "Hide history" : "Show history"}
            className={`p-1.5 border transition-all ${
              showHistory
                ? "border-accent-ink bg-accent-ink-soft text-accent-ink"
                : "border-rule text-ink-soft hover:text-ink hover:border-rule-strong"
            }`}
          >
            <History className="w-3.5 h-3.5" />
          </button>
        )}
        {onShowHowAnswersAreMade && (
          <button
            onClick={onShowHowAnswersAreMade}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 border border-rule text-xs text-ink-soft hover:text-ink hover:border-rule-strong transition-all"
          >
            <Info className="w-3 h-3" />
            How answers are made
          </button>
        )}

        {/* User avatar menu */}
        {profile && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpen(o => !o)}
              className="flex items-center gap-1.5 px-2 py-1 border border-rule hover:border-rule-strong transition-all"
            >
              <div className="w-6 h-6 rounded-full bg-accent-ink-soft border border-accent-ink flex items-center justify-center text-[11px] font-bold text-accent-ink">
                {initial}
              </div>
              <ChevronDown className={`w-3 h-3 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-2 w-64 border border-rule bg-paper-raised shadow-[0_16px_36px_-16px_rgba(20,22,26,0.30)] z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-rule">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent-ink-soft border border-accent-ink flex items-center justify-center text-sm font-bold text-accent-ink">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink truncate">{profile.email}</p>
                      <span className={`inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-semibold uppercase border ${roleBadgeColor}`}>
                        {profile.role}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 border-b border-rule space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-ink-soft">Token Budget</span>
                    <span className="text-ink font-mono">
                      {profile.tokens_consumed.toLocaleString()} / {profile.token_budget.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-paper rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        budgetPct > 90 ? "bg-ledger-neg" : budgetPct > 70 ? "bg-accent-ink" : "bg-ledger-pos"
                      }`}
                      style={{ width: `${budgetPct}%` }}
                    />
                  </div>
                </div>

                {/* Admin dashboard entry point */}
                {profile.role === "admin" && onOpenAdmin && (
                  <button
                    onClick={() => { setOpen(false); onOpenAdmin(); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-ink hover:bg-paper transition-colors border-b border-rule"
                  >
                    <ShieldCheck className="w-4 h-4" /> Admin Dashboard
                  </button>
                )}

                {/* Sign out */}
                <button
                  onClick={() => { setOpen(false); signOut(); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-ledger-neg hover:bg-red-500/5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
