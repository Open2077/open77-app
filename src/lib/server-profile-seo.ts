import type { CatalogServer } from "./servers";
import { plainLauncherText } from "./launcher-text";

export const SERVER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The words the summary adds when an operator left a field empty. Translated
 * pages pass their own (`servers.meta` in the dictionaries); `{name}` is the
 * server's plain name. What the operator wrote is never translated.
 */
export type ServerProfileTemplates = { title: string; description: string };

const ENGLISH: ServerProfileTemplates = {
  title: "OPEN//77 community server",
  description: "Join {name}, a Cyberpunk 2077 multiplayer server on OPEN//77. View server details and connect with the launcher.",
};

/** Public text only; player counts and rosters never enter search snippets. */
export function serverProfileSummary(
  server: Pick<CatalogServer, "name" | "description" | "bannerUrl" | "iconUrl">,
  templates: ServerProfileTemplates = ENGLISH,
) {
  const title = plainLauncherText(server.name).trim() || templates.title;
  const description = plainLauncherText(server.description).trim().replace(/\s+/g, " ") ||
    // A function replacement: a server name is inserted as is, `$&` and all.
    templates.description.replace(/\{name\}/g, () => title);
  const image = [server.bannerUrl, server.iconUrl].find(value => {
    if (!value) return false;
    try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password; }
    catch { return false; }
  }) ?? undefined;
  return { title, description, image };
}
