/** Native map and authoritative vehicle-AI documentation release guard. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(file, "utf8");
const api = JSON.parse(await read("content/api/api.json"));
const nav = JSON.parse(await read("content/docs/meta.json"));
const cases = [
  { namespace: "Open77.map", runtime: "client", slug: "native-map", section: "interfaces",
    names: ["getWaypoint", "getSelectedMarker", "isOpen", "state", "open", "pickPoint", "close", "cancelPick",
      "getView", "focus", "recenter", "setZoomLevel", "setCameraMode", "getScreen", "setTitle", "setAccentColor",
      "resetAppearance", "addTab", "removeTab", "selectTab", "setTabLabel"] },
  { namespace: "Open77.vehicles.ai", runtime: "server", slug: "vehicle-ai", section: "world",
    names: ["attachDriver", "removeDriver", "state", "driveTo", "followRoute", "follow", "chase", "joinTraffic", "stop", "setSpeed", "setBehavior", "on"] },
];
const categories = await read("src/lib/api-categories.ts");
const reference = await read("src/lib/api-reference.ts");
for (const spec of cases) {
  const entries = api.filter((entry) => entry.namespace === spec.namespace);
  assert.deepEqual(entries.map((entry) => entry.name).sort(), [...spec.names].sort());
  for (const entry of entries) {
    assert.equal(entry.runtime, spec.runtime, entry.qualified);
    assert.equal(entry.inferred, false, entry.qualified);
    assert.ok(entry.summary && entry.description && entry.returns.length, entry.qualified);
  }
  assert.ok(nav.sections.find((section) => section.id === spec.section).pages.some((page) => page.slug === spec.slug && page.kind === "guide"));
  assert.ok(categories.includes(`"${spec.namespace}"`));
  assert.ok(reference.includes(`/docs/${spec.slug}`));
  const guide = await read(`content/docs/${spec.slug}.md`);
  assert.ok(guide.includes("2.31.13+op77.54"));
  // Native map calls are client-local; vehicle AI requires compatible runtimes.
  if (spec.runtime === "server") assert.ok(guide.includes("compatible network protocols"));
}
const ai = await read("content/docs/vehicle-ai.md");
for (const text of ["driverless", "no headless server physics", "reserved", "removeDriver", "world.vehicles", "world.npcs"]) {
  assert.ok(ai.includes(text), text);
}
const map = await read("content/docs/native-map.md");
for (const text of ["map.read", "map.control", "source=\"player\"", "pointPicked", "waypoint:placed"]) {
  assert.ok(map.includes(text), text);
}
const mapCards = api.filter((entry) => entry.namespace === "Open77.map");
const original = new Set(["getWaypoint", "getSelectedMarker", "isOpen", "state", "open", "pickPoint", "close", "cancelPick"]);
for (const card of mapCards) {
  assert.ok(card.permissions.includes(["getWaypoint", "getSelectedMarker", "isOpen", "state", "getView", "getScreen"].includes(card.name)
    ? "map.read" : "map.control"), `${card.qualified}: permission`);
  if (!original.has(card.name)) assert.equal(card.since, null, "Do not invent release versions for experimental additions");
}
for (const token of ["experimental", "type(Open77.map.addTab)", "onClientResourceStart", "five resource tabs",
  "1280×572", "1–120 UTF-8 bytes", "1–40 UTF-8 bytes", "1–48 ASCII", "-1000 to 1000", "#RRGGBB",
  "qualifiedId, page", "page_must_be_hidden_and_unbound", "resource_preparing", "map_picking", "map_closed",
  "tabEntered", "tabLeft", "tabChanged", "tabRemoved", "tabState", "screenChanged", "open77:map:ready",
  "do not", "page:destroy()", "map_queue_full", "commandResult", "zoomLevels", "native_ink"]) {
  assert.ok(map.toLowerCase().includes(token.toLowerCase()), `Missing map contract: ${token}`);
}
assert.ok(map.indexOf("Open77.on('open77:map:tabState'") < map.indexOf("Open77.emit('open77:map:ready'"), "Subscribe before handshake");
const runtime = await read("content/guides/resource-runtime.md");
assert.ok(runtime.includes("native-map.md#customize-the-map-screen"));
const manifest = JSON.parse(await read("content/docs/_manifest.json"));
for (const target of ["content/docs/native-map.md", "content/api/api.json"]) {
  const text = (await read(target)).replaceAll("\r\n", "\n");
  const record = manifest.files.find((entry) => entry.target.replaceAll("\\", "/") === target);
  assert.equal(record.bytes, Buffer.byteLength(text), `${target}: bytes`);
  assert.equal(record.sha256, createHash("sha256").update(text).digest("hex"), `${target}: hash`);
}
assert.equal(manifest.apiEntries, api.length);

const origin = process.argv[2];
if (origin) {
  for (const [url, needle] of [
    ["/docs/native-map", "Native map and player waypoints"],
    ["/docs/native-map", "Customize the map screen"],
    ["/docs/native-map.md", "open77:map:ready"],
    ["/docs/resource-runtime.md", "native-map.md#customize-the-map-screen"],
    ["/docs/api/client/open77-map", "setAccentColor"],
    ["/docs/api/client/open77-map.md", "Open77.map.addTab"],
    ["/docs/api/client/open77-map.md", "Open77.map.setCameraMode"],
    ["/docs/vehicle-ai", "Networked vehicle AI"],
    ["/docs/native-map.md", "2.31.13+op77.54"],
    ["/docs/vehicle-ai.md", "driverless"],
    ["/docs/api/client/open77-map", "Native map &amp; waypoints guide"],
    ["/docs/api/server/open77-vehicles-ai", "Autonomous vehicles &amp; AI guide"],
    ["/docs/api/client/open77-map.md", "Open77.map.getWaypoint"],
    ["/docs/api/server/open77-vehicles-ai.md", "Open77.vehicles.ai.attachDriver"],
    ["/docs/api", "Open77.vehicles.ai.driveTo"],
    ["/sitemap.xml", "/docs/native-map"],
    ["/llms.txt", "/docs/vehicle-ai"],
    ["/llms-full.txt", "Networked vehicle AI"],
    ["/llms-full.txt", "open77:map:ready"],
  ]) {
    const response = await fetch(new URL(url, origin));
    assert.equal(response.status, 200, url);
    assert.ok((await response.text()).includes(needle), `${url}: ${needle}`);
    console.log(`served OK ${url}`);
  }
}
console.log("Native map and vehicle AI: 33 API cards, custom tabs, Lua/JS lifecycle, provenance and runtime constraints verified.");
