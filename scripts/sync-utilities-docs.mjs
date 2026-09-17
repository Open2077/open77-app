/** Publish only the utility/audio contracts; preserve newer unrelated site docs. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readGuideForSync, reviewApiEntries } from "./docs-editorial.mjs";

const args = process.argv.slice(2);
let source = process.env.OPEN77_WIKI_SOURCE ?? "../CyberM/wiki";
let check = false;
for (let i = 0; i < args.length; ++i) {
  if (args[i] === "--from") {
    assert.ok(args[i + 1] && !args[i + 1].startsWith("--"), "--from needs a wiki path");
    source = args[++i];
  } else if (args[i] === "--check") check = true;
  else throw new Error(`Unknown argument: ${args[i]}`);
}
const read = async (file) => (await readFile(file, "utf8")).replaceAll("\r\n", "\n");
const hash = (text) => createHash("sha256").update(text).digest("hex");
const key = (entry) => `${entry.runtime}:${entry.namespace}.${entry.name}`;
const contracts = JSON.parse(await read(path.join(source, "utilities-audio-api.json")));
const selectedKeys = new Set(contracts.map((entry) => key({ ...entry, namespace: entry.scope })));
assert.equal(selectedKeys.size, 47, "Expected 47 utility/audio contracts");
// This release also ships the previously implemented server-owned holocall glow.
for (const id of ["server:Open77.players.setHoloCallEyes", "server:Open77.players.getHoloCallEyes", "client:Open77.players.getHoloCallEyes"]) selectedKeys.add(id);
const selected = (entry) => selectedKeys.has(key(entry));
const incoming = reviewApiEntries(JSON.parse(await read(path.join(source, "data/api.json")))).filter(selected);
assert.equal(incoming.length, selectedKeys.size, "Missing generated utility/audio cards");
const apiTarget = "content/api/api.json";
const current = JSON.parse(await read(apiTarget));
assert.equal(new Set(current.map(key)).size, current.length, "Duplicate site cards");
const byKey = new Map(incoming.map((entry) => [key(entry), entry]));
const currentKeys = new Set(current.map(key));
const merged = [...current.map((entry) => byKey.get(key(entry)) ?? entry),
  ...incoming.filter((entry) => !currentKeys.has(key(entry)))];
const guides = ["player-utilities", "package-audio", "holocall-eyes"];
const writes = new Map();
for (const slug of guides) writes.set(`content/docs/${slug}.md`, await readGuideForSync(source, `${slug}.md`));
writes.set(apiTarget, JSON.stringify(merged, null, 1) + "\n");
const manifestTarget = "content/docs/_manifest.json";
const manifest = JSON.parse(await read(manifestTarget));
const recordFor = (target) => manifest.files.find((file) => file.target.replaceAll("\\", "/") === target);
if (check) {
  const sorted = (entries) => entries.filter(selected).sort((a, b) => key(a).localeCompare(key(b)));
  assert.deepEqual(sorted(current), sorted(incoming), "Utility/audio API drift");
  for (const [target, expected] of writes) {
    const actual = await read(target);
    if (target !== apiTarget) assert.equal(actual, expected, target);
    const record = recordFor(target);
    assert.ok(record, `Missing manifest entry: ${target}`);
    assert.equal(record.sha256, hash(actual), `${target}: hash`);
    assert.equal(record.bytes, Buffer.byteLength(actual), `${target}: bytes`);
  }
  assert.equal(manifest.apiEntries, current.length);
  console.log("Utility/audio/holocall sync verified: three guides and 50 API cards.");
} else {
  for (const [target, text] of writes) {
    const existing = recordFor(target);
    const slug = path.basename(target, ".md");
    const record = { ...(existing ?? {}),
      source: target === apiTarget ? "wiki/data/api.json" : `wiki/${slug}.md`, target,
      ...(target === apiTarget ? { entries: merged.length } : { slug, title: text.match(/^#\s+(.+)$/m)?.[1] ?? slug }),
      bytes: Buffer.byteLength(text), sha256: hash(text),
    };
    if (existing) Object.assign(existing, record);
    else manifest.files.push(record);
    await writeFile(target, text, "utf8");
  }
  manifest.guides = manifest.files.filter((file) => file.slug).length;
  manifest.apiEntries = merged.length;
  manifest.syncedAt = new Date().toISOString();
  manifest.partialSync = { tool: "scripts/sync-utilities-docs.mjs", syncedAt: manifest.syncedAt,
    sourcePath: "wiki", guides, apiRouteIds: incoming.map(key).sort(),
    apiMode: "merge-selected-cards-preserve-other-site-entries" };
  await writeFile(manifestTarget, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log("Synced three guides and 50 API cards; unrelated site content preserved.");
}
