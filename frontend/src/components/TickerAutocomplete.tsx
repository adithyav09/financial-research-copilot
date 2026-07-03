import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { api } from "../api/client";
import type { TickerCompany as CompanyEntry } from "../types";

interface Props {
  value: string;
  onChange: (ticker: string, companyName?: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  size?: "sm" | "lg";
}

export default function TickerAutocomplete({ value, onChange, placeholder = "Search a company or ticker — Apple, AAPL…", autoFocus = false, size = "sm" }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CompanyEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only sync from parent when it changes externally (e.g. onTickerChange from sidebar clear)
  const prevValueRef = useRef(value);
  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      setQuery(value);
    }
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 1) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await api.tickers(q, 8);
      setResults(res.results);
      setOpen(true);
      setHighlighted(0);
    } catch {
      // Backend/SEC hiccup — keep the field usable; Enter still commits the raw value.
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep the user's text as typed — they may be searching by company name.
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 180);
  };

  // A bare typed value is only committed as a ticker if it looks like one (short,
  // no spaces). Longer text is a name search and must be picked from the dropdown,
  // so we never mistakenly treat "Apple" as the ticker APPLE.
  const looksLikeTicker = (s: string) => /^[A-Za-z.\-]{1,6}$/.test(s.trim());

  const commitRaw = (raw: string): boolean => {
    const val = raw.trim();
    if (!val || !looksLikeTicker(val)) return false;
    const up = val.toUpperCase();
    setQuery(up);
    prevValueRef.current = up;
    onChange(up);
    setOpen(false);
    return true;
  };

  const select = (entry: CompanyEntry) => {
    setQuery(entry.ticker);
    prevValueRef.current = entry.ticker;
    onChange(entry.ticker, entry.title);
    setOpen(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && results[highlighted]) select(results[highlighted]);
      else commitRaw((e.target as HTMLInputElement).value);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    if (e.key === "Escape") setOpen(false);
  };

  const handleBlur = () => {
    // Only auto-commit ticker-like text on blur (supports pasting a symbol);
    // a half-typed company name is left alone until the user picks a result.
    setTimeout(() => {
      setOpen(false);
      if (query && query.toUpperCase() !== value) commitRaw(query);
    }, 150);
  };

  const inputSize = size === "lg" ? "py-3 pl-10 text-base" : "py-2 pl-8 text-sm";
  const iconPos = size === "lg" ? "left-3.5 w-4 h-4" : "left-3 w-3.5 h-3.5";

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        {loading
          ? <Loader2 className={`absolute top-1/2 -translate-y-1/2 text-gray-500 animate-spin pointer-events-none ${iconPos}`} />
          : <Search className={`absolute top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none ${iconPos}`} />}
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKey}
          onBlur={handleBlur}
          onFocus={() => query.length > 0 && results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          maxLength={48}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          className={`w-full pr-3 bg-surface rounded-lg border border-border text-white placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all ${inputSize}`}
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-secondary border border-border rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-50 max-h-60 overflow-y-auto">
          {results.map((entry, i) => (
            <button
              key={entry.cik_str}
              onMouseDown={(e) => { e.preventDefault(); select(entry); }}
              onMouseEnter={() => setHighlighted(i)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                i === highlighted ? "bg-accent/10" : "hover:bg-surface-tertiary"
              }`}
            >
              <span className="font-mono text-xs font-bold text-accent w-14 shrink-0">{entry.ticker}</span>
              <span className="text-xs text-gray-300 truncate">{entry.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
