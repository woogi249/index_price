import type { AlertEvent, DepthSnapshot, RiskScore, SymbolType } from "./types";
import { RingBuffer } from "./ring-buffer";
import {
  SPREAD_WARN_THRESHOLD,
  SPREAD_DANGER_THRESHOLD,
  DRAIN_WARN_THRESHOLD,
  DRAIN_DANGER_THRESHOLD,
  RISK_WARN_THRESHOLD,
  RISK_DANGER_THRESHOLD,
} from "./constants";

let alertCounter = 0;
function genId(): string {
  return `alert_${Date.now()}_${++alertCounter}`;
}

export function calcSpread(
  lastPrice: number,
  markPrice: number,
  indexPrice: number
): { spreadPct: number; lastMarkSpreadPct: number } {
  const spreadPct =
    indexPrice > 0 ? ((markPrice - indexPrice) / indexPrice) * 100 : 0;
  const lastMarkSpreadPct =
    markPrice > 0 ? ((lastPrice - markPrice) / markPrice) * 100 : 0;
  return { spreadPct, lastMarkSpreadPct };
}

export function checkSpreadAlert(
  spreadPct: number,
  symbol: SymbolType
): AlertEvent | null {
  const abs = Math.abs(spreadPct);
  if (abs >= SPREAD_DANGER_THRESHOLD) {
    return {
      id: genId(),
      timestamp: Date.now(),
      type: "SPREAD",
      severity: "danger",
      symbol,
      message: `Mark-Index spread ${spreadPct.toFixed(4)}% exceeds danger threshold`,
      value: spreadPct,
    };
  }
  if (abs >= SPREAD_WARN_THRESHOLD) {
    return {
      id: genId(),
      timestamp: Date.now(),
      type: "SPREAD",
      severity: "warning",
      symbol,
      message: `Mark-Index spread ${spreadPct.toFixed(4)}% exceeds warning threshold`,
      value: spreadPct,
    };
  }
  return null;
}

export function calcDepthAtRange(
  orders: [number, number][],
  midPrice: number,
  rangePct: number
): number {
  const threshold = midPrice * (rangePct / 100);
  let total = 0;
  for (const [price, qty] of orders) {
    if (Math.abs(price - midPrice) <= threshold) {
      total += price * qty;
    }
  }
  return total;
}

export function calcDrainPct(
  currentDepth: number,
  avgBuffer: RingBuffer<number>
): number {
  const avg = avgBuffer.average((v) => v);
  if (avg <= 0) return 0;
  return ((avg - currentDepth) / avg) * 100;
}

export function calcDepthSnapshot(
  bids: [number, number][],
  asks: [number, number][],
  midPrice: number,
  bidAvg1: RingBuffer<number>,
  bidAvg3: RingBuffer<number>,
  askAvg1: RingBuffer<number>,
  askAvg3: RingBuffer<number>
): DepthSnapshot {
  const bidDepth1Pct = calcDepthAtRange(bids, midPrice, 1);
  const bidDepth3Pct = calcDepthAtRange(bids, midPrice, 3);
  const askDepth1Pct = calcDepthAtRange(asks, midPrice, 1);
  const askDepth3Pct = calcDepthAtRange(asks, midPrice, 3);

  const bidDrainPct = calcDrainPct(bidDepth1Pct, bidAvg1);
  const askDrainPct = calcDrainPct(askDepth1Pct, askAvg1);

  bidAvg1.push(bidDepth1Pct);
  bidAvg3.push(bidDepth3Pct);
  askAvg1.push(askDepth1Pct);
  askAvg3.push(askDepth3Pct);

  return {
    timestamp: Date.now(),
    bids,
    asks,
    bidDepth1Pct,
    bidDepth3Pct,
    askDepth1Pct,
    askDepth3Pct,
    bidDrainPct,
    askDrainPct,
  };
}

export function checkDrainAlert(
  drainPct: number,
  side: string,
  symbol: SymbolType
): AlertEvent | null {
  if (drainPct >= DRAIN_DANGER_THRESHOLD) {
    return {
      id: genId(),
      timestamp: Date.now(),
      type: "LIQUIDITY_DRAIN",
      severity: "danger",
      symbol,
      message: `${side} liquidity drained ${drainPct.toFixed(1)}% vs 1-min average`,
      value: drainPct,
    };
  }
  if (drainPct >= DRAIN_WARN_THRESHOLD) {
    return {
      id: genId(),
      timestamp: Date.now(),
      type: "LIQUIDITY_DRAIN",
      severity: "warning",
      symbol,
      message: `${side} liquidity dropped ${drainPct.toFixed(1)}% vs 1-min average`,
      value: drainPct,
    };
  }
  return null;
}

export function calcRiskScore(
  oiChange5m: number,
  fundingRate: number,
  longShortRatio: number
): RiskScore {
  const oiComponent = Math.min(33, (Math.abs(oiChange5m) / 10) * 33);
  const fundingComponent = Math.min(
    33,
    (Math.abs(fundingRate) / 0.001) * 33
  );
  const lsComponent = Math.min(
    34,
    (Math.abs(longShortRatio - 1.0) / 0.3) * 34
  );
  const score = Math.round(oiComponent + fundingComponent + lsComponent);

  return {
    timestamp: Date.now(),
    score,
    oiChange5m,
    fundingRate,
    longShortRatio,
    components: {
      oiComponent: Math.round(oiComponent),
      fundingComponent: Math.round(fundingComponent),
      lsComponent: Math.round(lsComponent),
    },
  };
}

export function checkRiskAlert(
  score: number,
  symbol: SymbolType
): AlertEvent | null {
  if (score >= RISK_DANGER_THRESHOLD) {
    return {
      id: genId(),
      timestamp: Date.now(),
      type: "ADL_RISK",
      severity: "danger",
      symbol,
      message: `ADL/Squeeze risk score ${score}/100 — HIGH RISK`,
      value: score,
    };
  }
  if (score >= RISK_WARN_THRESHOLD) {
    return {
      id: genId(),
      timestamp: Date.now(),
      type: "ADL_RISK",
      severity: "warning",
      symbol,
      message: `ADL/Squeeze risk score ${score}/100 — Elevated`,
      value: score,
    };
  }
  return null;
}
