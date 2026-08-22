/**
 * Confirms the wiki's hand-written API overlays reached the site.
 *
 * `api.json` is generated upstream from the C++ resource host and then merged
 * with `api-descriptions.json`, `api-notes.json` and `server-vehicle-api.json`.
 * If that merge ever stops happening, the pages still render — just with the
 * terse generated summaries and none of the reviewed semantics — which is the
 * kind of regression nothing else would catch.
 *
 * Usage: node scripts/check-api-overlays.mjs [pathToSourceWiki]
 */

import fs from "node:fs/promises";
import path from "node:path";

const wiki = process.argv[2] ?? path.join(process.cwd(), "..", "base", "wiki");
const api = JSON.parse(
  await fs.readFile(path.join(process.cwd(), "content", "api", "api.json"), "utf8"),
);

/**
 * A qualified name is not unique: `Open77.vehicles.get` exists in both
 * runtimes, and the overlays are written per name, so a lookup has to consider
 * every entry that shares it.
 */
const byQualified = new Map();
for (const entry of api) {
  const bucket = byQualified.get(entry.qualified);
  if (bucket) bucket.push(entry);
  else byQualified.set(entry.qualified, [entry]);
}

async function readOverlay(name) {
  const parsed = JSON.parse(await fs.readFile(path.join(wiki, name), "utf8"));
  delete parsed._comment;
  return parsed;
}

/** The prose an overlay contributes, whichever field it uses. */
function overlayText(value) {
  if (typeof value === "string") return value;
  return value?.description ?? value?.summary ?? "";
}

/** Does any entry sharing the name carry this overlay text? */
function carries(entries, text) {
  if (!entries || !text) return false;
  const needle = text.replace(/\s+/g, " ").trim().slice(0, 60);
  return entries.some((entry) =>
    JSON.stringify(entry).replace(/\\n/g, " ").includes(needle),
  );
}

function audit(file, overlay, resolve) {
  let merged = 0;
  const unmerged = [];
  const unknown = [];
  for (const [name, value] of Object.entries(overlay)) {
    const text = overlayText(value);
    if (!text) continue;
    const entries = resolve(name);
    if (!entries) unknown.push(name);
    else if (carries(entries, text)) merged += 1;
    else unmerged.push(name);
  }

  const total = merged + unmerged.length + unknown.length;
  console.log(`${file}: ${merged}/${total} contributed prose present in api.json`);
  if (unmerged.length > 0) console.log(`   not merged: ${unmerged.join(", ")}`);
  if (unknown.length > 0) console.log(`   no such function: ${unknown.join(", ")}`);
  return unmerged.length + unknown.length;
}

let gaps = 0;
gaps += audit(
  "api-descriptions.json",
  await readOverlay("api-descriptions.json"),
  (name) => byQualified.get(name),
);
gaps += audit("api-notes.json", await readOverlay("api-notes.json"), (name) =>
  byQualified.get(name),
);
gaps += audit(
  "server-vehicle-api.json",
  await readOverlay("server-vehicle-api.json"),
  (name) => byQualified.get(`Open77.vehicles.${name}`) ?? byQualified.get(name),
);

console.log("\nCoverage of the generated fields:");
const withExample = api.filter((entry) => entry.example).length;
const reviewed = api.filter((entry) => entry.inferred === false).length;
const withReturns = api.filter((entry) => entry.returns?.length > 0).length;
console.log(`  entries          : ${api.length}`);
console.log(`  reviewed         : ${reviewed}`);
console.log(`  inferred         : ${api.length - reviewed}`);
console.log(`  with an example  : ${withExample}`);
console.log(`  documented return: ${withReturns}`);
console.log(`  api_set values   : ${[...new Set(api.map((e) => e.api_set))].join(", ")}`);

const shared = [...byQualified.entries()].filter(([, entries]) => entries.length > 1);
console.log(`  names in both runtimes: ${shared.length}`);

process.exit(gaps === 0 ? 0 : 1);
