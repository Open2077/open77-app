/** Native map and authoritative vehicle-AI documentation release guard. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(file, "utf8");
const api = JSON.parse(await read("content/api/api.json"));
const nav = JSON.parse(await read("content/docs/meta.json"));
const cases = [
  { namespace: "Open77.map", runtime: "client", slug: "native-map", section: "interfaces",
    names: ["getWaypoint", "getSelectedMarker", "isOpen", "state", "open", "pickPoint", "close", "cancelPick"] },
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

const origin = process.argv[2];
if (origin) {
  for (const [url, needle] of [
    ["/docs/native-map", "Native map and player waypoints"],
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
  ]) {
    const response = await fetch(new URL(url, origin));
    assert.equal(response.status, 200, url);
    assert.ok((await response.text()).includes(needle), `${url}: ${needle}`);
    console.log(`served OK ${url}`);
  }
}
console.log("Native map and vehicle AI: 20 API cards, runtime split, guides and release constraints verified.");
