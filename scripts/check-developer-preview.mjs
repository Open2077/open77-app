import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const read = (file) => readFile(file, "utf8");
const meta = JSON.parse(await read("content/docs/meta.json"));
assert.ok(meta.sections[0].pages.some((page) => page.slug === "developer-preview" && page.source === "authored"));
assert.match(await read("src/lib/site.ts"), /Developer Preview is active/);
const guide = await read("content/guides/developer-preview.md");
for (const text of ["Get access", "Install and connect", "Host your first server", "Preview expectations", "Report a problem", "approved", "not a stable release"]) {
  assert.ok(guide.includes(text), `Preview guide: ${text}`);
}

// Dated devblog entries and technical wiki limitations are historical evidence,
// not marketing copy to rewrite when the product's stage changes.
const stale = /public alpha has not opened|there are no public servers yet|no public servers exist during pre-alpha|developer preview coming soon|DEVELOPER ALPHA PREVIEW · COMING SOON|The alpha is not open yet|Nothing to play on just yet|Design intent, not shipped software/i;
async function checkCurrentCopy(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await checkCurrentCopy(file);
    else if (/\.(tsx?|md)$/.test(entry.name)) assert.doesNotMatch(await read(file), stale, file);
  }
}
await checkCurrentCopy("src");
await checkCurrentCopy("content/guides");

const origin = process.argv[2];
if (origin) {
  for (const [route, expected] of [
    ["/docs/developer-preview", "Developer Preview is live"],
    ["/docs/developer-preview.md", "not a stable release"],
    ["/docs", "Developer Preview is active"],
    ["/download", "Developer Preview is active"],
    ["/create", "Developer Preview is active"],
    ["/workshop", "Developer Preview is live"],
    ["/docs/platform.md", "Developer Preview is active"],
    ["/docs/host-a-server.md", "Both Windows x64 and Linux x64"],
    ["/llms.txt", "Developer Preview is active"],
    ["/llms-full.txt", "Developer Preview is active"],
    ["/sitemap.xml", "/docs/developer-preview"],
  ]) {
    const response = await fetch(new URL(route, origin));
    assert.equal(response.status, 200, route);
    const body = await response.text();
    assert.ok(body.includes(expected), `${route}: ${expected}`);
    console.log(`served OK ${route}`);
  }
}
console.log("PASS: Developer Preview is active across current copy, guide and navigation.");
