"use client";
import { useDashboard } from "@/context/dashboard-context";
import { useEffect, useRef, useState } from "react";

function formatLabel(symbol: string): string {
  return symbol.replace("USDT", "/USDT");
}

export function SymbolSelector() {
  const { symbol, setSymbol } = useDashboard();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [allSymbols, setAllSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/symbols")
      .then((r) => r.json())
      .then((data: string[]) => {
        if (Array.isArray(data)) setAllSymbols(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const filtered = query
    ? allSymbols.filter((s) => s.toLowerCase().includes(query.toLowerCase()))
    : allSymbols;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => {
          setOpen(!open);
          setQuery("");
        }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-void border border-border text-sm font-medium hover:border-accent/40 transition-colors"
      >
        <span className="text-accent">{formatLabel(symbol)}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 5L6 8L9 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 w-64 bg-surface border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="종목 검색... (예: BTC, SOL)"
              className="w-full px-2 py-1.5 bg-void border border-border rounded text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent/40"
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-4 text-sm text-muted text-center">불러오는 중...</div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted text-center">결과 없음</div>
            ) : (
              filtered.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSymbol(s);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    s === symbol
                      ? "bg-accent/20 text-accent"
                      : "text-muted hover:bg-void hover:text-white"
                  }`}
                >
                  {formatLabel(s)}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
