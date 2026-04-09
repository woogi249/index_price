"use client";
import type { DepthSnapshot } from "@/lib/types";

function formatUsd(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function getBarColor(drainPct: number): string {
  if (drainPct >= 60) return "bg-danger";
  if (drainPct >= 40) return "bg-warn";
  return "bg-safe";
}

function getDrainColor(drainPct: number): string {
  if (drainPct >= 60) return "text-danger";
  if (drainPct >= 40) return "text-warn";
  return "text-muted";
}

interface BarProps {
  label: string;
  value: number;
  maxValue: number;
  drainPct: number;
}

function DepthBar({ label, value, maxValue, drainPct }: BarProps) {
  const widthPct = maxValue > 0 ? Math.min(100, (value / maxValue) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-white">{formatUsd(value)}</span>
          {drainPct > 0 && (
            <span className={`font-mono text-[10px] ${getDrainColor(drainPct)}`}>
              -{drainPct.toFixed(0)}%
            </span>
          )}
        </div>
      </div>
      <div className="h-2.5 bg-void rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${getBarColor(drainPct)}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

interface Props {
  data: DepthSnapshot | null;
}

export function DepthGauge({ data }: Props) {
  if (!data) {
    return (
      <div className="h-full flex items-center justify-center text-muted text-sm">
        Waiting for depth data...
      </div>
    );
  }

  const maxValue = Math.max(
    data.bidDepth1Pct,
    data.bidDepth3Pct,
    data.askDepth1Pct,
    data.askDepth3Pct,
    1
  );

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-sm font-medium text-muted mb-3">Liquidity Depth</h3>
      <div className="flex-1 flex flex-col justify-center gap-3">
        <DepthBar
          label="Bid -1%"
          value={data.bidDepth1Pct}
          maxValue={maxValue}
          drainPct={Math.max(0, data.bidDrainPct)}
        />
        <DepthBar
          label="Ask +1%"
          value={data.askDepth1Pct}
          maxValue={maxValue}
          drainPct={Math.max(0, data.askDrainPct)}
        />
        <DepthBar
          label="Bid -3%"
          value={data.bidDepth3Pct}
          maxValue={maxValue}
          drainPct={0}
        />
        <DepthBar
          label="Ask +3%"
          value={data.askDepth3Pct}
          maxValue={maxValue}
          drainPct={0}
        />
      </div>
    </div>
  );
}
