/**
 * Targeted wiki sync for attachments/interactions. Keeps newer, unrelated site
 * content (e.g. Cyberware) when the source checkout is on another revision.
 * Usage: node scripts/sync-attachment-docs.mjs [--from ../CyberM/wiki] [--check]
 * Generated guides remain byte-for-byte wiki copies; API cards are merged by
 * runtime + namespace + name. A full sync still needs a complete source wiki.
 */
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
const read = (file) => readFile(file, "utf8");
const hash = (text) => createHash("sha256").update(text).digest("hex");
const key = (entry) => `${entry.runtime}:${entry.namespace}.${entry.name}`;
const normalizePath = (value) => value.replaceAll("\\", "/");
const guides = ["attachments", "player-interactions", "props", "rp-animation-catalogue"];
const contracts = JSON.parse(await read(path.join(source, "attachment-interaction-api.json")));
const contractKeys = new Set(Object.entries(contracts).flatMap(([namespace, runtimes]) =>
  Object.entries(runtimes).flatMap(([runtime, methods]) =>
    Object.keys(methods).map((name) => key({ namespace, runtime, name })))));
assert.equal(contractKeys.size, 24, "Review the targeted sync when the contract changes");
const selected = (entry) => contractKeys.has(key(entry)) || entry.namespace === "Open77.animations";
const sourceApi = JSON.parse(await read(path.join(source, "data/api.json")));
const incoming = sourceApi.filter(selected);
assert.equal(incoming.length, 41, "Expected 24 attachment/interaction and 17 animation cards");
assert.equal(new Set(incoming.map(key)).size, incoming.length, "Duplicate source API cards");
for (const id of contractKeys) assert.ok(incoming.some((entry) => key(entry) === id), id);

const apiTarget = "content/api/api.json";
const currentApi = JSON.parse(await read(apiTarget));
assert.equal(new Set(currentApi.map(key)).size, currentApi.length, "Duplicate site API cards");
const incomingByKey = new Map(incoming.map((entry) => [key(entry), entry]));
const currentKeys = new Set(currentApi.map(key));
const merged = [
  ...currentApi.map((entry) => incomingByKey.get(key(entry)) ?? entry),
  ...incoming.filter((entry) => !currentKeys.has(key(entry))),
];
const manifestTarget = "content/docs/_manifest.json";
const manifest = JSON.parse(await read(manifestTarget));
const writes = new Map();
for (const slug of guides) {
  writes.set(`content/docs/${slug}.md`, (await read(path.join(source, `${slug}.md`))).replaceAll("\r\n", "\n"));
}
// Match the existing generated JSON indentation.
writes.set(apiTarget, JSON.stringify(merged, null, 1) + "\n");

if (check) {
  // Semantic comparison avoids treating unrelated API updates or ordering as drift.
  assert.deepEqual(currentApi.filter(selected).sort((a, b) => key(a).localeCompare(key(b))),
    incoming.sort((a, b) => key(a).localeCompare(key(b))), "Selected API cards have drifted");
  for (const [target, expected] of writes) {
    const actual = await read(target);
    if (target !== apiTarget) assert.equal(actual.replaceAll("\r\n", "\n"), expected, target);
    const record = manifest.files.find((file) => normalizePath(file.target) === target);
    assert.ok(record, `Missing manifest entry: ${target}`);
    assert.equal(record.sha256, hash(actual.replaceAll("\r\n", "\n")), `${target}: manifest hash`);
    assert.equal(record.bytes, Buffer.byteLength(actual.replaceAll("\r\n", "\n")), `${target}: manifest bytes`);
  }
  assert.equal(manifest.apiEntries, currentApi.length);
  console.log("Attachment docs sync OK: 4 guides and 41 reviewed API cards; unrelated content preserved.");
} else {
  const now = new Date().toISOString();
  for (const [target, text] of writes) {
    const existing = manifest.files.find((file) => normalizePath(file.target) === target);
    const slug = path.basename(target, ".md");
    const record = {
      ...(existing ?? {}), source: target === apiTarget ? "wiki/data/api.json" : `wiki/${slug}.md`,
      target, ...(target === apiTarget ? { entries: merged.length } : {
        slug, title: text.match(/^#\s+(.+)$/m)?.[1] ?? slug,
      }), bytes: Buffer.byteLength(text), sha256: hash(text),
    };
    if (existing) Object.assign(existing, record);
    else manifest.files.push(record);
    await writeFile(target, text, "utf8");
  }
  manifest.guides = manifest.files.filter((file) => file.slug).length;
  manifest.apiEntries = merged.length;
  // Do not pretend all files originated from this older checkout in one sync.
  manifest.partialSync = {
    tool: "scripts/sync-attachment-docs.mjs", syncedAt: now,
    sourcePath: "wiki", guides, apiRouteIds: incoming.map(key).sort(),
    apiMode: "merge-selected-cards-preserve-other-site-entries",
  };
  manifest.syncedAt = now;
  await writeFile(manifestTarget, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`Synced 4 guides and 41 reviewed API cards (${merged.length} total). No unrelated guides removed.`);
}
