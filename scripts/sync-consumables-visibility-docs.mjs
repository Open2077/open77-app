/** Refresh only consumable/local-visibility cards; retain reviewed site guides. */
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
const methods = ["configure", "setType", "setCount", "equip", "unequip", "setRecharge", "snapshot", "reset", "get"];
const expected = [...["client", "server"].flatMap((runtime) => methods.map((name) => `${runtime}:Open77.consumables.${name}`)),
  "client:Open77.players.setLocalPuppetVisible", "client:Open77.players.isLocalPuppetVisible"].sort();
const selected = (entry) => expected.includes(key(entry));
const incoming = reviewApiEntries(JSON.parse(await read(path.join(source, "data/api.json"))).filter(selected));
assert.deepEqual(incoming.map(key).sort(), expected, "Missing or duplicate feature contracts");
for (const entry of incoming) assert.ok(!entry.inferred && entry.description && entry.example, key(entry));
const apiTarget = "content/api/api.json";
const current = JSON.parse(await read(apiTarget));
assert.equal(new Set(current.map(key)).size, current.length, "Duplicate site cards");
const byKey = new Map(incoming.map((entry) => [key(entry), entry]));
const oldKeys = new Set(current.map(key));
const merged = [...current.map((entry) => byKey.get(key(entry)) ?? entry), ...incoming.filter((entry) => !oldKeys.has(key(entry)))];
assert.deepEqual(merged.filter((entry) => !selected(entry)), current.filter((entry) => !selected(entry)));
const guides = ["consumables-api", "local-puppet-visibility", "weapons-api", "player-utilities", "perspective"];
const guideTexts = new Map();
for (const slug of guides) {
  const text = await read(`content/docs/${slug}.md`);
  assertEditorialProse(text, slug);
  guideTexts.set(slug, text);
}
const manifestTarget = "content/docs/_manifest.json";
const manifest = JSON.parse(await read(manifestTarget));
const recordFor = (target) => manifest.files.find((entry) => entry.target.replaceAll("\\", "/") === target);
if (check) {
  const sorted = (entries) => entries.filter(selected).sort((a, b) => key(a).localeCompare(key(b)));
  assert.deepEqual(sorted(current), sorted(incoming));
  for (const target of [apiTarget, ...guides.map((slug) => `content/docs/${slug}.md`)]) {
    const text = await read(target);
    assert.equal(recordFor(target)?.sha256, hash(text), target);
    assert.equal(recordFor(target)?.bytes, Buffer.byteLength(text), target);
  }
  assert.equal(manifest.apiEntries, current.length);
  assert.equal(recordFor(apiTarget).entries, current.length);
} else {
  const git = (...argv) => execFileSync("git", ["-C", source, ...argv], { encoding: "utf8" }).trim();
  const provenance = {
    tool: "scripts/sync-consumables-visibility-docs.mjs", syncedAt: new Date().toISOString(),
    sourceRevision: git("rev-parse", "HEAD"),
    sourceWorkingTreeDirty: Boolean(git("status", "--porcelain", "--", "api-notes.json", "server-api-notes.json", "tools/extract-api.py", "data/api.json", ...guides.map((slug) => `${slug}.md`))),
    sourceApiSha256: hash(JSON.stringify(incoming)), apiRouteIds: incoming.map(key).sort(),
    apiMode: "merge-selected-cards-preserve-other-site-entries",
  };
  const apiText = JSON.stringify(merged, null, 1) + "\n";
  const apiRecord = recordFor(apiTarget);
  assert.ok(apiRecord, "Missing API manifest record");
  Object.assign(apiRecord, { entries: merged.length, bytes: Buffer.byteLength(apiText), sha256: hash(apiText) });
  await writeFile(apiTarget, apiText);
  for (const [slug, text] of guideTexts) {
    const target = `content/docs/${slug}.md`;
    let record = recordFor(target);
    if (!record) {
      record = { source: `wiki/${slug}.md`, target, slug, title: text.match(/^#\s+(.+)$/m)?.[1] ?? slug };
      manifest.files.push(record);
    }
    Object.assign(record, { bytes: Buffer.byteLength(text), sha256: hash(text) });
    record.siteEditorial = { ...record.siteEditorial, owner: "website", consumablesVisibilityAmendment: {
      ...provenance, upstreamGuideSha256: hash(await read(path.join(source, `${slug}.md`))),
    } };
  }
  manifest.apiEntries = merged.length;
  manifest.guides = manifest.files.filter((file) => file.slug).length;
  manifest.consumablesVisibilitySync = provenance;
  await writeFile(manifestTarget, JSON.stringify(manifest, null, 2) + "\n");
}
console.log(`Consumables and local visibility: 20 cards and five guide records ${check ? "verified" : "updated"}; unrelated content preserved.`);
