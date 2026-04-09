"use client";
import { SymbolSelector } from "./symbol-selector";

const statusColors = {
  connected: "bg-safe",
  connecting: "bg-warn animate-pulse",
  reconnecting: "bg-warn animate-pulse",
  error: "bg-danger",
};

const statusLabels: Record<string, string> = {
  connected: "Connected",
  connecting: "Connecting...",
  reconnecting: "Reconnecting...",
  error: "Error",
};

export function TopBar({ connectionStatus }: { connectionStatus: string }) {
  const dotColor = statusColors[connectionStatus as keyof typeof statusColors] || statusColors.connecting;
  const label = statusLabels[connectionStatus] || "Connecting...";

  return (
    <div className="flex items-center justify-between h-16 px-6 border-b border-border bg-surface">
      <div className="flex items-center gap-3">
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
      </div>

      <SymbolSelector />

      <div className="flex items-center gap-2 text-sm">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-muted">{label}</span>
      </div>
    </div>
  );
}
