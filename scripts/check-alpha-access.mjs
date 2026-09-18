import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const read = (file) => readFile(file, "utf8");
const meta = JSON.parse(await read("content/docs/meta.json"));
assert.ok(meta.sections[0].pages.some((page) => page.slug === "alpha-access" && page.source === "authored"));
assert.ok(!meta.sections.flatMap((section) => section.pages).some((page) => page.slug === "developer-preview"));
assert.match(await read("src/lib/site.ts"), /Everyone with Alpha access can download the server and start building/);
const guide = await read("content/guides/alpha-access.md");
for (const text of ["Get access", "Install and connect", "Host your first server", "Alpha expectations", "Report a problem", "not a stable release", "/alpha apply", "any channel", "changelog channel", "No separate developer application"]) {
  assert.ok(guide.includes(text), `Alpha guide: ${text}`);
}

// Keep experimental feature warnings; reject the retired access programme,
// its separate application form and its stale scarcity claims on every public surface.
const stale = /developer[ _-]?preview|dev[ _-]?preview|pre-alpha|preview access|join preview|approved.preview|preview accounts|very limited launch slots|applications are open for a limited|docs\.google\.com\/forms|public alpha has not opened|there are no public servers yet|The alpha is not open yet/i;
async function checkCurrentCopy(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await checkCurrentCopy(file);
    else if (/\.(tsx?|md|json)$/.test(entry.name) && entry.name !== "_manifest.json") assert.doesNotMatch(await read(file), stale, file);
  }
}
await checkCurrentCopy("src");
await checkCurrentCopy("content");
for (const file of ["src/components/developer-alpha.tsx", "src/components/host/host-gate.tsx"]) {
  const text = await read(file);
  assert.ok(text.includes("/alpha apply") && text.includes("any"), `${file}: Discord access instructions`);
  assert.ok(text.includes("No separate developer application"), `${file}: no second access gate`);
}
const redirects = await read("next.config.ts");
for (const [oldRoute, newRoute] of [
  ["/docs/developer-preview", "/docs/alpha-access"],
  ["/docs/developer-preview.md", "/docs/alpha-access.md"],
  ["/md/docs/developer-preview", "/docs/alpha-access.md"],
]) assert.ok(redirects.includes(`source: "${oldRoute}", destination: "${newRoute}", permanent: true`));

const origin = process.argv[2];
if (origin) {
  for (const [route, expected] of [
    ["/", "Everyone with Alpha access"],
    ["/docs/alpha-access", "Alpha access: play, host and build"],
    ["/docs/alpha-access.md", "/alpha apply"],
    ["/docs", "Everyone with Alpha access"],
    ["/download", "Everyone with Alpha access"],
    ["/create", "Everyone with Alpha access"],
    ["/host", "Everyone with Alpha access"],
    ["/workshop", "Everyone with Alpha access"],
    ["/servers", "Everyone with Alpha access"],
    ["/account", "Everyone with Alpha access"],
    ["/devblog", "Everyone with Alpha access"],
    ["/docs/platform.md", "/alpha apply"],
    ["/docs/launcher.md", "/alpha apply"],
    ["/docs/launcher-for-server-owners.md", "/alpha apply"],
    ["/docs/host-a-server.md", "Both Windows x64 and Linux x64"],
    ["/llms.txt", "Everyone with Alpha access"],
    ["/llms-full.txt", "Everyone with Alpha access"],
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
console.log("PASS: Alpha server access, Discord instructions, current copy, navigation and legacy guide redirects.");
