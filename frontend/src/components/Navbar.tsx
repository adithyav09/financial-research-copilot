import { useState, useRef, useEffect } from "react";
import { BarChart2, Circle, LogOut, ChevronDown, History } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface NavbarProps {
  backendStatus: "healthy" | "offline" | "checking";
  onToggleHistory?: () => void;
  showHistory?: boolean;
}

export default function Navbar({ backendStatus, onToggleHistory, showHistory }: NavbarProps) {
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
  const roleBadgeColor = profile?.role === "admin" ? "text-purple-400 bg-purple-400/10 border-purple-400/20"
    : profile?.role === "approved" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
    : "text-gray-400 bg-gray-400/10 border-gray-400/20";
  const budgetPct = profile ? Math.min(100, (profile.tokens_consumed / profile.token_budget) * 100) : 0;
  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface-secondary shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 border border-accent/20">
          <BarChart2 className="w-4 h-4 text-accent" />
        </div>
        <div>
          <span className="text-sm font-semibold text-white tracking-tight">
            SEC Research Terminal
          </span>
          <span className="ml-2 text-xs text-gray-500 font-normal hidden sm:inline">
            10-K Analysis Platform
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onToggleHistory && (
          <button
            onClick={onToggleHistory}
            title={showHistory ? "Hide history" : "Show history"}
            className={`p-1.5 rounded-lg border transition-all ${
              showHistory
                ? "border-accent/30 bg-accent/10 text-accent"
                : "border-border text-gray-500 hover:text-gray-300 hover:border-gray-600"
            }`}
          >
            <History className="w-3.5 h-3.5" />
          </button>
        )}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border text-xs text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
          SEC EDGAR Live
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Circle
            className={`w-2 h-2 fill-current ${
              backendStatus === "healthy"
                ? "text-positive"
                : backendStatus === "checking"
                  ? "text-warning animate-pulse"
                  : "text-negative"
            }`}
          />
          <span className="text-gray-400 hidden sm:inline">
            {backendStatus === "healthy" ? "Connected" : backendStatus === "checking" ? "Connecting" : "Offline"}
          </span>
        </div>

        {/* User avatar menu */}
        {profile && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpen(o => !o)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border hover:border-gray-600 transition-all"
            >
              <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-[11px] font-bold text-accent">
                {initial}
              </div>
              <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-surface-secondary shadow-2xl shadow-black/60 z-50 overflow-hidden">
                {/* Profile header */}
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-sm font-bold text-accent">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{profile.email}</p>
                      <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase border ${roleBadgeColor}`}>
                        {profile.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Token budget */}
                <div className="px-4 py-3 border-b border-border space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Token Budget</span>
                    <span className="text-gray-300 font-mono">
                      {profile.tokens_consumed.toLocaleString()} / {profile.token_budget.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        budgetPct > 90 ? "bg-red-500" : budgetPct > 70 ? "bg-amber-500" : "bg-accent"
                      }`}
                      style={{ width: `${budgetPct}%` }}
                    />
                  </div>
                </div>

                {/* Sign out */}
                <button
                  onClick={() => { setOpen(false); signOut(); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/5 transition-colors"
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
