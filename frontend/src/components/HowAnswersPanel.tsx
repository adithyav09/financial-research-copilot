import { useEffect } from "react";
import { X } from "lucide-react";

const STEPS = [
  {
    title: "You ask a question",
    body: "Routed automatically: live-market questions (price, news, ratings) skip filings entirely.",
  },
  {
    title: "Public data is fetched",
    body: "SEC EDGAR 10-K/10-Q filings + XBRL history; Yahoo Finance quotes and headlines. Ingested filings are indexed once, so repeat questions are fast.",
  },
  {
    title: "Relevant passages are retrieved",
    body: "A vector index (Supabase pgvector) finds the filing sections that match your question — typically 4–8 passages.",
  },
  {
    title: "OpenAI writes the answer — from those passages only",
    body: "The model is instructed to answer strictly from the retrieved text and live data blocks. Your question + passages go to the OpenAI API; API data isn't used for training.",
  },
  {
    title: "Every claim carries its citation",
    body: "Citations link to the exact passage; you can read each one in the built-in filing viewer.",
  },
];

const FACTS: [string, string][] = [
  ["Accuracy", "AI summaries can be wrong. Treat citations as the source of truth."],
  ["Fair use limits", "Each account has a token budget so the service stays fast for everyone. Usage is visible in your profile menu."],
  ["Security", "Sign-in via Supabase Auth; this app never stores your password. All data analyzed is public."],
  ["Coverage", "US-listed companies with SEC filings. Quotes are delayed ~15 min."],
];

/** Design 1h: the transparency panel — the full pipeline, nothing hidden. */
export default function HowAnswersPanel({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-end bg-black/50" onClick={onClose}>
      <div
        className="w-[460px] max-w-full h-full overflow-y-auto bg-surface-secondary border-l border-border px-6 py-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[15px] font-semibold text-white tracking-tight">How answers are made</h3>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-200 transition-colors" title="Close (esc)">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-gray-500">The full pipeline, nothing hidden.</p>

        {/* Pipeline steps */}
        <div className="flex flex-col">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-[22px] h-[22px] rounded-full bg-accent/15 border border-accent/35 text-accent-hover text-[10.5px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                {i < STEPS.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
              </div>
              <div className={i < STEPS.length - 1 ? "pb-4" : ""}>
                <p className="text-[12.5px] font-semibold text-gray-200">{step.title}</p>
                <p className="mt-0.5 text-[11.5px] text-gray-400 leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Honest-limits grid */}
        <div className="grid grid-cols-2 gap-2 mt-5">
          {FACTS.map(([label, body]) => (
            <div key={label} className="rounded-lg border border-border bg-surface px-3 py-2.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
              <p className="mt-1 text-[11px] text-gray-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[11px] text-gray-600 text-center">
          Data sources: SEC EDGAR · Yahoo Finance · OpenAI API
        </p>
      </div>
    </div>
  );
}
