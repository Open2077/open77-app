/** RP guide/reference regression check. Optional origin also checks served HTML/Markdown. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(file, "utf8");
const api = JSON.parse(await read("content/api/api.json"));
const entries = api.filter((entry) => entry.namespace === "Open77.animations");
// 25 since wave 5 (row I4): playAt and stopAt joined the server namespace.
assert.equal(entries.length, 25);
assert.equal(new Set(entries.map((entry) => entry.route_id)).size, 25);
assert.ok(entries.every((entry) => !entry.name.startsWith("_") && entry.name !== "animations"));
const find = (runtime, name) => {
  const entry = entries.find((entry) => entry.runtime === runtime && entry.name === name);
  assert.ok(entry, `${runtime}:${name}`);
  return entry;
};
for (const name of ["list", "get", "request", "sequence", "cancel", "state"]) {
  const entry = find("client", name);
  assert.ok(entry.returns.some((result) => result.includes("Open77.Promise")));
  assert.match(entry.description, /open77_animations/);
  assert.match(entry.example, /:await\(\)/);
  assert.equal(entry.inferred, false);
}
for (const name of ["list", "get", "play", "sequence", "stop", "current"]) {
  const entry = find("server", name);
  assert.equal(entry.route_id, `server:Open77.animations.${name}`);
  assert.ok(entry.summary && entry.description && entry.example && entry.returns.length);
  assert.equal(entry.inferred, false);
}
for (const [runtime, name, params] of [
  ["client", "clip", ["clip"]],
  ["client", "clips", ["query"]],
  ["client", "requestClip", ["clip", "options"]],
  ["server", "clip", ["clip"]],
  ["server", "clips", ["query"]],
  ["server", "playClip", ["playerId", "clip", "options"]],
  ["server", "playAt", ["playerId", "profileId", "position", "yaw", "options"]],
  ["server", "stopAt", ["playbackId"]],
]) {
  const entry = find(runtime, name);
  assert.deepEqual(entry.params.map((param) => param.name), params, `${runtime}:${name}`);
  assert.ok(entry.summary && entry.description && entry.returns.length, `${runtime}:${name}`);
  assert.equal(entry.inferred, false, `${runtime}:${name}`);
}
assert.deepEqual(find("client", "sequence").params.map((p) => p.name), ["steps", "options"]);
assert.deepEqual(find("server", "sequence").params.map((p) => p.name), ["playerId", "steps", "options"]);
assert.deepEqual(find("client", "play").params.map((p) => p.name), ["entity", "animation"]);
assert.deepEqual(find("server", "play").params.map((p) => p.name), ["playerId", "profileId", "options"]);
const meta = JSON.parse(await read("content/docs/meta.json"));
const players = meta.sections.find((section) => section.id === "players");
for (const slug of ["rp-animations", "rp-animation-catalogue"]) {
  assert.ok(players.pages.some((page) => page.slug === slug && page.kind === "guide"));
}
const guide = await read("content/docs/rp-animations.md");
for (const section of ["How it works", "Quick start: your first client action", "Client Lua API", "Server Lua API", "Playback state", "Ownership, cancellation and events"]) {
  assert.ok(guide.includes(section), section);
}
assert.match(guide, /Open77RP\.archive/);
assert.match(guide, /onAnimationPlaybackFailed/);
assert.match(guide, /Repeated reconnects.+camera hold/);
// The public profile catalogue contains 456 selectable clips across 76 profiles.
assert.equal((await read("content/docs/rp-animation-catalogue.md")).match(/^- `/gm).length, 456);

const origin = process.argv[2];
if (origin) {
  const pages = [
    ["/docs/rp-animations", "my_smoke"],
    ["/docs/rp-animation-catalogue", "stand__rh_cigarette__01__smoke__01"],
    ["/docs/api/client/open77-animations", "Open77.animations.request"],
    ["/docs/api/server/open77-animations", "players.animations.control"],
    ["/docs/rp-animations.md", "## How it works"],
    ["/docs/rp-animation-catalogue.md", "Smoke a cigarette"],
    ["/docs/api/client/open77-animations.md", "Open77.Promise"],
    ["/docs/api/server/open77-animations.md", "playbackId"],
    ["/docs/api", "Open77.animations.request"],
    ["/sitemap.xml", "/docs/rp-animations"],
    ["/llms.txt", "/docs/rp-animations"],
    ["/llms-full.txt", "Open77.animations.request"],
  ];
  for (const [path, expected] of pages) {
    const response = await fetch(new URL(path, origin));
    assert.equal(response.status, 200, path);
    assert.ok((await response.text()).includes(expected), `${path}: ${expected}`);
    console.log(`served OK ${path}`);
  }
}
console.log("Animation documentation OK: 25 API cards, tutorial and 456 catalogue clips.");
