/** Real headless browser, synthetic Alpha account, no executable downloads. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const origin = process.argv[2] ?? "http://127.0.0.1:3137";
const expectedAvailable = process.argv.includes("--available");
const profile = await fs.mkdtemp(path.join(os.tmpdir(), "op77-server-preview-"));
const browser = spawn("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", [
  "--headless=new", "--disable-gpu", "--no-first-run", "--disable-background-networking",
  "--remote-debugging-port=0", "--remote-debugging-address=127.0.0.1", `--user-data-dir=${profile}`, "about:blank",
], { windowsHide: true, stdio: "ignore" });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(action) {
  const until = Date.now() + 30_000;
  while (Date.now() < until) { if (await action()) return; await pause(100); }
  throw new Error("Timed out waiting for preview UI");
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
  let id = 0;
  const pending = new Map(), errors = [];
  socket.addEventListener("message", event => {
    const msg = JSON.parse(event.data);
    if (msg.id) {
      const waiter = pending.get(msg.id); pending.delete(msg.id);
      if (msg.error) waiter.reject(new Error(msg.error.message)); else waiter.resolve(msg.result);
    } else if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.text);
    else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") errors.push(msg.params.args.map(a => a.value ?? a.description).join(" "));
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const key = ++id; pending.set(key, { resolve, reject }); socket.send(JSON.stringify({ id: key, method, params }));
  });
  async function evaluate(expression) {
    const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  await call("Page.enable"); await call("Runtime.enable"); await call("Network.enable");
  await call("Network.setBlockedURLs", { urls: ["*.zip", "*.tar.gz", "*.exe"] });
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `
    const account = { accountId:'11111111-2222-4333-8444-555555555555',email:'preview@example.test',displayName:'Preview',role:'user',emailVerified:true,identities:[] };
    localStorage.setItem('open77.session',JSON.stringify({...account,token:'synthetic-preview-token',expiresAtUtc:'2036-09-24T00:00:00Z'}));
    const originalFetch=window.fetch;
    window.fetch=async (input,init)=>{
      const url=new URL(typeof input==='string'?input:input.url||input,location.href);
      if(!url.pathname.startsWith('/api/v1/'))return originalFetch(input,init);
      return Response.json(url.pathname==='/api/v1/accounts/me'?{...account,alphaAccess:true,alphaGateActive:true}:{code:'test_only'},{status:url.pathname==='/api/v1/accounts/me'?200:403});
    };
  ` });
  for (const width of [1440, 390]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await call("Page.navigate", { url: `${origin}/host` });
    await waitFor(() => evaluate(`!!document.querySelector('[data-server-preview]')`));
    const preview = `document.querySelector('[data-server-preview]')`;
    const links = `Array.from(document.querySelectorAll('[data-release-channel="server"] a')).map(a=>a.href)`;
    const stableLinks = await evaluate(links);
    assert.equal(stableLinks.length, 2);
    assert.equal(await evaluate(`${preview}.open`), false, "collapsed by default");
    assert.equal(await evaluate(`${preview}.querySelectorAll('a').length`), 0, "no preview links before consent");
    await evaluate(`${preview}.querySelector('summary').click()`);
    await waitFor(() => evaluate(`${preview}.open`));
    assert.equal(await evaluate(`${preview}.querySelectorAll('a').length`), 0, "expanding never downloads");
    if (expectedAvailable) {
      await evaluate(`${preview}.querySelector('input').click()`);
      await waitFor(() => evaluate(`${preview}.querySelectorAll('a').length===2`));
      const downloads = await evaluate(`Array.from(${preview}.querySelectorAll('a')).map(a=>({url:a.href,label:a.textContent,fit:a.getBoundingClientRect().right<=innerWidth+1}))`);
      for (const download of downloads) {
        assert.match(decodeURIComponent(download.url), /\/server\/\d+\.\d+\.\d+-unstable\+op77\.\d+\//);
        assert.match(download.label, /Unstable/); assert.ok(download.fit);
      }
      assert.match(await evaluate(`${preview}.textContent`), /Compatible client:.*Network protocol:/);
      await evaluate(`${preview}.scrollIntoView({block:'start',behavior:'instant'})`);
      await evaluate(`Promise.all(${preview}.getAnimations({subtree:true}).filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))`);
      await fs.mkdir(".shots/server-preview", { recursive: true });
      await fs.writeFile(`.shots/server-preview/${width}.png`, Buffer.from((await call("Page.captureScreenshot")).data, "base64"));
      await evaluate(`${preview}.querySelector('summary').click()`);
      await waitFor(() => evaluate(`${preview}.querySelectorAll('a').length===0`));
      await evaluate(`${preview}.querySelector('summary').click()`);
      assert.equal(await evaluate(`${preview}.querySelector('input').checked`), false, "closing resets consent");
    } else assert.match(await evaluate(`${preview}.textContent`), /No verified Unstable build/);
    assert.deepEqual(await evaluate(links), stableLinks, "Stable links never change");
    assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`), "no horizontal overflow");
  }
  assert.deepEqual(errors, []);
  console.log(`PASS: desktop/mobile preview gating, ${expectedAvailable ? "consent, reset, compatibility and Unstable links" : "unavailable state"}, Stable isolation, no hydration errors.`);
  await call("Browser.close").catch(() => {});
} finally {
  socket?.close();
  if (browser.exitCode === null) browser.kill();
}
