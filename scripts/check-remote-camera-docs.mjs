/** Contract, discovery and optional served-route checks for remote-camera documentation. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const read = async (file) => (await readFile(file, "utf8")).replaceAll("\r\n", "\n");
const nativeNames = ["create", "update", "get", "list", "destroy", "capabilities", "budget", "worldModels",
  "bindHud", "bindWorld", "bindWebUI", "updateBinding", "getBinding", "bindings", "unbind"];
const exportNames = ["create", "configure", "get", "list", "remove", "setAccess", "acquire", "release",
  "createScreen", "updateScreen", "getScreen", "listScreens", "removeScreen", "openView", "updateView",
  "getView", "listViews", "closeView", "changes"];
const api = JSON.parse(await read("content/api/api.json"));
const cards = api.filter((entry) => entry.namespace === "Open77.remoteCamera");
assert.deepEqual(cards.map((entry) => entry.name).sort(), [...nativeNames].sort());
for (const card of cards) {
  assert.equal(card.runtime, "client");
  assert.equal(card.inferred, false);
  assert.ok(card.permissions.includes("camera.capture"), card.qualified);
  assert.ok(card.summary && card.description && card.example && card.returns.length, card.qualified);
}
const guide = await read("content/docs/remote-camera.md");
for (const name of [...nativeNames, ...exportNames]) assert.ok(guide.includes(`\`${name}(`), name);
for (const token of ["2.31.13+op77.82", "experimental", "camera.capture", "local.events",
  "dependency \"open77_remote_camera >=0.3.0\"", "open77:remoteCamera:stateChanged",
  "open77:remoteCamera:bindingChanged", "640 × 360", "camera_slots_exhausted", "retiring",
  "stale_binding_id", "setAccess", "world-space fallback", "do not restore private grants",
  "not video frames", "intermittent engine crashes", "command.remote-camera.editor"])
  assert.ok(guide.includes(token), `Missing public contract: ${token}`);
const nav = JSON.parse(await read("content/docs/meta.json"));
assert.equal(nav.sections.flatMap((s) => s.pages).filter((p) => p.slug === "remote-camera").length, 1);
assert.ok(nav.sections.find((s) => s.id === "cameras").pages.some((p) => p.slug === "remote-camera"));
assert.ok((await read("src/lib/api-categories.ts")).includes('"Open77.remoteCamera"'));
assert.ok((await read("src/lib/api-reference.ts")).includes('usageGuideHref: "/docs/remote-camera"'));
assert.ok(JSON.parse(await read("scripts/curated-docs.json")).includes("remote-camera.md"));
const manifest = JSON.parse(await read("content/docs/_manifest.json"));
for (const target of ["content/docs/remote-camera.md", "content/docs/cameras.md", "content/api/api.json", "content/api/permissions.json"]) {
  const text = await read(target);
  const record = manifest.files.find((entry) => entry.target.replaceAll("\\", "/") === target);
  assert.equal(record.bytes, Buffer.byteLength(text), `${target}: bytes`);
  assert.equal(record.sha256, createHash("sha256").update(text).digest("hex"), `${target}: hash`);
}
const permission = JSON.parse(await read("content/api/permissions.json")).permissions.find((p) => p.name === "camera.capture");
assert.deepEqual([...permission.natives].sort(), cards.map((c) => c.qualified).sort());
const origin = process.argv[2];
if (origin) {
  for (const [route, needle] of [
    ["/docs/remote-camera", "Remote cameras and world screens"],
    ["/docs/remote-camera.md", "intermittent engine crashes"],
    ["/docs/api/client/open77-remotecamera", "Open77.remoteCamera.bindWorld"],
    ["/docs/api/client/open77-remotecamera.md", "Open77.remoteCamera.bindWebUI"],
    ["/docs/api", "Open77.remoteCamera.create"],
    ["/sitemap.xml", "/docs/remote-camera"],
    ["/llms.txt", "/docs/remote-camera"],
    ["/llms-full.txt", "Remote cameras and world screens"],
  ]) {
    const response = await fetch(new URL(route, origin), { signal: AbortSignal.timeout(60000) });
    assert.equal(response.status, 200, route);
    assert.ok((await response.text()).includes(needle), `${route}: ${needle}`);
    console.log(`served OK ${route}`);
  }
  // Check every same-site guide link, including fragment targets, in the new Markdown.
  const cache = new Map();
  for (const [, target] of guide.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^https?:/.test(target)) continue;
    const normalized = target.startsWith("#") ? `/docs/remote-camera${target}`
      : target.startsWith("/") ? target : `/docs/${target.replace(/\.md(?=#|$)/, "")}`;
    const url = new URL(normalized, origin);
    if (!cache.has(url.pathname)) {
      const response = await fetch(new URL(url.pathname, origin), { signal: AbortSignal.timeout(60000) });
      assert.equal(response.status, 200, url.pathname);
      cache.set(url.pathname, await response.text());
    }
    if (url.hash) assert.ok(cache.get(url.pathname).includes(`id="${url.hash.slice(1)}"`), normalized);
  }
}
console.log("Remote-camera documentation: 15 client APIs, 19 server exports, permissions, lifecycle, limits and navigation verified.");
