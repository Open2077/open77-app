/** SVG blip guide/API consistency and optional served-route checks. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const read = async (file) => (await readFile(file, "utf8")).replaceAll("\r\n", "\n");
const guide = await read("content/guides/custom-blip-icons.md");
const blips = await read("content/docs/blips.md");
const api = JSON.parse(await read("content/api/api.json"));
const cards = api.filter((entry) => entry.namespace === "Open77.blips");
const nav = JSON.parse(await read("content/docs/meta.json"));
const pages = nav.sections.flatMap((section) => section.pages);
assert.equal(pages.filter((page) => page.slug === "custom-blip-icons").length, 1);
assert.ok(nav.sections.find((section) => section.id === "map").pages.some((page) =>
  page.slug === "custom-blip-icons" && page.source === "authored"));
assert.ok(blips.includes("custom-blip-icons.md"));
for (const token of ["Experimental", "Client only", "2.31", "ui.vanilla.map", "client_script",
  "icons/fuel.svg", 'viewBox="0 0 64 64"', "type(Open77.blips.setColor)", "setIcon(id, false)",
  "setColor(id, false)", "#RRGGBBAA", "setRange", "routable", "256 KiB", "1,024", "16,384",
  "native_unavailable", "blip_visual_budget_exceeded", "svg_geometry_outside_viewport"])
  assert.ok(guide.includes(token), `Missing guide contract: ${token}`);
for (const name of ["create", "update", "setIcon", "setColor"]) {
  const matches = cards.filter((entry) => entry.name === name);
  assert.equal(matches.length, 1, name);
  assert.equal(matches[0].runtime, "client", name);
  assert.ok(matches[0].permissions.includes("ui.vanilla.map"), name);
}
assert.equal(cards.find((entry) => entry.name === "setColor").since, null,
  "Do not invent a release version for the experimental API");
assert.ok(cards.find((entry) => entry.name === "setIcon").example.includes(".svg"));
assert.ok(cards.find((entry) => entry.name === "create").params[0].type.includes("color?"));
for (const oldClaim of ["Custom PNG icons", "Stores a declared PNG", "renders only the native sprite",
  "unsupported_option:color"])
  assert.ok(!blips.includes(oldClaim), `Obsolete contract: ${oldClaim}`);
const manifest = JSON.parse(await read("content/docs/_manifest.json"));
for (const target of ["content/docs/blips.md", "content/api/api.json"]) {
  const record = manifest.files.find((entry) => entry.target.replaceAll("\\", "/") === target);
  const content = await read(target);
  assert.equal(record.bytes, Buffer.byteLength(content), target);
  assert.equal(record.sha256, createHash("sha256").update(content).digest("hex"), target);
}
assert.equal(manifest.apiEntries, api.length);
for (const [, href] of guide.matchAll(/\]\(([^)]+)\)/g)) {
  if (href.startsWith("/docs/api/")) continue;
  assert.ok(pages.some((page) => page.slug === href.replace(/\.md(?:#.*)?$/, "")), href);
}

const origin = process.argv[2];
if (origin) {
  for (const [route, token] of [
    ["/docs/custom-blip-icons", 'id="create-your-first-icon"'],
    ["/docs/custom-blip-icons.md", "svg_geometry_outside_viewport"],
    ["/docs/blips", "/docs/custom-blip-icons"],
    ["/docs/api/client/open77-blips", "setColor"],
    ["/docs/api/client/open77-blips.md", "#RRGGBBAA"],
    ["/docs", "/docs/custom-blip-icons"],
    ["/sitemap.xml", "/docs/custom-blip-icons"],
    ["/llms.txt", "/docs/custom-blip-icons"],
  ]) {
    const response = await fetch(new URL(route, origin), { signal: AbortSignal.timeout(60000) });
    assert.equal(response.status, 200, route);
    assert.ok((await response.text()).includes(token), `${route}: ${token}`);
    console.log(`served OK ${route}`);
  }
}
console.log("SVG blip guide, API cards, navigation, links and provenance verified.");
