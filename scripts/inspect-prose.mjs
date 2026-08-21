/**
 * Prints the sentences around each reference to a file in the platform
 * repository, so the wording can be read the way a visitor reads it.
 *
 * These used to be links. While the platform repository is private they render
 * as inline code, and this exists to confirm the surrounding prose still makes
 * sense once the link is gone.
 *
 * Usage: node scripts/inspect-prose.mjs [origin]
 */

const origin = process.argv[2] ?? "http://127.0.0.1:3000";

const PAGES = [
  "/docs",
  "/docs/npcs",
  "/docs/data-reference",
  "/docs/vehicles",
  "/docs/server-resources",
  "/docs/debug-runtime",
  "/docs/resource-exports",
  "/docs/server-api",
];

function toText(html) {
  return html
    .replace(/<code[^>]*>/g, "`")
    .replace(/<\/code>/g, "`")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ");
}

const PATTERN = /[^.!?]*`(?:wiki|docs|resources|LICENSE)[^`]*`[^.!?]*[.!?]/g;

for (const page of PAGES) {
  const html = await fetch(origin + page).then((response) => response.text());
  const start = html.indexOf('class="dx-prose"');
  const end = html.indexOf("dx-index-section");
  const text = toText(html.slice(start, end > start ? end : undefined));

  console.log(`=== ${page} ===`);
  const hits = [...new Set(text.match(PATTERN) ?? [])];
  if (hits.length === 0) {
    console.log("   (no repository file references)");
  }
  for (const hit of hits) console.log("  ", hit.trim());
}
