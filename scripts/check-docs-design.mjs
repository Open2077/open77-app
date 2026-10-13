/** Docs frame regressions: the site header over the docs, sticky sidebar, Ctrl+K search, no overflow. Isolated browser; no real account/session. */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const origin = process.argv[2] ?? "http://127.0.0.1:3113";
const port = 9348;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let failures = 0;
const check = (label, ok, detail) => { console.log(`${ok ? "PASS" : "FAIL"} ${label}`); if (!ok) { failures++; if (detail) console.log(detail); } };
const candidates = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"];
let binary;
for (const candidate of candidates) { try { await fs.access(candidate); binary = candidate; break; } catch { /* Next binary. */ } }
if (!binary) throw new Error("Chrome not found");
const profile = await fs.mkdtemp(path.join(os.tmpdir(), "open77-docs-design-"));
const child = spawn(binary, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "about:blank"], { windowsHide: true, stdio: "ignore" });
let socket;
try {
  let endpoint;
  for (let attempt = 0; attempt < 60; attempt++) { try { endpoint = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl; break; } catch { await delay(250); } }
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve); socket.addEventListener("error", reject); });
  let id = 0, sessionId;
  const pending = new Map(), errors = [];
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.id) { const item = pending.get(message.id); pending.delete(message.id); if (message.error) item?.reject(message.error); else item?.resolve(message.result); }
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails);
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") errors.push(message.params.args.map(a => a.value ?? a.description));
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const next = ++id; pending.set(next, { resolve, reject }); socket.send(JSON.stringify({ id: next, method, params, ...(sessionId ? { sessionId } : {}) })); });
  const target = await send("Target.createTarget", { url: "about:blank" });
  sessionId = (await send("Target.attachToTarget", { targetId: target.targetId, flatten: true })).sessionId;
  await send("Page.enable"); await send("Runtime.enable");
  const evaluate = async source => {
    const result = await send("Runtime.evaluate", { expression: `(async()=>{${source}})()`, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? "Evaluation failed");
    return result.result.value;
  };
  const ready = async route => {
    for (let attempt = 0; attempt < 200; attempt++) {
      if (await evaluate(`return location.pathname===${JSON.stringify(route.split("?")[0].split("#")[0])} && document.readyState==='complete' && !!document.querySelector('main');`)) { await evaluate("await document.fonts.ready;"); await delay(500); return; }
      await delay(100);
    }
    throw new Error(`Timeout on ${route}`);
  };
  const visit = async route => { await send("Page.navigate", { url: origin + route }); await ready(route); };
  const resize = width => send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
  const shot = async name => { await fs.mkdir(".shots", { recursive: true }); const { data } = await send("Page.captureScreenshot", { format: "png" }); await fs.writeFile(path.join(".shots", name + ".png"), Buffer.from(data, "base64")); };

  // The site header stays on every docs page; the docs bring their own sidebar, search and outline below it.
  for (const route of ["/docs", "/docs/vehicles"]) {
    await resize(1680); await visit(route);
    for (const width of [1680, 1280, 1100, 800, 760, 420, 375, 320]) {
      await resize(width); await delay(200);
      await evaluate("scrollTo({top:0,behavior:'instant'});");
      const state = await evaluate(`
        const header=document.querySelector('body > header');
        return {site: !!header && !!header.querySelector('nav[aria-label="Main"]'), legacy: !!document.querySelector('.docs-header, .docs-site, [class*="docs-theme"]'),
          overflow: document.documentElement.scrollWidth>innerWidth, h1: document.querySelectorAll('h1').length};
      `);
      check(`${route} ${width}px: site header, no legacy docs header, one h1, no overflow`, state.site && !state.legacy && state.h1 === 1 && !state.overflow, state);
      if ([1680, 375].includes(width)) await shot(`docs-redesign${route.replaceAll("/", "-")}-${width}`);
    }
  }

  await resize(1440); await visit("/docs/vehicles");
  await evaluate("scrollTo({top:2400,behavior:'instant'});"); await delay(250);
  const sticky = await evaluate("const h=document.querySelector('body > header').getBoundingClientRect(),n=document.querySelector('[data-docs-nav]').getBoundingClientRect();return {header:h.bottom,sidebar:n.top,current:!!document.querySelector('[data-docs-nav] a[aria-current=\"page\"]')};");
  check("sidebar sticks right under the site header and marks the current guide", Math.abs(sticky.header - sticky.sidebar) < 2 && sticky.current, sticky);

  await evaluate("scrollTo({top:0,behavior:'instant'});");
  await evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}));"); await delay(300);
  check("Ctrl+K opens the documentation search", await evaluate("return !!document.querySelector('dialog[open]') && document.activeElement===document.querySelector('[aria-label=\"Search documentation and API\"]');"));
  await evaluate("const i=document.activeElement; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'vehicles');i.dispatchEvent(new Event('input',{bubbles:true}));"); await delay(200);
  const results = await evaluate("return [...document.querySelectorAll('#docs-search-results a')].map(a => a.textContent);");
  check("search returns guides and API functions", results.some(text => /Vehicles/.test(text)) && results.some(text => /API/.test(text)), results);
  await evaluate("document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));");
  check("search results support keyboard focus", await evaluate("return document.activeElement.matches('#docs-search-results a');"));
  await evaluate("document.querySelector('[aria-label=\"Search documentation and API\"]').focus(); document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));"); await delay(150);
  check("Escape closes the search", await evaluate("return !document.querySelector('dialog[open]');"));
  await evaluate("document.querySelector('[data-docs-nav] [data-docs-search-trigger]')?.click();"); await delay(250);
  check("the sidebar search field opens the same search", await evaluate("const open=!!document.querySelector('dialog[open]'); document.querySelector('dialog[open]')?.close(); return open;"));

  for (const route of ["/docs/vehicles", "/docs/native-map", "/docs/platform", "/docs/host-a-server", "/docs/api", "/docs/api/client/open77-vehicles"]) {
    await visit(route);
    for (const width of [1440, 1024, 375, 320]) {
      await resize(width); await delay(150);
      check(`${route} at ${width}px fits`, await evaluate("return document.documentElement.scrollWidth<=innerWidth;"));
      if (width === 1440 || width === 375) await shot(`docs-redesign-${route.split("/").at(-1)}-${width}`);
    }
  }
  await resize(1440); await visit("/docs/host-a-server");
  const tone = await evaluate("return {page:getComputedStyle(document.querySelector('main')).getPropertyValue('--tone').trim(),blue:getComputedStyle(document.documentElement).getPropertyValue('--blue').trim()};");
  check("hosting guides take the creators' blue tone", tone.page === tone.blue, tone);

  await resize(1440); await visit("/docs");
  for (const route of ["/", "/docs", "/", "/docs"]) {
    await evaluate(`scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});document.querySelector('a[href="${route}"]').click();`);
    await ready(route); await delay(300);
    const state = await evaluate("return {y:scrollY,site:!!document.querySelector('body > header nav[aria-label=\"Main\"]')};");
    check(`client navigation to ${route} keeps the site header and starts at top`, state.y <= 1 && state.site, state);
  }
  check("no browser errors", errors.length === 0, errors);
} finally {
  socket?.close(); child.kill();
  const resolved = path.resolve(profile), base = path.resolve(os.tmpdir()) + path.sep;
  if (resolved.startsWith(base) && path.basename(resolved).startsWith("open77-docs-design-")) await fs.rm(resolved, { recursive: true, force: true }).catch(() => {});
}
process.exitCode = failures ? 1 : 0;
