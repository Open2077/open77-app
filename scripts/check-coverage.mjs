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

import { isExcluded } from "./wiki-exclusions.mjs";

const CONTENT_DIR = path.join(process.cwd(), "content", "docs");
const AUTHORED_DIR = path.join(process.cwd(), "content", "guides");
const sourceWiki = process.argv[2] ?? path.join(process.cwd(), "..", "base", "wiki");

const meta = JSON.parse(await fs.readFile(path.join(CONTENT_DIR, "meta.json"), "utf8"));

/** Every page the navigation knows about, and the file it reads. */
const navFiles = new Map();
/** The subset authored here rather than synced, keyed the same way. */
const authoredNavFiles = new Map();
for (const section of meta.sections) {
  for (const page of section.pages) {
    const file = page.file ?? `${page.slug}.md`;
    if (page.source === "authored") authoredNavFiles.set(file, page);
    else navFiles.set(file, page);
  }
}

const syncedFiles = (await fs.readdir(CONTENT_DIR)).filter((name) => name.endsWith(".md"));

let authoredFiles = [];
try {
  authoredFiles = (await fs.readdir(AUTHORED_DIR)).filter((name) => name.endsWith(".md"));
} catch {
  // No authored guides in the tree is a valid state.
}

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
  // A deliberately held-back guide is a decision, not a gap. `wiki-exclusions.mjs`
  // carries the reason and the condition for publishing it.
  if (isExcluded(file)) continue;
  if (!syncedFiles.includes(file)) problems.push(`in source wiki but not synced: ${file}`);
}

// Authored guides are the mirror image: they have no wiki source, so the only
// gap that can exist is a navigation entry with no file, or a file with no
// entry — which would be an unreachable page exactly as an unsynced guide is.
for (const file of authoredFiles) {
  if (!authoredNavFiles.has(file)) problems.push(`authored but not in meta.json: ${file}`);
  if (syncedFiles.includes(file)) {
    problems.push(`authored guide collides with a synced wiki guide: ${file}`);
  }
}
for (const file of authoredNavFiles.keys()) {
  if (!authoredFiles.includes(file)) problems.push(`in meta.json but not authored: ${file}`);
}

console.log(`source wiki  : ${sourceFiles.length} markdown files`);
console.log(`synced       : ${syncedFiles.length} markdown files`);
console.log(`authored here: ${authoredFiles.length} markdown files`);
console.log(`in navigation: ${navFiles.size + authoredNavFiles.size} pages`);
console.log(`\nproblems: ${problems.length}`);
for (const problem of problems) console.log("  ", problem);

process.exit(problems.length === 0 ? 0 : 1);
