/** Scoped documentation contract checks; optionally verify the served pages. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const read = async (file) => (await readFile(file, "utf8")).replaceAll("\r\n", "\n");
const runtime = await read("content/guides/resource-runtime.md");
const sql = await read("content/guides/database.md");
const api = JSON.parse(await read("content/api/api.json"));
const meta = JSON.parse(await read("content/docs/meta.json"));
const manifest = JSON.parse(await read("content/docs/_manifest.json"));

for (const value of ["96 MiB", "1,500,000", "6 ms per client host", "3,072", "6,144", "1,536", "24", "12 MiB per file", "3 MiB"]) {
  assert.ok(runtime.includes(value), `Missing client limit: ${value}`);
}
for (const value of ["http://localhost:5173/", "https://ui.example.dev/", "CORS", "certificate validity", "iframe", "WS/WSS", "Ctrl + wheel", "2 MiB WebUI message limit", "dedicated server's Lua"]) {
  assert.ok(runtime.includes(value), `Missing WebUI contract: ${value}`);
}
const page = meta.sections.flatMap((section) => section.pages).filter((entry) => entry.slug === "database");
assert.equal(page.length, 1, "SQL guide must be registered exactly once");
assert.equal(page[0].source, "authored", "Wiki sync must not overwrite the site-owned SQL guide");
for (const value of ["MySQL/MariaDB", "OP77_DATABASE_CONNECTION", "connectionStringEnvironmentVariable", "takes precedence", "database.access", "MySQL.ready", "MySQL.scalar.await", "database_unreachable", "SslMode=VerifyFull", "Restart the dedicated server", "not a continuous health check", "All resources with"]) {
  assert.ok(sql.includes(value), `Missing SQL contract: ${value}`);
}
const configBlock = sql.match(/```json\n([\s\S]*?)\n```/);
assert.ok(configBlock, "SQL configuration example missing");
assert.deepEqual(JSON.parse(configBlock[1]), { database: { enabled: true, connectionString: "", connectionStringEnvironmentVariable: "OP77_DATABASE_CONNECTION", maxRows: 10000 } });
const schema = JSON.parse(await read("content/api/schemas/server-config.schema.json"));
const settings = schema.properties.database.properties;
for (const key of Object.keys(JSON.parse(configBlock[1]).database)) {
  assert.ok(key in settings, `SQL example property missing in the published schema: ${key}`);
}
assert.equal(settings.connectionStringEnvironmentVariable.default, "OP77_DATABASE_CONNECTION");

for (const name of ["Open77.webui.create", "Open77.webui.default", "Open77.resource.readPackedFile"]) {
  const entries = api.filter((entry) => entry.runtime === "client" && entry.qualified === name);
  assert.equal(entries.length, 1, `${name}: one API card`);
  assert.match(entries[0].description, /resource-runtime/, `${name}: link runtime requirements`);
}
for (const target of ["content/docs/debug-runtime.md", "content/docs/server-api.md", "content/docs/sound.md", "content/api/api.json", "content/api/schemas/server-config.schema.json"]) {
  const record = manifest.files.find((entry) => entry.target.replaceAll("\\", "/") === target);
  const data = await read(target);
  assert.ok(record, `${target}: provenance record missing`);
  assert.equal(record.bytes, Buffer.byteLength(data), `${target}: byte count`);
  assert.equal(record.sha256, createHash("sha256").update(data).digest("hex"), `${target}: hash`);
  assert.ok(record.source, `${target}: preserve upstream provenance`);
  if (target.endsWith(".md") || target === "content/api/api.json") {
    assert.equal(record.siteEditorial?.owner, "website", `${target}: record the site-owned amendment`);
  }
}
assert.equal(api.length, manifest.apiEntries, "No unrelated API cards removed");

const origin = process.argv[2];
if (origin) {
  for (const [path, expected] of [
    ["/docs/database", ["Configure a SQL database", "OP77_DATABASE_CONNECTION", "sql_probe"]],
    ["/docs/database.md", ["# Configure a SQL database", "MySQL.scalar.await"]],
    ["/docs/resource-runtime", ["remote-pages-external-content-and-hot-reload", "96 MiB"]],
    ["/docs/resource-runtime.md", ["Ctrl + wheel", "6 ms per client host"]],
    ["/docs/api/client/open77-webui.md", ["HTTP(S)", "remote WebUI"]],
    ["/sitemap.xml", ["/docs/database"]],
    ["/llms.txt", ["/docs/database"]],
  ]) {
    const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, path);
    const body = await response.text();
    for (const value of expected) assert.ok(body.includes(value), `${path}: ${value}`);
  }
}
console.log(`WebUI, sandbox and SQL documentation verified${origin ? " (including HTML, Markdown and discovery routes)" : " (content)"}.`);
