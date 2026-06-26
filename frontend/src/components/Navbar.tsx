import { BarChart2, Circle } from "lucide-react";

interface NavbarProps {
  backendStatus: "healthy" | "offline" | "checking";
}

export default function Navbar({ backendStatus }: NavbarProps) {
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

      <div className="flex items-center gap-4">
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
          <span className="text-gray-400">
            {backendStatus === "healthy"
              ? "Connected"
              : backendStatus === "checking"
                ? "Connecting"
                : "Offline"}
          </span>
        </div>
      </div>
    </nav>
  );
}
