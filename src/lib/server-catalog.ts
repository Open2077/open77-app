import "server-only";
import { cache } from "react";
import { MASTER_URL } from "@/lib/account/api";
import { withAbsoluteImageUrls, type CatalogPage, type CatalogServer } from "@/lib/servers";
import { SERVER_ID } from "@/lib/server-profile-seo";

const origin = (process.env.OP77_SERVER_CATALOG_URL ?? MASTER_URL).replace(/\/$/, "");

async function read(path: string): Promise<Response> {
  const response = await fetch(`${origin}/api/v1/servers${path}`, {
    next: { revalidate: 300 },
    headers: { Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });
  // Throw on temporary errors: ISR keeps the last successful page rather than
  // replacing an indexed profile with an empty/generic response.
  if (!response.ok && response.status !== 404) throw new Error(`Public server catalog returned ${response.status}`);
  return response;
}

export const getPublicServer = cache(async (id: string): Promise<CatalogServer | null> => {
  if (!SERVER_ID.test(id)) return null;
  const response = await read(`/${encodeURIComponent(id)}`);
  if (response.status === 404) return null;
  const server = await response.json() as CatalogServer;
  if (server.id?.toLowerCase() !== id.toLowerCase() || typeof server.name !== "string" || typeof server.description !== "string") {
    throw new Error("Invalid public server profile");
  }
  return withAbsoluteImageUrls(server);
});

export const listPublicServers = cache(async (): Promise<CatalogServer[]> => {
  const servers = new Map<string, CatalogServer>();
  // Bounded pagination avoids silently indexing only the first 20/100 servers.
  for (let page = 1; page <= 100; page++) {
    const response = await read(`?page=${page}&pageSize=100`);
    if (!response.ok) throw new Error("Public server directory is unavailable");
    const data = await response.json() as CatalogPage;
    if (!Array.isArray(data.items) || !Number.isFinite(data.total)) throw new Error("Invalid public server directory");
    const before = servers.size;
    for (const server of data.items) {
      if (SERVER_ID.test(server.id)) servers.set(server.id, withAbsoluteImageUrls(server));
    }
    if (servers.size >= data.total || data.items.length === 0) return [...servers.values()];
    if (servers.size === before) throw new Error("Repeated public server directory page");
  }
  throw new Error("Public server directory exceeds its page limit");
});

// Serialize the read clock so cached HTML and its first client render agree.
export const getPublicServerSnapshot = cache(async (id: string) => {
  const server = await getPublicServer(id);
  return server ? { server, capturedAt: Date.now() } : undefined;
});
