/** Single-header and theme regressions. Isolated browser; no real account/session. */
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
  await resize(1680); await visit("/docs");
  for (const theme of ["dark", "light"]) {
    await evaluate(`localStorage.setItem('open77.docs.theme', '${theme}'); window.dispatchEvent(new Event('open77:docs-theme'));`);
    await delay(150);
    for (const width of [1680, 1280, 1100, 800, 760, 420, 375, 320]) {
      await resize(width); await delay(200);
      await evaluate("scrollTo({top:0,behavior:'instant'});");
      const state = await evaluate(`
        const header=document.querySelector('.docs-header'), r=header.getBoundingClientRect();
        const children=[...header.querySelectorAll('.docs-header-bar > *, .docs-tabs a')].filter(e=>e.getClientRects().length);
        return {single: !document.querySelector('.site-header'), overflow: document.documentElement.scrollWidth>innerWidth,
          contained: children.every(e=>{const b=e.getBoundingClientRect();return b.left>=0 && b.right<=innerWidth;}),
          background:getComputedStyle(header).backgroundColor, image:header.querySelector('img').getAttribute('src'), top:r.top, height:r.height};
      `);
      check(`${theme} ${width}px: one header, contained controls, opaque surface, matching logo`, state.single && !state.overflow && state.contained && state.background === (theme === "dark" ? "rgb(7, 15, 24)" : "rgb(246, 249, 251)") && state.image.endsWith(`-${theme}.png`), state);
      if ([1680, 375].includes(width)) await shot(`docs-redesign-${theme}-${width}`);
      await evaluate("scrollTo({top:850,behavior:'instant'});"); await delay(150);
      const sticky = await evaluate("const h=document.querySelector('.docs-header').getBoundingClientRect(),n=document.querySelector('.dx-nav').getBoundingClientRect();return {header:h.top,bottom:h.bottom,sidebar:n.top};");
      check(`${theme} ${width}px: header and sidebar stay aligned on scroll`, Math.abs(sticky.header)<1 && Math.abs(sticky.bottom-sticky.sidebar)<1, sticky);
      if (width === 1680) await shot(`docs-redesign-${theme}-scrolled`);
    }
  }
  await resize(1440); await visit('/docs');
  await evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}));");
  check('Ctrl+K selects documentation search', await evaluate("return document.activeElement===document.querySelector('.docs-global-search input');"));
  await evaluate("const i=document.activeElement; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'vehicles');i.dispatchEvent(new Event('input',{bubbles:true}));");await delay(200);
  await evaluate("document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));");
  check('search results support keyboard focus',await evaluate("return document.activeElement.matches('.docs-search-results a');"));
  await evaluate("document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));");await delay(100);
  check('Escape dismisses results and returns to search',await evaluate("return !document.querySelector('.docs-search-results') && document.activeElement.matches('.docs-global-search input');"));
  for (const route of ['/docs/vehicles','/docs/native-map','/docs/api','/docs/api/client/open77-vehicles']) {
    await visit(route);
    for (const width of [1440,375,320]) {
      await resize(width); await delay(150);
      check(`${route} at ${width}px fits`, await evaluate("return document.documentElement.scrollWidth<=innerWidth;"));
      if(width!==320) await shot(`docs-redesign-${route.split('/').at(-1)}-${width}`);
    }
  }
  await resize(1440); await visit('/docs');
  for (const route of ['/','/docs','/','/download','/docs']) {
    await evaluate(`scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});document.querySelector('a[href="${route}"]').click();`);
    await ready(route); await delay(300);
    const state = await evaluate("return {y:scrollY,docs:!!document.querySelector('.docs-header'),site:!!document.querySelector('.site-header'),height:getComputedStyle(document.documentElement).getPropertyValue('--header-h')};");
    check(`client navigation ${route} restores correct header and starts at top`, state.y<=1 && state.docs===(route==='/docs') && state.site===(route!=='/docs') && (route==='/docs'||parseInt(state.height)>0),state);
  }
  check('no browser errors',errors.length===0,errors);
} finally {
  socket?.close(); child.kill();
  const resolved = path.resolve(profile), base = path.resolve(os.tmpdir()) + path.sep;
  if(resolved.startsWith(base) && path.basename(resolved).startsWith('open77-docs-design-')) await fs.rm(resolved,{recursive:true,force:true}).catch(()=>{});
}
process.exitCode = failures ? 1 : 0;
