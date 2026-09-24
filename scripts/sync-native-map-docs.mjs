/** Merge only Open77.map contracts; preserve the site's reviewed guide and other APIs. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertEditorialProse, reviewApiEntries } from "./docs-editorial.mjs";

const args = process.argv.slice(2);
let source = process.env.OPEN77_WIKI_SOURCE ?? "../CyberM/wiki";
let check = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--from") {
    assert.ok(args[i + 1] && !args[i + 1].startsWith("--"), "--from requires a wiki path");
    source = args[++i];
  } else if (args[i] === "--check") check = true;
  else throw new Error(`Unknown argument: ${args[i]}`);
}
const read = async (file) => (await readFile(file, "utf8")).replaceAll("\r\n", "\n");
const hash = (text) => createHash("sha256").update(text).digest("hex");
const key = (entry) => `${entry.runtime}:${entry.qualified}`;
const selected = (entry) => entry.runtime === "client" && entry.namespace === "Open77.map";
const names = ["getWaypoint", "getSelectedMarker", "isOpen", "state", "open", "close", "pickPoint", "cancelPick",
  "getView", "focus", "recenter", "setZoomLevel", "setCameraMode",
  "getScreen", "setTitle", "setAccentColor", "resetAppearance", "addTab", "removeTab", "selectTab", "setTabLabel"];
const sourceApi = await read(path.join(source, "data/api.json"));
const incoming = reviewApiEntries(JSON.parse(sourceApi).filter(selected));
assert.deepEqual(incoming.map((entry) => entry.name).sort(), [...names].sort(), "Regenerate all 21 native-map API cards first");
assert.equal(new Set(incoming.map(key)).size, incoming.length, "Duplicate source cards");
const apiTarget = "content/api/api.json";
const current = JSON.parse(await read(apiTarget));
assert.equal(new Set(current.map(key)).size, current.length, "Duplicate site cards");
const incomingByKey = new Map(incoming.map((entry) => [key(entry), entry]));
const existingKeys = new Set(current.map(key));
const merged = [...current.map((entry) => incomingByKey.get(key(entry)) ?? entry),
  ...incoming.filter((entry) => !existingKeys.has(key(entry)))];
assert.deepEqual(merged.filter((entry) => !selected(entry)), current.filter((entry) => !selected(entry)), "Unrelated API drift");
const guideTarget = "content/docs/native-map.md";
const guide = await read(guideTarget);
assertEditorialProse(guide, guideTarget);
const sourceGuide = await read(path.join(source, "native-map.md"));
const manifestTarget = "content/docs/_manifest.json";
const manifest = JSON.parse(await read(manifestTarget));
const recordFor = (target) => {
  const records = manifest.files.filter((record) => record.target.replaceAll("\\", "/") === target);
  assert.equal(records.length, 1, `Expected one manifest record: ${target}`);
  return records[0];
};
const writes = new Map([[guideTarget, guide], [apiTarget, JSON.stringify(merged, null, 1) + "\n"]]);
if (check) {
  const sorted = (entries) => entries.filter(selected).sort((a, b) => key(a).localeCompare(key(b)));
  assert.deepEqual(sorted(current), sorted(incoming), "Native-map API drift");
  for (const target of writes.keys()) {
    const actual = await read(target);
    const record = recordFor(target);
    assert.equal(record.sha256, hash(actual), `${target}: hash`);
    assert.equal(record.bytes, Buffer.byteLength(actual), `${target}: bytes`);
  }
  assert.equal(manifest.apiEntries, current.length);
  assert.equal(recordFor(apiTarget).entries, current.length);
  assert.equal(manifest.nativeMapSync.sourceGuideSha256, hash(sourceGuide), "Source guide changed; review public guide");
  assert.equal(manifest.nativeMapSync.sourceApiSha256, hash(JSON.stringify(incoming)), "Source contracts changed");
} else {
  const git = (...argv) => execFileSync("git", ["-C", source, ...argv], { encoding: "utf8" }).trim();
  const provenance = {
    tool: "scripts/sync-native-map-docs.mjs", syncedAt: new Date().toISOString(),
    sourceRevision: git("rev-parse", "HEAD"),
    sourceWorkingTreeDirty: Boolean(git("status", "--porcelain", "--", "native-map.md", "data/api.json")),
    sourceGuideSha256: hash(sourceGuide), sourceApiSha256: hash(JSON.stringify(incoming)),
    guides: ["native-map"], apiRouteIds: incoming.map(key).sort(),
    guideMode: "site-owned-technical-amendment", apiMode: "merge-selected-cards-preserve-other-site-entries",
  };
  for (const [target, text] of writes) {
    const record = recordFor(target);
    record.bytes = Buffer.byteLength(text);
    record.sha256 = hash(text);
    if (target === apiTarget) {
      record.entries = merged.length;
      await writeFile(target, text, "utf8");
    } else {
      record.title = guide.match(/^#\s+(.+)$/m)[1];
      record.siteEditorial = { ...record.siteEditorial, owner: "website", nativeMapAmendment: provenance };
    }
  }
  // Do not replace the full snapshot date or previous, unrelated partial-sync provenance.
  manifest.apiEntries = merged.length;
  manifest.nativeMapSync = provenance;
  await writeFile(manifestTarget, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}
console.log(`Native map: 21 API contracts ${check ? "verified" : "synced"}; reviewed site prose and unrelated APIs preserved.`);
