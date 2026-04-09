export type SymbolType = string;

export interface PriceTick {
  timestamp: number;
  lastPrice: number;
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
  spreadPct: number;
  lastMarkSpreadPct: number;
}

export interface DepthSnapshot {
  timestamp: number;
  bids: [number, number][];
  asks: [number, number][];
  bidDepth1Pct: number;
  bidDepth3Pct: number;
  askDepth1Pct: number;
  askDepth3Pct: number;
  bidDrainPct: number;
  askDrainPct: number;
}

export interface RiskScore {
  timestamp: number;
  score: number;
  oiChange5m: number;
  fundingRate: number;
  longShortRatio: number;
  components: {
    oiComponent: number;
    fundingComponent: number;
    lsComponent: number;
  };
}

export interface AlertEvent {
  id: string;
  timestamp: number;
  type: "SPREAD" | "LIQUIDITY_DRAIN" | "ADL_RISK";
  severity: "warning" | "danger";
  symbol: SymbolType;
  message: string;
  value: number;
}

export interface DashboardTick {
  symbol: SymbolType;
  price: PriceTick;
  depth: DepthSnapshot;
  risk: RiskScore;
  alerts: AlertEvent[];
  connectionStatus: "connected" | "reconnecting" | "error";
}
