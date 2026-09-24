import { sitemapEntries } from "@/lib/community/public-api";
import { communitySitemapDocument, validSitemapShard } from "@/lib/community/sitemap";
import { SITE_URL } from "@/lib/site";
import { connection } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ kind: string; bucket: string }> }) {
  await connection();
  const { kind, bucket } = await params;
  if (!validSitemapShard(kind, bucket)) return new Response("Sitemap not found.", { status: 404 });
  try {
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(20000)]);
    const body = await communitySitemapDocument(kind, SITE_URL, cursor => sitemapEntries(kind, bucket, cursor, signal));
    return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store" } });
  } catch {
    return new Response("Community sitemap temporarily unavailable.", { status: 503, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });
  }
}
