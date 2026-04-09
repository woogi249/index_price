import manager from "@/lib/binance-ws";
import type { SymbolType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "BTCUSDT") as SymbolType;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const unsubscribe = manager.subscribe(symbol, (tick) => {
        try {
          const payload = `data: ${JSON.stringify(tick)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          unsubscribe();
        }
      });

      req.signal.addEventListener("abort", () => {
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
