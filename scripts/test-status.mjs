import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SERVICES, artifactUrl, boundedBody, probe } from "../ops/status-monitor/probes.mjs";
import { DAY, MINUTE, openStore, prune, record, snapshot, validateMaintenance } from "../ops/status-monitor/store.mjs";
import { currentState, isStale, overallState, parseSnapshot, percent, statistics } from "../src/lib/status/model.ts";

const now = Date.parse("2026-09-23T12:00:10Z");
const good = { state: "operational", latencyMs: 100, detail: "Check passed" };
const bad = { state: "outage", latencyMs: null, detail: "HTTP 503" };
function seed(db, at = now) { for (const service of SERVICES) record(db, service.id, good, at); }
const json = (data, status = 200) => new Response(JSON.stringify(data), { status });
const partial = () => new Response(new Uint8Array(4096), { status: 206, headers: { "Content-Range": "bytes 0-4095/200000" } });

test("fresh install has 90 unknown days, never synthetic uptime", () => {
  const db = openStore(":memory:");
  try {
    const feed = snapshot(db, { now });
    assert.ok(parseSnapshot(feed));
    assert.equal(feed.startedAt, null);
    assert.equal(feed.services.length, 7);
    for (const service of feed.services) {
      assert.equal(service.state, "unknown");
      assert.equal(service.history.length, 90);
      assert.equal(service.latency.length, 288);
      assert.equal(statistics(service.history, 90).availability, null);
      assert.equal(statistics(service.history, 90).coverage, 0);
    }
  } finally { db.close(); }
});

test("checks persist across process restart; duplicate minute slots do not inflate uptime", () => {
  const folder = mkdtempSync(join(tmpdir(), "open77-status-test-"));
  try {
    let db = openStore(join(folder, "history.sqlite"));
    seed(db);
    record(db, "master", bad, now + 1000);
    db.close();
    db = openStore(join(folder, "history.sqlite"));
    const feed = snapshot(db, { now });
    assert.ok(parseSnapshot(feed));
    const stats = statistics(feed.services[0].history, 90);
    assert.equal(stats.checked, 1);
    assert.equal(stats.availability, 100);
    assert.ok(stats.coverage < 1);
    assert.equal(feed.startedAt, "2026-09-23T12:00:00.000Z");
    db.close();
  } finally { rmSync(folder, { recursive: true, force: true }); }
});

test("incident opens after two failures, survives restart logic, closes after two successes", () => {
  const db = openStore(":memory:");
  try {
    record(db, "master", bad, now);
    assert.equal(snapshot(db, { now }).incidents.length, 0);
    record(db, "master", bad, now + MINUTE);
    record(db, "master", bad, now + 2 * MINUTE);
    let feed = snapshot(db, { now: now + 2 * MINUTE });
    assert.equal(feed.incidents.length, 1);
    assert.equal(feed.incidents[0].resolvedAt, null);
    record(db, "master", good, now + 3 * MINUTE);
    assert.equal(snapshot(db, { now: now + 3 * MINUTE }).incidents[0].resolvedAt, null);
    record(db, "master", good, now + 4 * MINUTE);
    feed = snapshot(db, { now: now + 4 * MINUTE });
    assert.equal(feed.incidents[0].resolvedAt, "2026-09-23T12:04:00.000Z");
    assert.equal(statistics(feed.services[0].history, 7).availability, 40);
  } finally { db.close(); }
});

test("monitoring gaps do not count as consecutive failures or fabricate latency", () => {
  const db = openStore(":memory:");
  try {
    record(db, "master", bad, now);
    record(db, "master", bad, now + 10 * MINUTE);
    record(db, "master", good, now + 20 * MINUTE);
    const feed = snapshot(db, { now: now + 20 * MINUTE });
    assert.equal(feed.incidents.length, 0);
    assert.equal(feed.services[0].latency.filter((point) => point.ms !== null).length, 1);
    assert.equal(statistics(feed.services[0].history, 30).checked, 3);
  } finally { db.close(); }
});

test("stale feeds, stale individual services, missing services and future clocks cannot be green", () => {
  const db = openStore(":memory:");
  try {
    seed(db);
    const feed = snapshot(db, { now });
    assert.equal(currentState(feed.services[0], feed, now), "operational");
    assert.equal(currentState(feed.services[0], feed, now + 181000), "unknown");
    assert.equal(currentState(feed.services[0], feed, now - 120000), "unknown");
    const afterGap = snapshot(db, { now: now + 181000 });
    assert.equal(afterGap.services[0].state, "unknown");
    assert.ok(isStale(feed, now + 181000));
    assert.equal(overallState([]), "unknown");
    assert.equal(overallState(["operational", "unknown"]), "unknown");
    assert.equal(overallState(["outage", "unknown"]), "outage");
    assert.equal(parseSnapshot({ ...feed, services: feed.services.slice(1) }), null);
    assert.equal(parseSnapshot({ ...feed, services: Array(7).fill(feed.services[0]) }), null);
    const corrupt = structuredClone(feed);
    corrupt.services[0].history[0].available = 1;
    assert.equal(parseSnapshot(corrupt), null);
    assert.equal(percent(99.99999), "99.99%");
  } finally { db.close(); }
});

