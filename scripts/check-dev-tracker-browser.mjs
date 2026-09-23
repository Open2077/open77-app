// Local, deterministic UI acceptance. API fixtures stay inside this isolated
// browser; no account, proposal, vote or comment is written to any real Master.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const origin = process.argv[2] ?? "http://localhost:3219";
if (!["127.0.0.1", "localhost"].includes(new URL(origin).hostname)) throw new Error("Use a local website build");
const port = 9347;
let chrome;
for (const path of ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"]) {
  try { await access(path); chrome = path; break; } catch { /* next */ }
}
if (!chrome) throw new Error("Chrome/Edge not found");
const browser = spawn(chrome, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${await mkdtemp(join(tmpdir(), "open77-tracker-browser-"))}`, "--no-first-run", "--no-default-browser-check", "about:blank"], { windowsHide: true, stdio: "ignore" });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket, sessionId, sequence = 0;
const pending = new Map(), errors = [];
function send(method, params = {}, scoped = true) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params, ...(scoped && sessionId ? { sessionId } : {}) }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function waitFor(expression) {
  for (let i = 0; i < 200; i++) { if (await evaluate(expression)) return; await sleep(100); }
  throw new Error(`Condition not met: ${expression}\nBrowser errors: ${JSON.stringify(errors)}\n${await evaluate("document.body.innerText")}`);
}
const click = text => evaluate(`[...document.querySelectorAll('main button,main summary,main a')].find(b => b.textContent.trim() === ${JSON.stringify(text)}).click()`);
async function fill(selector, value) {
  await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
}
const now = new Date().toISOString();
const author = randomUUID(), viewer = randomUUID(), staff = randomUUID();
let account = null, failPost = false, failRead = false;
const createdRequests = [], commentRequests = [], comments = [], updates = [];
const makeIdea = (state, title) => ({ id: randomUUID(), authorId: author, authorName: "Community member", title, body: "Let players suggest improvements and discuss practical examples together. This is an isolated test fixture, not a real community proposal.", category: "multiplayer", state, revision: 1, hidden: false, locked: false, createdAtUtc: now, updatedAtUtc: now, upvotes: 12, downvotes: 2, comments: 0, myVote: 0 });
const ideas = [makeIdea("proposed", "Shared taxi destinations for passengers"), ...["approved", "planned", "in_progress", "testing", "shipped"].map(s => makeIdea(s, `Community improvement — ${s.replaceAll("_", " ")}`))];
const first = ideas[0];
function fixture(request) {
  if (request.method === "OPTIONS") return [204, null];
  const url = new URL(request.url), path = url.pathname, q = url.searchParams;
  const data = request.postData ? JSON.parse(request.postData) : null;
  if (path === "/api/v1/accounts/me") return [200, { ...account, email: "fixture@example.invalid", identities: [] }];
  if (path.endsWith("/me/quota")) return [200, { remaining: 2, nextSubmissionAtUtc: null, ideasPerWeek: 3, ideaCooldownMinutes: 30 }];
  if (path.endsWith("/ideas") && request.method === "GET") {
    if (failRead) return [503, { code: "unavailable", message: "The tracker is temporarily unavailable. Please retry." }];
    let items = ideas.filter(i => !i.hidden || q.get("view") === "admin" || (q.get("view") === "mine" && i.authorId === account?.accountId));
    if (q.get("view") === "approved") items = items.filter(i => ["approved", "planned", "in_progress", "testing", "shipped"].includes(i.state));
    if (q.get("view") === "mine") items = items.filter(i => i.authorId === account?.accountId);
    for (const key of ["state", "category"]) if (q.get(key)) items = items.filter(i => i[key] === q.get(key));
    if (q.get("q")) items = items.filter(i => i.title.toLowerCase().includes(q.get("q").toLowerCase()));
    const pageSize = Number(q.get("pageSize") ?? 20), page = Number(q.get("page") ?? 1);
    return [200, { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize }];
  }
  if (path.endsWith("/ideas") && request.method === "POST") {
    createdRequests.push(data.requestId);
    if (failPost) return [429, { code: "submission_limited", message: "You can submit another idea tomorrow at 12:00 UTC." }];
    const idea = { ...makeIdea("proposed", data.title), ...data, authorId: account.accountId, authorName: account.displayName, upvotes: 0, downvotes: 0 };
    ideas.push(idea); return [201, idea];
  }
  const idea = ideas.find(i => path.includes(i.id));
  if (!idea) return [404, { code: "not_found", message: "Idea not found." }];
  if (path.endsWith("/vote")) {
    if (idea.myVote === 1) idea.upvotes--; if (idea.myVote === -1) idea.downvotes--;
    idea.myVote = data.value;
    if (data.value === 1) idea.upvotes++; if (data.value === -1) idea.downvotes++;
    return [200, idea];
  }
  if (path.endsWith("/review")) {
    Object.assign(idea, { state: data.state, hidden: data.hidden, locked: data.locked, revision: idea.revision + 1 });
    updates.unshift({ id: randomUUID(), authorName: "Moderator", state: data.state, message: data.message, createdAtUtc: now });
    return [200, idea];
  }
  if (path.endsWith("/comments") && request.method === "GET") return [200, { items: comments.filter(c => c.ideaId === idea.id), total: comments.filter(c => c.ideaId === idea.id).length, page: 1, pageSize: 30 }];
  if (path.endsWith("/comments") && request.method === "POST") {
    commentRequests.push(data.requestId);
    const comment = { id: randomUUID(), ideaId: idea.id, authorId: account.accountId, authorName: account.displayName, parentId: data.parentId, body: data.body, hidden: false, deleted: false, staff: account.role === "admin", revision: 1, createdAtUtc: now, updatedAtUtc: now };
    comments.push(comment); idea.comments++; return [200, comment];
  }
  if (request.method === "GET") return [200, { idea, updates }];
  return [400, { code: "invalid_request", message: "Unexpected browser fixture request." }];
}
async function signIn(role = "player") {
  account = { token: "local-fixture-only", accountId: role === "admin" ? staff : viewer, displayName: role === "admin" ? "Moderator" : "Test player", role, emailVerified: true, expiresAtUtc: "2099-01-01T00:00:00Z" };
  await evaluate(`localStorage.setItem('open77.session', ${JSON.stringify(JSON.stringify(account))}); window.dispatchEvent(new StorageEvent('storage', {key:'open77.session'}))`);
}
async function navigate(path) { await send("Page.navigate", { url: origin + path }); }
async function screenshot(name) { await mkdir(".shots", { recursive: true }); await writeFile(`.shots/tracker-${name}.png`, Buffer.from((await send("Page.captureScreenshot", { captureBeyondViewport: true })).data, "base64")); }

try {
  let endpoint;
  for (let i = 0; i < 60; i++) { try { endpoint = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl; break; } catch { await sleep(100); } }
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  socket.addEventListener("message", ({ data }) => {
    const event = JSON.parse(data);
    if (event.id) {
      const item = pending.get(event.id); if (!item) return;
      clearTimeout(item.timer); pending.delete(event.id);
      if (event.error) item.reject(new Error(event.error.message)); else item.resolve(event.result);
    } else if (event.method === "Fetch.requestPaused") {
      try {
        const [code, body] = fixture(event.params.request);
        void send("Fetch.fulfillRequest", { requestId: event.params.requestId, responseCode: code,
          responseHeaders: [{ name: "Content-Type", value: "application/json" }, { name: "Cache-Control", value: "no-store" }, { name: "Access-Control-Allow-Origin", value: origin }, { name: "Access-Control-Allow-Headers", value: "Authorization, Content-Type" }, { name: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,OPTIONS" }],
          ...(body ? { body: Buffer.from(JSON.stringify(body)).toString("base64") } : {}) }).catch(e => errors.push(e.message));
      } catch (e) { errors.push(e.message); }
    } else if (event.method === "Runtime.exceptionThrown") errors.push(JSON.stringify(event.params.exceptionDetails));
  });
  const target = await send("Target.createTarget", { url: "about:blank" }, false);
  sessionId = (await send("Target.attachToTarget", { targetId: target.targetId, flatten: true }, false)).sessionId;
  await send("Runtime.enable"); await send("Page.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/v1/*", requestStage: "Request" }] });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  await navigate("/dev-tracker"); await waitFor("document.body.innerText.includes('Shared taxi destinations')");
  assert.equal(await evaluate("document.querySelector('[aria-label=Upvote]').disabled"), true);
  await screenshot("desktop");
  await signIn(); await waitFor("document.querySelector('[aria-label=Upvote]')?.disabled === false");
  await evaluate("document.querySelector('[aria-label=Upvote]').click()");
  await waitFor("document.querySelector('[aria-label=Upvote]')?.getAttribute('aria-pressed') === 'true'");
  await evaluate("document.querySelector('[aria-label=Downvote]').click()");
  await waitFor("document.querySelector('[aria-label=Downvote]')?.getAttribute('aria-pressed') === 'true'");
  assert.equal(first.myVote, -1);
  await fill('[aria-label="Search ideas"]', "taxi"); await click("Search"); await waitFor("document.querySelectorAll('main article').length === 1");

  await navigate(`/dev-tracker/${first.id}`); await waitFor("document.body.innerText.includes('Join the discussion')");
  await fill("main textarea", "A practical suggestion for taxi drivers."); await click("Post comment");
  await waitFor("document.body.innerText.includes('A practical suggestion for taxi drivers.')");
  await fill("main textarea", "A practical suggestion for taxi drivers."); await click("Post comment");
  await waitFor("document.querySelectorAll('article[id^=comment]').length === 2");
  assert.notEqual(commentRequests[0], commentRequests[1], "A confirmed comment kept the previous idempotency key");
  await click("Reply"); await fill("main textarea", "Adding a reply to that suggestion."); await click("Post reply");
  await waitFor("document.body.innerText.includes('Adding a reply to that suggestion.')");
  assert.equal(comments[2].parentId, comments[0].id);
  await signIn("admin"); await waitFor("document.body.innerText.includes('Staff controls')");
  await click("Staff controls · validation, progress & moderation");
  await fill("details select", "approved"); await fill("details textarea", "Approved after community discussion."); await click("Publish staff update");
  await waitFor("document.body.innerText.includes('Approved after community discussion.')");
  await click("Staff controls · validation, progress & moderation");
  await fill("details select", "in_progress"); await fill("details textarea", "Implementation has started on this feature."); await click("Publish staff update");
  await waitFor("document.body.innerText.includes('Implementation has started on this feature.')");
  await screenshot("discussion");

  await navigate("/dev-tracker/roadmap"); await waitFor("document.querySelectorAll('main article').length === 6"); await screenshot("board");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "Mobile roadmap overflows the page"); await screenshot("mobile-board");
  await navigate("/dev-tracker"); await waitFor("document.body.innerText.includes('Shared taxi destinations')");
  assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "Mobile directory overflows"); await screenshot("mobile");

  await navigate("/dev-tracker/new"); await waitFor("document.body.innerText.includes('2 / 3 ideas available')");
  await fill('main input[minlength="8"]', "Better community feedback filters"); await fill("main textarea", 'Let players filter proposals by the systems and gameplay features they care about.\n\n<img src=x onerror="window.__trackerXss=true">');
  failPost = true; await click("Publish idea"); await waitFor("document.body.innerText.includes('tomorrow at 12:00 UTC')");
  assert.ok((await evaluate("document.querySelector('main textarea').value")).includes("Let players"));
  failPost = false; await click("Publish idea"); await waitFor("document.body.innerText.includes('Proposed by') && document.body.innerText.includes('Better community feedback filters')");
  assert.equal(createdRequests.length, 2); assert.equal(createdRequests[0], createdRequests[1], "Retry changed idempotency key");
  assert.equal(await evaluate("document.querySelectorAll('main img').length"), 0, "Proposal interpreted as HTML");
  assert.equal(await evaluate("window.__trackerXss === true"), false);
  assert.equal(await evaluate("document.querySelector('[aria-label=Upvote]').disabled"), true, "Author can vote for their own idea");

  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate("/admin/dev-tracker"); await waitFor("document.body.innerText.includes('Review & moderate') && document.body.innerText.includes('Better community feedback filters')");
  assert.ok(await evaluate("document.querySelector('.adm-sync').textContent.includes('Updated')"));
  await evaluate("document.querySelector('.adm-workspace-tools button:last-child').click()");
  await waitFor("document.body.innerText.includes('Better community feedback filters')"); await screenshot("admin");
  failRead = true; await navigate("/dev-tracker"); await waitFor("document.body.innerText.includes('temporarily unavailable')");
  failRead = false; await click("Retry / refresh"); await waitFor("document.body.innerText.includes('Shared taxi destinations')");
  assert.deepEqual(errors, [], "Uncaught browser errors");
  console.log("Dev Tracker browser acceptance passed: guest/account permissions, votes, search, comments/replies, approval/progress, board, mobile, quota errors, idempotent retry, admin and recovery.");
} finally {
  if (socket?.readyState === WebSocket.OPEN) { try { await send("Browser.close", {}, false); } catch { /* closing */ } socket.close(); }
  browser.kill();
  for (const item of pending.values()) clearTimeout(item.timer);
}
