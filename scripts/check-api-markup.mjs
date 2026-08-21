/**
 * Reports what Markdown markup appears inside the API JSON's prose fields.
 *
 * The extractor's summaries and descriptions are written as Markdown, because
 * their other destination is a Markdown file. Anything the HTML pages render as
 * plain text therefore shows up as literal syntax — visible backticks around
 * every identifier.
 *
 * Usage: node scripts/check-api-markup.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";

const api = JSON.parse(
  await fs.readFile(path.join(process.cwd(), "content", "api", "api.json"), "utf8"),
);

const PATTERNS = [
  ["inline code", /`[^`]+`/],
  ["bold", /\*\*[^*]+\*\*/],
  ["link", /\[[^\]]+\]\([^)]+\)/],
  ["bullet list", /^[-*] /m],
  ["heading", /^#{1,6} /m],
  ["table row", /\|.*\|/],
];

const FIELDS = ["summary", "description"];
const counts = new Map();

for (const entry of api) {
  for (const field of FIELDS) {
    const value = entry[field] ?? "";
    for (const [name, pattern] of PATTERNS) {
      if (!pattern.test(value)) continue;
      const key = `${field} — ${name}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  for (const value of entry.returns ?? []) {
    if (/`[^`]+`/.test(value)) {
      counts.set("returns — inline code", (counts.get("returns — inline code") ?? 0) + 1);
    }
  }
  for (const param of entry.params ?? []) {
    if (param.default && /`/.test(param.default)) {
      counts.set("param default — backtick", (counts.get("param default — backtick") ?? 0) + 1);
    }
  }
}

console.log(`entries: ${api.length}\n`);
if (counts.size === 0) {
  console.log("No Markdown markup found in the prose fields.");
} else {
  for (const [key, count] of [...counts].sort((a, b) => b[1] - a[1])) {
    console.log(`${String(count).padStart(4)}  ${key}`);
  }
}

console.log("\nExamples of inline code in descriptions:");
let shown = 0;
for (const entry of api) {
  const matches = (entry.description ?? "").match(/`[^`]+`/g);
  if (!matches) continue;
  console.log(`  ${entry.qualified}: ${matches.slice(0, 4).join(" ")}`);
  if (++shown >= 8) break;
}

console.log("\nAnything other than inline code (would need a real renderer):");
let other = 0;
for (const entry of api) {
  for (const field of FIELDS) {
    const value = entry[field] ?? "";
    for (const [name, pattern] of PATTERNS) {
      if (name === "inline code" || name === "table row") continue;
      if (!pattern.test(value)) continue;
      console.log(`  ${entry.qualified} (${field}, ${name}): ${value.slice(0, 120)}`);
      other += 1;
    }
  }
}
if (other === 0) console.log("  none — inline code is the only markup used");
