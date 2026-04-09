"use client";
import { useDashboard } from "@/context/dashboard-context";
import { useRiskData } from "@/hooks/use-risk-data";
import { TopBar } from "@/components/layout/top-bar";
import { PriceChart } from "@/components/charts/price-chart";
import { DepthGauge } from "@/components/charts/depth-gauge";
import { RiskGauge } from "@/components/risk/risk-gauge";
import { AlertLog } from "@/components/alerts/alert-log";
import { Card } from "@/components/ui/card";

export default function Dashboard() {
  const { symbol } = useDashboard();
  const { priceHistory, currentDepth, currentRisk, alerts, connectionStatus } =
    useRiskData(symbol);

  return (
    <div className="grid grid-rows-[64px_1fr_220px] h-screen overflow-hidden">
      <TopBar connectionStatus={connectionStatus} />

      <div className="grid grid-cols-[2fr_1fr] gap-3 p-3 overflow-hidden min-h-0">
        <Card className="flex flex-col min-h-0">
          <PriceChart data={priceHistory} />
        </Card>

        <div className="grid grid-rows-2 gap-3 min-h-0">
          <Card className="min-h-0 overflow-hidden">
            <DepthGauge data={currentDepth} />
          </Card>
          <Card className="min-h-0 overflow-hidden">
            <RiskGauge data={currentRisk} />
          </Card>
        </div>
      </div>

      <div className="px-3 pb-3 min-h-0">
        <Card className="h-full min-h-0 overflow-hidden">
          <AlertLog alerts={alerts} />
        </Card>
      </div>
    </div>
  );
}
