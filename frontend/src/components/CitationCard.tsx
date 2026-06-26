import { useState } from "react";
import { FileText, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import type { Citation } from "../types";

interface CitationCardProps {
  citation: Citation;
  index: number;
}

export default function CitationCard({ citation, index }: CitationCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-surface-tertiary overflow-hidden">
      <div className="flex items-start gap-3 p-3">
        <div className="flex items-center justify-center w-6 h-6 rounded bg-accent/20 text-accent text-xs font-bold shrink-0 mt-0.5">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm text-gray-300 ${expanded ? "" : "line-clamp-2"}`}>
            {citation.text}
          </p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3 text-gray-500 shrink-0" />
              <span className="text-xs text-gray-500 truncate">{citation.source}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded ? "less" : "more"}
              </button>
              {citation.url && (
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
                  title="Open SEC filing"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open filing
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
