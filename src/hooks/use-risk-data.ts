"use client";
import { useRef, useState, useEffect } from "react";
import { useSSE } from "./use-sse";
import type { SymbolType, PriceTick, DepthSnapshot, RiskScore, AlertEvent } from "@/lib/types";

const PRICE_LIMIT = 3600;
const ALERT_LIMIT = 100;

export function useRiskData(symbol: SymbolType) {
  const { data, status } = useSSE(symbol);

  const [priceHistory, setPriceHistory] = useState<PriceTick[]>([]);
  const [currentDepth, setCurrentDepth] = useState<DepthSnapshot | null>(null);
  const [currentRisk, setCurrentRisk] = useState<RiskScore | null>(null);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  const seenAlertIds = useRef(new Set<string>());

  // Reset state when symbol changes
  useEffect(() => {
    setPriceHistory([]);
    setCurrentDepth(null);
    setCurrentRisk(null);
    setAlerts([]);
    setConnectionStatus("connecting");
    seenAlertIds.current.clear();
  }, [symbol]);

  // Process incoming SSE data
  useEffect(() => {
    if (!data) return;

    if (data.price && data.price.lastPrice > 0) {
      setPriceHistory((prev) => {
        const next = [...prev, data.price];
        return next.length > PRICE_LIMIT ? next.slice(-PRICE_LIMIT) : next;
      });
    }

    if (data.depth) {
      setCurrentDepth(data.depth);
    }

    if (data.risk) {
      setCurrentRisk(data.risk);
    }

    if (data.alerts && data.alerts.length > 0) {
      const newAlerts = data.alerts.filter((a) => !seenAlertIds.current.has(a.id));
      if (newAlerts.length > 0) {
        for (const a of newAlerts) seenAlertIds.current.add(a.id);
        setAlerts((prev) => [...newAlerts, ...prev].slice(0, ALERT_LIMIT));
      }
    }

    setConnectionStatus(data.connectionStatus || status);
  }, [data, status]);

  return { priceHistory, currentDepth, currentRisk, alerts, connectionStatus };
}
