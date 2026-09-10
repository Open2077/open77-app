/** Armed-vehicle guide, source catalogue and client-only API regression checks. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(file, "utf8");
const names = [
  "getWeaponModel", "modelHasWeaponMounts", "getWeaponState", "isArmed",
  "getWeapons", "getActiveWeapons", "getWeapon", "getWeaponAmmo",
  "getWeaponType", "isWeaponActive", "getWeaponCount", "getWeaponAim",
];
const api = JSON.parse(await read("content/api/api.json"));
const entries = api.filter((entry) => entry.namespace === "Open77.vehicles" && names.includes(entry.name));
assert.equal(entries.length, 12, "All twelve getters, no fabricated server variants");
assert.equal(new Set(entries.map((entry) => entry.name)).size, 12);
for (const entry of entries) {
  assert.equal(entry.runtime, "client", entry.qualified);
  assert.equal(entry.inferred, false, entry.qualified);
  assert.ok(entry.summary && entry.description && entry.example && entry.returns.length, entry.name);
  assert.ok(!entry.returns.join(" ").includes("Promise"), "These getters are synchronous");
}

const nav = JSON.parse(await read("content/docs/meta.json"));
const world = nav.sections.find((section) => section.id === "world");
assert.deepEqual(world.pages.slice(0, 3).map((page) => page.slug), ["vehicles", "vehicle-weapons", "armed-vehicles"]);
for (const slug of ["vehicle-weapons", "armed-vehicles"]) {
  assert.ok(world.pages.some((page) => page.slug === slug && page.kind === "guide"));
}
const guide = await read("content/docs/vehicle-weapons.md");
for (const heading of ["Release and compatibility", "How multiplayer weapon sync works", "What has been validated",
  "Current damage policy", "Function reference", "Ammunition availability", "Errors and streaming", "Troubleshooting"]) {
  assert.ok(guide.includes(`## ${heading}`), heading);
}
for (const name of names) assert.ok(guide.includes(`Open77.vehicles.${name}`), name);
for (const needle of ["2.31.13+op77.53", "1.24", "vehicles.read", "not_replicated", "weapon.index", "100 ms", "2147483647"]) {
  assert.ok(guide.includes(needle), needle);
}
assert.match(guide, /not yet live-validated/);
assert.match(guide, /no public Lua mounted-weapon fire\/select\/ammo setter/);
assert.match(await read("content/docs/vehicles.md"), /\[armed vehicles and weapon Lua API guide\]\(vehicle-weapons.md\)/);

const raw = await read("public/data/vehicle-weapons-2.31.json");
const catalogue = JSON.parse(raw);
const inventory = await read("content/docs/armed-vehicles.md");
assert.equal(catalogue.gameBuild, 23100);
assert.equal(Object.keys(catalogue.vehicles).length, 172);
assert.equal(catalogue.mounts.length, 15);
const mounts = new Map(catalogue.mounts.map((mount) => [mount.mountId, mount]));
assert.equal(mounts.size, 15);
for (const [record, ids] of Object.entries(catalogue.vehicles)) {
  assert.match(record, /^Vehicle\./);
  assert.equal(new Set(ids).size, ids.length, record);
  for (const id of ids) assert.ok(mounts.has(id), `${record}: unknown mount ${id}`);
}
const recordRows = [...inventory.matchAll(/^\| `(Vehicle\.[^`]+)` \|/gm)].map((match) => match[1]);
assert.deepEqual([...new Set(recordRows)].sort(), Object.keys(catalogue.vehicles).sort(), "Complete spawn inventory must exactly match extracted data");
const testedRows = [...inventory.matchAll(/^\|[^\n]*`(Vehicle\.[^`]+)`[^\n]*\|/gm)]
  .filter((match) => /Live firing checked/.test(match[0])).map((match) => match[1]);
assert.deepEqual([...new Set(testedRows)].sort(), [
  "Vehicle.v_militech_basilisk", "Vehicle.v_sport1_herrera_outlaw_heist_player",
  "Vehicle.v_sport2_mizutani_shion_nomad_player_missiles",
].sort(), "Do not promote untested appearances");
for (const mount of mounts.values()) {
  assert.ok(inventory.includes(`\`${mount.weapon}\``), mount.weapon);
  assert.ok(inventory.includes(`\`${mount.slot}\``), mount.slot);
  for (const field of ["mountId", "weaponId", "slotId"]) assert.ok(Number.isSafeInteger(mount[field]));
}
assert.match(inventory, /172 independently verified/);
assert.match(inventory, /\/data\/vehicle-weapons-2\.31\.json/);
const manifest = JSON.parse(await read("content/docs/_manifest.json"));
const source = manifest.files.find((entry) => entry.target === "public/data/vehicle-weapons-2.31.json");
assert.equal(source.source, "server/src/Open77.Server.Core/Vehicles/vehicle-weapons-2.31.json");
assert.equal(source.sha256, createHash("sha256").update(raw).digest("hex"));
assert.equal(source.bytes, Buffer.byteLength(raw));

const origin = process.argv[2];
if (origin) {
  const pages = [
    ["/docs/vehicles", "/docs/vehicle-weapons"],
    ["/docs/vehicle-weapons", "How multiplayer weapon sync works"],
    ["/docs/armed-vehicles", "Vehicle.v_militech_basilisk"],
    ["/docs/vehicle-weapons.md", "## Current damage policy"],
    ["/docs/armed-vehicles.md", "/data/vehicle-weapons-2.31.json"],
    ["/docs/api/client/open77-vehicles", "Armed vehicle guide"],
    ["/docs/api/client/open77-vehicles.md", "[Armed vehicle guide](/docs/vehicle-weapons#function-reference)"],
    ["/docs/api", "Open77.vehicles.getWeaponAmmo"],
    ["/sitemap.xml", "/docs/armed-vehicles"],
    ["/llms.txt", "/docs/vehicle-weapons"],
    ["/llms-full.txt", "How multiplayer weapon sync works"],
  ];
  for (const [url, needle] of pages) {
    const response = await fetch(new URL(url, origin));
    assert.equal(response.status, 200, url);
    assert.ok((await response.text()).includes(needle), `${url}: ${needle}`);
    console.log(`served OK ${url}`);
  }
  const reference = await (await fetch(new URL("/docs/api/client/open77-vehicles.md", origin))).text();
  for (const name of names) assert.ok(reference.includes(`## ${name}\n`), name);
  const server = await (await fetch(new URL("/docs/api/server/open77-vehicles.md", origin))).text();
  for (const name of names) assert.ok(!server.includes(`## ${name}\n`), `Server-only boundary: ${name}`);
  const download = await fetch(new URL("/data/vehicle-weapons-2.31.json", origin));
  assert.equal(download.status, 200);
  assert.equal(await download.text(), raw, "Public JSON must be byte-identical to the source snapshot");
}
console.log("Vehicle weapons documentation OK: 12 client APIs, 172 exact model records, 15 mounts and three live-tested variants.");
