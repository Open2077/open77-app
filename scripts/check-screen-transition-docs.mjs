/** Native screen fades: complete, client-only and honest about renderer limits. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(file, "utf8");
const api = JSON.parse(await read("content/api/api.json"));
const nav = JSON.parse(await read("content/docs/meta.json"));
// `Open77.screen` now also carries the wave-6 capture surface (`capture`,
// `surface`, `upload`, `mugshot` -- base 4d6b81ea, guide screenshots.md); this
// check is about the fades, so it looks at the eight fade cards only.
const fadeNames = ["fadeOut", "fadeIn", "transition", "cancel", "state", "catalog", "isFaded", "nativeState"];
const entries = api.filter((entry) => entry.namespace === "Open77.screen" && fadeNames.includes(entry.name));
assert.deepEqual(entries.map((entry) => entry.name).sort(), [...fadeNames].sort());
for (const entry of entries) {
  assert.equal(entry.runtime, "client", entry.qualified);
  assert.equal(entry.inferred, false, entry.qualified);
  assert.ok(entry.summary && entry.description && entry.returns.length, entry.qualified);
  assert.ok(entry.description.includes("screen.effects"), entry.qualified);
}
assert.ok(nav.sections.find((section) => section.id === "interfaces").pages
  .some((page) => page.slug === "screen-transitions" && page.kind === "guide"));
assert.ok((await read("src/lib/api-categories.ts")).includes('"Open77.screen"'));
assert.ok((await read("src/lib/api-reference.ts")).includes("/docs/screen-transitions"));
const guide = await read("content/docs/screen-transitions.md");
for (const text of ["2.31.13+op77.56", "1.24", "screen.effects", "open77:screen:black",
  "unsupported_screen_preset", "screen_busy", "native_screen_busy", "timeoutMs",
  "CEF", "blurred/tinted", "not a GPU presentation fence", "not authorization"]) {
  assert.ok(guide.includes(text), text);
}

const origin = process.argv[2];
if (origin) {
  for (const [url, needle] of [
    ["/docs/screen-transitions", "Native screen transitions"],
    ["/docs/screen-transitions.md", "2.31.13+op77.56"],
    ["/docs/api/client/open77-screen", "Native fades &amp; transitions guide"],
    ["/docs/api/client/open77-screen.md", "Open77.screen.fadeOut"],
    ["/docs/api", "Open77.screen.transition"],
    ["/sitemap.xml", "/docs/screen-transitions"],
    ["/llms.txt", "/docs/screen-transitions"],
    ["/llms-full.txt", "unsupported_screen_preset"],
  ]) {
    const response = await fetch(new URL(url, origin), { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, url);
    assert.ok((await response.text()).includes(needle), `${url}: ${needle}`);
    console.log(`served OK ${url}`);
  }
  assert.equal((await fetch(new URL("/docs/api/server/open77-screen", origin))).status,
    404, "No nonexistent server screen API page");
}
console.log("Native fades: eight client API cards, dedicated guide, navigation and limits verified.");
