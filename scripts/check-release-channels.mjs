/** Offline regression: mutable CDN pointers, channel isolation and tab refresh. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
async function moduleUrl(file, replacements = {}) {
  let code = ts.transpileModule(await readFile(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  for (const [from, to] of Object.entries(replacements)) code = code.replaceAll(JSON.stringify(from), JSON.stringify(to));
  return `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
}
const cdnUrl = await moduleUrl("src/lib/cdn.ts");
const cdn = await import(cdnUrl);
const { fetchLatestServerRelease } = await import(await moduleUrl("src/lib/server-release.ts", { "@/lib/cdn": cdnUrl }));
const { fetchLatestLauncherRelease } = await import(await moduleUrl("src/lib/launcher-release.ts", { "@/lib/cdn": cdnUrl }));

function server(version) {
  return { version, publishedAt: "2026-09-12T20:26:15Z", builds: Object.fromEntries([
    ["windows-x64", "zip"], ["linux-x64", "tar.gz"],
  ].map(([platform, ext]) => [platform, {
    url: `${cdn.CDN_URL}/server/${version}/open77-server-${version}-${platform}.${ext}`,
    archiveSha256: platform === "windows-x64" ? "a".repeat(64) : "b".repeat(64),
    size: 54_944_808,
  }])) };
}
let current = server("2.31.13+op77.58"), unavailable = false, invalidJson = false, headFails = false;
let headCalls = 0;
const launcher = { version: "2.31.13+op77.54", url: `${cdn.CDN_URL}/launcher/2.31.13+op77.54/Open77Launcher.exe`, sha256: "c".repeat(64) };
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  if (options.method === "HEAD") {
    headCalls++;
    assert.ok(options.signal instanceof AbortSignal);
    return new Response(null, { status: headFails ? 503 : 200, headers: { "Content-Length": "123456", "Last-Modified": "Sat, 12 Sep 2026 00:00:00 GMT" } });
  }
  assert.equal(options.cache, "no-store", "latest pointer must bypass persistent Next data cache");
  assert.equal(options.next?.revalidate, undefined, "no conflicting revalidation options");
  assert.equal(options.headers["Cache-Control"], "no-cache");
  assert.ok(options.signal instanceof AbortSignal, "bounded CDN timeout");
  if (unavailable) throw new Error("Synthetic CDN outage");
  if (invalidJson) return new Response("invalid json");
  assert.ok([`${cdn.CDN_URL}/server/latest.json`, `${cdn.CDN_URL}/launcher/latest.json`].includes(url));
  return Response.json(url.includes("/server/") ? current : launcher,
    { headers: { "Last-Modified": "Sun, 13 Sep 2026 00:00:00 GMT" } });
};
try {
  let result = await fetchLatestServerRelease();
  assert.equal(result.version, "2.31.13+op77.58");
  current = server("2.31.13+op77.59");
  result = await fetchLatestServerRelease();
  assert.equal(result.version, current.version, "next request follows publication without rebuild");
  assert.equal(result.publishedAtUtc, "2026-09-12T20:26:15.000Z", "publication time beats pointer upload timestamp");
  assert.equal(headCalls, 0, "current pointer includes size; no extra HEAD requests needed");
  for (const build of result.builds) {
    assert.ok(build.url.includes(current.version));
    assert.equal(build.sizeBytes, 54_944_808);
    assert.equal(build.archiveSha256, current.builds[build.platform].archiveSha256);
  }
  assert.equal((await fetchLatestLauncherRelease()).version, launcher.version, "server releases do not change launcher version");
  assert.equal(headCalls, 1);
  for (const badUrl of [launcher.url, `${cdn.CDN_URL}/server/2.31.13+op77.58/old.zip`, "https://example.invalid/server.zip", "javascript:alert(1)"]) {
    current = server("2.31.13+op77.59");
    current.builds["windows-x64"].url = badUrl;
    result = await fetchLatestServerRelease();
    assert.equal(result.builds[0].url, null, "no cross-channel, cross-version or external download");
    assert.equal(result.builds[0].archiveSha256, null);
    assert.ok(result.builds[1].url, "valid platform remains available");
  }
  current = { version: "2.31.13+op77.1", url: `${cdn.CDN_URL}/server/2.31.13+op77.1/server.zip`, zipSha256: "d".repeat(64) };
  result = await fetchLatestServerRelease();
  assert.equal(result.builds[0].url, current.url, "legacy Windows pointer supported");
  assert.equal(result.builds[1].url, null);
  current = { version: "2.31.13+op77.59" };
  assert.equal(await fetchLatestServerRelease(), null, "never invent an archive URL");
  for (const malformed of [null, [], {}, { version: "", builds: {} }, { version: "x", builds: [] }]) {
    current = malformed;
    assert.equal(await fetchLatestServerRelease(), null);
  }
  unavailable = true;
  assert.equal(await fetchLatestServerRelease(), null, "no stale server fallback on CDN outage");
  assert.equal(await fetchLatestLauncherRelease(), null);
  unavailable = false;
  invalidJson = true;
  assert.equal(await fetchLatestServerRelease(), null);
  invalidJson = false;
  current = server("2.31.13+op77.60");
  assert.equal((await fetchLatestServerRelease()).version, current.version, "recovers on next check");
  headFails = true;
  assert.equal((await fetchLatestLauncherRelease()).url, launcher.url, "optional size outage does not hide valid release");
} finally { globalThis.fetch = realFetch; }

// Exercise the real refresh effect using deterministic browser/time adapters.
const saved = new Map(["window", "document", "navigator"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const realNow = Date.now;
let now = 0, cleanup, tick, requests = 0, cleared = false;
Date.now = () => now;
const browser = new EventTarget(), document = new EventTarget();
document.visibilityState = "visible";
browser.setInterval = (fn, ms) => { assert.equal(ms, 60_000); tick = fn; return 1; };
browser.clearInterval = id => { assert.equal(id, 1); cleared = true; };
Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
Object.defineProperty(globalThis, "document", { configurable: true, value: document });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { onLine: true } });
globalThis.__releaseTest = {
  effect: fn => { cleanup = fn(); },
  router: { refresh: () => requests++ },
};
const fakeReact = "data:text/javascript," + encodeURIComponent("export const useEffect=globalThis.__releaseTest.effect; export const useTransition=()=>[false,fn=>fn()];");
const fakeRouter = "data:text/javascript," + encodeURIComponent("export const useRouter=()=>globalThis.__releaseTest.router;");
try {
  const { ReleaseRefresh } = await import(await moduleUrl("src/components/release-refresh.tsx", {
    react: fakeReact, "next/navigation": fakeRouter,
    "react/jsx-runtime": pathToFileURL(require.resolve("react/jsx-runtime")).href,
  }));
  const element = ReleaseRefresh();
  now = 60_000; tick(); assert.equal(requests, 1);
  document.visibilityState = "hidden";
  now += 60_000; tick(); assert.equal(requests, 1, "no hidden tab polling");
  document.visibilityState = "visible";
  document.dispatchEvent(new Event("visibilitychange")); assert.equal(requests, 2);
  browser.dispatchEvent(new Event("focus")); assert.equal(requests, 2, "deduplicate focus + visibility");
  navigator.onLine = false; now += 60_000; tick(); assert.equal(requests, 2);
  navigator.onLine = true; browser.dispatchEvent(new Event("online")); assert.equal(requests, 3);
  now += 10_000; browser.dispatchEvent(new Event("pageshow")); assert.equal(requests, 4);
  element.props.children[1].props.onClick(); assert.equal(requests, 5, "manual retry");
  cleanup(); assert.ok(cleared);
  now += 60_000; browser.dispatchEvent(new Event("focus")); assert.equal(requests, 5, "listeners removed on unmount");
} finally {
  Date.now = realNow;
  delete globalThis.__releaseTest;
  for (const [key, descriptor] of saved) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
}
for (const page of ["host", "download"]) {
  const source = await readFile(`src/app/${page}/page.tsx`, "utf8");
  assert.match(source, /await connection\(\)/, `${page}: request-time rendering`);
  assert.doesNotMatch(source, /export const revalidate\s*=\s*[1-9]/, `${page}: no stale ISR page`);
  assert.match(source, /<ReleaseRefresh/);
}
console.log("PASS: independent live release channels; publication changes; URLs/dates/sizes; malformed/outage recovery; visible-tab/focus/reconnect/manual refresh; cleanup.");
