/** Marker contracts, navigation, stale-copy guards and optional served-route checks. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const read = async (file) => (await readFile(file, "utf8")).replaceAll("\r\n", "\n");
const api = JSON.parse(await read("content/api/api.json"));
const cards = api.filter((entry) => entry.namespace === "Open77.markers");
assert.deepEqual(cards.map((entry) => entry.name).sort(), ["clear", "create", "get", "list", "remove", "shapes", "update"]);
for (const card of cards) {
  assert.equal(card.runtime, "client");
  assert.equal(card.inferred, false);
  assert.deepEqual(card.permissions, card.name === "shapes" ? [] : ["world.markers"]);
  assert.ok(card.summary && card.description && card.example && card.returns.length, card.qualified);
}
const guide = await read("content/docs/markers.md");
for (const { name } of cards) assert.ok(guide.includes(`\`${name}(`), name);
for (const shape of ["ring", "cylinder", "checkpoint", "arrow", "chevron", "cone", "diamond", "sphere"])
  assert.ok(guide.includes(`| \`${shape}\` |`), shape);
for (const token of ["2.31.13+op77.83", 'permissions { "world.markers" }', "height", "scale", "rotation",
  "RGBA", "color = false", "minDistance", "maxDistance", "customColor", "rendered", "failed",
  "marker_assets_missing", "marker_streaming_timeout", "64 logical markers", "256 native material slots",
  "not automatically replicated", "server", "worldReady", "open77_markers", "facade package"])
  assert.ok(guide.includes(token), `Missing marker contract: ${token}`);
const overview = await read("content/guides/world-drawing.md");
assert.ok(overview.includes("markers.md"));
assert.ok(!overview.includes("there is no\nfree-form colour"), "Obsolete fixed-color claim");
assert.ok(!overview.includes('"ring" (default) or "cylinder"'), "Obsolete two-shape native catalogue");
const nav = JSON.parse(await read("content/docs/meta.json"));
assert.equal(nav.sections.flatMap((section) => section.pages).filter((page) => page.slug === "markers").length, 1);
assert.ok(nav.sections.find((section) => section.id === "map").pages.some((page) => page.slug === "markers"));
assert.ok((await read("src/lib/api-reference.ts")).includes('usageGuideHref: "/docs/markers"'));
assert.ok(JSON.parse(await read("scripts/curated-docs.json")).includes("markers.md"));
const permission = JSON.parse(await read("content/api/permissions.json")).permissions.find((entry) => entry.name === "world.markers");
assert.deepEqual(permission.natives, cards.filter((entry) => entry.name !== "shapes").map((entry) => entry.qualified).sort());
assert.ok(permission.guides.includes("markers.md"));
const manifest = JSON.parse(await read("content/docs/_manifest.json"));
for (const target of ["content/docs/markers.md", "content/api/api.json", "content/api/permissions.json"]) {
  const text = await read(target);
  const record = manifest.files.find((entry) => entry.target.replaceAll("\\", "/") === target);
  assert.equal(record?.bytes, Buffer.byteLength(text), `${target}: bytes`);
  assert.equal(record?.sha256, createHash("sha256").update(text).digest("hex"), `${target}: hash`);
}
assert.equal(manifest.apiEntries, api.length);
assert.match(manifest.markerSync.sourceRevision, /^[a-f0-9]{40}$/);

const origin = process.argv[2];
if (origin) {
  const cache = new Map();
  const html = async (route) => {
    if (!cache.has(route)) {
      const response = await fetch(new URL(route, origin), { signal: AbortSignal.timeout(60000) });
      assert.equal(response.status, 200, route);
      cache.set(route, await response.text());
    }
    return cache.get(route);
  };
  for (const [route, needle] of [
    ["/docs/markers", "3D world markers"], ["/docs/markers.md", "marker_assets_missing"],
    ["/docs/api/client/open77-markers", "Open77.markers.get"],
    ["/docs/api/client/open77-markers.md", "Open77.markers.shapes"],
    ["/docs/api", "Open77.markers.get"], ["/docs/world-drawing", "/docs/markers"],
    ["/sitemap.xml", "/docs/markers"], ["/llms.txt", "/docs/markers"],
    ["/llms-full.txt", "marker_streaming_timeout"],
  ]) {
    assert.ok((await html(route)).includes(needle), `${route}: ${needle}`);
    console.log(`served OK ${route}`);
  }
  for (const [, target] of guide.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^https?:/.test(target)) continue;
    const route = target.startsWith("/") ? target : `/docs/${target.replace(/\.md(?=#|$)/, "")}`;
    const url = new URL(route, origin);
    const body = await html(url.pathname);
    if (url.hash) assert.ok(body.includes(`id="${url.hash.slice(1)}"`), `Broken fragment: ${route}`);
  }
}
console.log("3D marker documentation: seven APIs, eight shapes, permissions, lifecycle and discovery verified.");
