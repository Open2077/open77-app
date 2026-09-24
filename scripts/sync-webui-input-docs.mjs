/** Scoped sync: preserve all unrelated guides and reviewed API cards. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readGuideForSync, reviewApiEntries } from "./docs-editorial.mjs";

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
const selected = (entry) => entry.runtime === "client" && entry.qualified === "WebUI.Page.setConsumedKeys";
const incoming = reviewApiEntries(JSON.parse(await read(path.join(source, "data/api.json")))).filter(selected);
assert.equal(incoming.length, 1, "Regenerate the wiki API before syncing");
const apiTarget = "content/api/api.json";
const current = JSON.parse(await read(apiTarget));
assert.ok(current.filter(selected).length <= 1, "Duplicate API card");
const merged = current.some(selected)
  ? current.map((entry) => selected(entry) ? incoming[0] : entry)
  : [...current, incoming[0]];
const writes = new Map([
  ["content/docs/webui-input.md", await readGuideForSync(source, "webui-input.md")],
  [apiTarget, JSON.stringify(merged, null, 1) + "\n"],
]);
const manifestTarget = "content/docs/_manifest.json";
const manifest = JSON.parse(await read(manifestTarget));
const findRecord = (target) => manifest.files.find((record) => record.target.replaceAll("\\", "/") === target);
if (check) {
  assert.deepEqual(current.filter(selected), incoming, "Selective-input API drift");
  for (const [target, expected] of writes) {
    const actual = await read(target);
    if (target !== apiTarget) assert.equal(actual, expected, target);
    const record = findRecord(target);
    assert.ok(record, `Missing manifest record: ${target}`);
    assert.equal(record.bytes, Buffer.byteLength(actual), `${target}: bytes`);
    assert.equal(record.sha256, hash(actual), `${target}: hash`);
  }
  assert.equal(manifest.apiEntries, current.length);
} else {
  for (const [target, text] of writes) {
    const existing = findRecord(target);
    const record = { ...(existing ?? {}), target,
      source: target === apiTarget ? "wiki/data/api.json" : "wiki/webui-input.md",
      ...(target === apiTarget ? { entries: merged.length } : {
        slug: "webui-input", title: "WebUI selective keyboard capture",
      }),
      bytes: Buffer.byteLength(text), sha256: hash(text),
    };
    if (existing) Object.assign(existing, record);
    else manifest.files.push(record);
    await writeFile(target, text, "utf8");
  }
  manifest.guides = manifest.files.filter((record) => record.slug).length;
  manifest.apiEntries = merged.length;
  manifest.partialSync = { tool: "scripts/sync-webui-input-docs.mjs", syncedAt: new Date().toISOString(),
    guides: ["webui-input"], apiRouteIds: ["client:WebUI.Page.setConsumedKeys"],
    apiMode: "merge-selected-cards-preserve-other-site-entries" };
  await writeFile(manifestTarget, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}
console.log(`WebUI input documentation ${check ? "verified" : "synced"}; unrelated content preserved.`);
