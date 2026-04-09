"use client";
import type { AlertEvent } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { useRef, useEffect } from "react";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

const typeLabels: Record<string, string> = {
  SPREAD: "Spread",
  LIQUIDITY_DRAIN: "Liquidity",
  ADL_RISK: "ADL Risk",
};

interface Props {
  alerts: AlertEvent[];
}

export function AlertLog({ alerts }: Props) {
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [alerts.length]);

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-sm font-medium text-muted mb-2">Alert Log</h3>
      <div className="flex-1 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted text-sm">
            No alerts triggered yet
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface">
              <tr className="text-muted border-b border-border">
                <th className="text-left py-1.5 px-2 w-20">Time</th>
                <th className="text-left py-1.5 px-2 w-20">Type</th>
                <th className="text-left py-1.5 px-2 w-20">Severity</th>
                <th className="text-left py-1.5 px-2 w-16">Symbol</th>
                <th className="text-left py-1.5 px-2">Message</th>
                <th className="text-right py-1.5 px-2 w-20">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6}>
                  <div ref={topRef} />
                </td>
              </tr>
              {alerts.map((alert) => (
                <tr
                  key={alert.id}
                  className="border-b border-border/50 hover:bg-surface-hover transition-colors"
                >
                  <td className="py-1.5 px-2 font-mono text-muted">
                    {formatTime(alert.timestamp)}
                  </td>
                  <td className="py-1.5 px-2">
                    {typeLabels[alert.type] || alert.type}
                  </td>
                  <td className="py-1.5 px-2">
                    <Badge severity={alert.severity}>{alert.severity}</Badge>
                  </td>
                  <td className="py-1.5 px-2 font-mono">{alert.symbol}</td>
                  <td className="py-1.5 px-2 text-muted">{alert.message}</td>
                  <td className="py-1.5 px-2 text-right font-mono">
                    {alert.value.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
