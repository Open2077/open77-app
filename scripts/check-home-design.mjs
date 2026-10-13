/**
 * Drives the built site in a real browser and fails on console noise.
 *
 * The static HTML is verified elsewhere; this covers the other half. Every
 * interactive part of this site is a client component hydrating over
 * server-rendered markup, and the two ways that goes wrong — a hydration
 * mismatch, or state read from the browser during render — produce a console
 * error and otherwise look fine in a screenshot.
 *
 * It also exercises the interactions themselves, because a filter that silently
 * stops filtering is not something a build can notice.
 *
 * Usage: node scripts/check-hydration.mjs [origin]
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const origin = process.argv[2] ?? "http://127.0.0.1:3000";
const DEBUG_PORT = 9346;

const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

async function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next one.
    }
  }
  throw new Error("No Chrome or Edge binary found.");
}

/**
 * Helpers made available to every expression evaluated in the page.
 *
 * `parseSuggestions` pulls the example queries out of a search placeholder like
 * "Filter functions — try camera, vehicles, TriggerServerEvent…", so the tests
 * check whatever the UI currently advertises rather than a copy that drifts.
 */
const PAGE_HELPERS = `
  const parseSuggestions = (placeholder) =>
    (placeholder.split(/[\\u2014:]/)[1] ?? '')
      .replace(/^\\s*try\\s+/i, '')
      .split(',')
      .map((part) => part.replace('\\u2026', '').trim())
      .filter(Boolean);
`;

/* -------------------------------------------------------------------------- */
/* Minimal CDP client                                                         */
/* -------------------------------------------------------------------------- */

