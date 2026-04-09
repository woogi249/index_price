import WebSocket from "ws";
import type { SymbolType, DashboardTick, PriceTick, AlertEvent } from "./types";
import { RingBuffer } from "./ring-buffer";
import { BinanceRestPoller } from "./binance-rest";
import { WS_BASE, DEPTH_AVG_WINDOW, SSE_THROTTLE_INTERVAL } from "./constants";
import {
  calcSpread,
  checkSpreadAlert,
  calcDepthSnapshot,
  checkDrainAlert,
  calcRiskScore,
  checkRiskAlert,
} from "./risk-engine";

const ALERT_COOLDOWN_MS = 30_000;

interface SymbolState {
  ws: WebSocket | null;
  lastPrice: number;
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
  bids: [number, number][];
  asks: [number, number][];
  bidAvg1: RingBuffer<number>;
  bidAvg3: RingBuffer<number>;
  askAvg1: RingBuffer<number>;
  askAvg3: RingBuffer<number>;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  reconnectDelay: number;
  throttleTimer: ReturnType<typeof setTimeout> | null;
  pendingEmit: boolean;
  connectionStatus: "connected" | "reconnecting" | "error";
  lastAlertTime: Map<string, number>;
}

type Listener = (tick: DashboardTick) => void;

class BinanceStreamManager {
  private states = new Map<SymbolType, SymbolState>();
  private listeners = new Map<SymbolType, Set<Listener>>();
  private restPoller = new BinanceRestPoller();

  subscribe(symbol: SymbolType, cb: Listener): () => void {
    if (!this.listeners.has(symbol)) {
      this.listeners.set(symbol, new Set());
    }
    const set = this.listeners.get(symbol)!;
    set.add(cb);

    if (set.size === 1) {
      this.connect(symbol);
      this.restPoller.startPolling(symbol);
    }

    return () => {
      set.delete(cb);
      if (set.size === 0) {
        this.disconnect(symbol);
        this.restPoller.stopPolling(symbol);
      }
    };
  }

  private getState(symbol: SymbolType): SymbolState {
    if (!this.states.has(symbol)) {
      this.states.set(symbol, {
        ws: null,
        lastPrice: 0,
        markPrice: 0,
        indexPrice: 0,
        fundingRate: 0,
        bids: [],
        asks: [],
        bidAvg1: new RingBuffer(DEPTH_AVG_WINDOW),
        bidAvg3: new RingBuffer(DEPTH_AVG_WINDOW),
        askAvg1: new RingBuffer(DEPTH_AVG_WINDOW),
        askAvg3: new RingBuffer(DEPTH_AVG_WINDOW),
        reconnectTimer: null,
        reconnectDelay: 1000,
        throttleTimer: null,
        pendingEmit: false,
        connectionStatus: "reconnecting",
        lastAlertTime: new Map(),
      });
    }
    return this.states.get(symbol)!;
  }

  private buildWsUrl(symbol: SymbolType): string {
    const s = symbol.toLowerCase();
    return `${WS_BASE}?streams=${s}@markPrice@1s/${s}@depth20@100ms/${s}@miniTicker`;
  }

