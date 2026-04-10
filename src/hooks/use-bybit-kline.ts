"use client";
import { useEffect, useState } from "react";

const BYBIT_KLINE = "https://api.bybit.com/v5/market/kline";

export interface KlinePoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export function useBybitKline(symbol: string | null, interval = "1", limit = 30) {
  const [data, setData] = useState<KlinePoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol) {
      setData([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchKline() {
      try {
        const res = await fetch(
          `${BYBIT_KLINE}?category=linear&symbol=${symbol}&interval=${interval}&limit=${limit}`
        );
        if (!res.ok) return;
        const json = await res.json();
        const list = json?.result?.list;
        if (!Array.isArray(list)) return;

        // Bybit returns newest first, reverse for chronological order
        const points: KlinePoint[] = list
          .map((k: string[]) => ({
            timestamp: parseInt(k[0]),
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
          }))
          .reverse();

        if (!cancelled) setData(points);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchKline();
    const poll = setInterval(fetchKline, 15000); // refresh every 15s

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [symbol, interval, limit]);

  return { data, loading };
}
