import type { SymbolType } from "./types";
import { RingBuffer } from "./ring-buffer";
import { REST_BASE, OI_POLL_INTERVAL, LS_POLL_INTERVAL, OI_HISTORY_SIZE } from "./constants";

interface OIEntry {
  ts: number;
  oi: number;
}

export class BinanceRestPoller {
  private oiHistory = new Map<SymbolType, RingBuffer<OIEntry>>();
  private lsRatioCache = new Map<SymbolType, number>();
  private intervals = new Map<SymbolType, NodeJS.Timeout[]>();

  startPolling(symbol: SymbolType): void {
    if (this.intervals.has(symbol)) return;

    if (!this.oiHistory.has(symbol)) {
      this.oiHistory.set(symbol, new RingBuffer<OIEntry>(OI_HISTORY_SIZE));
    }

    this.fetchOI(symbol);
    this.fetchLSRatio(symbol);

    const oiInterval = setInterval(() => this.fetchOI(symbol), OI_POLL_INTERVAL);
    const lsInterval = setInterval(() => this.fetchLSRatio(symbol), LS_POLL_INTERVAL);
    this.intervals.set(symbol, [oiInterval, lsInterval]);
  }

  stopPolling(symbol: SymbolType): void {
    const ints = this.intervals.get(symbol);
    if (ints) {
      ints.forEach(clearInterval);
      this.intervals.delete(symbol);
    }
  }

  getOIChange5m(symbol: SymbolType): number {
    const buf = this.oiHistory.get(symbol);
    if (!buf || buf.length < 2) return 0;
    const arr = buf.toArray();
    const oldest = arr[0].oi;
    const newest = arr[arr.length - 1].oi;
    if (oldest === 0) return 0;
    return ((newest - oldest) / oldest) * 100;
  }

  getLongShortRatio(symbol: SymbolType): number {
    return this.lsRatioCache.get(symbol) ?? 1.0;
  }

  private async fetchOI(symbol: SymbolType): Promise<void> {
    try {
      const res = await fetch(
        `${REST_BASE}/fapi/v1/openInterest?symbol=${symbol}`
      );
      if (!res.ok) return;
      const data = await res.json();
      const buf = this.oiHistory.get(symbol);
      buf?.push({ ts: Date.now(), oi: parseFloat(data.openInterest) });
    } catch {
      // silently ignore network errors
    }
  }

  private async fetchLSRatio(symbol: SymbolType): Promise<void> {
    try {
      const res = await fetch(
        `${REST_BASE}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        this.lsRatioCache.set(symbol, parseFloat(data[0].longShortRatio));
      }
    } catch {
      // silently ignore network errors
    }
  }
}
