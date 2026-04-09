import { REST_BASE } from "@/lib/constants";

export const runtime = "nodejs";

interface ExchangeInfo {
  symbols: Array<{
    symbol: string;
    contractType: string;
    status: string;
    quoteAsset: string;
  }>;
}

let cache: { data: string[]; ts: number } | null = null;
const CACHE_TTL = 60_000 * 10; // 10 minutes

export async function GET(): Promise<Response> {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL) {
    return Response.json(cache.data);
  }

  try {
    const res = await fetch(`${REST_BASE}/fapi/v1/exchangeInfo`);
    if (!res.ok) {
      return Response.json({ error: "Failed to fetch exchange info" }, { status: 502 });
    }
    const info: ExchangeInfo = await res.json();

    const symbols = info.symbols
      .filter(
        (s) =>
          s.contractType === "PERPETUAL" &&
          s.status === "TRADING" &&
          s.quoteAsset === "USDT"
      )
      .map((s) => s.symbol)
      .sort();

    cache = { data: symbols, ts: now };
    return Response.json(symbols);
  } catch {
    return Response.json({ error: "Network error" }, { status: 502 });
  }
}
