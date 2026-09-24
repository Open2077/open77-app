import { sitemapShards } from "@/lib/community/public-api";
import { communitySitemapIndex } from "@/lib/community/sitemap";
import { SITE_URL } from "@/lib/site";
import { connection } from "next/server";

export async function GET(request: Request) {
  await connection();
  try {
    const shards = await sitemapShards(request.signal);
    return new Response(communitySitemapIndex(shards, SITE_URL), { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store" } });
  } catch {
    return new Response("Community sitemap temporarily unavailable.", { status: 503, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });
  }
}
