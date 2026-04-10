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

export interface OverviewTick {
  symbol: string;
  lastPrice: number;
  markPrice: number;
  indexPrice: number;
  markPct: number;
  indexPct: number;
  fundingRate: number;
}

export interface ADLTicker {
  symbol: string;
  last_price: number;
  mark_price: number;
  index_price: number;
  high_8h: number;
  drawdown_pct: number;
  mark_last_gap_pct: number;
  funding_rate: number;
  open_interest: number;
  volume_24h: number;
  is_new_listing: boolean;
  adl_warning: boolean;
  is_fake_gap: boolean;
  is_candidate: boolean;
  candidate_score: number;
  binance_oi_change_pct: number | null;
  binance_volume_change_pct: number | null;
  timestamp: number;
}

export interface ADLBroadcast {
  type: string;
  ts: number;
  tickers: ADLTicker[];
}

export interface ADLSnapshot {
  tickers: ADLTicker[];
  updated_at: number | null;
}
