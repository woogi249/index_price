"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { ADLTicker, ADLSnapshot } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_ADL_API_URL || "http://localhost:8001";
const WS_TOKEN = process.env.NEXT_PUBLIC_ADL_WS_TOKEN || "";
const WS_URL = (() => {
  const base = API_BASE.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
  const tokenParam = WS_TOKEN ? `?token=${WS_TOKEN}` : "";
  return base + "/api/adl/ws" + tokenParam;
})();
const REST_URL = API_BASE + "/api/adl/snapshot";
const RECONNECT_MS = 3000;

export function useAdl() {
  const [tickers, setTickers] = useState<Map<string, ADLTicker>>(new Map());
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const mergeTickers = useCallback((incoming: ADLTicker[]) => {
    setTickers((prev) => {
      const next = new Map(prev);
      for (const t of incoming) {
        next.set(t.symbol, t);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    // Fallback: fetch REST snapshot if WS fails
    async function fetchSnapshot() {
      try {
        const res = await fetch(REST_URL);
        if (res.ok) {
          const snap: ADLSnapshot = await res.json();
          if (mounted && snap.tickers.length > 0) {
            mergeTickers(snap.tickers);
          }
        }
      } catch {
        /* ignore */
      }
    }

    function connect() {
      if (!mounted) return;
      setStatus("connecting");

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (mounted) setStatus("connected");
      };

      ws.onmessage = (evt) => {
        if (!evt.data || evt.data === "") return; // heartbeat
        try {
          const msg = JSON.parse(evt.data);
          // Could be a snapshot (has tickers array at top) or broadcast
          const list: ADLTicker[] = msg.tickers ?? [];
          if (list.length > 0 && mounted) {
            mergeTickers(list);
          }
        } catch {
          /* ignore parse errors */
        }
      };

      ws.onerror = () => {
        if (mounted) setStatus("error");
      };

      ws.onclose = () => {
        if (mounted) {
          setStatus("error");
          reconnectTimer.current = setTimeout(connect, RECONNECT_MS);
        }
      };
    }

    connect();
    fetchSnapshot();

    // Re-fetch snapshot every 30s as fallback
    const pollInterval = setInterval(fetchSnapshot, 30000);

    return () => {
      mounted = false;
      clearTimeout(reconnectTimer.current);
      clearInterval(pollInterval);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [mergeTickers]);

  return { tickers, status };
}
