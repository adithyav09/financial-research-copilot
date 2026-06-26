import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";

interface CompanyEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

let cachedTickers: CompanyEntry[] | null = null;

async function loadTickers(): Promise<CompanyEntry[]> {
  if (cachedTickers) return cachedTickers;
  const res = await fetch("https://www.sec.gov/files/company_tickers.json");
  const raw: Record<string, CompanyEntry> = await res.json();
  cachedTickers = Object.values(raw);
  return cachedTickers;
}

interface Props {
  value: string;
  onChange: (ticker: string, companyName?: string) => void;
  placeholder?: string;
}

export default function TickerAutocomplete({ value, onChange, placeholder = "Ticker — AAPL, MSFT…" }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CompanyEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQuery(value); }, [value]);

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
      const all = await loadTickers();
      const upper = q.toUpperCase();
      const tickerMatches = all.filter(e => e.ticker.startsWith(upper));
      const nameMatches = all.filter(e =>
        !e.ticker.startsWith(upper) && e.title.toUpperCase().includes(upper)
      );
      setResults([...tickerMatches, ...nameMatches].slice(0, 8));
      setOpen(true);
      setHighlighted(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setQuery(val);
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 180);
  };

  const select = (entry: CompanyEntry) => {
    setQuery(entry.ticker);
    onChange(entry.ticker, entry.title);
    setOpen(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    if (e.key === "Enter" && results[highlighted]) { e.preventDefault(); select(results[highlighted]); }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        {loading
          ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 animate-spin pointer-events-none" />
          : <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />}
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKey}
          onFocus={() => query.length > 0 && results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          maxLength={10}
          autoComplete="off"
          spellCheck={false}
          className="w-full pl-8 pr-3 py-2 bg-surface rounded-lg border border-border text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all font-mono tracking-wider"
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
