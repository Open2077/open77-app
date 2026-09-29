/** Merge the eight drive-by contracts and guide without replacing other site documentation. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertEditorialProse, reviewApiEntries } from "./docs-editorial.mjs";

let source = process.env.OPEN77_WIKI_SOURCE ?? "../CyberM/wiki";
let check = false;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--from") {
    assert.ok(args[i + 1] && !args[i + 1].startsWith("--"), "--from needs a wiki path");
    source = args[++i];
  } else if (args[i] === "--check") check = true;
  else throw new Error(`Unknown argument: ${args[i]}`);
}
const read = async (file) => (await readFile(file, "utf8")).replaceAll("\r\n", "\n");
const hash = (text) => createHash("sha256").update(text).digest("hex");
const key = (entry) => `${entry.runtime}:${entry.qualified}`;
const reads = ["getDriveByState", "isDriveByEnabled", "isInDriveBy"];
const expected = [...["client", "server"].flatMap((runtime) => reads.map((name) => `${runtime}:Open77.players.${name}`)),
  "client:Open77.players.setLocalDriveByEnabled", "server:Open77.players.setDriveByEnabled"].sort();
const selected = (entry) => expected.includes(key(entry));
const incoming = reviewApiEntries(JSON.parse(await read(path.join(source, "data/api.json"))).filter(selected));
assert.deepEqual(incoming.map(key).sort(), expected, "Missing or duplicate drive-by contracts");
for (const entry of incoming) {
  assert.ok(!entry.inferred && entry.description && entry.example, key(entry));
  const permission = entry.name.startsWith("set") ? "players.driveby" : entry.runtime === "client" ? "players.read" : "players.life.read";
  assert.deepEqual(entry.permissions, [permission], key(entry));
}
const git = (...argv) => execFileSync("git", ["-C", source, ...argv], { encoding: "utf8" }).trim();
assert.equal(git("status", "--porcelain", "--", "api-notes.json", "server-api-notes.json", "tools/extract-api.py", "data/api.json", "drive-by.md"), "", "Commit the source contracts before syncing");

execFileSync(process.execPath, ["scripts/sync-wiki.mjs", "--from", source, "--only", "drive-by.md", ...(check ? ["--check"] : [])], { stdio: "inherit" });
const apiTarget = "content/api/api.json";
const current = JSON.parse(await read(apiTarget));
assert.equal(new Set(current.map(key)).size, current.length, "Duplicate site cards");
const byKey = new Map(incoming.map((entry) => [key(entry), entry]));
const oldKeys = new Set(current.map(key));
const merged = [...current.map((entry) => byKey.get(key(entry)) ?? entry), ...incoming.filter((entry) => !oldKeys.has(key(entry)))];
assert.deepEqual(merged.filter((entry) => !selected(entry)), current.filter((entry) => !selected(entry)));
const guideTexts = new Map();
for (const filename of ["README.md", "player-utilities.md", "server-api.md", "vehicles.md"]) {
  const target = `content/docs/${filename}`;
  const text = await read(target);
  assertEditorialProse(text, target);
  guideTexts.set(target, text);
}
const manifestTarget = "content/docs/_manifest.json";
const manifest = JSON.parse(await read(manifestTarget));
const recordFor = (target) => manifest.files.find((entry) => entry.target.replaceAll("\\", "/") === target);
if (check) {
  const sorted = (entries) => entries.filter(selected).sort((a, b) => key(a).localeCompare(key(b)));
  assert.deepEqual(sorted(current), sorted(incoming));
  for (const target of [apiTarget, ...guideTexts.keys()]) {
    const text = await read(target);
    assert.equal(recordFor(target)?.sha256, hash(text), target);
    assert.equal(recordFor(target)?.bytes, Buffer.byteLength(text), target);
  }
  assert.equal(manifest.apiEntries, current.length);
  assert.equal(recordFor(apiTarget).entries, current.length);
} else {
  const provenance = {
    tool: "scripts/sync-drive-by-docs.mjs", syncedAt: new Date().toISOString(),
    sourceRevision: git("rev-parse", "HEAD"), sourceWorkingTreeDirty: false,
    sourceApiSha256: hash(JSON.stringify(incoming)), apiRouteIds: incoming.map(key).sort(),
    apiMode: "merge-selected-cards-preserve-other-site-entries",
  };
  const apiText = JSON.stringify(merged, null, 1) + "\n";
  const apiRecord = recordFor(apiTarget);
  assert.ok(apiRecord, "Missing API manifest record");
  Object.assign(apiRecord, { entries: merged.length, bytes: Buffer.byteLength(apiText), sha256: hash(apiText) });
  await writeFile(apiTarget, apiText);
  for (const [target, text] of guideTexts) {
    const record = recordFor(target);
    assert.ok(record, target);
    Object.assign(record, { bytes: Buffer.byteLength(text), sha256: hash(text) });
    record.siteEditorial = { ...record.siteEditorial, owner: "website", driveByAmendment: provenance };
  }
  manifest.apiEntries = merged.length;
  manifest.driveBySync = provenance;
  await writeFile(manifestTarget, JSON.stringify(manifest, null, 2) + "\n");
}
console.log(`Drive-by: eight API cards, guide and cross-links ${check ? "verified" : "updated"}; unrelated content preserved.`);
