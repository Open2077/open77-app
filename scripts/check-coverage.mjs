/**
 * Guards against a wiki page that exists but has no route.
 *
 * `meta.json` drives the sidebar, the sitemap and the Markdown endpoints, so a
 * guide missing from it is invisible on the site even though the file was
 * synced. This compares the synced files against the navigation in both
 * directions and against the source wiki, and fails on any gap.
 *
 * Usage: node scripts/check-coverage.mjs [pathToSourceWiki]
 */

import fs from "node:fs/promises";
import path from "node:path";

const CONTENT_DIR = path.join(process.cwd(), "content", "docs");
const sourceWiki = process.argv[2] ?? path.join(process.cwd(), "..", "base", "wiki");

const meta = JSON.parse(await fs.readFile(path.join(CONTENT_DIR, "meta.json"), "utf8"));

/** Every page the navigation knows about, and the file it reads. */
const navFiles = new Map();
for (const section of meta.sections) {
  for (const page of section.pages) {
    navFiles.set(page.file ?? `${page.slug}.md`, page);
  }
}

const syncedFiles = (await fs.readdir(CONTENT_DIR)).filter((name) => name.endsWith(".md"));

let sourceFiles = [];
try {
  sourceFiles = (await fs.readdir(sourceWiki)).filter((name) => name.endsWith(".md"));
} catch {
  console.log(`(source wiki not readable at ${sourceWiki} — skipping that comparison)`);
}

const problems = [];

for (const file of syncedFiles) {
  if (!navFiles.has(file)) problems.push(`synced but not in meta.json: ${file}`);
}
for (const file of navFiles.keys()) {
  // `api` and `platform` are hand-built pages with no Markdown source.
  const page = navFiles.get(file);
  if (page.kind === "page" && !syncedFiles.includes(file)) continue;
  if (!syncedFiles.includes(file)) problems.push(`in meta.json but not synced: ${file}`);
}
for (const file of sourceFiles) {
  if (!syncedFiles.includes(file)) problems.push(`in source wiki but not synced: ${file}`);
}

console.log(`source wiki  : ${sourceFiles.length} markdown files`);
console.log(`synced       : ${syncedFiles.length} markdown files`);
console.log(`in navigation: ${navFiles.size} pages`);
console.log(`\nproblems: ${problems.length}`);
for (const problem of problems) console.log("  ", problem);

process.exit(problems.length === 0 ? 0 : 1);
