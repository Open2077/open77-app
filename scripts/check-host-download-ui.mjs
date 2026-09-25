/** Real Edge + synthetic account responses. Never uses production credentials. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const origin = process.argv[2] ?? "http://127.0.0.1:3037";
const configuredCdn = (process.env.NEXT_PUBLIC_OP77_CDN_URL ?? "https://cdn.open77.dev").replace(/\/$/, "");
const cdn = configuredCdn === "https://cdn.open2077.net" ? "https://cdn.open77.dev" : configuredCdn;
const downloadUrl = url => cdn === "https://cdn.open77.dev"
  ? url.replace(/^https:\/\/cdn\.open2077\.net\//, "https://cdn.open77.dev/") : url;
const [serverRelease, launcherRelease] = await Promise.all(["server", "launcher"].map(async channel => {
  const response = await fetch(`${cdn}/${channel}/latest.json`, { cache: "no-store" });
  assert.equal(response.status, 200);
  return response.json();
}));
const output = path.resolve(".shots/host-download");
await fs.mkdir(output, { recursive: true });
const profile = await fs.mkdtemp(path.join(os.tmpdir(), "open77-host-ui-"));
const browser = spawn("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", [
  "--headless=new", "--disable-gpu", "--no-first-run", "--disable-background-networking",
  "--remote-debugging-port=0", "--remote-debugging-address=127.0.0.1", `--user-data-dir=${profile}`, "about:blank",
], { windowsHide: true, stdio: "ignore" });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(action) {
  const end = Date.now() + 15000;
  while (Date.now() < end) { if (await action()) return; await pause(80); }
  throw new Error("Timed out waiting for host download UI");
}
let socket;
try {
  let port;
  await waitFor(async () => {
    try { port = (await fs.readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; return !!port; }
    catch { return false; }
  });
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(t => t.type === "page").webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
  let sequence = 0;
  const pending = new Map(), errors = [];
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const waiter = pending.get(message.id); pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message)); else waiter.resolve(message.result);
    } else if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    else if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error")
      errors.push(message.params.args.map(arg => arg.value ?? arg.description).join(" "));
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  async function evaluate(expression) {
    const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  await call("Page.enable"); await call("Runtime.enable");
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `
    window.__hostTest = {mode:localStorage.getItem('host-test-mode') || 'alpha', meCalls:0};
    const account = {accountId:'11111111-2222-4333-8444-555555555555',email:'preview@example.test',
      displayName:'Preview developer',role:'user',emailVerified:true,identities:[]};
    if (__hostTest.mode === 'guest') localStorage.removeItem('open77.session');
    else localStorage.setItem('open77.session',JSON.stringify({...account,role:__hostTest.mode==='admin'?'admin':'user',
      token:'synthetic-host-ui-token',expiresAtUtc:'2036-09-11T00:00:00Z'}));
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input.url || input, location.href);
      if (!url.pathname.startsWith('/api/v1/')) return originalFetch(input, init);
      if (url.pathname !== '/api/v1/accounts/me')
        return new Response(JSON.stringify({code:'test_only'}),{status:403,headers:{'Content-Type':'application/json'}});
      __hostTest.meCalls++;
      const mode = __hostTest.mode;
      const body = mode==='failure' ? {code:'unavailable',message:'Synthetic master unavailable'}
        : mode==='expired' ? {code:'invalid_session',message:'Synthetic session expired'}
        : {...account,role:mode==='admin'?'admin':'user',alphaAccess:mode==='alpha',alphaGateActive:true};
      return new Response(JSON.stringify(body),{status:mode==='failure'?503:mode==='expired'?401:200,
        headers:{'Content-Type':'application/json'}});
    };
  ` });
  async function visit(route, mode = "alpha") {
    // First page starts with alpha; later cases select their fixture before navigation.
    if (await evaluate("location.protocol.startsWith('http')"))
      await evaluate(`localStorage.setItem('host-test-mode',${JSON.stringify(mode)})`);
    await call("Page.navigate", { url: new URL(route, origin).href });
    await waitFor(() => evaluate(`location.pathname===${JSON.stringify(route)} && document.readyState==='complete'`));
    if (errors.length) throw new Error(`Browser errors after ${route}: ${errors.join("\n")}`);
  }
  const downloadLinks = `Array.from(document.querySelectorAll('#download .host-build-cta a')).map(a=>a.href)`;
  for (const width of [1440, 390]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height:900, deviceScaleFactor:1, mobile:false });
    await visit("/download");
    await waitFor(() => evaluate(`!!document.querySelector('[data-release-channel="server"]')`));
    await waitFor(() => evaluate(`!!document.querySelector('.copy-line-btn')`));
    assert.equal(await evaluate(`document.querySelector('[data-channel-summary="server"] strong').textContent`), serverRelease.version);
    assert.equal(await evaluate(`document.querySelector('[data-channel-summary="launcher"] strong').textContent`), launcherRelease.version);
    assert.equal(await evaluate(`document.querySelector('[data-release-channel="server"]').dataset.releaseVersion`), serverRelease.version);
    assert.equal(await evaluate(`document.querySelector('[data-release-channel="launcher"]').dataset.releaseVersion`), launcherRelease.version);
    assert.ok(await evaluate(`!!document.querySelector('#server a[href="/host"]')`));
    assert.ok(await evaluate(`!document.querySelector('#server a[href*="/launcher/"]')`));
    assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`), "Download page fits viewport");
    await evaluate(`document.fonts.ready`);
    await pause(800);
    await fs.writeFile(path.join(output, `download-${width}.png`), Buffer.from((await call("Page.captureScreenshot")).data, "base64"));
    await evaluate(`document.fonts.ready.then(()=>document.getElementById('get').scrollIntoView({behavior:'instant'}))`);
    await pause(100);
    await evaluate(`window.__beforeRefreshY=scrollY;document.querySelector('[data-release-refresh] button').click()`);
    await waitFor(() => evaluate(`!document.querySelector('[data-release-refresh] button').disabled`));
    const scroll = await evaluate(`({before:window.__beforeRefreshY,after:scrollY})`);
    assert.ok(Math.abs(scroll.after-scroll.before)<2, `Refresh preserves reading position: ${JSON.stringify(scroll)}`);
    await visit("/create");
    assert.equal(await evaluate(`document.querySelector('.page-hero a[href="/host"]').textContent.trim()`), "Download server");
    assert.equal(await evaluate(`document.querySelector('#developer-alpha a[href="/host"]').textContent.trim()`), "Download server");
    assert.ok(await evaluate(`!!document.querySelector('.footer-nav a[href="/host"]')`));
    await evaluate(`document.querySelector('.page-hero a[href="/host"]').click()`);
    await waitFor(() => evaluate(`document.querySelectorAll('#download .host-build-cta a').length===2`));
    assert.equal(await evaluate("location.pathname"), "/host");
    assert.equal(await evaluate(`document.querySelector('[data-release-channel="server"]').dataset.releaseVersion`), serverRelease.version);
    assert.deepEqual((await evaluate(downloadLinks)).sort(), Object.values(serverRelease.builds).map(build => downloadUrl(build.url)).sort(), "Host offers exactly the current CDN archives");
    for (const url of await evaluate(downloadLinks)) assert.ok(url.startsWith(`${cdn}/server/`));
    assert.ok(await evaluate(`!document.querySelector('.host-locked')`), "Approved non-admin sees downloads");
    assert.ok(await evaluate("__hostTest.meCalls > 0"), "Approval comes from a fresh /me response");
    await evaluate(`document.getElementById('download').scrollIntoView()`);
    await pause(150);
    assert.ok(await evaluate(`Array.from(document.querySelectorAll('.host-build-cta a')).every(a=>{
      const r=a.getBoundingClientRect(); return r.width>0 && r.left>=0 && r.right<=innerWidth+1;
    })`), "Download buttons fit viewport");
    await fs.writeFile(path.join(output, `approved-${width}.png`), Buffer.from((await call("Page.captureScreenshot")).data, "base64"));
  }
  await visit("/account");
  await waitFor(() => evaluate(`!!document.querySelector('[data-server-download] a[href="/host"]')`));
  for (const mode of ["member", "guest", "failure", "expired", "admin"]) {
    await visit("/host", mode);
    if (mode === "admin") await waitFor(() => evaluate(`document.querySelectorAll('#download .host-build-cta a').length===2`));
    else {
      await waitFor(() => evaluate(`!!document.querySelector('.host-locked')`));
      assert.deepEqual(await evaluate(downloadLinks), [], `${mode} must not see archive buttons`);
      if (mode === "failure") {
        assert.ok(await evaluate(`document.querySelector('.host-locked').textContent.includes('Unable to verify')`));
        await evaluate(`__hostTest.mode='alpha';document.querySelector('.host-locked button').click()`);
        await waitFor(() => evaluate(`document.querySelectorAll('#download .host-build-cta a').length===2`));
      }
    }
  }
  await visit("/account", "member");
  await waitFor(() => evaluate(`!!document.querySelector('.ac-profile-grid')`));
  assert.ok(await evaluate(`!document.querySelector('[data-server-download]')`));
  assert.deepEqual(errors, []);
  console.log("PASS: download page shows independent live launcher/server versions; host links match current CDN; refresh preserves scroll; alpha/admin and other account gates; desktop/mobile; no hydration errors.");
  await call("Browser.close").catch(() => {});
} finally {
  socket?.close();
  if (browser.exitCode === null) browser.kill();
}
