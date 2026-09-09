/** Server export documentation contract; pass an origin to check the built routes. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(file, "utf8");
const runtime = await read("content/guides/resource-runtime.md");
assert.ok(!runtime.includes("Exports are a client-side mechanism"));
assert.match(runtime, /### Server-to-server exports/);
assert.match(runtime, /server-exports\.md/);
const guide = await read("content/docs/server-exports.md");
for (const term of ["exports('add'", "Open77.exports.call('score_service'", "pending:await()", "GetInvokingResource()", "resource_preparing", "export_timeout", "export_resource_stopped", "TriggerEvent", "30 seconds"]) {
  assert.ok(guide.includes(term), term);
}
const api = await read("content/docs/server-api.md");
for (const name of ["exports", "Open77.exports.call", "GetInvokingResource", "GetInvokingResourceGeneration", "Open77.resource.generation", "Open77.Promise.await", "Open77.Promise.status"]) {
  assert.ok(api.includes(`| \`${name}\` |`), name);
}
const meta = JSON.parse(await read("content/docs/meta.json"));
assert.ok(meta.sections.some((section) => section.pages.some((page) => page.slug === "server-exports")));

if (process.argv[2]) {
  for (const [path, expected] of [
    ["/docs/server-exports", "Publish a service"],
    ["/docs/server-exports.md", "Open77.exports.call('score_service'"],
    ["/docs/resource-runtime", "Server-to-server exports"],
    ["/docs/api/server/open77-exports", "Promise"],
    ["/docs/api/server/open77-promise", "promise:await()"],
    ["/docs/api/server/open77-exports.md", "Open77.exports.call"],
    ["/docs/api", "GetInvokingResourceGeneration"],
    ["/sitemap.xml", "/docs/server-exports"],
    ["/llms.txt", "/docs/server-exports"],
  ]) {
    const response = await fetch(new URL(path, process.argv[2]));
    assert.equal(response.status, 200, path);
    const body = await response.text();
    assert.ok(body.includes(expected), `${path}: ${expected}`);
    assert.ok(!body.includes("Exports are a client-side mechanism"), path);
    console.log(`served OK ${path}`);
  }
}
console.log("Server export guide, examples, navigation and runtime reference OK.");
