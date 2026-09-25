/** Merge only the three native weapon-tuning cards; retain other public contracts. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertEditorialProse, reviewApiEntries } from "./docs-editorial.mjs";

let source = process.env.OPEN77_WIKI_SOURCE;
let check = false;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--from") source = args[++i];
  else if (args[i] === "--check") check = true;
  else throw new Error(`Unknown argument: ${args[i]}`);
}
assert.ok(source, "Pass --from <platform-worktree>/wiki");
const read = async (file) => (await readFile(file, "utf8")).replaceAll("\r\n", "\n");
const hash = (text) => createHash("sha256").update(text).digest("hex");
const names = ["clearTuning", "setTuning", "tuning"];
const selected = (entry) => entry.runtime === "client" && entry.namespace === "Open77.weapons" && names.includes(entry.name);
const key = (entry) => `${entry.runtime}:${entry.qualified}`;
const incoming = reviewApiEntries(JSON.parse(await read(path.join(source, "data/api.json"))).filter(selected));
assert.deepEqual(incoming.map((entry) => entry.name).sort(), names);
for (const entry of incoming) assert.equal(entry.inferred, false, entry.qualified);
const apiTarget = "content/api/api.json";
const current = JSON.parse(await read(apiTarget));
assert.equal(new Set(current.map(key)).size, current.length, "Duplicate site cards");
const byKey = new Map(incoming.map((entry) => [key(entry), entry]));
const oldKeys = new Set(current.map(key));
const merged = [...current.map((entry) => byKey.get(key(entry)) ?? entry), ...incoming.filter((entry) => !oldKeys.has(key(entry)))];
assert.deepEqual(merged.filter((entry) => !selected(entry)), current.filter((entry) => !selected(entry)));
const guideTarget = "content/docs/weapons-api.md";
const guide = await read(guideTarget);
assertEditorialProse(guide, guideTarget);
assertEditorialProse(await read("content/guides/weapon-customization.md"), "weapon-customization");
const manifestTarget = "content/docs/_manifest.json";
const manifest = JSON.parse(await read(manifestTarget));
const recordFor = (target) => {
  const matches = manifest.files.filter((entry) => entry.target.replaceAll("\\", "/") === target);
  assert.equal(matches.length, 1, target);
  return matches[0];
};
if (check) {
  assert.deepEqual(current.filter(selected).sort((a, b) => a.name.localeCompare(b.name)), incoming.sort((a, b) => a.name.localeCompare(b.name)));
  for (const target of [apiTarget, guideTarget]) {
    const text = await read(target);
    assert.equal(recordFor(target).sha256, hash(text), target);
    assert.equal(recordFor(target).bytes, Buffer.byteLength(text), target);
  }
  assert.equal(manifest.apiEntries, current.length);
  assert.equal(recordFor(apiTarget).entries, current.length);
} else {
  const git = (...argv) => execFileSync("git", ["-C", source, ...argv], { encoding: "utf8" }).trim();
  const provenance = {
    tool: "scripts/sync-weapon-tuning-docs.mjs", syncedAt: new Date().toISOString(),
    sourceRevision: git("rev-parse", "HEAD"),
    sourceWorkingTreeDirty: Boolean(git("status", "--porcelain", "--", "api-descriptions.json", "data/api.json", "weapons-api.md")),
    sourceApiSha256: hash(JSON.stringify(incoming)),
    apiRouteIds: incoming.map(key), apiMode: "merge-selected-cards-preserve-other-site-entries",
  };
  const writes = new Map([[apiTarget, JSON.stringify(merged, null, 1) + "\n"], [guideTarget, guide]]);
  for (const [target, text] of writes) {
    const record = recordFor(target);
    record.bytes = Buffer.byteLength(text); record.sha256 = hash(text);
    if (target === apiTarget) { record.entries = merged.length; await writeFile(target, text); }
    else record.siteEditorial = { ...record.siteEditorial, owner: "website", weaponTuningAmendment: provenance };
  }
  manifest.apiEntries = merged.length;
  manifest.weaponTuningSync = provenance;
  await writeFile(manifestTarget, JSON.stringify(manifest, null, 2) + "\n");
}
console.log(`Weapon tuning: three native cards ${check ? "verified" : "synced"}; unrelated APIs preserved.`);