  private connect(symbol: SymbolType): void {
    const state = this.getState(symbol);
    if (state.ws) return;

    const url = this.buildWsUrl(symbol);
    const ws = new WebSocket(url);
    state.ws = ws;
    state.connectionStatus = "reconnecting";

    ws.on("open", () => {
      state.connectionStatus = "connected";
      state.reconnectDelay = 1000;
      this.scheduleEmit(symbol);
    });

    ws.on("message", (raw: WebSocket.Data) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.stream && msg.data) {
          this.handleMessage(symbol, msg.stream, msg.data);
        }
      } catch {
        // ignore parse errors
      }
    });

    ws.on("close", () => {
      state.ws = null;
      state.connectionStatus = "reconnecting";
      this.scheduleReconnect(symbol);
    });

    ws.on("error", () => {
      state.connectionStatus = "error";
      ws.close();
    });
  }

  private disconnect(symbol: SymbolType): void {
    const state = this.states.get(symbol);
    if (!state) return;
    if (state.ws) {
      state.ws.close();
      state.ws = null;
    }
    if (state.reconnectTimer) {
      clearTimeout(state.reconnectTimer);
      state.reconnectTimer = null;
    }
    if (state.throttleTimer) {
      clearTimeout(state.throttleTimer);
      state.throttleTimer = null;
    }
  }

  private scheduleReconnect(symbol: SymbolType): void {
    const state = this.getState(symbol);
    const listeners = this.listeners.get(symbol);
    if (!listeners || listeners.size === 0) return;

    if (state.reconnectTimer) return;
    state.reconnectTimer = setTimeout(() => {
      state.reconnectTimer = null;
      this.connect(symbol);
    }, state.reconnectDelay);
    state.reconnectDelay = Math.min(state.reconnectDelay * 2, 30000);
  }

  private handleMessage(symbol: SymbolType, stream: string, data: any): void {
    const state = this.getState(symbol);

    if (stream.includes("@markPrice")) {
      state.markPrice = parseFloat(data.p);
      state.indexPrice = parseFloat(data.i);
      state.fundingRate = parseFloat(data.r);
    } else if (stream.includes("@depth")) {
      state.bids = (data.b || []).map((e: string[]) => [
        parseFloat(e[0]),
        parseFloat(e[1]),
      ]);
      state.asks = (data.a || []).map((e: string[]) => [
        parseFloat(e[0]),
        parseFloat(e[1]),
      ]);
    } else if (stream.includes("@miniTicker")) {
      state.lastPrice = parseFloat(data.c);
    }

    this.scheduleEmit(symbol);
  }

  private scheduleEmit(symbol: SymbolType): void {
    const state = this.getState(symbol);
    state.pendingEmit = true;

    if (state.throttleTimer) return;
    state.throttleTimer = setTimeout(() => {
      state.throttleTimer = null;
      if (state.pendingEmit) {
        state.pendingEmit = false;
        this.emitTick(symbol);
      }
    }, SSE_THROTTLE_INTERVAL);
  }

  private emitTick(symbol: SymbolType): void {
    const state = this.getState(symbol);
    const listeners = this.listeners.get(symbol);
    if (!listeners || listeners.size === 0) return;
    if (state.markPrice === 0) return;

    const lastPrice = state.lastPrice || state.markPrice;
    const midPrice = lastPrice;
    const { spreadPct, lastMarkSpreadPct } = calcSpread(
      lastPrice,
      state.markPrice,
      state.indexPrice
    );

    const price: PriceTick = {
      timestamp: Date.now(),
      lastPrice: lastPrice,
      markPrice: state.markPrice,
      indexPrice: state.indexPrice,
      fundingRate: state.fundingRate,
      spreadPct,
      lastMarkSpreadPct,
    };

    const depth = calcDepthSnapshot(
      state.bids,
      state.asks,
      midPrice,
      state.bidAvg1,
      state.bidAvg3,
      state.askAvg1,
      state.askAvg3
    );

    const oiChange5m = this.restPoller.getOIChange5m(symbol);
    const longShortRatio = this.restPoller.getLongShortRatio(symbol);
    const risk = calcRiskScore(oiChange5m, state.fundingRate, longShortRatio);

    const now = Date.now();
    const alerts: AlertEvent[] = [];
    const tryAlert = (alert: AlertEvent | null) => {
      if (!alert) return;
      const lastTime = state.lastAlertTime.get(alert.type) ?? 0;
      if (now - lastTime >= ALERT_COOLDOWN_MS) {
        state.lastAlertTime.set(alert.type, now);
        alerts.push(alert);
      }
    };
    tryAlert(checkSpreadAlert(spreadPct, symbol));
    tryAlert(checkDrainAlert(depth.bidDrainPct, "Bid", symbol));
    tryAlert(checkDrainAlert(depth.askDrainPct, "Ask", symbol));
    tryAlert(checkRiskAlert(risk.score, symbol));

    const tick: DashboardTick = {
      symbol,
      price,
      depth: {
        ...depth,
        bids: [],
        asks: [],
      },
      risk,
      alerts,
      connectionStatus: state.connectionStatus,
    };

    for (const cb of listeners) {
      try {
        cb(tick);
      } catch {
        // listener error shouldn't break others
      }
    }
  }
}

const GLOBAL_KEY = "__binanceStreamManager";
const g = globalThis as unknown as Record<string, BinanceStreamManager>;
const manager: BinanceStreamManager = (g[GLOBAL_KEY] ??= new BinanceStreamManager());
export default manager;
