import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildNpcCatalogue, parseCsv } from "./npc-catalogue.mjs";

assert.deepEqual(parseCsv('a,b\r\n"x,y","z""q"\r\n"line\nbreak",last'), [["a", "b"], ["x,y", 'z"q'], ["line\nbreak", "last"]]);
assert.throws(() => parseCsv('"unterminated'), /Unclosed/);
assert.throws(() => parseCsv('"closed"junk'), /Malformed/);
const read = (file) => readFile(file, "utf8");
const catalogue = JSON.parse(await read("public/data/npc-records-2.31.json"));
assert.deepEqual(catalogue, buildNpcCatalogue(await read("public/data/npc-records-2.31.csv")));
assert.equal(catalogue.count, 6582);
assert.equal(catalogue.sourceCount, 6668);
assert.equal(catalogue.excludedUnsupportedIds, 86);
assert.equal(new Set(catalogue.records.map((record) => record.record)).size, 6582);
assert.ok(catalogue.records.every((record) => record.record.startsWith("Character.")));
assert.ok(catalogue.records.some((record) => record.record === "Character.cpz_maelstrom_grunt1_ranged1_lexington_wa"));
const api = JSON.parse(await read("content/api/api.json"));
const server = api.filter((entry) => entry.namespace === "Open77.npcs" && entry.runtime === "server");
assert.deepEqual(server.map((entry) => entry.name).sort(), ["getBehavior", "setAIEnabled", "setBehavior", "setCombatEnabled", "setPerceptionEnabled", "setVoiceEnabled"].sort());
assert.equal(api.filter((entry) => entry.namespace === "Open77.npcs" && entry.runtime === "client").length, 5);
for (const entry of server) assert.ok(entry.summary && entry.description && entry.returns.length, entry.name);
const nav = JSON.parse(await read("content/docs/meta.json"));
for (const slug of ["npcs", "npc-behavior", "npc-catalogue"]) {
  assert.ok(nav.sections.some((section) => section.pages.some((page) => page.slug === slug && page.kind === "guide")));
  assert.ok((await read(`content/docs/${slug}.md`)).length > 500);
}
assert.ok((await read("content/docs/npc-behavior.md")).includes("2.31.13+op77.55"));
const manifest = JSON.parse(await read("content/docs/_manifest.json"));
for (const extension of ["csv", "json"]) assert.ok(manifest.files.some((file) => file.target === `public/data/npc-records-2.31.${extension}` && file.records === (extension === "csv" ? 6668 : 6582)));
const origin = process.argv[2];
if (origin) {
  for (const [url, needle] of [
    ["/docs/npcs", "Character.*"], ["/docs/npc-behavior", "setVoiceEnabled"],
    ["/docs/npc-catalogue", "Explore NPC records"], ["/docs/npc-catalogue.md", "not a spawn allowlist"],
    ["/docs/npc-behavior.md", "2.31.13+op77.55"],
    ["/docs/api/server/open77-npcs", "setVoiceEnabled"], ["/docs/api/client/open77-npcs", "NPC lifecycle"],
    ["/docs/api/server/open77-npcs.md", "setBehavior"],
    ["/data/npc-records-2.31.json", '"count":6582'], ["/data/npc-records-2.31.csv", "Character.Judy"],
    ["/sitemap.xml", "/docs/npc-catalogue"], ["/llms.txt", "/docs/npc-behavior"],
  ]) {
    const response = await fetch(new URL(url, origin));
    assert.equal(response.status, 200, url);
    assert.ok((await response.text()).includes(needle), `${url}: ${needle}`);
    console.log(`served OK ${url}`);
  }
}
console.log("NPC docs: 6 server behavior APIs, 5 client reads, 3 guides and 6,582 Character records verified (86 TEST IDs excluded).");
