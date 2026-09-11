import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function argumentsFor(args) {
  if (args.length < 3 || args.length > 4 || (args[3] && args[3] !== "--require-gallery")) throw Error("Usage: node scripts/check-hub-browser.mjs <local-origin> <published-slug> <exact-title> [--require-gallery]");
  const origin = new URL(args[0]);
  if (origin.protocol !== "http:" || !["127.0.0.1", "[::1]", "localhost"].includes(origin.hostname) || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) throw Error("Supply an explicit HTTP loopback origin with no path or credentials.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args[1]) || args[1].length > 120) throw Error("Supply the current published project slug.");
  if (!args[2].trim() || args[2].length > 200 || /[\x00-\x1f]/.test(args[2])) throw Error("Supply the exact published title.");
  return { origin: origin.origin, slug: args[1], title: args[2], requireGallery: !!args[3] };
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, label, ms = 15000) {
  const end = Date.now() + ms;
  do { if (await check()) return; await delay(100); } while (Date.now() < end);
  throw Error(`Deadline: ${label}`);
}
class Cdp {
  constructor(socket) {
    this.socket = socket; this.next = 0; this.pending = new Map(); this.errors = [];
    socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data), pending = this.pending.get(message.id);
      if (pending) { clearTimeout(pending.timer); this.pending.delete(message.id); if (message.error) pending.reject(Error(message.error.message)); else pending.resolve(message.result); }
      if (message.method === "Runtime.exceptionThrown") this.errors.push("Uncaught browser exception");
      if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") this.errors.push("Browser console error");
    });
  }
  send(method, params = {}) {
    const id = ++this.next;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(Error(`CDP deadline: ${method}`)); }, 10000);
      this.pending.set(id, { resolve, reject, timer }); this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(body) {
    const result = await this.send("Runtime.evaluate", { expression: `(async()=>{${body}})()`, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw Error("Browser assertion evaluation failed");
    return result.result.value;
  }
  async key(key, code = key, modifiers = 0) {
    await this.send("Input.dispatchKeyEvent", { type: "keyDown", key, code, modifiers, windowsVirtualKeyCode: { Enter: 13, Escape: 27, Tab: 9, ArrowRight: 39, ArrowLeft: 37 }[key] });
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, modifiers });
  }
  close() { for (const entry of this.pending.values()) { clearTimeout(entry.timer); entry.reject(Error("Browser closed")); } this.pending.clear(); this.socket.close(); }
}

