"use client";
import { createContext, useContext, useState } from "react";
import type { SymbolType } from "@/lib/types";

interface DashboardContextType {
  symbol: SymbolType;
  setSymbol: (s: SymbolType) => void;
}

const DashboardContext = createContext<DashboardContextType>({
  symbol: "BTCUSDT",
  setSymbol: () => {},
});

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [symbol, setSymbol] = useState<SymbolType>("BTCUSDT");
  return (
    <DashboardContext.Provider value={{ symbol, setSymbol }}>
      {children}
    </DashboardContext.Provider>
  );
}

export const useDashboard = () => useContext(DashboardContext);
