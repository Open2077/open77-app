/** Merge the weapon-tuning and character-launch slice; retain other public contracts. */
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
const key = (entry) => `${entry.runtime}:${entry.qualified}`;
const expected = [
  "client:Open77.weapons.clearTuning", "client:Open77.weapons.setTuning", "client:Open77.weapons.tuning",
  "client:Open77.motion.launch", "server:Open77.motion.launch", "server:Open77.motion.current",
  "server:Open77.players.ragdoll",
].sort();
const selected = (entry) => expected.includes(key(entry));
const incoming = reviewApiEntries(JSON.parse(await read(path.join(source, "data/api.json"))).filter(selected));
assert.deepEqual(incoming.map(key).sort(), expected);
for (const entry of incoming) assert.equal(entry.inferred, false, entry.qualified);
const apiTarget = "content/api/api.json";
const current = JSON.parse(await read(apiTarget));
assert.equal(new Set(current.map(key)).size, current.length, "Duplicate site cards");
const byKey = new Map(incoming.map((entry) => [key(entry), entry]));
const oldKeys = new Set(current.map(key));
const merged = [...current.map((entry) => byKey.get(key(entry)) ?? entry), ...incoming.filter((entry) => !oldKeys.has(key(entry)))];
assert.deepEqual(merged.filter((entry) => !selected(entry)), current.filter((entry) => !selected(entry)));
const guideTargets = ["content/docs/weapons-api.md", "content/docs/player-freeze.md"];
const guides = new Map();
for (const target of guideTargets) {
  const text = await read(target);
  assertEditorialProse(text, target);
  guides.set(target, text);
}
assertEditorialProse(await read("content/guides/weapon-customization.md"), "weapon-customization");
const manifestTarget = "content/docs/_manifest.json";
const manifest = JSON.parse(await read(manifestTarget));
const recordFor = (target) => {
  const matches = manifest.files.filter((entry) => entry.target.replaceAll("\\", "/") === target);
  assert.equal(matches.length, 1, target);
  return matches[0];
};
if (check) {
  assert.deepEqual(current.filter(selected).sort((a, b) => key(a).localeCompare(key(b))), incoming.sort((a, b) => key(a).localeCompare(key(b))));
  for (const target of [apiTarget, ...guideTargets]) {
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
    sourceWorkingTreeDirty: Boolean(git("status", "--porcelain", "--", "api-descriptions.json", "cyberware-api.json", "server-api-notes.json", "data/api.json", "weapons-api.md", "player-freeze.md")),
    sourceApiSha256: hash(JSON.stringify(incoming)),
    apiRouteIds: incoming.map(key), apiMode: "merge-selected-cards-preserve-other-site-entries",
  };
  const writes = new Map([[apiTarget, JSON.stringify(merged, null, 1) + "\n"], ...guides]);
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
console.log(`Weapon tuning and launch: seven scoped API cards ${check ? "verified" : "synced"}; unrelated APIs preserved.`);
