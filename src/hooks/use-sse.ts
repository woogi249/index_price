"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { DashboardTick, SymbolType } from "@/lib/types";

export function useSSE(symbol: SymbolType) {
  const [data, setData] = useState<DashboardTick | null>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const esRef = useRef<EventSource | null>(null);

  const cleanup = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  useEffect(() => {
    cleanup();
    setStatus("connecting");
    setData(null);

    const es = new EventSource(`/api/stream?symbol=${symbol}`);
    esRef.current = es;

    es.onopen = () => setStatus("connected");

    es.onmessage = (event) => {
      try {
        const tick: DashboardTick = JSON.parse(event.data);
        setData(tick);
        setStatus("connected");
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setStatus("error");
    };

    return cleanup;
  }, [symbol, cleanup]);

  return { data, status };
}
