import { useState } from "react";
import { Scale, Database, ShieldCheck, Check } from "lucide-react";
import ThesisMark from "./ThesisMark";

export const NOTICE_STORAGE_KEY = "thesis_first_run_acknowledged";

/**
 * Design 1g: the one-time notice that replaced the permanent amber banner.
 * Shown until acknowledged; the acknowledgement is stored in localStorage
 * (per browser, deliberately not per account — it's a disclosure, not consent
 * we need to audit).
 */
export default function FirstRunNotice({ onAcknowledge }: { onAcknowledge: () => void }) {
  const [checked, setChecked] = useState(false);

  const points = [
    {
      icon: Scale,
      title: "Research, not advice",
      body: "Answers summarize public SEC filings and market data. Nothing here is a recommendation to buy or sell anything.",
    },
    {
      icon: Database,
      title: "Your questions are processed by OpenAI",
      body: "Questions and filing excerpts are sent to the OpenAI API to write answers. API data isn't used to train models, and your account details are never sent.",
    },
    {
      icon: ShieldCheck,
      title: "AI can be wrong — every claim is checkable",
      body: "Each number and quote links to the exact passage in the filing. If something matters, click the citation and read the original.",
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-[2px] px-4">
      <div className="w-full max-w-[560px] rounded-2xl border border-[#2a2f3c] bg-surface-secondary shadow-2xl shadow-black/80 p-7">
        <div className="flex items-center gap-2.5 mb-1.5">
          <ThesisMark size={30} />
          <h2 className="text-[17px] font-semibold text-white tracking-tight">Before you research</h2>
        </div>
        <p className="mb-5 text-[12.5px] text-gray-500">Three things worth knowing — you'll only see this once.</p>

        <div className="flex flex-col gap-3.5">
          {points.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="text-[13.5px] font-semibold text-gray-200">{title}</p>
                <p className="mt-0.5 text-[12.5px] text-gray-400 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2.5 mt-5 pt-4 border-t border-border">
          <button
            role="checkbox"
            aria-checked={checked}
            onClick={() => setChecked(c => !c)}
            className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
              checked ? "border-accent bg-accent/20" : "border-gray-600 hover:border-gray-400"
            }`}
          >
            {checked && <Check className="w-2.5 h-2.5 text-accent-hover" strokeWidth={3} />}
          </button>
          <button onClick={() => setChecked(c => !c)} className="text-[12.5px] text-gray-300 text-left">
            I understand — this is a research tool, not financial advice
          </button>
          <button
            onClick={onAcknowledge}
            disabled={!checked}
            className="ml-auto px-4 py-2 rounded-[9px] bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
          >
            Start researching
          </button>
        </div>
      </div>
    </div>
  );
}
