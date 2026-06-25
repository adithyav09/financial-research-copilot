import type { AnalysisMode } from "../types";
import { TrendingDown, TrendingUp } from "lucide-react";

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
];

export default function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
        Analysis Mode
      </label>
      <div className="space-y-1.5">
        {modes.map((m) => {
          const Icon = m.icon;
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onChange(m.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                isActive
                  ? "bg-accent/15 border border-accent/40 text-white"
                  : "border border-transparent hover:bg-surface-tertiary text-gray-300"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-accent" : "text-gray-500"}`} />
              <div>
                <div className="text-sm font-medium">{m.label}</div>
                <div className="text-xs text-gray-500">{m.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
