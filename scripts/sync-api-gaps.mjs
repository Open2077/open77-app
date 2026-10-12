/**
 * Add the natives, events and permissions the platform documents but the site
 * does not list yet. Never rewrites an entry the site already has: the reviewed
 * site cards stay as they are, only missing ones are appended.
 *
 *   node scripts/sync-api-gaps.mjs --from ../base/wiki          # append what is missing
 *   node scripts/sync-api-gaps.mjs --from ../base/wiki --check  # fail when the site is behind
 *   node scripts/sync-api-gaps.mjs --from ../base/wiki --previous old-api.json
 *
 * --previous names the upstream api.json the site was last synced from. A card
 * the site still holds exactly as that version had it (after the editorial
 * review) is refreshed to the current upstream card; a card the site rewrote is
 * left alone and listed.
 *
 * A native is taken only when its card is reviewed (not an inferred signature,
 * with a description and an example) and public (no leading underscore). The
 * others are listed so they can be documented upstream first.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { reviewApiEntries } from "./docs-editorial.mjs";

let source = process.env.OPEN77_WIKI_SOURCE ?? "../base/wiki";
let check = false;
let previousPath = null;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--from") {
    assert.ok(args[i + 1] && !args[i + 1].startsWith("--"), "--from needs a wiki path");
    source = args[++i];
  } else if (args[i] === "--previous") {
    assert.ok(args[i + 1] && !args[i + 1].startsWith("--"), "--previous needs an api.json path");
    previousPath = args[++i];
  } else if (args[i] === "--check") check = true;
  else throw new Error(`Unknown argument: ${args[i]}`);
}

const read = async (file) => (await readFile(file, "utf8")).replaceAll("\r\n", "\n");
const hash = (text) => createHash("sha256").update(text).digest("hex");
const serialize = (value) => JSON.stringify(value, null, 1) + "\n";
const key = (entry) => `${entry.runtime}:${entry.qualified}`;
const isPublic = (entry) => !entry.name.startsWith("_");
const isReviewed = (entry) => !entry.inferred && Boolean(entry.description) && Boolean(entry.example);

// --- natives -------------------------------------------------------------------------------
const apiTarget = "content/api/api.json";
const siteApi = JSON.parse(await read(apiTarget));
assert.equal(new Set(siteApi.map(key)).size, siteApi.length, "Duplicate site cards");
const siteKeys = new Set(siteApi.map(key));
const upstreamApi = JSON.parse(await read(path.join(source, "data/api.json")));
const missingApi = upstreamApi.filter((entry) => isPublic(entry) && !siteKeys.has(key(entry)));
const unreviewed = missingApi.filter((entry) => !isReviewed(entry)).map(key);
const incomingApi = reviewApiEntries(missingApi.filter(isReviewed));

// Cards whose code changed upstream, refreshed only where the site kept the
// previous upstream text untouched.
const CONTENT = ["summary", "description", "params", "returns", "reasons", "permissions"];
const sameContent = (a, b) => CONTENT.every((field) => JSON.stringify(a?.[field]) === JSON.stringify(b?.[field]));
const refreshed = new Map();
const siteRewritten = [];
if (previousPath) {
  const previous = new Map(JSON.parse(await read(previousPath)).map((entry) => [key(entry), entry]));
  const upstream = new Map(upstreamApi.map((entry) => [key(entry), entry]));
  for (const card of siteApi) {
    const now = upstream.get(key(card));
    if (!now || !isPublic(now)) continue;
    const [reviewedNow] = reviewApiEntries([now]);
    if (sameContent(card, reviewedNow)) continue;
    const before = previous.get(key(card));
    const [reviewedBefore] = before ? reviewApiEntries([before]) : [null];
    if (reviewedBefore && sameContent(card, reviewedBefore)) refreshed.set(key(card), reviewedNow);
    else siteRewritten.push(key(card));
  }
}

// --- events and permissions ----------------------------------------------------------------
async function gaps(file, listKey) {
  const target = `content/api/${file}`;
  const site = JSON.parse(await read(target));
  const upstream = JSON.parse(await read(path.join(source, "data", file)));
  const names = new Set(site[listKey].map((entry) => entry.name));
  const missing = upstream[listKey].filter((entry) => !names.has(entry.name));
  return { target, site, listKey, missing };
}
const events = await gaps("events.json", "events");
const permissions = await gaps("permissions.json", "permissions");

const report = {
  natives: incomingApi.map(key),
  refreshed: [...refreshed.keys()],
  siteRewritten,
  needsUpstreamDocs: unreviewed,
  events: events.missing.map((entry) => entry.name),
  permissions: permissions.missing.map((entry) => entry.name),
};
console.log(JSON.stringify(report, null, 2));

if (check) {
  const behind = report.natives.length + report.refreshed.length + report.events.length + report.permissions.length;
  if (behind > 0) {
    console.error(`The site is behind the platform: ${behind} entr${behind === 1 ? "y" : "ies"} to add (run without --check).`);
    process.exit(1);
  }
  process.exit(0);
}

// --- write ---------------------------------------------------------------------------------
const manifestTarget = "content/docs/_manifest.json";
const manifestRaw = await readFile(manifestTarget, "utf8");
const manifest = JSON.parse(manifestRaw);
const recordFor = (target) => manifest.files.find((entry) => entry.target.replaceAll("\\", "/") === target);

async function write(target, value, entries) {
  const text = serialize(value);
  await writeFile(target, text);
  const record = recordFor(target);
  assert.ok(record, `Missing manifest record for ${target}`);
  Object.assign(record, { entries, bytes: Buffer.byteLength(text), sha256: hash(text) });
}

if (incomingApi.length || refreshed.size) {
  const merged = [...siteApi.map((card) => refreshed.get(key(card)) ?? card), ...incomingApi];
  await write(apiTarget, merged, merged.length);
  manifest.apiEntries = merged.length;
}
for (const part of [events, permissions]) {
  if (!part.missing.length) continue;
  const value = { ...part.site, [part.listKey]: [...part.site[part.listKey], ...part.missing] };
  await write(part.target, value, value[part.listKey].length);
}
if (incomingApi.length || refreshed.size || events.missing.length || permissions.missing.length) {
  let revision = null;
  try {
    revision = execFileSync("git", ["-C", source, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    // a source outside a git checkout is fine; the added names are the provenance
  }
  manifest.apiGapSync = {
    tool: "scripts/sync-api-gaps.mjs",
    syncedAt: new Date().toISOString(),
    sourceRevision: revision,
    mode: "append-missing-preserve-site-entries",
    added: { natives: report.natives, events: report.events, permissions: report.permissions },
    refreshed: report.refreshed,
  };
  const eol = manifestRaw.includes("\r\n") ? "\r\n" : "\n";
  await writeFile(manifestTarget, JSON.stringify(manifest, null, 2).replace(/\n/g, eol) + (manifestRaw.endsWith(eol) ? eol : ""));
}
if (unreviewed.length) {
  console.warn(`Skipped ${unreviewed.length} native(s) without a reviewed card: document them upstream first.`);
}
