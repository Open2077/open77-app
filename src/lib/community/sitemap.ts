import type { CommunityPage, CommunitySitemapEntry, CommunitySitemapShard } from "./types";

const xml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
export const validSitemapShard = (kind: string, bucket: string) => (kind === "projects" || kind === "creators") && /^[a-f0-9]{2}$/.test(bucket);

export function communitySitemapIndex(shards: CommunitySitemapShard[], origin: string) {
  if (shards.length > 512 || shards.some(shard => !validSitemapShard(shard.kind, shard.bucket))) throw new Error("Invalid sitemap index");
  const urls = [...new Set(shards.map(shard => `${origin}/community/sitemaps/${shard.kind}/${shard.bucket}/sitemap.xml`))];
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<sitemap><loc>${xml(url)}</loc></sitemap>`).join("")}</sitemapindex>`;
}

export async function communitySitemapDocument(kind: string, origin: string, load: (cursor?: string) => Promise<CommunityPage<CommunitySitemapEntry>>) {
  const paths = new Set<string>(); const cursors = new Set<string>(); const entries: string[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 50; page++) {
    const result = await load(cursor);
    if (result.items.length > 1000) throw new Error("Sitemap page exceeds its bound");
    for (const item of result.items) {
      const prefix = kind === "projects" ? "/resources/" : "/creators/";
      if (!item.path.startsWith(prefix) || !/^\/(resources|creators)\/[a-z0-9_-]{3,80}$/.test(item.path) || !Number.isFinite(Date.parse(item.lastModifiedUtc))) throw new Error("Invalid sitemap entry");
      if (paths.has(item.path)) continue;
      paths.add(item.path);
      entries.push(`<url><loc>${xml(origin + item.path)}</loc><lastmod>${new Date(item.lastModifiedUtc).toISOString()}</lastmod></url>`);
    }
    if (!result.nextCursor) return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join("")}</urlset>`;
    if (cursors.has(result.nextCursor)) throw new Error("Repeated sitemap cursor");
    cursors.add(result.nextCursor); cursor = result.nextCursor;
  }
  throw new Error("Sitemap shard exceeds 50000 entries; split the shard before serving it");
}
