"use client";
import type { RiskScore } from "@/lib/types";

function getScoreColor(score: number): string {
  if (score >= 85) return "#ef4444";
  if (score >= 65) return "#f59e0b";
  if (score >= 40) return "#06b6d4";
  return "#10b981";
}

function getScoreLabel(score: number): string {
  if (score >= 85) return "HIGH RISK";
  if (score >= 65) return "ELEVATED";
  if (score >= 40) return "MODERATE";
  return "LOW RISK";
}

interface Props {
  data: RiskScore | null;
}

export function RiskGauge({ data }: Props) {
  const score = data?.score ?? 0;
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  const cx = 100;
  const cy = 95;
  const r = 70;
  const strokeWidth = 14;
  const startAngle = Math.PI;
  const endAngle = 0;
  const circumference = Math.PI * r;
  const progress = circumference * (score / 100);

  function arcPath(radius: number): string {
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
  }

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-sm font-medium text-muted mb-1">ADL / Squeeze Risk</h3>
      <div className="flex-1 flex flex-col items-center justify-center">
        <svg viewBox="0 0 200 110" className="w-full max-w-[200px]">
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <path
            d={arcPath(r)}
            fill="none"
            stroke="#1a1a24"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d={arcPath(r)}
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            style={{ transition: "stroke-dasharray 0.5s ease-out" }}
          />
          <text
            x={cx}
            y={cy - 10}
            textAnchor="middle"
            fill={color}
            fontSize="28"
            fontWeight="bold"
            fontFamily="var(--font-mono)"
          >
            {score}
          </text>
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            fill={color}
            fontSize="10"
            fontWeight="500"
            letterSpacing="0.1em"
          >
            {label}
          </text>
        </svg>

        {data && (
          <div className="w-full space-y-1.5 mt-2">
            <FactorRow label="OI Change (5m)" value={`${data.oiChange5m.toFixed(2)}%`} score={data.components.oiComponent} max={33} />
            <FactorRow label="Funding Rate" value={`${(data.fundingRate * 100).toFixed(4)}%`} score={data.components.fundingComponent} max={33} />
            <FactorRow label="Long/Short" value={data.longShortRatio.toFixed(3)} score={data.components.lsComponent} max={34} />
          </div>
        )}
      </div>
    </div>
  );
}

function FactorRow({
  label,
  value,
  score,
  max,
}: {
  label: string;
  value: string;
  score: number;
  max: number;
}) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  const color = pct >= 80 ? "bg-danger" : pct >= 50 ? "bg-warn" : "bg-safe";

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-muted w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-void rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-white w-16 text-right">{value}</span>
    </div>
  );
}
