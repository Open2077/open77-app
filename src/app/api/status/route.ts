import { parseSnapshot } from "@/lib/status/model";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Live telemetry must not use stale-while-revalidate at any layer. In production
// the edge kept serving an old successful response while the collector was healthy.
const liveHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET() {
  try {
    // Operator configuration only. Query parameters cannot turn this route into a proxy.
    const url = new URL(process.env.OP77_STATUS_FEED_URL ?? "https://cdn.open2077.net/status/v1.json");
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname))) throw new Error("Invalid feed URL");
    const response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(6000) });
    if (!response.ok || !response.body) throw new Error("Feed unavailable");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 1024 * 1024) throw new Error("Feed too large");
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    const snapshot = parseSnapshot(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (!snapshot) throw new Error("Invalid feed");
    return Response.json(snapshot, { headers: liveHeaders });
  } catch {
    // An unavailable collector is not evidence that the platform is down, or up.
    return Response.json({ error: "status_unavailable", message: "Live monitoring data is temporarily unavailable. Service availability cannot be confirmed." },
      { status: 503, headers: { ...liveHeaders, "Retry-After": "60" } });
  }
}
