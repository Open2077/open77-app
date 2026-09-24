/** Prometheus guide contracts and optional served HTML/Markdown discovery. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertEditorialProse } from "./docs-editorial.mjs";

const guide = await readFile("content/guides/metrics.md", "utf8");
assertEditorialProse(guide, "metrics.md");
const nav = JSON.parse(await readFile("content/docs/meta.json", "utf8"));
const pages = nav.sections.flatMap((section) => section.pages);
assert.equal(pages.filter((page) => page.slug === "metrics").length, 1);
assert.ok(nav.sections.find((section) => section.id === "server-administration")
  .pages.some((page) => page.slug === "metrics" && page.kind === "guide" && page.source === "authored"));

for (const token of [
  "GET /metrics", "disabled by default", "http://127.0.0.1:11783",
  "OP77_METRICS_TOKEN", "Authorization: Bearer", "32–256", "refuses startup without a token",
  "Bearer authentication is not encryption", "credentials_file", "scrape_interval: 5s",
  "Prometheus stores the history", "does not persist a time series", "1 Hz",
  "open77_players_ready", "process_resident_memory_bytes", "process_cpu_seconds_total",
  "histogram_quantile", "open77_tick_duration_seconds_bucket", "open77_exporter_render_timestamp_seconds",
  "resource SQL bridge", "not CPU", "not** total NIC bandwidth", "cannot be inferred",
  "permissions { 'metrics.write' }", "Open77.metrics.increment", "Open77.metrics.gauge",
  "Open77.metrics.observe", "false, reason", "metrics_disabled", "32 names per resource",
  "512", "32,768", "There are deliberately no caller-supplied labels", "promtool check metrics",
]) assert.ok(guide.includes(token), `Missing contract: ${token}`);

// The root fragment is meant to be merged into an existing server.jsonc.
const config = JSON.parse(`{${guide.match(/```json\s+([\s\S]*?)```/)[1]}}`);
assert.deepEqual(config.metrics, { enabled: true, listenUrl: "http://127.0.0.1:11783", tokenEnvironmentVariable: "OP77_METRICS_TOKEN" });
for (const [, href] of guide.matchAll(/\]\(([^)]+)\)/g)) {
  if (href.startsWith("#")) continue;
  assert.ok(href.startsWith("/docs/") && pages.some((page) => page.slug === href.slice(6).split("#")[0]), `Broken guide link: ${href}`);
}
assert.ok((await readFile("content/guides/rcon.md", "utf8")).includes("/docs/metrics"));

if (process.argv[2]) {
  for (const [route, tokens] of [
    ["/docs/metrics", ["Prometheus metrics", 'id="enable-the-endpoint"', 'id="useful-queries"', 'id="custom-gameplay-counters-from-lua"', 'href="/docs/metrics.md"']],
    ["/docs/metrics.md", ["Open77.metrics.increment", "OP77_METRICS_TOKEN", "histogram_quantile"]],
    ["/docs", ["/docs/metrics", "Prometheus metrics"]],
    ["/docs/rcon", ["/docs/metrics"]],
    ["/sitemap.xml", ["/docs/metrics"]],
    ["/llms.txt", ["/docs/metrics"]],
  ]) {
    const response = await fetch(new URL(route, process.argv[2]), { signal: AbortSignal.timeout(60000) });
    assert.equal(response.status, 200, route);
    const body = await response.text();
    for (const token of tokens) assert.ok(body.includes(token), `${route}: ${token}`);
    console.log(`served OK ${route}`);
  }
}
console.log("Prometheus documentation: configuration, security, metrics, Lua API, navigation and links verified.");
