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
import { existsSync } from "node:fs";
import path from "node:path";

const wiki = process.argv[2] ?? process.env.OPEN77_WIKI_SOURCE ?? ["CyberM", "open77-base", "base"]
  .map((directory) => path.join(process.cwd(), "..", directory, "wiki"))
  .find(existsSync) ?? path.join(process.cwd(), "..", "base", "wiki");
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

/**
 * An overlay file, or `null` when the wiki does not carry one.
 *
 * An overlay is a hand-written supplement to the extractor, so upstream is free
 * to retire one by writing the same prose into the extractor itself — which is
 * what happened to `cyberware-api.json`. Crashing on the absent file would then
 * report a regression that does not exist, so a missing overlay is announced
 * and skipped; prose that silently stopped merging is still a failure.
 */
async function readOverlay(name) {
  if (!existsSync(path.join(wiki, name))) {
    console.log(`${name}: not in this wiki — skipped`);
    return null;
  }
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
    [entry.description, entry.summary].some((value) =>
      typeof value === "string" && value.replace(/\s+/g, " ").includes(needle),
    ),
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
const descriptions = await readOverlay("api-descriptions.json");
const notes = await readOverlay("api-notes.json");
if (!descriptions || !notes) {
  throw new Error("api-descriptions.json and api-notes.json are required overlays");
}
gaps += audit(
  "api-descriptions.json",
  descriptions,
  (name) => byQualified.get(name),
);
// The extractor deliberately applies api-descriptions after api-notes. Check
// their effective merged prose rather than requiring a superseded description
// to survive as well (e.g. Open77.travel.isMapPick).
const effectiveNotes = Object.fromEntries(Object.entries(notes).map(([name, value]) =>
  [name, { ...value, ...descriptions[name] }],
));
gaps += audit("api-notes.json (effective)", effectiveNotes, (name) =>
  byQualified.get(name),
);
const serverVehicles = await readOverlay("server-vehicle-api.json");
if (serverVehicles) {
  gaps += audit(
    "server-vehicle-api.json",
    serverVehicles,
    (name) => byQualified.get(`Open77.vehicles.${name}`) ?? byQualified.get(name),
  );
}
const animations = await readOverlay("animation-api.json");
for (const runtime of animations ? ["client", "server"] : []) {
  gaps += audit(`animation-api.json (${runtime})`, animations[runtime], (name) =>
    byQualified.get(`Open77.animations.${name}`)?.filter((entry) => entry.runtime === runtime),
  );
}

const cyberware = await readOverlay("cyberware-api.json");
for (const [runtime, namespaces] of Object.entries(cyberware ?? {})) {
  for (const [namespace, cards] of Object.entries(namespaces)) {
    gaps += audit(`cyberware-api.json (${runtime} ${namespace})`, cards, (name) =>
      byQualified.get(`${namespace}.${name}`)?.filter((entry) => entry.runtime === runtime),
    );
  }
}

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

// Every card carries a worked example: a generated card through the wiki
// overlays, a table-derived server global through the site's own overlay.
// A card without one used to be the silent default; keep it a failure.
const overlayExamples = JSON.parse(await fs.readFile(
  path.join(process.cwd(), "content", "api", "server-globals-examples.json"), "utf8",
));
// A wiki server-global card without an example is served with the site-owned
// overlay example (src/lib/api-reference.ts); only a card neither side covers is a gap.
const missingExamples = api
  .filter((entry) => !entry.example && !(entry.runtime === "server" && entry.namespace === "_G" && typeof overlayExamples[entry.name] === "string" && overlayExamples[entry.name].trim()))
  .map((entry) => entry.route_id);
if (missingExamples.length > 0) {
  console.log(`   cards without an example: ${missingExamples.join(", ")}`);
  gaps += missingExamples.length;
}
const globalsExamples = JSON.parse(await fs.readFile(
  path.join(process.cwd(), "content", "api", "server-globals-examples.json"), "utf8",
));
const emptyGlobals = Object.entries(globalsExamples)
  .filter(([name, text]) => !name.startsWith("$") && (typeof text !== "string" || !text.trim()))
  .map(([name]) => name);
if (emptyGlobals.length > 0) {
  console.log(`   server-globals-examples.json entries without text: ${emptyGlobals.join(", ")}`);
  gaps += emptyGlobals.length;
}

process.exit(gaps === 0 ? 0 : 1);
