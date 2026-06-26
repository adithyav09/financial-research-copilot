import type { AnalysisMode } from "../types";
import {
  TrendingDown,
  TrendingUp,
  Coins,
  Award,
  ShieldCheck,
  Leaf,
  Swords,
} from "lucide-react";

interface ModeSelectorProps {
  mode: AnalysisMode;
  onChange: (mode: AnalysisMode) => void;
}

const modes: { id: AnalysisMode; label: string; icon: typeof TrendingDown; description: string }[] = [
  {
    id: "value",
    label: "Value",
    icon: TrendingDown,
    description: "Margins, FCF, debt, risks",
  },
  {
    id: "growth",
    label: "Growth",
    icon: TrendingUp,
    description: "Revenue, R&D, expansion",
  },
  {
    id: "income",
    label: "Income",
    icon: Coins,
    description: "Dividends, payout, cash coverage",
  },
  {
    id: "quality",
    label: "Quality",
    icon: Award,
    description: "ROE, ROIC, moats, margins",
  },
  {
    id: "risk_averse",
    label: "Risk-Averse",
    icon: ShieldCheck,
    description: "Leverage, coverage, risk factors",
  },
  {
    id: "esg",
    label: "ESG",
    icon: Leaf,
    description: "Governance, board, sustainability",
  },
  {
    id: "activist",
    label: "Activist",
    icon: Swords,
    description: "Insiders, buybacks, accounting",
  },
];

export default function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="space-y-1">
      {modes.map((m) => {
        const Icon = m.icon;
        const isActive = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
              isActive
                ? "bg-accent/10 border border-accent/30 text-white"
                : "border border-transparent hover:bg-surface-tertiary text-gray-400 hover:text-gray-200"
            }`}
          >
            <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-accent" : "text-gray-600"}`} />
            <div className="min-w-0">
              <div className={`text-xs font-semibold ${isActive ? "text-white" : "text-gray-300"}`}>{m.label}</div>
              <div className="text-[10px] text-gray-600 truncate">{m.description}</div>
            </div>
            {isActive && <div className="ml-auto w-1 h-4 rounded-full bg-accent shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
