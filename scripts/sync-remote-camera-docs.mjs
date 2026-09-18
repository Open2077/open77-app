/** Import only remote-camera contracts, preserving unrelated APIs and reviewed prose. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertEditorialProse, reviewApiEntries } from "./docs-editorial.mjs";

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
const key = (entry) => `${entry.runtime}:${entry.qualified}`;
const selected = (entry) => entry.runtime === "client" && entry.namespace === "Open77.remoteCamera";
const names = ["create", "update", "get", "list", "destroy", "capabilities", "budget", "worldModels",
  "bindHud", "bindWorld", "bindWebUI", "updateBinding", "getBinding", "bindings", "unbind"];
const incoming = reviewApiEntries(JSON.parse(await read(path.join(source, "data/api.json"))).filter(selected));
assert.deepEqual(incoming.map((entry) => entry.name).sort(), [...names].sort(), "Expected all 15 native contracts");
const apiTarget = "content/api/api.json";
const current = JSON.parse(await read(apiTarget));
assert.equal(new Set(current.map(key)).size, current.length, "Duplicate site API cards");
const byKey = new Map(incoming.map((entry) => [key(entry), entry]));
const oldKeys = new Set(current.map(key));
const merged = [...current.map((entry) => byKey.get(key(entry)) ?? entry),
  ...incoming.filter((entry) => !oldKeys.has(key(entry)))];
assert.deepEqual(merged.filter((entry) => !selected(entry)), current.filter((entry) => !selected(entry)), "Unrelated API drift");

const permissionTarget = "content/api/permissions.json";
const permissions = JSON.parse(await read(permissionTarget));
const incomingPermission = JSON.parse(await read(path.join(source, "data/permissions.json")))
  .permissions.filter((entry) => entry.name === "camera.capture");
assert.equal(incomingPermission.length, 1);
const mergedPermissions = { ...permissions, permissions: [
  ...permissions.permissions.filter((entry) => entry.name !== "camera.capture"), ...incomingPermission,
].sort((a, b) => a.name.localeCompare(b.name)) };
const sourceGuide = await read(path.join(source, "remote-camera.md"));
const manifestTarget = "content/docs/_manifest.json";
const manifest = JSON.parse(await read(manifestTarget));
const writes = new Map([
  [apiTarget, JSON.stringify(merged, null, 1) + "\n"],
  [permissionTarget, JSON.stringify(mergedPermissions, null, 1) + "\n"],
]);
for (const slug of ["remote-camera", "cameras"]) {
  const target = `content/docs/${slug}.md`;
  const text = await read(target);
  assertEditorialProse(text, target);
  writes.set(target, text);
}
const recordFor = (target) => manifest.files.find((record) => record.target.replaceAll("\\", "/") === target);
if (check) {
  assert.deepEqual(current.filter(selected).sort((a, b) => key(a).localeCompare(key(b))), incoming.sort((a, b) => key(a).localeCompare(key(b))));
  assert.deepEqual(permissions.permissions.filter((entry) => entry.name === "camera.capture"), incomingPermission);
  for (const target of writes.keys()) {
    const text = await read(target);
    const record = recordFor(target);
    assert.ok(record, `${target}: missing provenance`);
    assert.equal(record.bytes, Buffer.byteLength(text), `${target}: bytes`);
    assert.equal(record.sha256, hash(text), `${target}: hash`);
  }
  assert.equal(manifest.apiEntries, current.length);
  assert.equal(recordFor(apiTarget).entries, current.length);
  assert.equal(manifest.remoteCameraSync.sourceGuideSha256, hash(sourceGuide), "Upstream guide changed; review site prose");
} else {
  const git = (...argv) => execFileSync("git", ["-C", source, ...argv], { encoding: "utf8" }).trim();
  const provenance = {
    tool: "scripts/sync-remote-camera-docs.mjs", syncedAt: new Date().toISOString(),
    sourceRevision: git("rev-parse", "HEAD"),
    sourceWorkingTreeDirty: Boolean(git("status", "--porcelain", "--", "remote-camera.md", "data/api.json", "data/permissions.json")),
    sourceGuideSha256: hash(sourceGuide), sourceApiSha256: hash(JSON.stringify(incoming)),
    guides: ["remote-camera", "cameras"], apiRouteIds: incoming.map(key).sort(),
    guideMode: "site-owned-technical-amendment", apiMode: "merge-selected-cards-preserve-other-site-entries",
  };
  for (const [target, text] of writes) {
    let record = recordFor(target);
    if (!record) {
      assert.equal(target, "content/docs/remote-camera.md", "Unexpected missing manifest entry");
      record = { source: "wiki/remote-camera.md", target, slug: "remote-camera" };
      manifest.files.push(record);
      manifest.guides++;
    }
    record.bytes = Buffer.byteLength(text);
    record.sha256 = hash(text);
    if (target === apiTarget) record.entries = merged.length;
    else if (target === permissionTarget) record.entries = mergedPermissions.permissions.length;
    else {
      record.title = text.match(/^#\s+(.+)$/m)[1];
      record.siteEditorial = { ...record.siteEditorial, owner: "website", remoteCameraAmendment: provenance };
    }
    // Guide text stays authored through apply_patch; only generated catalogues are written.
    if (target === apiTarget || target === permissionTarget) await writeFile(target, text, "utf8");
  }
  manifest.apiEntries = merged.length;
  manifest.remoteCameraSync = provenance;
  await writeFile(manifestTarget, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}
console.log(`Remote cameras: 15 native contracts and permission ${check ? "verified" : "synced"}; unrelated API entries preserved.`);
