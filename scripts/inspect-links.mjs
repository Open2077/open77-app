/**
 * Audits the links inside rendered documentation.
 *
 * The wiki is written for a filesystem: guides link to each other as
 * `vehicles.md#seats` and occasionally escape the directory with `../LICENSE`.
 * Anything that survives that rewriting as a literal `.md` path, or points at a
 * route that does not exist, is a 404 waiting for a reader.
 *
 * Usage: node scripts/inspect-links.mjs [origin]
 */

const origin = process.argv[2] ?? "http://127.0.0.1:3000";

const PAGES = [
  "/docs",
  "/docs/vehicles",
  "/docs/server-api",
  "/docs/npcs",
  "/docs/data-reference",
  "/docs/resource-exports",
  "/docs/server-resources",
  "/docs/debug-runtime",
];

const internal = new Set();
const external = new Set();
const suspicious = [];

for (const page of PAGES) {
  const html = await fetch(origin + page).then((response) => response.text());
  // Only the article body: the chrome's links are generated, not rewritten.
  const body = html.slice(html.indexOf('class="dx-prose"'));
  for (const match of body.matchAll(/href="([^"]+)"/g)) {
    const href = match[1];
    if (href.startsWith("#")) continue;
    if (href.startsWith("http")) {
      external.add(href.split("#")[0]);
      continue;
    }
    const clean = href.split("#")[0];
    if (clean.endsWith(".md")) {
      // The Markdown twin of the page itself is expected; a wiki path is not.
      if (!clean.startsWith("/docs")) suspicious.push(`${page} -> ${href}`);
      continue;
    }
    if (!href.startsWith("/")) suspicious.push(`${page} -> ${href} (relative)`);
    else internal.add(clean);
  }
}

console.log("Internal targets found:", internal.size);
const broken = [];
for (const target of [...internal].sort()) {
  const response = await fetch(origin + target, { redirect: "manual" });
  if (response.status !== 200) broken.push(`${target} => ${response.status}`);
}

console.log("\nExternal targets (should all be the platform repository or a real site):");
for (const href of [...external].sort()) console.log("  ", href);

console.log("\nBroken internal links:", broken.length);
for (const entry of broken) console.log("  ", entry);

console.log("\nSuspicious hrefs:", suspicious.length);
for (const entry of suspicious) console.log("  ", entry);

process.exit(broken.length === 0 && suspicious.length === 0 ? 0 : 1);
