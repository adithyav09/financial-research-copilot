import React, { useState, useRef, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Citation } from "../types";

export function buildHighlightUrl(baseUrl: string | undefined, text: string): string {
  if (!baseUrl) return "#";
  // Use a short verbatim phrase from the start of the chunk for reliable Text Fragment matching.
  // Strip markdown/special chars, take first ~8 words.
  const clean = text.replace(/[*_#>`\[\]]/g, "").replace(/\s+/g, " ").trim();
  const words = clean.split(" ").slice(0, 8).join(" ");
  return `${baseUrl}#:~:text=${encodeURIComponent(words)}`;
}

export function CitationBadge({ num, citation, onOpen }: { num: number; citation: Citation | undefined; onOpen?: () => void }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const open = pos !== null;

  const handleClick = () => {
    // When the in-app filing viewer can show this passage, clicking goes
    // straight there (design 1c). The popover remains the fallback for
    // citations without a chunk (live data, restored history).
    if (onOpen) { onOpen(); return; }
    if (open) { setPos(null); return; }
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.top - 8, left: r.left + r.width / 2 });
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        popRef.current && !popRef.current.contains(e.target as Node)
      ) setPos(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const highlightUrl = citation ? buildHighlightUrl(citation.url, citation.text) : "#";

  return (
    <span className="relative inline-block mx-0.5 align-middle">
      <button
        ref={btnRef}
        onClick={handleClick}
        className={`inline-flex items-center justify-center min-w-4 h-4 px-0.5 text-[9px] font-bold border transition-colors cursor-pointer leading-none ${
          open
            ? "bg-accent-ink text-paper border-accent-ink"
            : "bg-accent-ink-soft text-accent-ink hover:bg-accent-ink-soft border-accent-ink"
        }`}
      >
        {num}
      </button>

      {open && citation && pos && (
        <div
          ref={popRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, transform: "translate(-50%, -100%)", zIndex: 9999 }}
          className="w-80 border border-rule bg-paper-raised shadow-[0_12px_30px_-12px_rgba(20,22,26,0.35)] text-left"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-rule">
            <span className="text-[10px] font-semibold text-accent-ink uppercase tracking-wider">
              Source [{num}]
            </span>
            <a
              href={highlightUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-medium text-ink hover:text-accent-ink bg-paper px-2 py-1 border border-rule hover:border-accent-ink transition-all"
            >
              <ExternalLink className="w-3 h-3" />
              Open &amp; highlight in filing
            </a>
          </div>
          {/* Excerpt */}
          <div className="px-3 py-2.5">
            <p className="text-xs text-ink leading-relaxed line-clamp-6">{citation.text}</p>
            <p className="text-[10px] text-ink-faint mt-2 truncate">{citation.source}</p>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-paper-raised border-r border-b border-rule rotate-45 -mt-[5px]" />
        </div>
      )}
    </span>
  );
}

export type CitationClickHandler = (num: number, citation: Citation) => void;

function makeMarkdownComponents(citations: Citation[], onCitationClick?: CitationClickHandler) {
  return {
    h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-base font-bold text-ink mt-4 mb-1.5">{children}</h1>,
    h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-sm font-semibold text-ink mt-3 mb-1">{children}</h2>,
    h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-sm font-semibold text-ink mt-2 mb-0.5">{children}</h3>,
    p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
    ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-outside ml-4 mb-2 space-y-0.5">{children}</ul>,
    ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-outside ml-4 mb-2 space-y-0.5">{children}</ol>,
    li: ({ children }: { children?: React.ReactNode }) => <li className="leading-relaxed">{children}</li>,
    strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-ink">{children}</strong>,
    em: ({ children }: { children?: React.ReactNode }) => <em className="italic text-ink">{children}</em>,
    code: ({ children }: { children?: React.ReactNode }) => <code className="font-mono text-xs bg-paper px-1 py-0.5 text-accent-ink">{children}</code>,
    // Custom span handles our cit-N placeholders
    span: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
      if (typeof className === "string" && className.startsWith("cit-")) {
        const num = parseInt(className.replace("cit-", ""));
        const citation = citations[num - 1];
        // Only filing citations (with a chunk to show) route to the viewer
        const openable = onCitationClick && citation?.chunk_index != null;
        return (
          <CitationBadge
            num={num}
            citation={citation}
            onOpen={openable ? () => onCitationClick(num, citation) : undefined}
          />
        );
      }
      return <span className={className}>{children}</span>;
    },
  };
}

// Sanitize schema: start from defaultSchema (allows standard markdown output elements),
// then additionally permit <span> tags but ONLY when the class matches our cit-N sentinel.
// All other HTML from the LLM (e.g. <script>, <img>, <a onclick=...>) is stripped.
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [
      [
        "className",
        // Only class values matching cit-<digits> are allowed through
        /^cit-\d+$/,
      ],
    ],
  },
  tagNames: [...(defaultSchema.tagNames ?? []), "span"],
};

/**
 * Renders answer markdown with [N] markers replaced by interactive citation
 * badges. Pass an empty citations array for citation-less markdown.
 */
export default function AnswerMarkdown({ content, citations, onCitationClick }: {
  content: string;
  citations: Citation[];
  onCitationClick?: CitationClickHandler;
}) {
  if (!citations.length) {
    return <ReactMarkdown components={makeMarkdownComponents([]) as never}>{content}</ReactMarkdown>;
  }
  // Replace [N] markers with sentinel spans before markdown parsing.
  // rehype-raw re-parses the inline HTML; rehype-sanitize then strips
  // everything except our cit-N spans (and standard markdown output tags).
  const prepared = content.replace(/\[(\d+)\]/g, (_m, n) => `<span class="cit-${n}"></span>`);
  return (
    <ReactMarkdown
      components={makeMarkdownComponents(citations, onCitationClick) as never}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
    >
      {prepared}
    </ReactMarkdown>
  );
}