export async function run(options) {
  const route = `/resources/${options.slug}`, canonical = `https://open2077.net${route}`;
  // Verify the already-running origin before creating a browser. No server startup.
  const response = await fetch(options.origin + route, { redirect: "error", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Error(`Published SSR fixture unavailable: HTTP ${response.status}`);
  const html = await response.text();
  if (!/<h1(?:\s[^>]*)?>/.test(html) || !html.includes(canonical)) throw Error("Real SSR project/canonical missing");
  const candidates = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].filter(Boolean);
  let executable;
  for (const candidate of candidates) { try { await fs.access(candidate); executable = candidate; break; } catch {} }
  if (!executable) throw Error("Chrome/Edge unavailable; set CHROME_PATH to an existing executable.");
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "open77-hub-browser-"));
  const output = path.resolve("artifacts/hub-browser", new Date().toISOString().replaceAll(/[:.]/g, "-"));
  await fs.mkdir(output, { recursive: true });
  const evidence = { ...options, canonical, scope: "guest served-browser checks only", fullHubAcceptanceClaim: false, browserExecuted: false, widths: [], checks: [], passed: false };
  let child, cdp;
  let stage = "owned browser startup";
  function assert(ok, name) { stage = name; if (!ok) throw Error(name); evidence.checks.push(name); }
  try {
    child = spawn(executable, ["--headless=new", "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--disable-gpu", "about:blank"], { windowsHide: true, stdio: "ignore" });
    let launchError; child.on("error", error => { launchError = error; });
    let port;
    await until(async () => { if (launchError) throw launchError; try { port = Number((await fs.readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); return port > 0; } catch { return false; } }, "owned browser startup");
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(3000) })).json();
    const target = targets.find(item => item.type === "page" && item.url === "about:blank");
    assert(!!target, "Owned blank browser target");
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error("CDP connection timeout")), 5000); socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }); socket.addEventListener("error", () => { clearTimeout(timer); reject(Error("CDP connection failed")); }); });
    cdp = new Cdp(socket); await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
    async function visit(url) {
      stage = "real page navigation and hydration";
      await cdp.send("Page.navigate", { url });
      await until(() => cdp.evaluate(`return location.href===${JSON.stringify(url)} && document.readyState==='complete' && !!document.querySelector('main');`), "page load");
      await cdp.evaluate("await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true;");
    }
    async function screenshot(name) { const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }); await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(shot.data, "base64")); }
    for (const width of [390, 768, 1440]) {
      await cdp.send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
      // DOMParser reads the actual fetched SSR HTML, independently of hydration.
      await visit(options.origin + route);
      evidence.browserExecuted = true;
      assert(await cdp.evaluate(`const doc=new DOMParser().parseFromString(${JSON.stringify(html)},'text/html');return doc.querySelector('h1')?.textContent.trim()===${JSON.stringify(options.title)};`), `${width}: SSR exact project title`);
      await until(() => cdp.evaluate("return document.body.innerText.includes('to vote, save or follow releases.') && !document.body.innerText.includes('Loading community actions');"), "guest action hydration");
      assert(await cdp.evaluate(`return document.querySelector('h1')?.textContent.trim()===${JSON.stringify(options.title)} && document.querySelector('link[rel=canonical]')?.href===${JSON.stringify(canonical)} && document.title.includes(${JSON.stringify(options.title)});`), `${width}: hydrated title and canonical`);
      assert(await cdp.evaluate("return document.documentElement.scrollWidth<=innerWidth+1;"), `${width}: no horizontal overflow`);
      assert(await cdp.evaluate("return !localStorage.getItem('open77.session') && [...document.querySelectorAll('a')].some(a=>a.textContent==='Sign in with a verified account'&&new URL(a.href).pathname==='/account') && ![...document.querySelectorAll('button')].some(b=>/^(Upvote|Save|Follow releases)$/.test(b.textContent.trim()));"), `${width}: guest interaction gate`);
      const gallery = await cdp.evaluate("return document.querySelectorAll('.hub-media-gallery a[aria-haspopup=dialog]').length;");
      if (options.requireGallery) assert(gallery >= 2, `${width}: two real gallery images required for navigation`);
      if (gallery) {
        assert(await cdp.evaluate("return [...document.querySelectorAll('.hub-media-gallery img')].every(i=>i.alt.trim().length>=3 && !/^(image|screenshot|photo)(\\s*\\d+)?$/i.test(i.alt.trim()));"), `${width}: meaningful gallery alt text`);
        await cdp.evaluate("const a=document.querySelector('.hub-media-gallery a');a.scrollIntoView();a.focus();return true;");
        await cdp.key("Enter");
        await until(() => cdp.evaluate("return !!document.querySelector('dialog[open]') && document.activeElement?.textContent==='Close screenshot';"), "keyboard opens gallery and focuses close");
        await until(() => cdp.evaluate("const i=document.querySelector('dialog[open] img');return !!i&&i.complete&&i.naturalWidth>0;"), "real full gallery image");
        await cdp.key("Tab", "Tab", 8);
        assert(await cdp.evaluate("return !!document.activeElement.closest('dialog[open]');"), `${width}: modal reverse-tab stays inside`);
        if (gallery > 1) {
          await cdp.key("ArrowRight");
          await until(() => cdp.evaluate("return document.querySelector('dialog[open] h2')?.textContent.startsWith('Screenshot 2 of');"), "next screenshot keyboard");
          await cdp.key("ArrowLeft");
          await until(() => cdp.evaluate("return document.querySelector('dialog[open] h2')?.textContent.startsWith('Screenshot 1 of');"), "previous screenshot keyboard");
        }
        await screenshot(`gallery-${width}`); await cdp.key("Escape");
        await until(() => cdp.evaluate("return !document.querySelector('dialog[open]') && document.activeElement===document.querySelector('.hub-media-gallery a');"), "Escape restores trigger focus");
      }
      await cdp.evaluate("scrollTo(0,0);return true;"); await screenshot(`project-${width}`);
      await visit(options.origin + route + "/discussion");
      await until(() => cdp.evaluate("return document.body.innerText.includes('to write a comment.');"), "guest discussion hydration");
      assert(await cdp.evaluate("return [...document.querySelectorAll('textarea')].every(t=>t.readOnly||t.disabled) && document.documentElement.scrollWidth<=innerWidth+1;"), `${width}: guest comments locked and no overflow`);
      await screenshot(`discussion-${width}`); evidence.widths.push({ width, gallery: gallery ? "executed" : "not present", galleryNavigation: gallery > 1 ? "executed" : "requires two real images" });
    }
    assert(cdp.errors.length === 0, "No browser console errors or uncaught exceptions"); evidence.passed = true;
  } catch (error) {
    // Fixed assertion/stage labels only: never persist raw CDP, URL or token text.
    evidence.failure = { stage, kind: error instanceof Error ? "check_failed" : "unexpected_failure" };
    throw error;
  } finally {
    if (cdp) { try { await cdp.send("Browser.close"); } catch {} cdp.close(); }
    if (child && child.exitCode === null) { child.kill(); await Promise.race([new Promise(resolve => child.once("exit", resolve)), delay(3000)]); }
    // Unique owned profile only; never a normal browser profile or server process.
    try { await fs.rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); } catch { evidence.profileCleanupFailed = true; }
    await fs.writeFile(path.join(output, "evidence.json"), JSON.stringify(evidence, null, 2));
  }
  if (evidence.profileCleanupFailed) throw Error("Owned browser profile cleanup failed");
  console.log(`Hub served-browser checks passed: ${output}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { await run(argumentsFor(process.argv.slice(2))); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
