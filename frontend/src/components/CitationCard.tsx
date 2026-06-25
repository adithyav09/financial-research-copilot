import { FileText } from "lucide-react";
import type { Citation } from "../types";

interface CitationCardProps {
  citation: Citation;
  index: number;
}

export default function CitationCard({ citation, index }: CitationCardProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-surface-tertiary rounded-lg border border-border">
      <div className="flex items-center justify-center w-6 h-6 rounded bg-accent/20 text-accent text-xs font-bold shrink-0">
        {index + 1}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-300 line-clamp-2">{citation.text}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <FileText className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-500">
            {citation.source}
            {citation.page && ` · p.${citation.page}`}
          </span>
        </div>
      </div>
    </div>
  );
}
