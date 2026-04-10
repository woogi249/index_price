"use client";
import { useEffect, useState } from "react";

const BYBIT_KLINE = "https://api.bybit.com/v5/market/kline";
const BYBIT_MARK_KLINE = "https://api.bybit.com/v5/market/mark-price-kline";
const BYBIT_INDEX_KLINE = "https://api.bybit.com/v5/market/index-price-kline";

export interface KlinePoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface MultiKlineData {
  last: KlinePoint[];
  mark: KlinePoint[];
  index: KlinePoint[];
}

function parseKline(list: string[][]): KlinePoint[] {
  return list
    .map((k) => ({
      timestamp: parseInt(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
    }))
    .reverse();
}

async function fetchOne(url: string, symbol: string, interval: string, limit: number): Promise<KlinePoint[]> {
  try {
    const res = await fetch(`${url}?category=linear&symbol=${symbol}&interval=${interval}&limit=${limit}`);
    if (!res.ok) return [];
    const json = await res.json();
    const list = json?.result?.list;
    if (!Array.isArray(list)) return [];
    return parseKline(list);
  } catch {
    return [];
  }
}

export function useBybitKline(symbol: string | null, interval = "1", limit = 30) {
  const [data, setData] = useState<MultiKlineData>({ last: [], mark: [], index: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol) {
      setData({ last: [], mark: [], index: [] });
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchAll() {
      const [last, mark, index] = await Promise.all([
        fetchOne(BYBIT_KLINE, symbol!, interval, limit),
        fetchOne(BYBIT_MARK_KLINE, symbol!, interval, limit),
        fetchOne(BYBIT_INDEX_KLINE, symbol!, interval, limit),
      ]);

      if (!cancelled) {
        setData({ last, mark, index });
        setLoading(false);
      }
    }

    fetchAll();
    const poll = setInterval(fetchAll, 15000);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [symbol, interval, limit]);

  return { data, loading };
}
