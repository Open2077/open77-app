// Exercise the owner/admin review workflow with real pointer events. All
// account/API traffic is fulfilled inside this isolated browser, including PUTs.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const origin = process.argv[2] ?? "http://127.0.0.1:3132";
const port = 9364;
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
let mode = "owner", sequence = 0;
const now = new Date().toISOString();
const workspace = { quota: { active: 2, createdToday: 4, maximumActive: 5, maximumDailyCreations: 5, resetsAtUtc: new Date(Date.now()+86400000).toISOString() }, licenses: [
  {licenseId:"license-a",label:"Community license",keyHint:"aaaa",createdAtUtc:now,revokedAtUtc:null,lastServer:{serverId:"server-a",name:"$f00NIGHT CITY$z",connectEndpoint:"example.invalid:7777",lastSeenAtUtc:now,online:false,revoked:false},upcoming:null},
  {licenseId:"license-b",label:"Spare license",keyHint:"bbbb",createdAtUtc:now,revokedAtUtc:null,lastServer:null,upcoming:null},
  {licenseId:"license-c",label:"Revoked history",keyHint:"cccc",createdAtUtc:now,revokedAtUtc:now,lastServer:null,upcoming:null},
] };
const activeLicense = workspace.licenses[0];
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
    if (await evaluate(`Boolean(${expression})`)) return;
    await sleep(100);
  }
  throw Error(`Condition not met: ${expression}`);
}
async function fixture({ requestId, request }) {
  const url = new URL(request.url), path = url.pathname;
  let data = [], code = 200;
  if (request.method === "OPTIONS") code = 204;
  else if (path.endsWith("/accounts/me")) data = { accountId: "fixture", email: "test@example.invalid", emailVerified: true, displayName: "Fixture owner", role: mode === "admin" ? "admin" : "user", identities: [] };
  else if (path.endsWith("/licenses/workspace")) data = workspace;
  else if (path.endsWith("/admin/licenses")) {
    const status = url.searchParams.get("status");
    data = workspace.licenses.filter(license => status === "all" || (status === "revoked" ? license.revokedAtUtc : !license.revokedAtUtc))
      .map(license => ({...license,ownerAccountId:"fixture",ownerEmail:"test@example.invalid"}));
  }
  else if (path.endsWith("/accounts/licenses") && request.method === "POST") {
    assert.ok(workspace.quota.createdToday < 5 && workspace.quota.active < 5);
    const label = JSON.parse(request.postData).label;
    const license = {licenseId:"created-"+(++sequence),label,keyHint:"new1",createdAtUtc:now,revokedAtUtc:null,lastServer:null,upcoming:null};
    workspace.licenses.unshift(license); workspace.quota.active++; workspace.quota.createdToday++;
    data = {...license,key:"op77_live_fixture_once_only"}; code = 201; writes.push({action:"create"});
  } else if (path.endsWith("/revoke") && request.method === "POST") {
    const license = workspace.licenses.find(license=>path.includes('/'+license.licenseId+'/'));
    assert.ok(license); license.revokedAtUtc = now; workspace.quota.active--; code = 204; writes.push({action:"revoke"});
  } else if (path.endsWith("/upcoming") && request.method === "POST") {
    const body = JSON.parse(request.postData);
    assert.ok(!activeLicense.upcoming || activeLicense.upcoming.status === "rejected");
    assert.equal(body.revision, activeLicense.upcoming?.revision ?? 0);
    activeLicense.upcoming = { requestId:"request-a",licenseId:activeLicense.licenseId,submittedServerId:"server-a",profile:body.profile,status:"pending",revision:body.revision+1,submittedAtUtc:now,reviewedAtUtc:null,reason:null };
    data = workspace; writes.push({action:"submit",body});
  } else if (path.endsWith("/admin/upcoming-requests")) {
    const status = url.searchParams.get('status');
    const items = activeLicense.upcoming && (status === "all" || activeLicense.upcoming.status === status) ? [{request:activeLicense.upcoming,ownerAccountId:"fixture",ownerEmail:"test@example.invalid",licenseLabel:activeLicense.label,licenseRevokedAtUtc:null,lastServer:activeLicense.lastServer}] : [];
    data = {items,total:items.length,page:1,pageSize:25};
  } else if (path.endsWith("/decision") && request.method === "POST") {
    const body = JSON.parse(request.postData); assert.equal(body.revision,activeLicense.upcoming.revision);
    assert.equal(activeLicense.upcoming.status,"pending"); if(!body.approve) assert.ok(body.reason.trim());
    Object.assign(activeLicense.upcoming,{status:body.approve?"approved":"rejected",revision:body.revision+1,reason:body.reason,reviewedAtUtc:now});
    writes.push({action:"review",body}); code = 204;
  } else if (path.endsWith("/launch") && request.method === "POST") {
    assert.equal(activeLicense.upcoming.status,"approved"); activeLicense.upcoming.status="launched"; activeLicense.upcoming.revision++; writes.push({action:"launch"});code=204;
  } else if (!["GET", "OPTIONS"].includes(request.method)) throw Error(`Unexpected write: ${path}`);
  await send("Fetch.fulfillRequest", {requestId,responseCode:code,responseHeaders:[
    {name:"Content-Type",value:"application/json"},{name:"Access-Control-Allow-Origin",value:origin},
    {name:"Access-Control-Allow-Headers",value:"Authorization,Content-Type"},{name:"Access-Control-Allow-Methods",value:"GET,POST,OPTIONS"}],
    body:code===204?"":Buffer.from(JSON.stringify(data)).toString("base64")});
}
const field = label => `document.getElementById([...document.querySelectorAll('label')].find(l=>l.htmlFor&&l.textContent===${JSON.stringify(label)})?.htmlFor)`;
const button = label => `[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===${JSON.stringify(label)}||b.textContent.trim()===${JSON.stringify(label)})`;
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
  async function navigate(as, path) {
    mode = as;
    await evaluate(`localStorage.setItem('open77.session',${JSON.stringify(JSON.stringify({...session,role:as==="admin"?"admin":"user"}))})`);
    await send("Page.navigate",{url:origin+path});
  }
  async function fill(label,value) {
    const expression=field(label); await click(expression);
    await evaluate(`(()=>{const e=${expression};Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  }
  const card = "document.querySelector('[data-owner-license=license-a]')";
  const label = text => `[...document.querySelectorAll('label')].find(l=>l.textContent.includes(${JSON.stringify(text)}))`;
  await send("Page.navigate",{url:origin+'/account/keys'});
  await waitFor("document.querySelectorAll('[data-owner-license]').length===2");
  assert.ok(!await evaluate("document.body.textContent.includes('Revoked history')"));
  assert.ok(await evaluate("document.body.textContent.includes('NIGHT CITY')"));
  await select("License status","revoked"); await waitFor("document.querySelectorAll('[data-owner-license]').length===1");
  assert.ok(await evaluate("document.body.textContent.includes('Revoked history')"));
  await select("License status","active");
  await waitFor("document.querySelectorAll('[data-owner-license]').length===2");
  await click(button("Prepare announcement"));
  await fill("Community","Night City France"); await fill("Announcement name","$f00NIGHT CITY$z"); await fill("Languages","fr, en");
  await fill("Opening date and time (your local timezone)","2027-01-10T18:30");
  await fill("Discord invitation","https://discord.gg/open77");
  await fill("Description","A community launch awaiting review.");
  await click(label("I understand that I cannot change"));
  await click(button("Submit for review"));
  await waitFor("document.body.textContent.includes('waiting for staff review')");
  assert.equal(writes.filter(w=>w.action==='submit').length,1);
  assert.deepEqual(writes.find(w=>w.action==='submit').body.profile.languages,["fr","en"]);
  await navigate("admin","/admin/upcoming");
  await waitFor("document.querySelector('[data-upcoming-request]')");
  assert.equal(await evaluate(`(${button("Reject with reason")}).disabled`),true);
  await click("document.querySelector('[data-upcoming-request] summary')");
  await fill("Reason / staff note","Please clarify the launch date.");
  await click(button("Reject with reason")); await click(button("Confirm rejection?"));
  await waitFor("document.body.textContent.includes('No requests in this view')");
  await navigate("owner","/account/keys");
  await waitFor("document.body.textContent.includes('Please clarify the launch date.')");
  await click(button("Revise and resubmit"));
  await fill("Opening date and time (your local timezone)","2027-02-12T20:00");
  await click(label("I understand that I cannot change")); await click(button("Resubmit for review"));
  await waitFor("document.body.textContent.includes('waiting for staff review')");
  await navigate("admin","/admin/upcoming"); await waitFor("document.querySelector('[data-upcoming-request]')");
  await click(button("Approve announcement")); await click(button("Confirm approval and lock owner edits?"));
  await waitFor("document.body.textContent.includes('No requests in this view')");
  await navigate("owner","/account/keys");
  await waitFor("document.body.textContent.includes('permanently locked')");
  assert.equal(await evaluate(`(${card}).querySelector('form')!==null`),false);
  assert.ok(!await evaluate(`(${card}).textContent.includes('Revise and resubmit')`));
  await click(button("New license")); await fill("Key label","New community"); await click(button("Create key"));
  await waitFor("document.querySelector('[data-key-reveal]')");
  assert.ok(await evaluate("document.querySelector('[data-key-reveal]').textContent.includes('op77_live_fixture_once_only')"));
  await click(button("I saved my key"));
  assert.equal(await evaluate(`(${button("New license")}).disabled`),true);
  await click(button("Revoke Spare license"));
  await waitFor("document.querySelector('dialog[open]')"); await click(button("Revoke key"));
  await waitFor("!document.querySelector('dialog[open]')");
  assert.equal(workspace.quota.createdToday,5);
  assert.equal(await evaluate(`(${button("New license")}).disabled`),true);
  await select("License status","revoked"); await waitFor("document.querySelectorAll('[data-owner-license]').length===2");
  await select("License status","active");
  await mkdir('.shots/owner-workspace',{recursive:true});
  await evaluate("window.scrollTo({top:500,behavior:'instant'})");
  await writeFile('.shots/owner-workspace/desktop.png',Buffer.from((await send('Page.captureScreenshot')).data,'base64'));
  await navigate("admin","/admin/upcoming"); await waitFor("document.querySelector('select')");
  await select("Request status","approved"); await waitFor("document.querySelector('[data-upcoming-request]')");
  await click(button("Mark launch complete")); await click(button("Confirm this community has launched?"));
  await waitFor("document.body.textContent.includes('No requests in this view')");
  await navigate("admin","/admin/licenses");
  await waitFor("document.querySelectorAll('tbody tr').length===2");
  assert.ok(!await evaluate("document.querySelector('tbody').textContent.includes('Revoked history')"));
  await select("License status","revoked");
  await waitFor("document.querySelector('tbody').textContent.includes('Revoked history')");
  await navigate("owner","/account/keys");
  await waitFor("document.body.textContent.includes('launch complete')");
  await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await click(field("License status"));
  await send("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});
  assert.ok(await evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"),'Owner workspace must fit a narrow viewport');
  await writeFile('.shots/owner-workspace/mobile.png',Buffer.from((await send('Page.captureScreenshot')).data,'base64'));
  assert.deepEqual(errors,[]);
  assert.deepEqual(writes.map(w=>w.action),['submit','review','submit','review','create','revoke','launch']);
  process.stdout.write("PASS: owner licenses/default revoked filter, last server, quota UI, one-time key, refusal/reason/resubmit/approval lock, admin launch completion, mobile pointer interaction. All API writes were isolated fixtures.\n");

} finally {
  if (socket?.readyState === WebSocket.OPEN) { await send("Browser.close", {}, false).catch(() => {}); socket.close(); }
  browser.kill();
  for (const entry of pending.values()) clearTimeout(entry.timer);
}
