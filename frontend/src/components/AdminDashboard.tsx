import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2, ShieldCheck, Users, X } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { AdminUser, PendingAccessRequest, UsageSummary } from "../types";

interface AdminDashboardProps {
  onBack: () => void;
}

const roleBadgeColor = (role: string) =>
  role === "admin"
    ? "text-purple-400 bg-purple-400/10 border-purple-400/20"
    : role === "approved"
      ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
      : role === "denied"
        ? "text-red-400 bg-red-400/10 border-red-400/20"
        : "text-gray-400 bg-gray-400/10 border-gray-400/20";

function TokenBar({ consumed, budget }: { consumed: number; budget: number }) {
  const pct = budget > 0 ? Math.min(100, (consumed / budget) * 100) : 0;
  return (
    <div className="space-y-1 min-w-[140px]">
      <div className="flex justify-between text-[11px]">
        <span className="text-gray-500">Usage</span>
        <span className="text-gray-300 font-mono">
          {consumed.toLocaleString()} / {budget.toLocaleString()}
        </span>
      </div>
      <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-accent"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pending, setPending] = useState<PendingAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingDrafts, setPendingDrafts] = useState<Record<string, string>>({});
  const [grantDrafts, setGrantDrafts] = useState<Record<string, string>>({});
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [busyRows, setBusyRows] = useState<Record<string, boolean>>({});

  const loadAll = async () => {
    setLoadError(null);
    try {
      const [u, p, list] = await Promise.all([
        api.adminUsageSummary(),
        api.adminPendingRequests(),
        api.adminListUsers(),
      ]);
      setUsage(u);
      setPending(p.requests);
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

  const withBusy = async (key: string, fn: () => Promise<void>) => {
    setBusyRows(prev => ({ ...prev, [key]: true }));
    try {
      await fn();
    } finally {
      setBusyRows(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const cap = usage?.max_token_budget_grant ?? Infinity;

  const handleApprove = (req: PendingAccessRequest) => {
    const raw = pendingDrafts[req.user_id] ?? "50000";
    const tokenBudget = Number(raw);
    if (!Number.isFinite(tokenBudget) || tokenBudget < 0) {
      setRowError(req.user_id, "Enter a valid token budget.");
      return;
    }
    if (tokenBudget > cap) {
      setRowError(req.user_id, `Cannot exceed the max grant of ${cap.toLocaleString()}.`);
      return;
    }
    setRowError(req.user_id, null);
    withBusy(req.user_id, async () => {
      try {
        await api.adminApprove(req.user_id, { action: "approved", token_budget: tokenBudget });
        await loadAll();
      } catch (err: unknown) {
        setRowError(req.user_id, err instanceof ApiError ? err.message : "Approval failed.");
      }
    });
  };

  const handleDeny = (req: PendingAccessRequest) => {
    setRowError(req.user_id, null);
    withBusy(req.user_id, async () => {
      try {
        await api.adminApprove(req.user_id, { action: "denied" });
        await loadAll();
      } catch (err: unknown) {
        setRowError(req.user_id, err instanceof ApiError ? err.message : "Denial failed.");
      }
    });
  };

  const handleGrant = (u: AdminUser) => {
    const key = `grant:${u.user_id}`;
    const raw = grantDrafts[u.user_id] ?? String(u.token_budget);
    const tokenBudget = Number(raw);
    if (!Number.isFinite(tokenBudget) || tokenBudget < 0) {
      setRowError(key, "Enter a valid token budget.");
      return;
    }
    if (tokenBudget > cap) {
      setRowError(key, `Cannot exceed the max grant of ${cap.toLocaleString()}.`);
      return;
    }
    setRowError(key, null);
    withBusy(key, async () => {
      try {
        await api.adminGrantTokens(u.user_id, tokenBudget);
        await loadAll();
      } catch (err: unknown) {
        setRowError(key, err instanceof ApiError ? err.message : "Grant failed.");
      }
    });
  };

  const handleSetRole = (u: AdminUser) => {
    const key = `role:${u.user_id}`;
    const role = roleDrafts[u.user_id] ?? u.role;
    if (role === u.role) return;
    setRowError(key, null);
    withBusy(key, async () => {
      try {
        await api.adminSetRole(u.user_id, role);
        await loadAll();
      } catch (err: unknown) {
        setRowError(key, err instanceof ApiError ? err.message : "Role change failed.");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg border border-border text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-all"
            title="Back to chat"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <ShieldCheck className="w-5 h-5 text-accent" />
          <h1 className="text-lg font-semibold text-white">Admin Dashboard</h1>
        </div>

        {loadError && (
          <div className="rounded-lg px-3 py-2.5 text-xs border bg-red-500/5 border-red-500/20 text-red-400">
            {loadError}
          </div>
        )}

        {/* Usage summary */}
        {usage && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface-secondary border border-border rounded-xl p-4">
              <p className="text-[11px] text-gray-500 uppercase tracking-widest">Total Users</p>
              <p className="text-xl font-bold text-white mt-1">{usage.total_users}</p>
            </div>
            <div className="bg-surface-secondary border border-border rounded-xl p-4">
              <p className="text-[11px] text-gray-500 uppercase tracking-widest">Tokens Consumed</p>
              <p className="text-xl font-bold text-white mt-1">{usage.total_tokens_consumed.toLocaleString()}</p>
            </div>
            <div className="bg-surface-secondary border border-border rounded-xl p-4">
              <p className="text-[11px] text-gray-500 uppercase tracking-widest">Total Budget Allocated</p>
              <p className="text-xl font-bold text-white mt-1">{usage.total_token_budget.toLocaleString()}</p>
            </div>
            <div className="bg-surface-secondary border border-border rounded-xl p-4">
              <p className="text-[11px] text-gray-500 uppercase tracking-widest">By Role</p>
              <p className="text-xs text-gray-300 mt-1.5 space-x-2">
                {Object.entries(usage.by_role).map(([role, count]) => (
                  <span key={role} className={`inline-block px-1.5 py-0.5 rounded border ${roleBadgeColor(role)}`}>
                    {role}: {count}
                  </span>
                ))}
              </p>
            </div>
          </div>
        )}

        {/* Pending requests */}
        <div className="bg-surface-secondary border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-white">Pending Requests ({pending.length})</h2>
          </div>
          {pending.length === 0 ? (
            <p className="px-4 py-6 text-xs text-gray-500 text-center">No pending requests.</p>
          ) : (
            <div className="divide-y divide-border">
              {pending.map(req => (
                <div key={req.user_id} className="px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{req.email}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {req.investor_type} · {req.use_case}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min={0}
                        placeholder="50000"
                        value={pendingDrafts[req.user_id] ?? ""}
                        onChange={e =>
                          setPendingDrafts(prev => ({ ...prev, [req.user_id]: e.target.value }))
                        }
                        className="w-24 px-2 py-1 text-xs rounded-md bg-surface border border-border text-gray-200 font-mono"
                      />
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={busyRows[req.user_id]}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-all disabled:opacity-50"
                      >
                        <Check className="w-3 h-3" /> Approve
                      </button>
                      <button
                        onClick={() => handleDeny(req)}
                        disabled={busyRows[req.user_id]}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-medium transition-all disabled:opacity-50"
                      >
                        <X className="w-3 h-3" /> Deny
                      </button>
                    </div>
                  </div>
                  {rowErrors[req.user_id] && (
                    <p className="text-[11px] text-red-400">{rowErrors[req.user_id]}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All users */}
        <div className="bg-surface-secondary border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-white">All Users ({users.length})</h2>
          </div>
          <div className="divide-y divide-border">
            {users.map(u => (
              <div key={u.user_id} className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex items-center gap-2">
                    <p className="text-sm text-white truncate">{u.email}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase border ${roleBadgeColor(u.role)}`}>
                      {u.role}
                    </span>
                  </div>
                  <TokenBar consumed={u.tokens_consumed} budget={u.token_budget} />
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={roleDrafts[u.user_id] ?? u.role}
                      onChange={e => setRoleDrafts(prev => ({ ...prev, [u.user_id]: e.target.value }))}
                      className="px-2 py-1 text-xs rounded-md bg-surface border border-border text-gray-200 capitalize"
                    >
                      {["pending", "approved", "admin", "denied"].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleSetRole(u)}
                      disabled={busyRows[`role:${u.user_id}`] || (roleDrafts[u.user_id] ?? u.role) === u.role}
                      className="px-2.5 py-1 rounded-md bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-medium transition-all disabled:opacity-50"
                    >
                      Set Role
                    </button>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={0}
                      placeholder={String(u.token_budget)}
                      value={grantDrafts[u.user_id] ?? ""}
                      onChange={e => setGrantDrafts(prev => ({ ...prev, [u.user_id]: e.target.value }))}
                      className="w-24 px-2 py-1 text-xs rounded-md bg-surface border border-border text-gray-200 font-mono"
                    />
                    <button
                      onClick={() => handleGrant(u)}
                      disabled={busyRows[`grant:${u.user_id}`]}
                      className="px-2.5 py-1 rounded-md bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent text-xs font-medium transition-all disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
                {rowErrors[`role:${u.user_id}`] && (
                  <p className="text-[11px] text-red-400">{rowErrors[`role:${u.user_id}`]}</p>
                )}
                {rowErrors[`grant:${u.user_id}`] && (
                  <p className="text-[11px] text-red-400">{rowErrors[`grant:${u.user_id}`]}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
