/** Documentation and optional served-route contract for client Lua modules. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(file, "utf8");
const guide = await read("content/docs/lua-modules.md");
for (const term of ["require('@polyzone')", "files { 'shared/fares.lua' }", "dependency 'polyzone >=1.0.0'",
  "dedicated-server sandbox", "development-build feature", "caller's permissions", "separate module instances",
  "module_dependency_not_declared", "module_dependency_not_running", "circular_module_dependency", "Reload the consuming resources",
  "Require or exports?", "do not call `Wait`", "helpers.math", "value == nil"]) {
  assert.ok(guide.includes(term), `Guide missing ${term}`);
}
const runtime = await read("content/guides/resource-runtime.md");
assert.ok(runtime.includes("(lua-modules.md)"));
assert.ok(!runtime.includes("`require` is confined to the resource"));
const meta = JSON.parse(await read("content/docs/meta.json"));
for (const slug of ["lua-modules", "polyzone"]) {
  assert.equal(meta.sections.flatMap((section) => section.pages).filter((page) => page.slug === slug).length, 1);
}
const api = JSON.parse(await read("content/api/api.json"));
const entry = api.find((row) => row.namespace === "_G" && row.name === "require" && row.runtime === "client");
assert.ok(entry?.description.includes("declared, running dependency"));
assert.ok(entry.example.includes("require('@polyzone')"));
assert.ok(!entry.description.includes("or modules from another resource"));
assert.ok(!api.some((row) => row.namespace === "_G" && row.name === "require" && row.runtime === "server"));

if (process.argv[2]) {
  for (const [route, expected] of [
    ["/docs/lua-modules", "Require or exports?"],
    ["/docs/lua-modules.md", "require('@polyzone')"],
    ["/docs/polyzone", "Zone-filtered events"],
    ["/docs/resource-runtime", "/docs/lua-modules"],
    ["/docs/api/client/globals", "/docs/lua-modules"],
    ["/docs/api/client/globals.md", "declared, running dependency"],
    ["/sitemap.xml", "/docs/lua-modules"],
    ["/llms.txt", "/docs/lua-modules"],
  ]) {
    const response = await fetch(new URL(route, process.argv[2]));
    assert.equal(response.status, 200, route);
    assert.ok((await response.text()).includes(expected), `${route}: ${expected}`);
    console.log(`served OK ${route}`);
  }
}
console.log("Module guide, runtime reference, API card and navigation OK.");
