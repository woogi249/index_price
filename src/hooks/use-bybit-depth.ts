"use client";
import { useEffect, useState } from "react";

const BYBIT_ORDERBOOK = "https://api.bybit.com/v5/market/orderbook";

export interface BybitDepth {
  bidTotal1Pct: number; // USDT within -1%
  askTotal1Pct: number; // USDT within +1%
  bidTotal3Pct: number; // USDT within -3%
  askTotal3Pct: number; // USDT within +3%
  midPrice: number;
}

export function useBybitDepth(symbol: string | null) {
  const [data, setData] = useState<BybitDepth | null>(null);

  useEffect(() => {
    if (!symbol) {
      setData(null);
      return;
    }

    let cancelled = false;

    async function fetchDepth() {
      try {
        const res = await fetch(
          `${BYBIT_ORDERBOOK}?category=linear&symbol=${symbol}&limit=50`
        );
        if (!res.ok) return;
        const json = await res.json();
        const result = json?.result;
        if (!result) return;

        const bids: [string, string][] = result.b || [];
        const asks: [string, string][] = result.a || [];

        if (bids.length === 0 || asks.length === 0) return;

        const bestBid = parseFloat(bids[0][0]);
        const bestAsk = parseFloat(asks[0][0]);
        const mid = (bestBid + bestAsk) / 2;

        const threshold1 = mid * 0.01;
        const threshold3 = mid * 0.03;

        let bidTotal1 = 0, bidTotal3 = 0;
        for (const [p, q] of bids) {
          const price = parseFloat(p);
          const qty = parseFloat(q);
          const dist = mid - price;
          if (dist <= threshold3) {
            bidTotal3 += price * qty;
            if (dist <= threshold1) bidTotal1 += price * qty;
          }
        }

        let askTotal1 = 0, askTotal3 = 0;
        for (const [p, q] of asks) {
          const price = parseFloat(p);
          const qty = parseFloat(q);
          const dist = price - mid;
          if (dist <= threshold3) {
            askTotal3 += price * qty;
            if (dist <= threshold1) askTotal1 += price * qty;
          }
        }

        if (!cancelled) {
          setData({
            bidTotal1Pct: bidTotal1,
            askTotal1Pct: askTotal1,
            bidTotal3Pct: bidTotal3,
            askTotal3Pct: askTotal3,
            midPrice: mid,
          });
        }
      } catch {
        /* ignore */
      }
    }

    fetchDepth();
    const poll = setInterval(fetchDepth, 10000);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [symbol]);

  return data;
}