test("retention removes old checks but preserves collection start and open incidents", () => {
  const db = openStore(":memory:");
  try {
    record(db, "master", bad, now - 100 * DAY);
    record(db, "master", bad, now - 100 * DAY + MINUTE);
    record(db, "directory", good, now);
    prune(db, now);
    const feed = snapshot(db, { now });
    assert.equal(statistics(feed.services[0].history, 90).checked, 0);
    assert.equal(feed.incidents.length, 1);
    assert.ok(Date.parse(feed.startedAt) < now - 90 * DAY);
  } finally { db.close(); }
});

test("maintenance is explicit, bounded, validated and does not erase failed checks", () => {
  const notice = { id: "cdn-maintenance", title: "CDN maintenance", message: "A short interruption is expected.", services: ["client"], startsAt: "2026-09-23T11:00:00Z", endsAt: "2026-09-23T13:00:00Z" };
  assert.equal(validateMaintenance([notice]).length, 1);
  assert.throws(() => validateMaintenance([notice, notice]));
  assert.throws(() => validateMaintenance([{ ...notice, services: ["secret"] }]));
  assert.throws(() => validateMaintenance([{ ...notice, endsAt: notice.startsAt }]));
  const db = openStore(":memory:");
  try {
    record(db, "client", bad, now);
    const feed = snapshot(db, { now, maintenance: [notice] });
    assert.ok(parseSnapshot(feed));
    assert.equal(feed.services.find((item) => item.id === "client").state, "outage");
  } finally { db.close(); }
});

test("public endpoint checks reject HTML errors, unhealthy payloads and catalogue shape changes", async () => {
  assert.equal((await probe(SERVICES[0], async () => json({ status: "healthy" }))).state, "operational");
  assert.equal((await probe(SERVICES[0], async () => json({ status: "unhealthy" }))).state, "outage");
  assert.equal((await probe(SERVICES[0], async () => new Response("<html>Oops</html>"))).state, "outage");
  assert.equal((await probe(SERVICES[1], async () => json({ items: [] }))).state, "operational");
  assert.equal((await probe(SERVICES[1], async () => json({}))).state, "outage");
  assert.equal((await probe(SERVICES[5], async () => new Response("<!doctype html><title>OPEN//77</title>"))).state, "operational");
});

test("CDN probes follow only same-origin redirects and validate actual partial bytes", async () => {
  let calls = 0;
  const fetcher = async (url, options) => {
    calls++;
    if (String(url).endsWith("latest.json")) return json({ version: "1.0", url: "https://cdn.open2077.net/launcher/1.0/app.exe" });
    assert.equal(options.headers.Range, "bytes=0-4095");
    if (!String(url).endsWith(".op77.bin")) return new Response(null, { status: 307, headers: { location: String(url) + ".op77.bin" } });
    return partial();
  };
  assert.equal((await probe(SERVICES[3], fetcher)).state, "operational");
  assert.equal(calls, 3);
  const noRange = async (url) => String(url).endsWith("latest.json") ? json({ version: "1", url: "https://cdn.open2077.net/launcher/1/app.exe" }) : new Response("not an exe");
  assert.equal((await probe(SERVICES[3], noRange)).state, "outage");
  const short = async (url) => String(url).endsWith("latest.json") ? json({ version: "1", url: "https://cdn.open2077.net/launcher/1/app.exe" }) : new Response("short", { status: 206, headers: { "content-range": "bytes 0-4095/9000" } });
  assert.equal((await probe(SERVICES[3], short)).detail, "Incomplete download");
});

test("download URLs cannot redirect checks to arbitrary hosts, paths or credentials", () => {
  for (const url of ["http://cdn.open2077.net/launcher/1/a", "https://127.0.0.1/server/1/a", "https://cdn.open2077.net@evil.test/mod/1/a", "https://cdn.open2077.net/server/1/a?token=secret", "https://cdn.open2077.net/launcher/../latest.json"]) assert.throws(() => artifactUrl(url));
  assert.equal(artifactUrl("https://cdn.open2077.net/mod/2.31+op77.90/archive/pc/mod/Open77.archive.op77.bin").hostname, "cdn.open2077.net");
});

test("both server platforms are tested, not only the metadata pointer", async () => {
  const requested = [];
  const result = await probe(SERVICES[4], async (url) => {
    if (String(url).endsWith("latest.json")) return json({ version: "1", builds: { "windows-x64": { url: "https://cdn.open2077.net/server/1/windows.zip" }, "linux-x64": { url: "https://cdn.open2077.net/server/1/linux.tar.gz" } } });
    requested.push(String(url));
    return partial();
  });
  assert.equal(result.state, "operational");
  assert.equal(requested.length, 2);
});

test("response size and timeout are bounded; underlying errors never leak", async () => {
  await assert.rejects(boundedBody(new Response("123456"), 5));
  const hung = async (_url, { signal }) => new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
  const keepAlive = setTimeout(() => {}, 1000);
  const result = await probe(SERVICES[0], hung, 20);
  clearTimeout(keepAlive);
  assert.equal(result.state, "outage");
  assert.match(result.detail, /timed out/);
  const error = await probe(SERVICES[0], async () => { throw new Error("private connection details and secret"); });
  assert.doesNotMatch(error.detail, /secret/);
});
