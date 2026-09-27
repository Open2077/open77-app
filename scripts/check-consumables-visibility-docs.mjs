/** Verify contracts, discoverability and optionally the rendered public routes. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = (file) => readFile(file, "utf8");
const api = JSON.parse(await read("content/api/api.json"));
const nav = JSON.parse(await read("content/docs/meta.json"));
const methods = { configure: ["options"], setType: ["record"], setCount: ["count"], equip: ["record"], unequip: [], setRecharge: ["enabled"], snapshot: [], reset: [], get: [] };
for (const runtime of ["client", "server"]) {
  const cards = api.filter((entry) => entry.namespace === "Open77.consumables" && entry.runtime === runtime);
  assert.equal(cards.length, 9);
  for (const [name, rest] of Object.entries(methods)) {
    const card = cards.find((entry) => entry.name === name);
    assert.ok(card && !card.inferred && card.example, `${runtime}.${name}`);
    assert.deepEqual(card.params.map((p) => p.name), [...(runtime === "server" ? ["playerId"] : []), "kind", ...rest]);
    const permission = runtime === "server" ? (name === "get" ? "player.weapons.read" : "network.events")
      : (["get", "snapshot"].includes(name) ? "player.weapons.read" : "player.weapons.edit");
    assert.deepEqual(card.permissions, [permission], `${runtime}.${name}`);
    if (name === "equip") assert.equal(card.params.at(-1).optional, true);
  }
}
for (const name of ["setLocalPuppetVisible", "isLocalPuppetVisible"]) {
  const matches = api.filter((entry) => entry.qualified === `Open77.players.${name}`);
  assert.equal(matches.length, 1, "Visibility API is client-only");
  const card = matches[0];
  assert.equal(card.runtime, "client");
  assert.ok(!card.inferred && card.example);
  assert.deepEqual(card.permissions, ["players.local.visibility"]);
  assert.deepEqual(card.params.map((p) => p.name), name.startsWith("set") ? ["visible"] : []);
}
for (const slug of ["consumables-api", "local-puppet-visibility"]) {
  assert.equal(nav.sections.flatMap((s) => s.pages).filter((p) => p.slug === slug).length, 1);
}
const consumables = await read("content/docs/consumables-api.md");
for (const text of ["open77_weapons", "0.2.0", "Items.FirstAidWhiffV0", "Items.BonesMcCoy70V1", "onConsumableUsed", "open77:consumables:state", "open77:weapons:completed", "server-authoritative", "consumable_busy", "not an anti-cheat proof", "request ID means **queued**"])
  assert.ok(consumables.includes(text), text);
const visibility = await read("content/docs/local-puppet-visibility.md");
for (const text of ["players.local.visibility", "players.life.visibility", "network.events", "Prop Hunt", "resource_not_running", "setVisible(playerId", "another resource", "collision"])
  assert.ok(visibility.includes(text), text);
const routes = await read("src/lib/api-reference.ts");
assert.ok(routes.includes('usageGuideHref: "/docs/consumables-api"'));
assert.ok(routes.includes('usageGuideHref: "/docs/local-puppet-visibility"'));

const origin = process.argv[2];
if (origin) {
  for (const [route, needles] of [
    ["/docs/consumables-api", ["Items.FirstAidWhiffV0", "onConsumableUsed", "server-authoritative"]],
    ["/docs/consumables-api.md", ["Items.BonesMcCoy70V1", "consumable_busy"]],
    ["/docs/local-puppet-visibility", ["setLocalPuppetVisible", "Prop Hunt", "players.local.visibility"]],
    ["/docs/local-puppet-visibility.md", ["isLocalPuppetVisible", "players.life.visibility"]],
    ...["client", "server"].flatMap((runtime) => ["", ".md"].map((suffix) => [`/docs/api/${runtime}/open77-consumables${suffix}`, Object.keys(methods)])),
    ...["", ".md"].map((suffix) => [`/docs/api/client/open77-players${suffix}`, ["setLocalPuppetVisible", "isLocalPuppetVisible", "/docs/local-puppet-visibility"]]),
    ["/sitemap.xml", ["/docs/consumables-api", "/docs/local-puppet-visibility"]],
    ["/llms.txt", ["/docs/consumables-api", "/docs/local-puppet-visibility"]],
  ]) {
    const response = await fetch(new URL(route, origin), { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, route);
    const text = await response.text();
    for (const needle of needles) assert.ok(text.includes(needle), `${route}: ${needle}`);
    if (route.endsWith(".md")) assert.ok(response.headers.get("content-type").includes("text/markdown"), route);
    console.log(`served OK ${route}`);
  }
}
console.log("Consumables and local visibility: 20 contracts, runtime permissions, examples, lifecycle and navigation verified.");
