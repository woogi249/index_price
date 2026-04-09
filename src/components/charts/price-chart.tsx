"use client";
import { useMemo } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
  ReferenceLine,
  useXAxisScale,
  useYAxisScale,
  usePlotArea,
} from "recharts";
// NOTE: recharts v3 only creates axis scales when a built-in component (Line, Bar, etc.)
// references that axis. A hidden <Line yAxisId={0} dataKey="close" /> is used below
// to force scale creation for the left Y-axis used by the candlestick layer.
import type { PriceTick } from "@/lib/types";
import { SPREAD_WARN_THRESHOLD } from "@/lib/constants";

const CANDLE_INTERVAL_MS = 5_000;

/* ── types ─────────────────────────────────────────── */

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  markPrice: number;
  indexPrice: number;
  markLastPct: number;
  indexLastPct: number;
  spreadPct: number;
}

/* ── helpers ────────────────────────────────────────── */

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

function formatPrice(v: number): string {
  if (v >= 1000) return v.toFixed(1);
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

function formatPctAxis(v: number): string {
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(3)}%`;
}

/* ── aggregate ticks → candles ─────────────────────── */

function aggregateCandles(ticks: PriceTick[]): Candle[] {
  if (ticks.length === 0) return [];

  const candles: Candle[] = [];
  let cur: Candle | null = null;

  for (const t of ticks) {
    const slot = Math.floor(t.timestamp / CANDLE_INTERVAL_MS) * CANDLE_INTERVAL_MS;
    const mlPct = t.lastPrice > 0 ? ((t.markPrice - t.lastPrice) / t.lastPrice) * 100 : 0;
    const ilPct = t.lastPrice > 0 ? ((t.indexPrice - t.lastPrice) / t.lastPrice) * 100 : 0;

    if (!cur || cur.timestamp !== slot) {
      if (cur) candles.push(cur);
      cur = {
        timestamp: slot,
        open: t.lastPrice,
        high: t.lastPrice,
        low: t.lastPrice,
        close: t.lastPrice,
        markPrice: t.markPrice,
        indexPrice: t.indexPrice,
        markLastPct: mlPct,
        indexLastPct: ilPct,
        spreadPct: t.spreadPct,
      };
    } else {
      cur.high = Math.max(cur.high, t.lastPrice);
      cur.low = Math.min(cur.low, t.lastPrice);
      cur.close = t.lastPrice;
      cur.markPrice = t.markPrice;
      cur.indexPrice = t.indexPrice;
      cur.markLastPct = mlPct;
      cur.indexLastPct = ilPct;
      cur.spreadPct = t.spreadPct;
    }
  }
  if (cur) candles.push(cur);
  return candles;
}

/* ── candlestick SVG layer (uses LEFT y-axis) ──────── */

function CandlestickLayer({ candles }: { candles: Candle[] }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale(0);
  const plotArea = usePlotArea();

  if (!xScale || !yScale || !plotArea || candles.length === 0) return null;

  const candleWidth = Math.max(
    2,
    Math.min(12, (plotArea.width / candles.length) * 0.6)
  );

  return (
    <g>
      {candles.map((c: Candle, i: number) => {
        const cx = xScale(c.timestamp);
        if (cx == null || isNaN(cx)) return null;

        const yHigh = yScale(c.high);
        const yLow = yScale(c.low);
        const yOpen = yScale(c.open);
        const yClose = yScale(c.close);

        if ([yHigh, yLow, yOpen, yClose].some((v) => v == null || isNaN(v))) return null;

        const bullish = c.close >= c.open;
        const bodyTop = bullish ? yClose : yOpen;
        const bodyBottom = bullish ? yOpen : yClose;
        const bodyHeight = Math.max(1, bodyBottom - bodyTop);
        const color = bullish ? "#10b981" : "#ef4444";

        return (
          <g key={i}>
            <line x1={cx} x2={cx} y1={yHigh} y2={yLow} stroke={color} strokeWidth={1} />
            <rect
              x={cx - candleWidth / 2}
              y={bodyTop}
              width={candleWidth}
              height={bodyHeight}
              fill={color}
              stroke={color}
              strokeWidth={0.5}
              rx={0.5}
            />
          </g>
        );
      })}
    </g>
  );
}

/* ── custom tooltip ────────────────────────────────── */

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as Candle;
  if (!d) return null;

  return (
    <div className="bg-surface border border-border rounded-lg p-3 text-xs shadow-xl">
      <p className="text-muted mb-2">{formatTime(d.timestamp)}</p>
      <div className="space-y-1">
        <div className="grid grid-cols-4 gap-x-2 text-[10px] font-mono">
          <span className="text-muted">O</span>
          <span className="text-white">{formatPrice(d.open)}</span>
          <span className="text-muted">H</span>
          <span className="text-white">{formatPrice(d.high)}</span>
          <span className="text-muted">L</span>
          <span className="text-white">{formatPrice(d.low)}</span>
          <span className="text-muted">C</span>
          <span className="text-white">{formatPrice(d.close)}</span>
        </div>
        <hr className="border-border my-1" />
        <p>
          <span className="text-accent">Mark-Last:</span>{" "}
          <span className={`font-mono ${pctColor(d.markLastPct)}`}>{pctStr(d.markLastPct)}</span>
        </p>
        <p>
          <span className="text-[#a78bfa]">Index-Last:</span>{" "}
          <span className={`font-mono ${pctColor(d.indexLastPct)}`}>{pctStr(d.indexLastPct)}</span>
        </p>
        <hr className="border-border my-1" />
        <p>
          <span className="text-muted">Mark-Index:</span>{" "}
          <span className={`font-mono ${pctColor(d.spreadPct)}`}>{pctStr(d.spreadPct)}</span>
        </p>
      </div>
    </div>
  );
}

/* ── main chart component ──────────────────────────── */

interface Props {
  data: PriceTick[];
}

export function PriceChart({ data }: Props) {
  const candles = useMemo(() => aggregateCandles(data), [data]);

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted text-sm">
        Waiting for price data...
      </div>
    );
  }

  /* latest deviation % */
  const last = data[data.length - 1];
  const markLastPct = last.lastPrice > 0
    ? ((last.markPrice - last.lastPrice) / last.lastPrice) * 100
    : 0;
  const indexLastPct = last.lastPrice > 0
    ? ((last.indexPrice - last.lastPrice) / last.lastPrice) * 100
    : 0;

  /* spread violation zones */
  const spreadZones: { x1: number; x2: number }[] = [];
  let zoneStart: number | null = null;
  for (let i = 0; i < candles.length; i++) {
    const over = Math.abs(candles[i].spreadPct) >= SPREAD_WARN_THRESHOLD;
    if (over && zoneStart === null) zoneStart = candles[i].timestamp;
    if (!over && zoneStart !== null) {
      spreadZones.push({ x1: zoneStart, x2: candles[i - 1].timestamp });
      zoneStart = null;
    }
  }
  if (zoneStart !== null) {
    spreadZones.push({ x1: zoneStart, x2: candles[candles.length - 1].timestamp });
  }

  /* left Y domain: candle prices only */
  const priceLows = candles.map((c) => c.low);
  const priceHighs = candles.map((c) => c.high);
  const yMin = Math.min(...priceLows);
  const yMax = Math.max(...priceHighs);
  const yPad = (yMax - yMin) * 0.08 || yMax * 0.001;

  /* right Y domain: % deviation — symmetric around 0 */
  const allPcts = candles.flatMap((c) => [c.markLastPct, c.indexLastPct]);
  const pctAbs = Math.max(0.01, ...allPcts.map(Math.abs));
  const pctPad = pctAbs * 1.3;

  return (
    <div className="h-full w-full flex flex-col">
      {/* header with deviation badges */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <h3 className="text-sm font-medium text-muted">Price Overlay</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-safe/60 border border-safe" /> Last
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-accent rounded" /> Mark
            <span className={`font-mono text-[10px] ${pctColor(markLastPct)}`}>
              {pctStr(markLastPct)}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#a78bfa] rounded" /> Index
            <span className={`font-mono text-[10px] ${pctColor(indexLastPct)}`}>
              {pctStr(indexLastPct)}
            </span>
          </span>
        </div>
      </div>

      {/* chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={candles} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            {spreadZones.map((zone, i) => (
              <ReferenceArea
                key={i}
                x1={zone.x1}
                x2={zone.x2}
                yAxisId={0}
                fill="#ef4444"
                fillOpacity={0.08}
                strokeOpacity={0}
              />
            ))}

            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTime}
              stroke="#333"
              tick={{ fill: "#666", fontSize: 10 }}
              tickLine={false}
              minTickGap={50}
              type="number"
              domain={["dataMin", "dataMax"]}
              scale="linear"
            />

            {/* left axis: absolute price for candles */}
            <YAxis
              yAxisId={0}
              domain={[yMin - yPad, yMax + yPad]}
              stroke="#333"
              tick={{ fill: "#666", fontSize: 10 }}
              tickFormatter={formatPrice}
              tickLine={false}
              width={70}
            />

            {/* right axis: % deviation from last */}
            <YAxis
              yAxisId={1}
              orientation="right"
              domain={[-pctPad, pctPad]}
              stroke="#333"
              tick={{ fill: "#555", fontSize: 9 }}
              tickFormatter={formatPctAxis}
              tickLine={false}
              width={72}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* 0% reference line on right axis */}
            <ReferenceLine
              yAxisId={1}
              y={0}
              stroke="#333"
              strokeDasharray="3 3"
            />

            {/* hidden line to register left axis scale in recharts v3 */}
            <Line
              yAxisId={0}
              dataKey="close"
              stroke="transparent"
              dot={false}
              isAnimationActive={false}
            />

            {/* candlesticks rendered as custom SVG on left axis */}
            <CandlestickLayer candles={candles} />

            {/* mark-last % on right axis */}
            <Line
              yAxisId={1}
              dataKey="markLastPct"
              stroke="#06b6d4"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            {/* index-last % on right axis */}
            <Line
              yAxisId={1}
              dataKey="indexLastPct"
              stroke="#a78bfa"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
