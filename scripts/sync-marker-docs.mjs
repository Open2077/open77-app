/** Merge marker contracts only; preserve unrelated API cards and reviewed guides. */
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
const git = (...argv) => execFileSync("git", ["-C", source, ...argv], { encoding: "utf8" }).trim();
const revision = git("rev-parse", "HEAD");
assert.match(revision, /^[a-f0-9]{40}$/);
assert.equal(git("status", "--porcelain", "--", "markers.md", "data/api.json", "../scripting/src/ResourceHost.cpp"), "",
  "Commit marker sources before syncing their provenance");
const sourceGuide = await read(path.join(source, "markers.md"));
const host = await read(path.join(source, "../scripting/src/ResourceHost.cpp"));
const selected = (entry) => entry.runtime === "client" && entry.namespace === "Open77.markers";
const key = (entry) => `${entry.runtime}:${entry.qualified}`;
const raw = JSON.parse(await read(path.join(source, "data/api.json"))).filter(selected);
assert.deepEqual(raw.map((entry) => entry.name).sort(), ["clear", "create", "get", "list", "remove", "shapes", "update"]);

// The upstream extractor assigns a namespace-wide permission to shapes() and
// its older permission catalogue omits get(). Verify actual handler checks.
const permissionSources = [];
const incoming = reviewApiEntries(raw).map((entry) => {
  const match = host.match(new RegExp(`static int ${entry.handler}\\([^]*?\\n    }\\n`));
  assert.ok(match, `Missing source handler: ${entry.handler}`);
  const gated = entry.name !== "shapes";
  assert.equal(match[0].includes("CanUseMarkers(aState)"), gated, `${entry.qualified}: permission contract changed`);
  if (gated) permissionSources.push({ file: "scripting/src/ResourceHost.cpp",
    line: host.slice(0, match.index + match[0].indexOf("CanUseMarkers(aState)")).split("\n").length });
  return { ...entry, permissions: gated ? ["world.markers"] : [] };
});

const apiTarget = "content/api/api.json";
const current = JSON.parse(await read(apiTarget));
assert.equal(new Set(current.map(key)).size, current.length, "Duplicate site API cards");
const incomingByKey = new Map(incoming.map((entry) => [key(entry), entry]));
const existingKeys = new Set(current.map(key));
const merged = [...current.map((entry) => incomingByKey.get(key(entry)) ?? entry),
  ...incoming.filter((entry) => !existingKeys.has(key(entry)))];
assert.deepEqual(merged.filter((entry) => !selected(entry)), current.filter((entry) => !selected(entry)));

const permissionTarget = "content/api/permissions.json";
const permissions = JSON.parse(await read(permissionTarget));
const markerPermission = permissions.permissions.find((entry) => entry.name === "world.markers");
assert.ok(markerPermission);
const expectedPermission = { ...markerPermission,
  summary: "Enforced by the client; gates 6 natives in Open77.markers. shapes() is a permission-free catalogue.",
  curated: true, natives: incoming.filter((entry) => entry.permissions.length).map((entry) => entry.qualified).sort(),
  guides: [...new Set([...markerPermission.guides, "markers.md"])].sort(),
  sources: permissionSources.sort((a, b) => a.line - b.line),
};
const mergedPermissions = { ...permissions,
  permissions: permissions.permissions.map((entry) => entry.name === "world.markers" ? expectedPermission : entry),
};
const guideTarget = "content/docs/markers.md";
const guide = await read(guideTarget);
assertEditorialProse(guide, guideTarget);
const writes = new Map([
  [apiTarget, JSON.stringify(merged, null, 1) + "\n"],
  [permissionTarget, JSON.stringify(mergedPermissions, null, 1) + "\n"],
  [guideTarget, guide],
]);
const manifestTarget = "content/docs/_manifest.json";
const manifest = JSON.parse(await read(manifestTarget));
const recordFor = (target) => {
  const records = manifest.files.filter((record) => record.target.replaceAll("\\", "/") === target);
  assert.ok(records.length <= 1, `Duplicate manifest record: ${target}`);
  return records[0];
};
if (check) {
  const sorted = (entries) => entries.filter(selected).sort((a, b) => key(a).localeCompare(key(b)));
  assert.deepEqual(sorted(current), sorted(incoming), "Marker API drift");
  assert.deepEqual(markerPermission, expectedPermission, "Marker permission drift");
  for (const target of writes.keys()) {
    const text = await read(target);
    const record = recordFor(target);
    assert.equal(record?.sha256, hash(text), `${target}: hash`);
    assert.equal(record?.bytes, Buffer.byteLength(text), `${target}: bytes`);
  }
  assert.equal(manifest.apiEntries, current.length);
  assert.equal(recordFor(apiTarget).entries, current.length);
  assert.equal(manifest.markerSync.sourceGuideSha256, hash(sourceGuide));
  assert.equal(manifest.markerSync.sourceApiSha256, hash(JSON.stringify(raw)));
  assert.equal(manifest.markerSync.sourceHostSha256, hash(host));
} else {
  const provenance = {
    tool: "scripts/sync-marker-docs.mjs", syncedAt: new Date().toISOString(), sourceRevision: revision,
    sourceGuideSha256: hash(sourceGuide), sourceApiSha256: hash(JSON.stringify(raw)), sourceHostSha256: hash(host),
    guides: ["markers"], apiRouteIds: incoming.map(key).sort(),
    guideMode: "site-owned-technical-amendment", apiMode: "merge-selected-cards-preserve-other-site-entries",
    permissionCorrection: "get requires world.markers; shapes is permission-free, verified against Lua handlers",
  };
  for (const [target, text] of writes) {
    let record = recordFor(target);
    if (!record) {
      assert.equal(target, guideTarget, `Missing catalogue manifest: ${target}`);
      record = { source: "wiki/markers.md", target, slug: "markers", sourceRevision: revision };
      manifest.files.push(record);
    }
    record.bytes = Buffer.byteLength(text);
    record.sha256 = hash(text);
    if (target === guideTarget) {
      record.title = guide.match(/^#\s+(.+)$/m)[1];
      record.siteEditorial = { ...record.siteEditorial, owner: "website", markerAmendment: provenance };
    } else {
      record.entries = target === apiTarget ? merged.length : mergedPermissions.permissions.length;
      await writeFile(target, text, "utf8");
    }
  }
  manifest.guides = manifest.files.filter((record) => record.slug).length;
  manifest.apiEntries = merged.length;
  manifest.markerSync = provenance;
  await writeFile(manifestTarget, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}
console.log(`3D markers: seven client contracts and permission ${check ? "verified" : "synced"}; unrelated content preserved.`);
