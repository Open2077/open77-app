// Exercise actual pointer hit testing with a production-sized directory. All
// account/API traffic is fulfilled inside this isolated browser, including PUTs.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const origin = process.argv[2] ?? "http://127.0.0.1:3132";
const port = 9363;
let chrome;
for (const candidate of ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"]) {
  try { await access(candidate); chrome = candidate; break; } catch { /* next */ }
}
assert.ok(chrome, "Chrome/Chromium must be installed");
const profile = await mkdtemp(join(tmpdir(), "open77-admin-servers-"));
const browser = spawn(chrome, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "about:blank"], { windowsHide: true, stdio: "ignore" });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket, sessionId, id = 0;
const pending = new Map(), errors = [], writes = [];
let shrink = false;
const rows = Array.from({ length: 1350 }, (_, i) => ({
  serverId: `server-${String(i).padStart(4, "0")}`, name: `Server ${String(i).padStart(4, "0")}`,
  connectEndpoint: "example.invalid:7777", connectedPlayers: 0, maximumPlayers: 64,
  lastHeartbeatUtc: new Date().toISOString(), ownerEmail: "test@example.invalid", online: i < 200,
  hidden: false, official: false, featured: false, featuredOrder: 0, directoryRevision: 0, upcoming: null,
}));
function send(method, params = {}, scoped = true) {
  const call = ++id;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(call); reject(Error(`CDP timeout: ${method}`)); }, 20000);
    pending.set(call, { resolve, reject, timer });
    socket.send(JSON.stringify({ id: call, method, params, ...(scoped && sessionId ? { sessionId } : {}) }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function waitFor(expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(expression)) return;
    await sleep(100);
  }
  throw Error(`Condition not met: ${expression}`);
}
async function fixture({ requestId, request }) {
  const path = new URL(request.url).pathname;
  let data = [];
  if (path.endsWith("/accounts/me")) data = { accountId: "fixture", email: "test@example.invalid", emailVerified: true, displayName: "Fixture admin", role: "admin", identities: [] };
  else if (path.endsWith("/admin/servers")) data = shrink ? rows.slice(0, 30) : rows;
  else if (request.method === "PUT" && /\/admin\/servers\/server-\d+\/directory$/.test(path)) {
    const row = rows.find(server => path.includes(server.serverId));
    const body = JSON.parse(request.postData);
    writes.push(body);
    Object.assign(row, body, { directoryRevision: row.directoryRevision + 1 });
    data = row;
  } else if (!["GET", "OPTIONS"].includes(request.method)) throw Error(`Unexpected write: ${path}`);
  await send("Fetch.fulfillRequest", {
    requestId, responseCode: request.method === "OPTIONS" ? 204 : 200,
    responseHeaders: [
      { name: "Content-Type", value: "application/json" },
      { name: "Access-Control-Allow-Origin", value: origin },
      { name: "Access-Control-Allow-Headers", value: "Authorization,Content-Type" },
      { name: "Access-Control-Allow-Methods", value: "GET,PUT,OPTIONS" },
    ],
    body: request.method === "OPTIONS" ? "" : Buffer.from(JSON.stringify(data)).toString("base64"),
  });
}
const field = label => `document.getElementById([...document.querySelectorAll('label')].find(l=>l.htmlFor&&l.textContent===${JSON.stringify(label)})?.htmlFor)`;
const button = label => `[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===${JSON.stringify(label)})`;
async function click(expression) {
  await evaluate(`(${expression}).scrollIntoView({block:'center',inline:'center',behavior:'instant'})`);
  await sleep(250);
  const point = await evaluate(`(()=>{const e=${expression},b=e.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2;return{x,y,reachable:e.contains(document.elementFromPoint(x,y)),hit:document.elementFromPoint(x,y)?.outerHTML.slice(0,250)}})()`);
  assert.ok(point.reachable, `Control is covered: ${JSON.stringify(point)}`);
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
    await send("Input.dispatchMouseEvent", { type, x: point.x, y: point.y, button: type === "mouseMoved" ? "none" : "left", clickCount: type === "mouseMoved" ? 0 : 1 });
  }
}
async function select(label, value) {
  const expression = field(label);
  await click(expression);
  // Close the native menu, then emit the same selection change deterministically.
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await evaluate(`(()=>{const e=${expression};Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
}
async function search(value) {
  await click(field("Find a server"));
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", modifiers: 2, windowsVirtualKeyCode: 65 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", modifiers: 2, windowsVirtualKeyCode: 65 });
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
  if (value) await send("Input.insertText", { text: value });
}
try {
  let endpoint;
  for (let n = 0; n < 60; n++) {
    try { endpoint = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl; break; } catch { await sleep(100); }
  }
  assert.ok(endpoint);
  socket = new WebSocket(endpoint);
  await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const entry = pending.get(message.id);
      if (!entry) return;
      clearTimeout(entry.timer); pending.delete(message.id);
      if (message.error) entry.reject(Error(JSON.stringify(message.error))); else entry.resolve(message.result);
    } else if (message.method === "Fetch.requestPaused") void fixture(message.params).catch(error => errors.push(error.message));
    else if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
  });
  const target = await send("Target.createTarget", { url: "about:blank" }, false);
  sessionId = (await send("Target.attachToTarget", { targetId: target.targetId, flatten: true }, false)).sessionId;
  await send("Runtime.enable"); await send("Page.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*://*/api/*" }] });
  const session = { token: "synthetic-fixture-only", expiresAtUtc: "2099-01-01T00:00:00Z", accountId: "fixture", displayName: "Fixture admin", role: "admin", emailVerified: true };
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `localStorage.setItem('open77.session',${JSON.stringify(JSON.stringify(session))})` });
  await send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `${origin}/admin/servers` });
  await waitFor("document.querySelectorAll('tbody tr').length===25&&!document.querySelector('tbody input').disabled");
  assert.ok(await evaluate("document.body.textContent.includes('page 1 of 54')"));
  await click("document.querySelector('tbody label')");
  await waitFor("document.querySelector('tbody input').checked");
  await click(button("Next"));
  await waitFor("document.querySelector('tbody').textContent.includes('Server 0025')");
  await click(button("Previous"));
  await waitFor("document.querySelector('tbody input').checked");
  await click(button("Edit announcement"));
  await waitFor("document.body.textContent.includes('Close editor')");
  await click(button("Close editor"));
  await waitFor("document.querySelectorAll('tbody tr').length===25");
  await click(button("Save changes"));
  await waitFor("document.body.textContent.includes('is hidden from public lists')");
  assert.equal(writes.length, 1);
  assert.equal(writes[0].hidden, true);
  await select("Page", "54");
  await waitFor("document.querySelector('tbody').textContent.includes('Server 1325')");
  await search("Server 1349");
  await waitFor("document.querySelectorAll('tbody tr').length===1");
  assert.ok(await evaluate("document.querySelector('tbody').textContent.includes('Server 1349')"));
  await search("missing-server");
  await waitFor("document.body.textContent.includes('No servers match this view.')");
  await search("");
  await waitFor("document.querySelectorAll('tbody tr').length===25");
  await select("Show", "online");
  await waitFor("document.body.textContent.includes('page 1 of 8')");
  await select("Show", "offline");
  await waitFor("document.body.textContent.includes('page 1 of 46')");
  await select("Show", "all");
  await select("Rows per page", "100");
  await waitFor("document.querySelectorAll('tbody tr').length===100");
  await select("Page", "14");
  await waitFor("document.querySelectorAll('tbody tr').length===50");
  shrink = true;
  await click(button("Refresh"));
  await waitFor("document.querySelectorAll('tbody tr').length===30&&!document.querySelector('tbody input').disabled");
  assert.ok(await evaluate("document.body.textContent.includes('page 1 of 1')"));
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await click(button("Edit announcement"));
  await waitFor("document.body.textContent.includes('Close editor')");
  assert.deepEqual(errors, []);
  process.stdout.write("PASS: 1,350 servers, real pointer clicks, pagination/jump/size, global search, online/offline filters, retained drafts, save, shrinking refresh, mobile editor.\n");
} finally {
  if (socket?.readyState === WebSocket.OPEN) { await send("Browser.close", {}, false).catch(() => {}); socket.close(); }
  browser.kill();
  for (const entry of pending.values()) clearTimeout(entry.timer);
}
