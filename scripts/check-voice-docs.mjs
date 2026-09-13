/** Voice lipsync: client-only, discoverable, and honest about release/renderer limits. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(file, "utf8");
const names = ["setLipSyncEnabled", "setPlayerLipSyncEnabled", "getLipSyncStatus", "getPlayerLipSyncState"];
const api = JSON.parse(await read("content/api/api.json"));
const cards = api.filter((entry) => entry.namespace === "Open77.voice" && names.includes(entry.name));
assert.equal(cards.length, 4);
assert.equal(new Set(cards.map((entry) => entry.name)).size, 4);
for (const card of cards) {
  assert.equal(card.runtime, "client", card.qualified);
  assert.equal(card.inferred, false, card.qualified);
  assert.ok(card.description.includes("voice.client"), card.qualified);
  assert.ok(card.summary && card.returns.length && card.example, card.qualified);
}
const nav = JSON.parse(await read("content/docs/meta.json"));
const pages = nav.sections.find((section) => section.id === "interfaces").pages;
assert.equal(pages.findIndex((page) => page.slug === "voice-lipsync"),
  pages.findIndex((page) => page.slug === "voice") + 1);
const guide = await read("content/docs/voice-lipsync.md");
for (const text of [...names, "voice.client", "audio-envelope", "male and female", "F7",
  "local presentation controls", "facial_graph_unavailable", "resource's", "not recognize phonemes",
  "Do not infer CDN availability"]) assert.ok(guide.includes(text), text);
assert.ok((await read("content/docs/voice.md")).includes("(voice-lipsync.md)"));
assert.ok((await read("src/lib/api-reference.ts")).includes('"/docs/voice-lipsync"'));
const origin = process.argv[2];
if (origin) {
  for (const [url, needle] of [
    ["/docs/voice", "/docs/voice-lipsync"],
    ["/docs/voice-lipsync", "facial_graph_unavailable"],
    ["/docs/voice-lipsync.md", "setLipSyncEnabled"],
    ["/docs/api/client/open77-voice", "Voice lipsync guide"],
    ["/docs/api/client/open77-voice.md", "getPlayerLipSyncState"],
    ["/sitemap.xml", "/docs/voice-lipsync"],
    ["/llms.txt", "/docs/voice-lipsync"],
  ]) {
    const response = await fetch(new URL(url, origin), { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, url);
    assert.ok((await response.text()).includes(needle), `${url}: ${needle}`);
    console.log(`served OK ${url}`);
  }
}
console.log("Voice guide, four client API cards, navigation and limits verified.");
