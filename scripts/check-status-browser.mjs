// Deterministic browser acceptance. Fixtures are intercepted only in this isolated
// browser; nothing is uploaded to the public monitoring history.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SERVICES } from "../ops/status-monitor/probes.mjs";
import { MINUTE, openStore, record, snapshot } from "../ops/status-monitor/store.mjs";

const origin = process.argv[2] ?? "http://127.0.0.1:3218";
if (!["127.0.0.1", "localhost"].includes(new URL(origin).hostname)) throw new Error("Browser tests must target a local build");
const port = 9346;
let chrome;
for (const candidate of ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"]) {
  try { await access(candidate); chrome = candidate; break; } catch { /* next */ }
}
if (!chrome) throw new Error("Chrome/Edge not found");
const profile = await mkdtemp(join(tmpdir(), "open77-status-browser-"));
const browser = spawn(chrome, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "about:blank"], { windowsHide: true, stdio: "ignore" });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
let id = 0;
const pending = new Map();
let sessionId;
let feed;
let apiCode = 200;
const errors = [];
function send(method, params = {}, scoped = true) {
  const callId = ++id;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(callId); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(callId, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id: callId, method, params, ...(scoped && sessionId ? { sessionId } : {}) }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function waitFor(expression) {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await evaluate(expression)) return;
    await sleep(100);
  }
  throw new Error(`Condition not met: ${expression}`);
}
const clickRefresh = () => evaluate("[...document.querySelectorAll('main button')].find(b => b.textContent.includes('Refresh status')).click()");
async function navigate() {
  await send("Page.navigate", { url: `${origin}/status` });
  await waitFor("document.querySelector('main') && !document.querySelector('main').textContent.includes('Connecting to the monitor')");
}

try {
  let endpoint;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { endpoint = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl; break; } catch { await sleep(100); }
  }
  if (!endpoint) throw new Error("Browser did not start");
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const item = pending.get(message.id);
      if (!item) return;
      clearTimeout(item.timeout); pending.delete(message.id);
      if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result);
    } else if (message.method === "Fetch.requestPaused") {
      void send("Fetch.fulfillRequest", { requestId: message.params.requestId, responseCode: apiCode,
        responseHeaders: [{ name: "Content-Type", value: "application/json" }, { name: "Cache-Control", value: "no-store" }],
        body: Buffer.from(JSON.stringify(apiCode === 200 ? feed : { error: "status_unavailable" })).toString("base64") }).catch((error) => errors.push(error.message));
    } else if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
    else if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") errors.push(JSON.stringify(message.params.args));
  });
  const target = await send("Target.createTarget", { url: "about:blank" }, false);
  sessionId = (await send("Target.attachToTarget", { targetId: target.targetId, flatten: true }, false)).sessionId;
  await send("Runtime.enable"); await send("Page.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/status*", requestStage: "Request" }] });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  const db = openStore(":memory:");
  const now = Date.now();
  for (let minute = 120; minute >= 0; minute--) for (const service of SERVICES) record(db, service.id, { state: "operational", latencyMs: 180 + minute % 10 * 18, detail: "Check passed" }, now - minute * MINUTE);
  feed = snapshot(db, { now });
  await navigate();
  await waitFor("document.body.textContent.includes('All systems operational')");
  assert.equal(await evaluate("document.querySelectorAll('main article').length"), 7);
  assert.equal(await evaluate("document.querySelectorAll('[aria-label*=\"90-day availability\"] button').length"), 630);
  await evaluate("[...document.querySelectorAll('main button')].find(b => b.textContent === '7 days').click()");
  await waitFor("document.querySelectorAll('[aria-label*=\"7-day availability\"] button').length === 49");
  await evaluate("document.querySelector('[aria-label*=\"7-day availability\"] button:last-child').click()");
  assert.ok(await evaluate("document.querySelector('main').textContent.includes('failed ·')"));
  await mkdir(".shots", { recursive: true });
  await writeFile(".shots/status-desktop.png", Buffer.from((await send("Page.captureScreenshot", { captureBeyondViewport: true })).data, "base64"));

  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await sleep(300);
  assert.ok(await evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), "Mobile horizontal overflow");
  await writeFile(".shots/status-mobile.png", Buffer.from((await send("Page.captureScreenshot", { captureBeyondViewport: true })).data, "base64"));

  feed = { ...feed, generatedAt: new Date(now - 300000).toISOString() };
  await clickRefresh();
  await waitFor("document.body.textContent.includes('Monitoring data is out of date.')");
  assert.ok(await evaluate("document.body.textContent.includes('Awaiting fresh monitoring data')"));

  apiCode = 503;
  await clickRefresh();
  await waitFor("!document.querySelector('main button').disabled");
  assert.equal(await evaluate("document.querySelectorAll('main article').length"), 7, "Last known history is preserved");
  await navigate();
  await waitFor("document.body.textContent.includes('The monitoring feed could not be refreshed.')");
  assert.ok(!await evaluate("document.body.textContent.includes('All systems operational')"));

  apiCode = 200;
  feed = snapshot(db, { now: Date.now() });
  feed.services[0].state = "outage";
  feed.incidents = [{ id: "test-only", service: "master", startedAt: new Date(now - MINUTE).toISOString(), detectedAt: new Date(now).toISOString(), resolvedAt: null, detail: "HTTP 503" }];
  feed.maintenance = [{ id: "test-only", title: "Test maintenance", message: "Isolated browser fixture, not a real incident.", startsAt: new Date(now + MINUTE).toISOString(), endsAt: new Date(now + 3600000).toISOString(), services: ["master"] }];
  await clickRefresh();
  await waitFor("document.body.textContent.includes('A service disruption was detected')");
  assert.ok(await evaluate("document.body.textContent.includes('Recovery not confirmed') && document.body.textContent.includes('Test maintenance')"));
  db.close();
  assert.deepEqual(errors, [], "Browser errors");
  console.log("Status browser acceptance passed: desktop/mobile, periods, day details, unknown/stale/error, retained history, incidents, maintenance and recovery from failed fetch.");
} finally {
  if (socket?.readyState === WebSocket.OPEN) { await send("Browser.close", {}, false).catch(() => {}); socket.close(); }
  browser.kill();
  for (const item of pending.values()) clearTimeout(item.timeout);
}
