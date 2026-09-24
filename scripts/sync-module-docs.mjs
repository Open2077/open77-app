/** Targeted module docs sync: never replace unrelated reviewed site content. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
let source = process.env.OPEN77_WIKI_SOURCE ?? "../CyberM/wiki";
let check = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--from") {
    assert.ok(args[i + 1] && !args[i + 1].startsWith("--"), "--from needs a wiki path");
    source = args[++i];
  } else if (args[i] === "--check") check = true;
  else throw new Error(`Unknown argument: ${args[i]}`);
}
const read = async (file) => (await readFile(file, "utf8")).replaceAll("\r\n", "\n");
const hash = (text) => createHash("sha256").update(text).digest("hex");
const selected = (entry) => entry.runtime === "client" && entry.namespace === "_G" && entry.name === "require";
const apiTarget = "content/api/api.json";
const current = JSON.parse(await read(apiTarget));
const incoming = JSON.parse(await read(path.join(source, "data/api.json"))).filter(selected);
assert.equal(incoming.length, 1, "Expected one client require API card");
assert.equal(current.filter(selected).length, 1, "Expected one existing require API card");
const merged = current.map((entry) => selected(entry) ? incoming[0] : entry);
const guides = ["lua-modules", "polyzone"];
const writes = new Map();
for (const slug of guides) writes.set(`content/docs/${slug}.md`, await read(path.join(source, `${slug}.md`)));
writes.set(apiTarget, JSON.stringify(merged, null, 1) + "\n");
const manifestTarget = "content/docs/_manifest.json";
const manifest = JSON.parse(await read(manifestTarget));
const recordFor = (target) => manifest.files.find((file) => file.target.replaceAll("\\", "/") === target);

if (check) {
  assert.deepEqual(current.filter(selected), incoming, "Require API drift");
  for (const [target, expected] of writes) {
    const actual = await read(target);
    if (target !== apiTarget) assert.equal(actual, expected, target);
    const record = recordFor(target);
    assert.ok(record, `Missing manifest entry: ${target}`);
    assert.equal(record.sha256, hash(actual), `${target}: hash`);
    assert.equal(record.bytes, Buffer.byteLength(actual), `${target}: bytes`);
  }
  assert.equal(manifest.apiEntries, current.length);
  console.log("Module documentation sync verified.");
} else {
  for (const [target, text] of writes) {
    const existing = recordFor(target);
    const slug = path.basename(target, ".md");
    const record = { ...(existing ?? {}), target,
      source: target === apiTarget ? "wiki/data/api.json" : `wiki/${slug}.md`,
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
  manifest.partialSync = { tool: "scripts/sync-module-docs.mjs", syncedAt: manifest.syncedAt,
    sourcePath: "wiki", guides, apiRouteIds: ["client:_G.require"],
    apiMode: "merge-selected-cards-preserve-other-site-entries" };
  await writeFile(manifestTarget, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log("Synced module/PolyZone guides and require API; unrelated content preserved.");
}
