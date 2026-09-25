/** Verify the public weapon-tuning slice, optionally including served routes. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const read = async (file) => (await readFile(file, "utf8")).replaceAll("\r\n", "\n");
const guide = await read("content/guides/weapon-customization.md");
const api = JSON.parse(await read("content/api/api.json"));
const fields = ["reloadSpeed", "fireRate", "recoil", "spread", "damage", "magazineCapacity", "projectilesPerShot", "aimSpeed", "chargeSpeed", "smartProjectileSpeed", "blastRadius", "blastPush", "blastLift", "blastFalloff", "blastCooldown"];
for (const field of fields) assert.ok(guide.includes(`| \`${field}\` |`), field);
for (const [name, permission, params] of [
  ["setTuning", "player.weapons.edit", ["record", "options"]],
  ["clearTuning", "player.weapons.edit", []],
  ["tuning", "player.weapons.read", []],
]) {
  const matches = api.filter((entry) => entry.runtime === "client" && entry.qualified === `Open77.weapons.${name}`);
  assert.equal(matches.length, 1, name);
  assert.equal(matches[0].inferred, false);
  assert.deepEqual(matches[0].params.map((param) => param.name), params);
  assert.ok(matches[0].permissions.includes(permission));
  assert.equal(api.some((entry) => entry.runtime === "server" && entry.qualified === `Open77.weapons.${name}`), false, "No server tuning overload");
}
for (const text of ["compatible development client", 'type(Open77.weapons.setTuning)', "pendingModifiers", "waiting_for_restore", "weapon_tuning_owned_by_another_resource", "300", "512", "64", "--fleet-mode passenger", "-HostPhysics", "Shots at the ground", "https://github.com/Open2077/open77-rp-examples/tree/main/rp_weapons_effect"])
  assert.ok(guide.toLowerCase().includes(text.toLowerCase()), text);
const manifest = JSON.parse(await read("content/docs/_manifest.json"));
for (const target of ["content/api/api.json", "content/docs/weapons-api.md"]) {
  const record = manifest.files.find((entry) => entry.target.replaceAll("\\", "/") === target);
  const text = await read(target);
  assert.equal(record.sha256, createHash("sha256").update(text).digest("hex"), target);
  assert.equal(record.bytes, Buffer.byteLength(text), target);
}
assert.equal(manifest.apiEntries, api.length);
const base = process.argv[2];
if (base) {
  for (const route of ["/docs/weapon-customization", "/docs/weapon-customization.md", "/docs/api/client/open77-weapons", "/docs/api/client/open77-weapons.md"]) {
    const response = await fetch(new URL(route, base));
    assert.equal(response.status, 200, route);
    const text = await response.text();
    for (const name of ["setTuning", "clearTuning", "tuning"]) assert.ok(text.includes(name), `${route}: ${name}`);
    if (route.endsWith(".md")) assert.ok(response.headers.get("content-type").includes("text/markdown"), route);
  }
}
console.log("Weapon tuning: three native signatures, 15 options, permissions, lifecycle, compatibility, links and provenance verified.");
