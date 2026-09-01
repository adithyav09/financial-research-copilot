import { useEffect } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ThesisMark from "./ThesisMark";

/**
 * Design 1i (after sign-up): the approval gate as a progress timeline
 * instead of a dead end. Polls the profile so approval flips the page live.
 */
export default function PendingApprovalPage() {
  const { user, signOut, refreshProfile } = useAuth();

  // Poll every 30s in case admin approves while the page is open
  useEffect(() => {
    const interval = setInterval(refreshProfile, 30000);
    return () => clearInterval(interval);
  }, [refreshProfile]);

  const steps = [
    { state: "done", title: "Account created", body: user?.email ?? "" },
    { state: "active", title: "Access review — usually same day", body: "Each account gets a real AI budget, so access is approved manually to keep the service fast and abuse-free. We'll email you." },
    { state: "todo", title: "Start researching", body: "Full access with a personal token budget." },
  ];

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-1">
          <ThesisMark size={30} />
          <span className="font-serif text-[17px] font-semibold text-ink">Thesis</span>
        </div>
        <p className="mb-6 text-[12.5px] text-ink-soft">Company research you can verify.</p>

        <h2 className="mb-4 font-serif text-lg font-semibold text-ink">You're in the review queue</h2>
        <div className="flex flex-col">
          {steps.map((step, i) => (
            <div key={step.title} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  step.state === "done" ? "bg-emerald-500/15 border border-emerald-500/40"
                  : step.state === "active" ? "bg-accent-ink-soft border border-accent-ink"
                  : "border border-dashed border-rule-strong"
                }`}>
                  {step.state === "done" ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  ) : (
                    <span className={`block rounded-full ${step.state === "active" ? "w-2 h-2 bg-accent-ink animate-pulse" : "w-1.5 h-1.5 bg-rule-strong"}`} />
                  )}
                </div>
                {i < steps.length - 1 && <div className="w-px flex-1 bg-rule my-1" />}
              </div>
              <div className={i < steps.length - 1 ? "pb-4" : ""}>
                <p className={`text-[13px] font-semibold ${step.state === "todo" ? "text-ink-soft" : "text-ink"}`}>{step.title}</p>
                <p className="mt-0.5 text-[11.5px] text-ink-soft leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={signOut}
          className="mt-6 inline-flex items-center gap-2 text-xs text-ink-faint hover:text-ink-soft transition-colors"
        >
          <LogOut className="w-3 h-3" /> Sign out
        </button>
      </div>
    </div>
  );
}
