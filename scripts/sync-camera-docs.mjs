/** Sync playable-camera docs without replacing unrelated site guides/API cards. */
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
const key = (entry) => `${entry.runtime}:${entry.namespace}.${entry.name}`;
const names = new Set([
  "Open77.camera.configureThirdPerson", "Open77.camera.thirdPersonState",
  "Open77.camera.resetThirdPerson", "Open77.camera.shakeThirdPerson",
  "Open77.camera.stopThirdPersonShake", "Open77.camera.thirdPerson",
  "Open77.perspective.setThirdPerson", "Open77.perspective.clearThirdPersonOverride",
  "Open77.perspective.state", "Open77.perspective.set", "Open77.perspective.toggle",
  "Open77.hud.setCinematic",
]);
const selected = (entry) => entry.runtime === "client" && names.has(`${entry.namespace}.${entry.name}`);
const incoming = JSON.parse(await read(path.join(source, "data/api.json"))).filter(selected);
assert.equal(incoming.length, names.size, "Missing camera API source cards; regenerate the wiki API");
assert.equal(new Set(incoming.map(key)).size, names.size, "Duplicate camera source cards");
const apiTarget = "content/api/api.json";
const current = JSON.parse(await read(apiTarget));
assert.equal(new Set(current.map(key)).size, current.length, "Duplicate site API cards");
const byKey = new Map(incoming.map((entry) => [key(entry), entry]));
const currentKeys = new Set(current.map(key));
const merged = [...current.map((entry) => byKey.get(key(entry)) ?? entry),
  ...incoming.filter((entry) => !currentKeys.has(key(entry)))];
const guides = ["third-person-camera", "perspective", "hud-visibility"];
const writes = new Map();
for (const slug of guides) writes.set(`content/docs/${slug}.md`, await read(path.join(source, `${slug}.md`)));
writes.set(apiTarget, JSON.stringify(merged, null, 1) + "\n");
const manifestTarget = "content/docs/_manifest.json";
const manifest = JSON.parse(await read(manifestTarget));
const recordFor = (target) => manifest.files.find((file) => file.target.replaceAll("\\", "/") === target);

if (check) {
  const sorted = (entries) => entries.filter(selected).sort((a, b) => key(a).localeCompare(key(b)));
  assert.deepEqual(sorted(current), sorted(incoming), "Camera API drift");
  for (const [target, expected] of writes) {
    const actual = await read(target);
    if (target !== apiTarget) assert.equal(actual, expected, target);
    const record = recordFor(target);
    assert.ok(record, `Missing manifest entry: ${target}`);
    assert.equal(record.sha256, hash(actual), `${target}: hash`);
    assert.equal(record.bytes, Buffer.byteLength(actual), `${target}: bytes`);
  }
  assert.equal(manifest.apiEntries, current.length);
  console.log("Camera sync verified: three guides and twelve reviewed API cards.");
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
  manifest.partialSync = { tool: "scripts/sync-camera-docs.mjs", syncedAt: manifest.syncedAt,
    sourcePath: "wiki", guides, apiRouteIds: incoming.map(key).sort(),
    apiMode: "merge-selected-cards-preserve-other-site-entries" };
  await writeFile(manifestTarget, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log("Synced camera, perspective and cinematic docs; unrelated site content preserved.");
}
