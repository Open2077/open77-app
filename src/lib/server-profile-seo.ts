import type { CatalogServer } from "./servers";

export const SERVER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Public text only; player counts and rosters never enter search snippets. */
export function serverProfileSummary(server: Pick<CatalogServer, "name" | "description" | "bannerUrl" | "iconUrl">) {
  const title = server.name.trim() || "OPEN//77 community server";
  const description = server.description.trim().replace(/\s+/g, " ") ||
    `Join ${title}, a Cyberpunk 2077 multiplayer server on OPEN//77. View server details and connect with the launcher.`;
  const image = [server.bannerUrl, server.iconUrl].find(value => {
    if (!value) return false;
    try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password; }
    catch { return false; }
  }) ?? undefined;
  return { title, description, image };
}
