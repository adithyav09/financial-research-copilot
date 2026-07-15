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

export function CitationBadge({ num, citation }: { num: number; citation: Citation | undefined }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const open = pos !== null;

  const handleClick = () => {
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
        className={`inline-flex items-center justify-center min-w-4 h-4 px-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer leading-none ${
          open
            ? "bg-accent text-white border-accent"
            : "bg-accent/20 text-accent-hover hover:bg-accent/40 border-accent/35"
        }`}
      >
        {num}
      </button>

      {open && citation && pos && (
        <div
          ref={popRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, transform: "translate(-50%, -100%)", zIndex: 9999 }}
          className="w-80 rounded-xl border border-border bg-surface-secondary shadow-2xl shadow-black/70 text-left"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-border">
            <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">
              Source [{num}]
            </span>
            <a
              href={highlightUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-medium text-gray-300 hover:text-accent bg-surface px-2 py-1 rounded-md border border-border hover:border-accent/40 transition-all"
            >
              <ExternalLink className="w-3 h-3" />
              Open &amp; highlight in filing
            </a>
          </div>
          {/* Excerpt */}
          <div className="px-3 py-2.5">
            <p className="text-xs text-gray-300 leading-relaxed line-clamp-6">{citation.text}</p>
            <p className="text-[10px] text-gray-600 mt-2 truncate">{citation.source}</p>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-surface-secondary border-r border-b border-border rotate-45 -mt-[5px]" />
        </div>
      )}
    </span>
  );
}

function makeMarkdownComponents(citations: Citation[]) {
  return {
    h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-base font-bold text-white mt-4 mb-1.5">{children}</h1>,
    h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-sm font-semibold text-white mt-3 mb-1">{children}</h2>,
    h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-sm font-semibold text-gray-200 mt-2 mb-0.5">{children}</h3>,
    p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
    ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-outside ml-4 mb-2 space-y-0.5">{children}</ul>,
    ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-outside ml-4 mb-2 space-y-0.5">{children}</ol>,
    li: ({ children }: { children?: React.ReactNode }) => <li className="leading-relaxed">{children}</li>,
    strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-white">{children}</strong>,
    em: ({ children }: { children?: React.ReactNode }) => <em className="italic text-gray-300">{children}</em>,
    code: ({ children }: { children?: React.ReactNode }) => <code className="font-mono text-xs bg-surface px-1 py-0.5 rounded text-accent">{children}</code>,
    // Custom span handles our cit-N placeholders
    span: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
      if (typeof className === "string" && className.startsWith("cit-")) {
        const num = parseInt(className.replace("cit-", ""));
        return <CitationBadge num={num} citation={citations[num - 1]} />;
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
export default function AnswerMarkdown({ content, citations }: { content: string; citations: Citation[] }) {
  if (!citations.length) {
    return <ReactMarkdown components={makeMarkdownComponents([]) as never}>{content}</ReactMarkdown>;
  }
  // Replace [N] markers with sentinel spans before markdown parsing.
  // rehype-raw re-parses the inline HTML; rehype-sanitize then strips
  // everything except our cit-N spans (and standard markdown output tags).
  const prepared = content.replace(/\[(\d+)\]/g, (_m, n) => `<span class="cit-${n}"></span>`);
  return (
    <ReactMarkdown
      components={makeMarkdownComponents(citations) as never}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
    >
      {prepared}
    </ReactMarkdown>
  );
}
