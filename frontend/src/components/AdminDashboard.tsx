import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, ShieldCheck, Users, Wallet } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { AdminUser, UsageSummary } from "../types";

interface AdminDashboardProps {
  onBack: () => void;
}

const roleBadgeColor = (role: string) =>
  role === "admin"
    ? "text-accent-ink bg-accent-ink-soft border-accent-ink"
    : "text-ink-faint bg-ink-faint/10 border-rule";

const usd = (n: number) => `$${n.toFixed(2)}`;

/** Global monthly budget bar (shared across all users). */
function BudgetBar({ spent, limit }: { spent: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  return (
    <div className="w-full h-2 bg-rule overflow-hidden">
      <div
        className={`h-full transition-all ${pct > 90 ? "bg-ledger-neg" : pct > 70 ? "bg-accent-ink" : "bg-ledger-pos"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [busyRows, setBusyRows] = useState<Record<string, boolean>>({});

  const loadAll = async () => {
    setLoadError(null);
    try {
      const [u, list] = await Promise.all([api.adminUsageSummary(), api.adminListUsers()]);
      setUsage(u);
      setUsers(list.users);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const setRowError = (key: string, message: string | null) =>
    setRowErrors(prev => {
      const next = { ...prev };
      if (message) next[key] = message;
      else delete next[key];
      return next;
    });

  const handleSetRole = (u: AdminUser) => {
    const key = `role:${u.user_id}`;
    const role = roleDrafts[u.user_id] ?? u.role;
    if (role === u.role) return;
    setRowError(key, null);
    setBusyRows(prev => ({ ...prev, [key]: true }));
    (async () => {
      try {
        await api.adminSetRole(u.user_id, role);
        await loadAll();
      } catch (err: unknown) {
        setRowError(key, err instanceof ApiError ? err.message : "Role change failed.");
      } finally {
        setBusyRows(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    })();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-paper">
        <Loader2 className="w-6 h-6 animate-spin text-accent-ink" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-paper">
      <div className="max-w-5xl mx-auto px-8 py-7 space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 border border-rule text-ink-soft hover:text-ink hover:border-rule-strong transition-all"
            title="Back to chat"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 bg-accent-ink-soft border border-accent-ink flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-accent-ink" />
          </div>
          <h1 className="font-serif text-[19px] font-semibold text-ink">Admin Dashboard</h1>
        </div>

        {loadError && (
          <div className="px-3.5 py-2.5 text-[12.5px] border bg-ledger-neg/5 border-ledger-neg/25 text-ledger-neg">
            {loadError}
          </div>
        )}

        {/* Shared monthly budget */}
        {usage && (
          <div className="bg-paper-raised border border-rule px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10.5px] font-semibold text-ink-faint uppercase tracking-[.13em] flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" /> Shared monthly budget
              </p>
              <span className="font-mono text-[12px] text-ink-soft">{usage.month_requests} requests this month</span>
            </div>
            <div className="flex items-end justify-between">
              <p className="font-mono text-2xl font-bold text-ink">
                {usd(usage.month_spent_usd)}
                <span className="text-sm font-normal text-ink-faint"> / {usd(usage.monthly_budget_usd)}</span>
              </p>
              <p className="font-mono text-[12px] text-ledger-pos">{usd(usage.month_remaining_usd)} left</p>
            </div>
            <BudgetBar spent={usage.month_spent_usd} limit={usage.monthly_budget_usd} />
            <p className="text-[11px] text-ink-faint">
              Resets automatically on the 1st (UTC). Per-user safeguards: {usd(usage.user_daily_budget_usd)}/day
              {usage.rate_limit_per_minute > 0 ? ` · ${usage.rate_limit_per_minute} requests/min` : ""}.
            </p>
          </div>
        )}

        {/* All users */}
        <div className="bg-paper-raised border border-rule overflow-hidden">
          <div className="px-4 py-3 border-b border-rule flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-ink-faint" />
            <h2 className="text-[13px] font-semibold text-ink">All Users ({users.length})</h2>
          </div>
          <div className="divide-y divide-rule">
            {users.map(u => (
              <div key={u.user_id} className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex items-center gap-2">
                    <p className="text-[13px] text-ink truncate">{u.email}</p>
                    <span className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase border ${roleBadgeColor(u.role)}`}>
                      {u.role}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-ink-soft min-w-[150px] text-right">
                    {usd(u.month_spent_usd)} this month · {u.month_requests} req
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={roleDrafts[u.user_id] ?? u.role}
                      onChange={e => setRoleDrafts(prev => ({ ...prev, [u.user_id]: e.target.value }))}
                      className="px-2 py-1.5 text-[11.5px] bg-paper border border-rule text-ink capitalize focus:outline-none focus:border-accent-ink transition-colors"
                    >
                      {["user", "admin"].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleSetRole(u)}
                      disabled={busyRows[`role:${u.user_id}`] || (roleDrafts[u.user_id] ?? u.role) === u.role}
                      className="px-2.5 py-1.5 bg-accent-ink hover:opacity-90 border border-accent-ink text-paper text-[11.5px] font-medium transition-all disabled:opacity-50"
                    >
                      Set Role
                    </button>
                  </div>
                </div>
                {rowErrors[`role:${u.user_id}`] && (
                  <p className="text-[11px] text-ledger-neg">{rowErrors[`role:${u.user_id}`]}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
