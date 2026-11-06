import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const read = (file) => readFile(file, "utf8");
const meta = JSON.parse(await read("content/docs/meta.json"));
assert.ok(meta.sections[0].pages.some((page) => page.slug === "alpha-access" && page.source === "authored"));
assert.ok(!meta.sections.flatMap((section) => section.pages).some((page) => page.slug === "developer-preview"));
assert.match(await read("src/lib/site.ts"), /Open Alpha is available to everyone/);
const guide = await read("content/guides/alpha-access.md");
for (const text of ["Get started", "Install and connect", "Host your first server", "Alpha expectations", "Report a problem", "not a stable release", "No access application", "verified email", "server license", "Build with Lua"]) {
  assert.ok(guide.includes(text), `Alpha guide: ${text}`);
}

// Keep experimental feature warnings; reject the retired access programme,
// its separate application form and its stale scarcity claims on every public surface.
const stale = /alpha apply|Everyone with Alpha access|Alpha-enabled|approved account|account approval|Alpha access is a separate|does not grant approval to join|developer[ _-]?preview|dev[ _-]?preview|pre-alpha|preview access|join preview|approved.preview|preview accounts|very limited launch slots|applications are open for a limited|docs\.google\.com\/forms|public alpha has not opened|there are no public servers yet|The alpha is not open yet/i;
async function checkCurrentCopy(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await checkCurrentCopy(file);
    else if (/\.(tsx?|md|json)$/.test(entry.name) && entry.name !== "_manifest.json") {
      const body = await read(file);
      if (file.split(path.sep).includes("devblog") && stale.test(body)) {
        assert.ok(body.includes("Open Alpha update — November 6, 2026"), `${file}: historical access policy needs a current notice`);
      } else assert.doesNotMatch(body, stale, file);
    }
  }
}
await checkCurrentCopy("src");
await checkCurrentCopy("content");
const redirects = await read("next.config.ts");
for (const [oldRoute, newRoute] of [
  ["/docs/developer-preview", "/docs/alpha-access"],
  ["/docs/developer-preview.md", "/docs/alpha-access.md"],
  ["/md/docs/developer-preview", "/docs/alpha-access.md"],
]) assert.ok(redirects.includes(`source: "${oldRoute}", destination: "${newRoute}", permanent: true`));

const origin = process.argv[2];
if (origin) {
  for (const [route, expected] of [
    ["/", "Open Alpha"],
    ["/docs/alpha-access", "Open Alpha: play, host and build"],
    ["/docs/alpha-access.md", "Open Alpha"],
    ["/docs", "Open Alpha"],
    ["/download", "Open Alpha"],
    ["/create", "Open Alpha"],
    ["/host", "Open Alpha"],
    ["/workshop", "Open Alpha"],
    ["/servers", "Open Alpha"],
    ["/account", "Open Alpha"],
    ["/devblog", "Open Alpha"],
    ["/docs/platform.md", "Open Alpha"],
    ["/docs/launcher.md", "Open Alpha"],
    ["/docs/launcher-for-server-owners.md", "Open Alpha"],
    ["/docs/host-a-server.md", "Both Windows x64 and Linux x64"],
    ["/llms.txt", "Open Alpha"],
    ["/llms-full.txt", "Open Alpha"],
    ["/sitemap.xml", "/docs/alpha-access"],
  ]) {
    const response = await fetch(new URL(route, origin), { signal: AbortSignal.timeout(60000) });
    assert.equal(response.status, 200, route);
    const body = await response.text();
    assert.ok(body.includes(expected), `${route}: ${expected}`);
    assert.doesNotMatch(body, stale, `${route}: retired access copy`);
    console.log(`served OK ${route}`);
  }
  for (const [oldRoute, newRoute] of [
    ["/docs/developer-preview", "/docs/alpha-access"],
    ["/docs/developer-preview.md", "/docs/alpha-access.md"],
    ["/md/docs/developer-preview", "/docs/alpha-access.md"],
  ]) {
    const response = await fetch(new URL(oldRoute, origin), { redirect: "manual", signal: AbortSignal.timeout(60000) });
    assert.equal(response.status, 308, oldRoute);
    assert.equal(new URL(response.headers.get("location"), origin).pathname, newRoute, oldRoute);
    console.log(`redirect OK ${oldRoute}`);
  }
}
console.log("PASS: Open Alpha guidance, public downloads, no application instructions, navigation and legacy guide redirects.");
