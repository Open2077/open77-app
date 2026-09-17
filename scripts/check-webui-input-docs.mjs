import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const read = async (file) => (await readFile(file, "utf8")).replaceAll("\r\n", "\n");
const guide = await read("content/docs/webui-input.md");
const runtime = await read("content/guides/resource-runtime.md");
const nav = JSON.parse(await read("content/docs/meta.json"));
const apiText = await read("content/api/api.json");
const api = JSON.parse(apiText);
const manifest = JSON.parse(await read("content/docs/_manifest.json"));
assert.equal(nav.sections.flatMap((section) => section.pages).filter((page) => page.slug === "webui-input").length, 1);
for (const token of ["setConsumedKeys", "webui.keep_input", "setFocus(true, false, true)",
  "preventDefault", "setMenuReady", "32", "unsupported_consumed_key", "controller", "compatible client"]) {
  assert.ok(guide.includes(token), `Missing contract: ${token}`);
}
assert.ok(runtime.includes("[WebUI keyboard input](webui-input.md)"));
const cards = api.filter((entry) => entry.qualified === "WebUI.Page.setConsumedKeys");
assert.equal(cards.length, 1);
assert.equal(cards[0].runtime, "client");
assert.equal(cards[0].handler, "LuaWebPageConsumedKeys");
assert.equal(cards[0].params[0].name, "keys");
assert.equal(cards[0].params[0].type, "string[]");
assert.equal(cards[0].inferred, false);
assert.equal(cards[0].since, null, "Keep unknown introduction versions unset");
for (const [target, data] of [["content/docs/webui-input.md", guide], ["content/api/api.json", apiText]]) {
  const record = manifest.files.find((entry) => entry.target.replaceAll("\\", "/") === target);
  assert.ok(record, `Missing provenance for ${target}`);
  assert.equal(record.bytes, Buffer.byteLength(data));
  assert.equal(record.sha256, createHash("sha256").update(data).digest("hex"));
}
assert.equal(manifest.apiEntries, api.length);
const origin = process.argv[2];
if (origin) {
  for (const [route, tokens] of [
    ["/docs/webui-input", ["WebUI selective keyboard capture", "setConsumedKeys", "compatible client"]],
    ["/docs/webui-input.md", ["# WebUI selective keyboard capture", "page:setConsumedKeys", "menu:back"]],
    ["/docs/resource-runtime.md", ["Escape and selective keyboard consumption", "webui-input"]],
    ["/docs/api/client/webui-page", ["setConsumedKeys", "/docs/webui-input"]],
    ["/docs/api/client/webui-page.md", ["setConsumedKeys", "keys", "Client"]],
    ["/sitemap.xml", ["/docs/webui-input"]],
    ["/llms.txt", ["/docs/webui-input"]],
  ]) {
    const response = await fetch(new URL(route, origin), { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, route);
    const text = await response.text();
    for (const token of tokens) assert.ok(text.includes(token), `${route}: ${token}`);
  }
}
console.log(`Selective WebUI input guide, API and provenance passed${origin ? " (served routes too)" : ""}.`);
