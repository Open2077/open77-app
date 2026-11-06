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
const [serverRelease, launcherRelease, unstableRelease] = await Promise.all(["server", "launcher", "server/unstable"].map(async channel => {
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
    window.__hostTest = {mode:localStorage.getItem('host-test-mode') || 'alpha', meCalls:0, licenseRequests:[], adminMutations:0};
    const account = {accountId:'11111111-2222-4333-8444-555555555555',email:'preview@example.test',
      displayName:'Open Alpha developer',role:'user',emailVerified:__hostTest.mode!=='unverified',identities:[]};
    if (__hostTest.mode === 'guest') localStorage.removeItem('open77.session');
    else localStorage.setItem('open77.session',JSON.stringify({...account,role:__hostTest.mode==='admin'?'admin':'user',
      token:'synthetic-host-ui-token',expiresAtUtc:'2036-09-11T00:00:00Z'}));
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input.url || input, location.href);
      if (!url.pathname.startsWith('/api/v1/')) return originalFetch(input, init);
      if (url.pathname.startsWith('/api/v1/admin/alpha-access')) {
        if (init?.method === 'POST') { __hostTest.adminMutations++; return Response.json({code:'blocked_test_mutation'},{status:403}); }
        return Response.json({alphaAccessRequired:false,page:1,pageSize:25,total:1,items:[{
          ...account,status:'active',alphaAccess:false,alphaAccessImplicit:false,createdAtUtc:'2026-11-06T00:00:00Z',
          grantedAtUtc:null,grantedByAccountId:null,grantedByEmail:null
        }]});
      }
      if (url.pathname === '/api/v1/accounts/licenses') {
        if (init?.method !== 'POST') return Response.json([]);
        __hostTest.licenseRequests.push(JSON.parse(init.body));
        if (!account.emailVerified) return Response.json({code:'email_unverified'},{status:403});
        return Response.json({licenseId:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',label:JSON.parse(init.body).label,
          key:'synthetic-license-for-browser-test-only',keyHint:'test-only',createdAtUtc:new Date().toISOString()},{status:201});
      }
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
  const downloadLinks = `Array.from(document.querySelectorAll('#download [data-release-channel="server"] a[href*="/server/"]')).map(a=>a.href)`;
  for (const width of [1440, 390]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height:900, deviceScaleFactor:1, mobile:false });
    await visit("/download");
    await waitFor(() => evaluate(`!!document.querySelector('[data-release-channel="server"]')`));
    await waitFor(() => evaluate(`!!document.querySelector('[data-copy-line] button')`));
    assert.equal(await evaluate(`document.querySelector('[data-channel-summary="server"] h2').textContent`), serverRelease.version);
    assert.equal(await evaluate(`document.querySelector('[data-channel-summary="launcher"] h2').textContent`), launcherRelease.version);
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
    const hostCta = `Array.from(document.querySelectorAll('a[href="/host"]')).find(a=>a.textContent.trim()==='Download server')`;
    assert.ok(await evaluate(`!!(${hostCta})`), "Create page offers the server download");
    assert.ok(await evaluate(`!!document.querySelector('a[href="/docs/host-a-server"]')`));
    assert.ok(await evaluate(`!!document.querySelector('footer a[href="/host"]')`));
    await evaluate(`(${hostCta}).click()`);
    await waitFor(() => evaluate(`(${downloadLinks}).length===2`));
    assert.equal(await evaluate("location.pathname"), "/host");
    assert.equal(await evaluate(`document.querySelector('[data-release-channel="server"]').dataset.releaseVersion`), serverRelease.version);
    assert.deepEqual((await evaluate(downloadLinks)).sort(), Object.values(serverRelease.builds).map(build => downloadUrl(build.url)).sort(), "Host offers exactly the current CDN archives");
    for (const url of await evaluate(downloadLinks)) assert.ok(url.startsWith(`${cdn}/server/`));
    assert.ok(await evaluate(`!document.querySelector('[data-host-locked]')`), "Public downloads are visible");
    assert.equal(await evaluate("__hostTest.meCalls"), 0, "Public downloads never request account approval");
    await evaluate(`document.getElementById('download').scrollIntoView()`);
    await pause(150);
    assert.ok(await evaluate(`Array.from(document.querySelectorAll('#download [data-release-channel="server"] a[href*="/server/"]')).every(a=>{
      const r=a.getBoundingClientRect(); return r.width>0 && r.left>=0 && r.right<=innerWidth+1;
    })`), "Download buttons fit viewport");
    await fs.writeFile(path.join(output, `open-alpha-${width}.png`), Buffer.from((await call("Page.captureScreenshot")).data, "base64"));
    const previewLinks = `Array.from(document.querySelectorAll('[data-release-channel="server-unstable"] a[href*="/server/"]')).map(a=>a.href)`;
    assert.deepEqual(await evaluate(previewLinks), [], "Unstable links absent before consent");
    await evaluate(`document.querySelector('[data-server-preview] summary').click()`);
    assert.deepEqual(await evaluate(previewLinks), [], "Opening preview alone never opts in");
    await evaluate(`document.querySelector('[data-server-preview] input[type="checkbox"]').click()`);
    await waitFor(() => evaluate(`(${previewLinks}).length===2`));
    assert.deepEqual((await evaluate(previewLinks)).sort(), Object.values(unstableRelease.builds).map(build => downloadUrl(build.url)).sort());
    await evaluate(`document.querySelector('[data-server-preview] summary').click()`);
    await waitFor(() => evaluate(`(${previewLinks}).length===0`));
  }
  await visit("/account");
  await waitFor(() => evaluate(`!!document.querySelector('[data-server-download] a[href="/host"]')`));
  for (const mode of ["member", "guest", "failure", "expired", "admin"]) {
    await visit("/host", mode);
    await waitFor(() => evaluate(`(${downloadLinks}).length===2`));
    assert.ok(await evaluate(`!document.querySelector('[data-host-locked], [data-auth-panel]')`), `${mode}: public downloads`);
    assert.equal(await evaluate("__hostTest.meCalls"), 0, `${mode}: no account lookup needed`);
    assert.deepEqual((await evaluate(downloadLinks)).sort(), Object.values(serverRelease.builds).map(build => downloadUrl(build.url)).sort());
  }
  await visit("/account", "member");
  await waitFor(() => evaluate(`!!document.querySelector('[data-account-overview]')`));
  assert.ok(await evaluate(`!!document.querySelector('[data-server-download] a[href="/host"]')`));

  await visit("/account/keys", "member");
  await waitFor(() => evaluate(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='New key'&&!b.disabled)`));
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='New key').click()`);
  await waitFor(() => evaluate(`!!document.querySelector('[data-key-form] input')`));
  await evaluate(`const input=document.querySelector('[data-key-form] input');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Open Alpha test server');
    input.dispatchEvent(new Event('input',{bubbles:true}));`);
  await waitFor(() => evaluate(`!document.querySelector('[data-key-form] button[type="submit"]').disabled`));
  await evaluate(`document.querySelector('[data-key-form]').requestSubmit()`);
  await waitFor(() => evaluate(`!!document.querySelector('[data-key-reveal]')`));
  assert.deepEqual(await evaluate(`__hostTest.licenseRequests`), [{ label: "Open Alpha test server" }], "Ordinary verified account without an Alpha grant can create a license");

  await visit("/account/keys", "unverified");
  await waitFor(() => evaluate(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='New key'&&b.disabled)`));
  assert.deepEqual(await evaluate(`__hostTest.licenseRequests`), [], "Email verification remains required for licensing");
  await visit("/account/keys", "guest");
  await waitFor(() => evaluate(`!!document.querySelector('[data-auth-panel]')`));
  assert.ok(await evaluate(`!document.querySelector('[data-key-form], [data-key-reveal]')`), "Private license management still requires sign-in");
  await visit("/admin/alpha-access", "admin");
  await waitFor(() => evaluate(`document.body.textContent.includes('Open Alpha is active') && !!document.querySelector('tbody tr')`));
  assert.ok(await evaluate(`!Array.from(document.querySelectorAll('main button')).some(b=>/^(Grant|Revoke)$/.test(b.textContent.trim()))`), "Historical grants cannot be edited when Open Alpha is active");
  assert.equal(await evaluate(`__hostTest.adminMutations`), 0);
  assert.deepEqual(errors, []);
  console.log("PASS: public downloads for guests, ordinary accounts, admins and failed/expired sessions; desktop/mobile; current CDN versions; no hydration errors; verified non-Alpha account creates a license; private keys and email verification remain protected.");
  await call("Browser.close").catch(() => {});
} finally {
  socket?.close();
  if (browser.exitCode === null) browser.kill();
}
