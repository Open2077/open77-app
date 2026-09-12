/** Guard the distinction between server-owned resource exports and client natives. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(file, "utf8");
const contracts = JSON.parse(await read("content/api/door-service-api.json"));
const expected = {
  server: ["get", "list", "near", "register", "configure", "setOpen", "setLocked", "setSealed",
    "setAutomatic", "setAccess", "linkElevator", "remove", "setDiscoveryEnabled", "changes"],
  client: ["get", "list", "requestOpen"],
};
assert.equal(contracts.length, 17);
for (const [runtime, names] of Object.entries(expected)) {
  assert.deepEqual(contracts.filter((entry) => entry.runtime === runtime).map((entry) => entry.name).sort(), names.sort());
}
for (const entry of contracts) {
  assert.ok(entry.summary && entry.description && entry.args && entry.returns, entry.name);
}
const nav = JSON.parse(await read("content/docs/meta.json"));
assert.ok(nav.sections.flatMap((section) => section.pages).some((page) => page.slug === "doors" && page.kind === "guide"));
const guide = await read("content/docs/doors.md");
for (const needle of ["2.31.13+op77.58", "server exports", "pending:await()",
  "routing bucket", "doorsClosed", "server_authority_required", "anti-tailgating", "not a world attestation",
  "open77:doors:requestResult", "generation", "4096", "256", "networkInstance"]) {
  assert.ok(guide.includes(needle), needle);
}
assert.ok((await read("src/lib/api-reference.ts")).includes('usageGuideHref: "/docs/doors"'));
assert.ok((await read("src/lib/api-categories.ts")).includes('"open77_doors"'));
assert.ok((await read("src/lib/door-service-api.ts")).includes('Open77.exports.call("open77_doors"'));
const native = JSON.parse(await read("content/api/api.json"));
assert.ok(!native.some((entry) => entry.runtime === "server" && entry.namespace === "Open77.doors"), "No invented server-native door table");

const origin = process.argv[2];
if (origin) {
  for (const [url, needle] of [
    ["/docs/doors", "Networked world doors"],
    ["/docs/doors.md", "2.31.13+op77.58"],
    ["/docs/api/server/resource-open77-doors", "open77_doors.setAccess"],
    ["/docs/api/server/resource-open77-doors.md", 'Open77.exports.call("open77_doors", "setAccess"'],
    ["/docs/api/client/resource-open77-doors", "open77_doors.requestOpen"],
    ["/docs/api", "open77_doors.linkElevator"],
    ["/sitemap.xml", "/docs/doors"],
    ["/llms.txt", "/docs/doors"],
    ["/llms-full.txt", "doorway_occupied"],
  ]) {
    const response = await fetch(new URL(url, origin), { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, url);
    assert.ok((await response.text()).includes(needle), `${url}: ${needle}`);
    console.log(`served OK ${url}`);
  }
}
console.log("Networked doors: guide, 14 server / 3 client exports, authority and deployment limits verified.");
