"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useBybitKline } from "@/hooks/use-bybit-kline";
import { useBybitDepth, type BybitDepth } from "@/hooks/use-bybit-depth";
import type { ADLTicker } from "@/lib/types";

/* ── helpers ─────────────────────────────────────── */

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function formatUsd(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function formatPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(4);
  return v.toFixed(6);
}

/* ── main panel ──────────────────────────────────── */

export function ADLDetailPanel({ ticker }: { ticker: ADLTicker }) {
  const { data: kline, loading } = useBybitKline(ticker.symbol);
  const depth = useBybitDepth(ticker.symbol);

  // Merge last/mark/index klines by timestamp
  const chartData = (() => {
    const map = new Map<number, { time: number; last?: number; mark?: number; index?: number }>();
    for (const k of kline.last) {
      const entry = map.get(k.timestamp) || { time: k.timestamp };
      entry.last = k.close;
      map.set(k.timestamp, entry);
    }
    for (const k of kline.mark) {
      const entry = map.get(k.timestamp) || { time: k.timestamp };
      entry.mark = k.close;
      map.set(k.timestamp, entry);
    }
    for (const k of kline.index) {
      const entry = map.get(k.timestamp) || { time: k.timestamp };
      entry.index = k.close;
      map.set(k.timestamp, entry);
    }
    return Array.from(map.values()).sort((a, b) => a.time - b.time);
  })();

  const lastPrice = ticker.last_price;
  const markPrice = ticker.mark_price;
  const indexPrice = ticker.index_price;
  const markDiffPct = lastPrice > 0 ? ((markPrice - lastPrice) / lastPrice * 100) : 0;
  const indexDiffPct = lastPrice > 0 ? ((indexPrice - lastPrice) / lastPrice * 100) : 0;

  return (
    <div className="flex gap-4 p-4 bg-void/50 border-t border-border/30">
      {/* ── Left: Chart (~60%) ── */}
      <div className="flex-[3] min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <h4 className="text-xs font-medium text-muted">30min Price Chart</h4>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-white inline-block rounded" />
              Last {formatPrice(lastPrice)}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-accent inline-block rounded" />
              Mark {formatPrice(markPrice)}
              <span className={markDiffPct >= 0 ? "text-safe" : "text-danger"}>
                ({markDiffPct >= 0 ? "+" : ""}{markDiffPct.toFixed(3)}%)
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-purple-400 inline-block rounded" />
              Index {formatPrice(indexPrice)}
              <span className={indexDiffPct >= 0 ? "text-safe" : "text-danger"}>
                ({indexDiffPct >= 0 ? "+" : ""}{indexDiffPct.toFixed(3)}%)
              </span>
            </span>
          </div>
        </div>

        {loading && kline.last.length === 0 ? (
          <div className="h-[160px] flex items-center justify-center text-muted text-xs">
            Loading chart...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="time"
                tickFormatter={formatTime}
                tick={{ fill: "#6b7280", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "#6b7280", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => formatPrice(v)}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  background: "#111118",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelFormatter={(v) => formatTime(Number(v))}
                formatter={(v) => [formatPrice(Number(v)), ""]}
              />
              <Line
                type="monotone"
                dataKey="last"
                stroke="#e5e7eb"
                strokeWidth={1.5}
                dot={false}
                name="Last"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="mark"
                stroke="#06b6d4"
                strokeWidth={1.2}
                dot={false}
                name="Mark"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="index"
                stroke="#a78bfa"
                strokeWidth={1.2}
                dot={false}
                name="Index"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Right: Depth + Risk (~40%) ── */}
      <div className="flex-[2] flex flex-col gap-3 min-w-[200px]">
        {/* Depth */}
        <MiniDepth depth={depth} />

        {/* ADL Risk from ticker data */}
        <MiniRisk ticker={ticker} />
      </div>
    </div>
  );
}

/* ── Mini Depth ──────────────────────────────────── */

function MiniDepth({ depth }: { depth: BybitDepth | null }) {
  if (!depth) {
    return (
      <div className="text-muted text-xs text-center py-2">Loading depth...</div>
    );
  }

  const max = Math.max(depth.bidTotal3Pct, depth.askTotal3Pct, 1);

  return (
    <div>
      <h4 className="text-xs font-medium text-muted mb-2">Liquidity Depth</h4>
      <div className="space-y-1.5">
        <DepthBar label="Bid -1%" value={depth.bidTotal1Pct} max={max} side="bid" />
        <DepthBar label="Ask +1%" value={depth.askTotal1Pct} max={max} side="ask" />
        <DepthBar label="Bid -3%" value={depth.bidTotal3Pct} max={max} side="bid" />
        <DepthBar label="Ask +3%" value={depth.askTotal3Pct} max={max} side="ask" />
      </div>
    </div>
  );
}

function DepthBar({ label, value, max, side }: { label: string; value: number; max: number; side: "bid" | "ask" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color = side === "bid" ? "bg-safe" : "bg-danger";

  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="text-muted w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-white w-14 text-right">{formatUsd(value)}</span>
    </div>
  );
}

/* ── Mini Risk ───────────────────────────────────── */

function MiniRisk({ ticker }: { ticker: ADLTicker }) {
  // Derive a 0-100 risk score from ADL data
  const drawdownScore = Math.min(33, (ticker.drawdown_pct / 30) * 33);
  const fundingScore = Math.min(33, (Math.abs(ticker.funding_rate) / 0.1) * 33);
  const gapScore = Math.min(34, (ticker.mark_last_gap_pct / 2) * 34);
  const totalScore = Math.round(drawdownScore + fundingScore + gapScore);

  const color =
    totalScore >= 75 ? "#ef4444" : totalScore >= 50 ? "#f59e0b" : totalScore >= 25 ? "#06b6d4" : "#10b981";
  const label =
    totalScore >= 75 ? "HIGH" : totalScore >= 50 ? "ELEVATED" : totalScore >= 25 ? "MODERATE" : "LOW";

  return (
    <div>
      <h4 className="text-xs font-medium text-muted mb-2">ADL Risk</h4>
      <div className="flex items-center gap-3">
        {/* Score circle */}
        <div
          className="w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center shrink-0"
          style={{ borderColor: color }}
        >
          <span className="text-sm font-bold font-mono" style={{ color }}>{totalScore}</span>
          <span className="text-[7px] font-medium" style={{ color }}>{label}</span>
        </div>

        {/* Factor bars */}
        <div className="flex-1 space-y-1">
          <FactorBar label="Drawdown" value={ticker.drawdown_pct} max={30} display={`${ticker.drawdown_pct.toFixed(1)}%`} />
          <FactorBar label="Funding" value={Math.abs(ticker.funding_rate)} max={0.1} display={`${ticker.funding_rate.toFixed(4)}%`} />
          <FactorBar label="Gap" value={ticker.mark_last_gap_pct} max={2} display={`${ticker.mark_last_gap_pct.toFixed(2)}%`} />
        </div>
      </div>
    </div>
  );
}

function FactorBar({ label, value, max, display }: { label: string; value: number; max: number; display: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 80 ? "bg-danger" : pct >= 50 ? "bg-warn" : "bg-safe";

  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <span className="text-muted w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-surface rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-white w-16 text-right">{display}</span>
    </div>
  );
}
