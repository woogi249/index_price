"use client";
import { useMemo, useState } from "react";
import { useAdl } from "@/hooks/use-adl";
import Link from "next/link";
import type { ADLTicker } from "@/lib/types";

/* ── helpers ─────────────────────────────────────────── */

function formatLabel(s: string) {
  return s.replace("USDT", "/USDT");
}

function formatPrice(v: number) {
  if (v >= 1000) return v.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

function pct(v: number) {
  return v.toFixed(2) + "%";
}

function drawdownColor(v: number) {
  if (v >= 25) return "text-danger";
  if (v >= 15) return "text-warn";
  if (v >= 10) return "text-yellow-300";
  return "text-muted";
}

function gapColor(v: number) {
  if (v >= 2) return "text-danger";
  if (v >= 1) return "text-warn";
  return "text-muted";
}

function timeAgo(ts: number) {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

/* ── sort ────────────────────────────────────────────── */

type SortKey = "symbol" | "drawdown_pct" | "mark_last_gap_pct" | "last_price" | "high_8h" | "funding_rate" | "candidate_score" | "timestamp";
type SortDir = "asc" | "desc";

type Filter = "all" | "warning" | "fake_gap" | "new_listing" | "candidate";

/* ── page ────────────────────────────────────────────── */

export default function ADLPage() {
  const { tickers, status } = useAdl();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("candidate_score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState<Filter>("candidate");
  const [minScore, setMinScore] = useState(2);

  const items = useMemo(() => {
    // remove dated futures/options (e.g. BTCUSDT-250411)
    let list = Array.from(tickers.values()).filter(
      (t) => !t.symbol.includes("-")
    );

    // filter
    if (filter === "warning") list = list.filter((t) => t.adl_warning);
    else if (filter === "fake_gap") list = list.filter((t) => t.is_fake_gap);
    else if (filter === "new_listing") list = list.filter((t) => t.is_new_listing);
    else if (filter === "candidate") list = list.filter((t) => t.candidate_score >= minScore && !t.adl_warning && !t.is_fake_gap);

    // search
    if (query) {
      const q = query.toUpperCase();
      list = list.filter((t) => t.symbol.includes(q));
    }

    // sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "symbol":
          cmp = a.symbol.localeCompare(b.symbol);
          break;
        case "drawdown_pct":
          cmp = a.drawdown_pct - b.drawdown_pct;
          break;
        case "mark_last_gap_pct":
          cmp = a.mark_last_gap_pct - b.mark_last_gap_pct;
          break;
        case "last_price":
          cmp = a.last_price - b.last_price;
          break;
        case "high_8h":
          cmp = a.high_8h - b.high_8h;
          break;
        case "funding_rate":
          cmp = Math.abs(a.funding_rate) - Math.abs(b.funding_rate);
          break;
        case "candidate_score":
          cmp = a.candidate_score - b.candidate_score;
          break;
        case "timestamp":
          cmp = a.timestamp - b.timestamp;
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return list;
  }, [tickers, query, sortKey, sortDir, filter, minScore]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "symbol" ? "asc" : "desc");
    }
  };

  const arrow = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " \u25B2" : " \u25BC";
  };

  const statusDot =
    status === "connected"
      ? "bg-safe"
      : status === "error"
        ? "bg-danger"
        : "bg-warn animate-pulse";

  const allTickers = Array.from(tickers.values());
  const warnCount = allTickers.filter((t) => t.adl_warning).length;
  const fakeCount = allTickers.filter((t) => t.is_fake_gap).length;
  const newCount = allTickers.filter((t) => t.is_new_listing).length;
  const candidateCount = allTickers.filter((t) => t.candidate_score >= minScore && !t.adl_warning && !t.is_fake_gap).length;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ── header ── */}
      <div className="flex items-center justify-between h-14 px-6 border-b border-border bg-surface flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-muted hover:text-white transition-colors text-sm">
            &larr; Overview
          </Link>
          <div className="w-px h-5 bg-border" />
          <svg width="18" height="18" viewBox="0 0 24 24" className="text-danger">
            <path
              d="M12 2L13.5 9H20L14.5 13.5L16.5 21L12 17L7.5 21L9.5 13.5L4 9H10.5L12 2Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-lg font-bold tracking-tight">ADL Monitor</span>
          <span className="text-xs text-muted bg-void px-2 py-0.5 rounded-full border border-border">
            Bybit USDT Perps
          </span>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol..."
            className="w-52 px-3 py-1.5 bg-void border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent/40"
          />
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${statusDot}`} />
            <span className="text-muted">{tickers.size} tracked</span>
          </div>
        </div>
      </div>

      {/* ── stats bar ── */}
      <div className="flex items-center gap-3 px-6 py-2.5 border-b border-border/50 bg-void">
        <FilterPill
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label={`All (${items.length})`}
        />
        <FilterPill
          active={filter === "warning"}
          onClick={() => setFilter("warning")}
          label={`ADL Warning (${warnCount})`}
          color="danger"
        />
        <FilterPill
          active={filter === "fake_gap"}
          onClick={() => setFilter("fake_gap")}
          label={`Fake Gap (${fakeCount})`}
          color="warn"
        />
        <FilterPill
          active={filter === "candidate"}
          onClick={() => setFilter("candidate")}
          label={`Candidate (${candidateCount})`}
          color="warn"
        />
        {filter === "candidate" && (
          <div className="flex items-center gap-1.5 ml-1 px-2 py-0.5 rounded-lg bg-surface border border-border">
            <span className="text-[11px] text-muted">Score</span>
            <button
              className="w-5 h-5 flex items-center justify-center rounded bg-void text-muted hover:text-white text-xs font-bold"
              onClick={() => setMinScore((s) => Math.max(1, s - 1))}
            >
              -
            </button>
            <span className="text-xs font-mono text-white w-3 text-center">{minScore}</span>
            <button
              className="w-5 h-5 flex items-center justify-center rounded bg-void text-muted hover:text-white text-xs font-bold"
              onClick={() => setMinScore((s) => Math.min(7, s + 1))}
            >
              +
            </button>
          </div>
        )}
        <FilterPill
          active={filter === "new_listing"}
          onClick={() => setFilter("new_listing")}
          label={`New Listing (${newCount})`}
          color="accent"
        />
      </div>

      {/* ── table ── */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface border-b border-border z-10">
            <tr className="text-muted text-xs uppercase tracking-wider">
              <Th onClick={() => handleSort("symbol")} label={"Symbol" + arrow("symbol")} align="left" />
              <Th onClick={() => handleSort("last_price")} label={"Last Price" + arrow("last_price")} />
              <Th onClick={() => handleSort("drawdown_pct")} label={"8h Drawdown" + arrow("drawdown_pct")} />
              <Th onClick={() => handleSort("mark_last_gap_pct")} label={"Mark-Last Gap" + arrow("mark_last_gap_pct")} />
              <Th onClick={() => handleSort("high_8h")} label={"8h High" + arrow("high_8h")} />
              <Th onClick={() => handleSort("funding_rate")} label={"Funding" + arrow("funding_rate")} />
              <Th onClick={() => handleSort("candidate_score")} label={"Score" + arrow("candidate_score")} />
              <Th label="Status" />
              <Th label="Binance OI Chg" />
              <Th onClick={() => handleSort("timestamp")} label={"Updated" + arrow("timestamp")} />
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <TickerRow key={t.symbol} ticker={t} />
            ))}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-60 text-muted gap-2">
            {status === "connecting" ? (
              <>
                <Spinner />
                <span className="text-sm">Connecting to ADL pipeline...</span>
              </>
            ) : tickers.size === 0 ? (
              <>
                <span className="text-2xl">~</span>
                <span className="text-sm">Waiting for data — tickers appear when drawdown &gt; 10% or gaps detected</span>
              </>
            ) : (
              <span className="text-sm">No symbols match current filters</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── sub-components ──────────────────────────────────── */

function TickerRow({ ticker: t }: { ticker: ADLTicker }) {
  return (
    <tr className="border-b border-border/50 hover:bg-surface-hover transition-colors">
      {/* Symbol */}
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-accent">{formatLabel(t.symbol)}</span>
          {t.is_new_listing && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/30 font-medium">
              NEW
            </span>
          )}
        </div>
      </td>

      {/* Last Price */}
      <td className="px-4 py-2.5 text-right font-mono text-white">
        {formatPrice(t.last_price)}
      </td>

      {/* 8h Drawdown */}
      <td className="px-4 py-2.5 text-right">
        <div className="flex items-center justify-end gap-2">
          <DrawdownBar pct={t.drawdown_pct} />
          <span className={`font-mono font-medium ${drawdownColor(t.drawdown_pct)}`}>
            {pct(t.drawdown_pct)}
          </span>
        </div>
      </td>

      {/* Mark-Last Gap */}
      <td className={`px-4 py-2.5 text-right font-mono ${gapColor(t.mark_last_gap_pct)}`}>
        {pct(t.mark_last_gap_pct)}
      </td>

      {/* 8h High */}
      <td className="px-4 py-2.5 text-right font-mono text-muted">
        {formatPrice(t.high_8h)}
      </td>

      {/* Funding Rate */}
      <td className={`px-4 py-2.5 text-right font-mono ${fundingColor(t.funding_rate)}`}>
        {t.funding_rate !== 0 ? (t.funding_rate >= 0 ? "+" : "") + t.funding_rate.toFixed(4) + "%" : "—"}
      </td>

      {/* Candidate Score */}
      <td className="px-4 py-2.5 text-right">
        <ScoreDots score={t.candidate_score} />
      </td>

      {/* Status badges */}
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1.5 justify-end flex-wrap">
          {t.is_candidate && !t.adl_warning && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-yellow-400/15 text-yellow-300 border-yellow-400/30">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              Bybit CAND
            </span>
          )}
          {t.adl_warning && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-danger/15 text-danger border-danger/30">
              <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
              Bybit ADL
            </span>
          )}
          {t.is_fake_gap && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-warn/15 text-warn border-warn/30">
              <span className="w-1.5 h-1.5 rounded-full bg-warn" />
              Bybit Only
            </span>
          )}
          {t.binance_oi_change_pct != null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-accent/10 text-accent/70 border-accent/20">
              Binance checked
            </span>
          )}
        </div>
      </td>

      {/* Binance OI Change */}
      <td className="px-4 py-2.5 text-right font-mono text-muted">
        {t.binance_oi_change_pct != null ? pct(t.binance_oi_change_pct) : "—"}
      </td>

      {/* Updated */}
      <td className="px-4 py-2.5 text-right text-muted text-xs">
        {timeAgo(t.timestamp)}
      </td>
    </tr>
  );
}

function fundingColor(rate: number) {
  const abs = Math.abs(rate);
  if (abs >= 0.05) return "text-danger";
  if (abs >= 0.03) return "text-warn";
  return "text-muted";
}

function ScoreDots({ score }: { score: number }) {
  const max = 7;
  const color =
    score >= 5 ? "bg-danger" : score >= 3 ? "bg-warn" : score >= 2 ? "bg-yellow-400" : "bg-muted/40";
  return (
    <div className="flex items-center justify-end gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={`w-1.5 h-3 rounded-sm ${i < score ? color : "bg-white/5"}`}
        />
      ))}
      <span className={`ml-1.5 text-xs font-mono ${score >= 2 ? "text-white" : "text-muted"}`}>
        {score}
      </span>
    </div>
  );
}

function DrawdownBar({ pct }: { pct: number }) {
  const w = Math.min(pct / 30 * 100, 100); // 30% = full bar
  const color =
    pct >= 25 ? "bg-danger" : pct >= 15 ? "bg-warn" : pct >= 10 ? "bg-yellow-400" : "bg-muted";
  return (
    <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${w}%` }} />
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: "danger" | "warn" | "accent";
}) {
  const base = "px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer select-none";
  if (active) {
    const colorMap = {
      danger: "bg-danger/15 text-danger border-danger/30",
      warn: "bg-warn/15 text-warn border-warn/30",
      accent: "bg-accent/15 text-accent border-accent/30",
    };
    const c = color ? colorMap[color] : "bg-white/10 text-white border-white/20";
    return <button className={`${base} ${c}`} onClick={onClick}>{label}</button>;
  }
  return (
    <button
      className={`${base} bg-transparent text-muted border-border hover:text-white hover:border-white/20`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Th({
  label,
  onClick,
  align = "right",
  children,
}: {
  label?: string;
  onClick?: () => void;
  align?: "left" | "right";
  children?: React.ReactNode;
}) {
  return (
    <th
      className={`${align === "left" ? "text-left" : "text-right"} px-4 py-3 ${onClick ? "cursor-pointer hover:text-white select-none" : ""}`}
      onClick={onClick}
    >
      {children ?? label}
    </th>
  );
}

function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-muted border-t-accent rounded-full animate-spin" />
  );
}
