/** Sync the RTTI guide and five client contracts from a committed platform revision. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { reviewApiEntries } from "./docs-editorial.mjs";

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
const selected = (entry) => entry.namespace === "Open77.rtti";
const incoming = reviewApiEntries(JSON.parse(await read(path.join(source, "data/api.json"))).filter(selected));
assert.deepEqual(incoming.map(key).sort(), ["call", "hook", "release", "resolve", "unhook"].map((name) => `client:Open77.rtti.${name}`).sort());
for (const entry of incoming) {
  assert.ok(!entry.inferred && entry.description && entry.example, key(entry));
  assert.deepEqual(entry.permissions, ["rtti.native"], key(entry));
}
const git = (...argv) => execFileSync("git", ["-C", source, ...argv], { encoding: "utf8" }).trim();
assert.equal(git("status", "--porcelain", "--", "api-notes.json", "tools/extract-api.py", "data/api.json", "rtti.md"), "", "Commit the source contracts before syncing");
execFileSync(process.execPath, ["scripts/sync-wiki.mjs", "--from", source, "--only", "rtti.md", ...(check ? ["--check"] : [])], { stdio: "inherit" });

const target = "content/api/api.json";
const current = JSON.parse(await read(target));
assert.equal(new Set(current.map(key)).size, current.length, "Duplicate site cards");
const byKey = new Map(incoming.map((entry) => [key(entry), entry]));
const oldKeys = new Set(current.map(key));
const merged = [...current.map((entry) => byKey.get(key(entry)) ?? entry), ...incoming.filter((entry) => !oldKeys.has(key(entry)))];
assert.deepEqual(merged.filter((entry) => !selected(entry)), current.filter((entry) => !selected(entry)));
const manifestPath = "content/docs/_manifest.json";
const manifest = JSON.parse(await read(manifestPath));
const record = manifest.files.find((entry) => entry.target.replaceAll("\\", "/") === target);
assert.ok(record, "Missing API manifest record");
if (check) {
  const sorted = (entries) => entries.filter(selected).sort((a, b) => key(a).localeCompare(key(b)));
  assert.deepEqual(sorted(current), sorted(incoming), "RTTI contract drift");
  const text = await read(target);
  assert.equal(record.sha256, hash(text));
  assert.equal(record.bytes, Buffer.byteLength(text));
  assert.equal(record.entries, current.length);
  assert.equal(manifest.apiEntries, current.length);
} else {
  const text = JSON.stringify(merged, null, 1) + "\n";
  Object.assign(record, { entries: merged.length, bytes: Buffer.byteLength(text), sha256: hash(text) });
  manifest.apiEntries = merged.length;
  manifest.rttiSync = {
    tool: "scripts/sync-rtti-docs.mjs", syncedAt: new Date().toISOString(),
    sourceRevision: git("rev-parse", "HEAD"), sourceWorkingTreeDirty: false,
    sourceApiSha256: hash(JSON.stringify(incoming)), apiRouteIds: incoming.map(key).sort(),
    apiMode: "merge-selected-cards-preserve-other-site-entries",
  };
  await writeFile(target, text);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}
console.log(`RTTI documentation ${check ? "verified" : "synced"}: one guide and five client contracts.`);