class Session {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.sessionId = null;

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== undefined) {
        const entry = this.pending.get(message.id);
        if (!entry) return;
        this.pending.delete(message.id);
        if (message.error) entry.reject(new Error(message.error.message));
        else entry.resolve(message.result);
        return;
      }
      const handlers = this.listeners.get(message.method);
      if (handlers) for (const handler of handlers) handler(message.params);
    });
  }

  send(method, params = {}, useSession = true) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (useSession && this.sessionId) payload.sessionId = this.sessionId;
    this.socket.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  on(method, handler) {
    const handlers = this.listeners.get(method) ?? [];
    handlers.push(handler);
    this.listeners.set(method, handlers);
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression: `(async () => { ${PAGE_HELPERS}\n${expression} })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? "evaluate failed");
    }
    return result.result.value;
  }
}

function connect(url) {
  const socket = new WebSocket(url);
  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () => resolve(new Session(socket)));
    socket.addEventListener("error", () => reject(new Error(`Cannot connect to ${url}`)));
  });
}

async function waitForDevTools() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (response.ok) return (await response.json()).webSocketDebuggerUrl;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Chrome never opened its debugging port.");
}

const profile = await fs.mkdtemp(path.join(os.tmpdir(), "open77-home-check-"));
const child = spawn(await findChrome(), ["--headless=new", "--remote-debugging-port=" + DEBUG_PORT, "--user-data-dir=" + profile, "--no-first-run", "--no-default-browser-check", "--force-device-scale-factor=1", "about:blank"], { stdio: "ignore", windowsHide: true });
let failures = 0;
const errors = [];
const check = (name, result) => { console.log((result ? "PASS " : "FAIL ") + name); if (!result) failures++; };
try {
  const session = await connect(await waitForDevTools());
  const { targetId } = await session.send("Target.createTarget", { url: "about:blank" }, false);
  session.sessionId = (await session.send("Target.attachToTarget", { targetId, flatten: true }, false)).sessionId;
  session.on("Runtime.exceptionThrown", (params) => errors.push(params.exceptionDetails.exception?.description ?? "Exception"));
  session.on("Runtime.consoleAPICalled", (params) => { if (params.type === "error") errors.push(params.args.map(a => a.value ?? a.description).join(" ")); });
  await session.send("Runtime.enable");
  await session.send("Page.enable");
  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  async function visit(route = "/") {
    await session.send("Page.navigate", { url: origin + route });
    for (let i = 0; i < 120; i++) {
      await delay(150);
      if (await session.evaluate("return document.readyState === 'complete' && !!document.querySelector('main');")) break;
    }
    await session.evaluate("await document.fonts.ready; return true;");
    await delay(500);
  }
  const resize = (width, height=1000) => session.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  await fs.mkdir(".shots", { recursive: true });
  async function shot(name, full=false) {
    const layout = await session.send("Page.getLayoutMetrics");
    const image = await session.send("Page.captureScreenshot", { format: "png", ...(full ? { captureBeyondViewport: true, clip: { x: 0, y: 0, width: layout.cssContentSize.width, height: layout.cssContentSize.height, scale: 1 } } : {}) });
    await fs.writeFile(path.join(".shots", name + ".png"), Buffer.from(image.data, "base64"));
  }
  const key = async (key, code, vkey, modifiers=0) => {
    await session.send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: vkey, modifiers });
    await session.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vkey, modifiers });
    await delay(100);
  };
  // The site header: the reference bar of the home page concept, on every route.
  const headerFits = `
    const header=document.querySelector("header");
    const visible=[...header.querySelectorAll("a, button")].filter(x=>x.getClientRects().length && getComputedStyle(x).visibility!=="hidden");
    return document.documentElement.scrollWidth <= innerWidth && visible.every(x=>{const r=x.getBoundingClientRect(); return r.left>=-1 && r.right<=innerWidth+1;});
  `;
  for (const width of [1680, 1440, 1280, 1100, 768, 420, 375, 320]) {
    await resize(width);
    await visit();
    const layout = await session.evaluate(`
      return { fit: (() => { ${headerFits} })(),
        singleTitle: document.querySelectorAll("h1").length===1,
        heroLoaded: [...document.images].filter(x=>x.src.includes("cyberpunk-logo")).every(x=>x.complete && x.naturalWidth>0) };
    `);
    check(width + "px: page and header fit", layout.fit);
    if (!layout.fit) console.log(await session.evaluate("return [...document.querySelectorAll('header a, header button')].filter(x=>x.getClientRects().length).map(x=>({label:x.getAttribute('aria-label')??x.textContent,rect:x.getBoundingClientRect().toJSON()}));"));
    check(width + "px: hero logo and a single heading", layout.singleTitle && layout.heroLoaded);
    if ([1680, 420].includes(width)) await shot("home-" + width);
  }
  await resize(1440);
  await visit("/servers");
  await session.evaluate("window.scrollTo({top:800,behavior:'instant'});");
  await delay(250);
  check("header stays fixed at the top when scrolling", await session.evaluate("return document.querySelector('header').getBoundingClientRect().top===0;"));
  await session.evaluate("document.activeElement.blur();");
  await key("k","KeyK",75,2);
  check("Ctrl+K opens quick navigation as a modal with the search focused", await session.evaluate("return !!document.querySelector('dialog[open] input[type=search]') && document.activeElement.type==='search';"));
  await session.evaluate(`
    const input=document.querySelector("dialog[open] input[type=search]");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,"lua");
    input.dispatchEvent(new Event("input",{bubbles:true}));
  `);
  await delay(150);
  check("quick navigation filters destinations", await session.evaluate("const links=document.querySelectorAll('dialog[open] a'); return links.length===2 && [...links].some(a=>a.textContent.includes('Lua API'));"));
  await shot("quick-navigation");
  await key("Escape","Escape",27);
  check("Escape closes quick navigation", await session.evaluate("return !document.querySelector('dialog[open]');"));
  await resize(420,900);
  await visit();
  await session.evaluate("const t=document.querySelector('button[aria-controls=site-menu]'); t.focus(); t.click();");
  await delay(150);
  check("mobile menu opens and locks the page", await session.evaluate("return !document.getElementById('site-menu').hidden && document.documentElement.style.overflow==='hidden' && document.querySelector('button[aria-controls=site-menu]').getAttribute('aria-expanded')==='true';"));
  await shot("mobile-menu");
  await key("Escape","Escape",27);
  check("Escape closes the menu and returns focus to its toggle", await session.evaluate("return document.getElementById('site-menu').hidden && document.documentElement.style.overflow!=='hidden' && document.activeElement.getAttribute('aria-controls')==='site-menu';"));
  await session.evaluate("document.querySelector('button[aria-controls=site-menu]').click();");
  await delay(150);
  await session.evaluate("document.querySelector('#site-menu a[href$=create]').click();");
  await delay(1500);
  check("navigating closes the menu", await session.evaluate("return location.pathname==='/create' && document.getElementById('site-menu').hidden && document.documentElement.style.overflow!=='hidden';"));
  for (const route of ["/download", "/docs", "/servers", "/account", "/admin"]) {
    await resize(1440);
    await visit(route);
    check(route + ": shared header fits", await session.evaluate(headerFits));
  }
  await resize(1680,1000);
  await session.send("Emulation.setEmulatedMedia", { features: [{ name:"prefers-reduced-motion", value:"reduce" }] });
  await visit();
  check("reduced motion: grain off, home scenes stacked vertically", await session.evaluate("return [...document.querySelectorAll('[class*=noise]')].every(x=>getComputedStyle(x).display==='none') && document.documentElement.dataset.scroll!=='horizontal';"));
  // Back to full motion: the stacked reduced-motion home is wider than the viewport by design
  // (as on the reference), clipped by html overflow-x, which scrollWidth still reports.
  await session.send("Emulation.setEmulatedMedia", { features: [{ name:"prefers-reduced-motion", value:"no-preference" }] });
  await visit();
  // A synthetic profile tests only header visibility, never authenticates or calls a master.
  await session.evaluate("localStorage.setItem('open77.session',JSON.stringify({token:'local-header-layout-fixture',expiresAtUtc:'2099-01-01',role:'admin',accountId:'fixture',displayName:'Layout',emailVerified:true})); window.dispatchEvent(new StorageEvent('storage',{key:'open77.session'}));");
  await delay(100);
  for (const width of [1680, 1440, 1366, 1280, 1100, 1024, 900, 768, 420]) {
    await resize(width);
    await delay(80);
    check(width + "px: signed-in header fits", await session.evaluate(headerFits));
  }
  await resize(420,900);
  await session.evaluate("document.querySelector('button[aria-controls=site-menu]').click();");
  await delay(150);
  check("admins find the admin console in the menu", await session.evaluate("return !!document.querySelector('#site-menu a[href$=admin]');"));
  await key("Escape","Escape",27);
  await session.evaluate("localStorage.removeItem('open77.session'); window.dispatchEvent(new StorageEvent('storage',{key:'open77.session'}));");
  check("no browser errors", errors.length===0);
  if(errors.length) console.log(errors);
  session.socket.close();
} finally {
  child.kill();
  // Only the exact unique browser profile created above is eligible for cleanup.
  const resolved=path.resolve(profile), base=path.resolve(os.tmpdir()) + path.sep;
  if(resolved.startsWith(base) && path.basename(resolved).startsWith("open77-home-check-")) await fs.rm(resolved,{recursive:true,force:true}).catch(()=>{});
}
console.log(failures ? failures + " checks failed." : "All homepage and navigation checks passed.");
process.exitCode=failures ? 1 : 0;
