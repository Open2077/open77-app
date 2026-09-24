/** Gizmo navigation/content contracts, optionally against a running site. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(file, "utf8");
const guide = await read("content/docs/gizmos.md");
for (const term of ["gizmos.edit", "Permission and execution side", "Quick start",
  "Target identities and capabilities", "API reference", "Built-in controls",
  "Events and snapshot shape", "Authoritative server integration", "Common errors",
  "nativeTransform", "preview=false", "vehicle_entry_requested",
  "not a collision sandbox", "gizmo_restore_pending"]) {
  assert.ok(guide.includes(term), `Guide missing ${term}`);
}
const removedNotice = "Requires a matching gizmo-capable OPEN//77 client.";
assert.ok(!guide.includes(removedNotice), "Do not restore the removed introductory notice");
const meta = JSON.parse(await read("content/docs/meta.json"));
assert.equal(meta.sections.flatMap((section) => section.pages)
  .filter((page) => page.slug === "gizmos" && page.kind === "guide").length, 1);
const api = JSON.parse(await read("content/api/api.json"));
const cards = api.filter((entry) => entry.namespace === "Open77.gizmos");
assert.equal(cards.length, 14);
assert.ok(cards.every((entry) => entry.runtime === "client" && !entry.inferred));
assert.deepEqual(cards.map((entry) => entry.name).sort(), ["activate", "active", "cancel",
  "capabilities", "commit", "create", "deactivate", "destroy", "get", "list", "redo",
  "setTransform", "undo", "update"].sort());
for (const card of cards) {
  assert.ok(card.summary && card.description && card.params && card.returns.length, `Incomplete ${card.name}`);
}
assert.ok(guide.includes("G.create({") && guide.includes("AddEventHandler('open77:gizmo:commit'"),
  "Guide must include runnable creation and lifecycle examples");
assert.ok((await read("src/lib/api-reference.ts")).includes('usageGuideHref: "/docs/gizmos"'));
assert.ok((await read("src/app/docs/[slug]/page.tsx")).includes('href="/docs/api/client/open77-gizmos"'));

if (process.argv[2]) {
  for (const [route, tokens] of [
    ["/docs/gizmos", ["Entity gizmos", 'id="events-and-snapshot-shape"', "/docs/api/client/open77-gizmos", "vehicle_entry_requested"]],
    ["/docs/gizmos.md", ["Open77.gizmos", "Permission and execution side"]],
    ["/docs/api/client/open77-gizmos", ["Open77.gizmos.create", "/docs/gizmos"]],
    ["/docs/api/client/open77-gizmos.md", ["Open77.gizmos.create", "nativeTransform"]],
    ["/docs/api", ["Open77.gizmos.create"]],
    ["/sitemap.xml", ["/docs/gizmos"]],
    ["/llms.txt", ["/docs/gizmos"]],
  ]) {
    const response = await fetch(new URL(route, process.argv[2]), { signal: AbortSignal.timeout(60000) });
    assert.equal(response.status, 200, route);
    const body = await response.text();
    if (route === "/docs/gizmos" || route === "/docs/gizmos.md") {
      assert.ok(!body.includes(removedNotice), `${route}: removed notice is still served`);
    }
    for (const token of tokens) assert.ok(body.includes(token), `${route}: ${token}`);
    console.log(`served OK ${route}`);
  }
}
console.log("Gizmo guide, client API, navigation and cross-links verified.");
