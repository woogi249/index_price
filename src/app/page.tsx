"use client";
import { useMemo, useState } from "react";
import { useOverview } from "@/hooks/use-overview";
import Link from "next/link";

function formatLabel(symbol: string): string {
  return symbol.replace("USDT", "/USDT");
}

function formatPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

function pctStr(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(4)}%`;
}

function pctColor(pct: number): string {
  const abs = Math.abs(pct);
  if (abs >= 0.15) return "text-danger";
  if (abs >= 0.05) return "text-warn";
  return "text-muted";
}

function fundingColor(rate: number): string {
  const abs = Math.abs(rate);
  if (abs >= 0.05) return "text-danger";
  if (abs >= 0.01) return "text-warn";
  return "text-muted";
}

type SortKey = "symbol" | "lastPrice" | "markPct" | "indexPct" | "fundingRate";
type SortDir = "asc" | "desc";

export default function OverviewPage() {
  const { data, status } = useOverview();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const ticks = useMemo(() => {
    let items = Array.from(data.values());

    if (query) {
      const q = query.toUpperCase();
      items = items.filter((t) => t.symbol.includes(q));
    }

    items.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "symbol":
          cmp = a.symbol.localeCompare(b.symbol);
          break;
        case "lastPrice":
          cmp = a.lastPrice - b.lastPrice;
          break;
        case "markPct":
          cmp = Math.abs(b.markPct) - Math.abs(a.markPct);
          break;
        case "indexPct":
          cmp = Math.abs(b.indexPct) - Math.abs(a.indexPct);
          break;
        case "fundingRate":
          cmp = Math.abs(b.fundingRate) - Math.abs(a.fundingRate);
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return items;
  }, [data, query, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "symbol" ? "asc" : "desc");
    }
  };

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " \u25B2" : " \u25BC";
  };

  const statusDot =
    status === "connected"
      ? "bg-safe"
      : status === "error"
        ? "bg-danger"
        : "bg-warn animate-pulse";

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between h-14 px-6 border-b border-border bg-surface flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 20 20" className="text-accent">
            <path
              d="M10 1L12.5 7H19L14 11L15.5 18L10 14L4.5 18L6 11L1 7H7.5L10 1Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-lg font-bold tracking-tight">Risk Radar</span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/adl"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
              <path d="M12 2L13.5 9H20L14.5 13.5L16.5 21L12 17L7.5 21L9.5 13.5L4 9H10.5L12 2Z" />
            </svg>
            ADL Monitor
          </Link>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol..."
            className="w-56 px-3 py-1.5 bg-void border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent/40"
          />
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${statusDot}`} />
            <span className="text-muted">{ticks.length} symbols</span>
          </div>
        </div>
      </div>

      {/* table */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface border-b border-border z-10">
            <tr className="text-muted text-xs uppercase tracking-wider">
              <th
                className="text-left px-4 py-3 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort("symbol")}
              >
                Symbol{sortArrow("symbol")}
              </th>
              <th
                className="text-right px-4 py-3 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort("lastPrice")}
              >
                Last Price{sortArrow("lastPrice")}
              </th>
              <th
                className="text-right px-4 py-3 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort("markPct")}
              >
                Mark Deviation{sortArrow("markPct")}
              </th>
              <th
                className="text-right px-4 py-3 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort("indexPct")}
              >
                Index Deviation{sortArrow("indexPct")}
              </th>
              <th
                className="text-right px-4 py-3 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort("fundingRate")}
              >
                Funding Rate{sortArrow("fundingRate")}
              </th>
            </tr>
          </thead>
          <tbody>
            {ticks.map((t) => (
              <Link
                key={t.symbol}
                href={`/symbol/${t.symbol}`}
                className="contents"
              >
                <tr className="border-b border-border/50 hover:bg-surface-hover transition-colors cursor-pointer">
                  <td className="px-4 py-2.5 font-medium text-accent">
                    {formatLabel(t.symbol)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-white">
                    {formatPrice(t.lastPrice)}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono ${pctColor(t.markPct)}`}>
                    {pctStr(t.markPct)}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono ${pctColor(t.indexPct)}`}>
                    {pctStr(t.indexPct)}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono ${fundingColor(t.fundingRate)}`}>
                    {pctStr(t.fundingRate)}
                  </td>
                </tr>
              </Link>
            ))}
          </tbody>
        </table>

        {ticks.length === 0 && (
          <div className="flex items-center justify-center h-40 text-muted text-sm">
            {status === "connecting" ? "Loading symbols..." : "No symbols found"}
          </div>
        )}
      </div>
    </div>
  );
}
