import { Activity } from "lucide-react";

interface NavbarProps {
  backendStatus: "healthy" | "offline" | "checking";
}

export default function Navbar({ backendStatus }: NavbarProps) {
  const statusColor =
    backendStatus === "healthy"
      ? "bg-emerald-500"
      : backendStatus === "checking"
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface-secondary">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-accent" />
        <span className="text-lg font-semibold tracking-tight">
          Financial Research Copilot
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className={`w-2 h-2 rounded-full ${statusColor}`} />
        <span>
          {backendStatus === "healthy"
            ? "Backend connected"
            : backendStatus === "checking"
              ? "Connecting..."
              : "Backend offline"}
        </span>
      </div>
    </nav>
  );
}
