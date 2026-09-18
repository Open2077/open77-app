/**
 * Download/hosting design regression in an isolated headless browser.
 * Covers navigation scroll, history, anchors, checksums, download feedback,
 * responsive layouts, Alpha download cards and reduced motion.
 * Never downloads an executable or authenticates against the real master.
 * Usage: node scripts/check-download-design.mjs [origin]
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const origin = process.argv[2] ?? "http://127.0.0.1:3000";
const DEBUG_PORT = 9347;

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
      expression: `(async () => { ${expression} })()`,
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


const profile = await fs.mkdtemp(path.join(os.tmpdir(), "open77-download-check-"));
const child = spawn(await findChrome(), ["--headless=new", "--remote-debugging-port=" + DEBUG_PORT, "--user-data-dir=" + profile, "--no-first-run", "--no-default-browser-check", "--force-device-scale-factor=1", "about:blank"], { stdio: "ignore", windowsHide: true });
let failures=0;
const check=(name,ok)=>{console.log((ok?"PASS ":"FAIL ")+name);if(!ok)failures++;};
try {
  const session=await connect(await waitForDevTools());
  const {targetId}=await session.send("Target.createTarget",{url:"about:blank"},false);
  session.sessionId=(await session.send("Target.attachToTarget",{targetId,flatten:true},false)).sessionId;
  await session.send("Runtime.enable"); await session.send("Page.enable");
  const errors=[];
  session.on("Runtime.exceptionThrown",p=>errors.push(p.exceptionDetails.exception?.description??"exception"));
  session.on("Runtime.consoleAPICalled",p=>{if(p.type==="error")errors.push(p.args.map(a=>a.value??a.description).join(" "));});
  const delay=ms=>new Promise(r=>setTimeout(r,ms));
  const resize=width=>session.send("Emulation.setDeviceMetricsOverride",{width,height:1000,deviceScaleFactor:1,mobile:false});
  async function ready(route) {
    for(let i=0;i<160;i++){
      if(await session.evaluate("return location.pathname==="+JSON.stringify(route)+" && document.readyState==='complete' && !!document.querySelector('main');"))break;
      await delay(150);
    }
    await session.evaluate("await document.fonts.ready;");
    await delay(400);
  }
  async function visit(route){await session.send("Page.navigate",{url:origin+route});await ready(route);}
  async function screenshot(name,full=false){
    const m=await session.send("Page.getLayoutMetrics");
    const img=await session.send("Page.captureScreenshot",{format:"png",...(full?{captureBeyondViewport:true,clip:{x:0,y:0,width:m.cssContentSize.width,height:m.cssContentSize.height,scale:1}}:{})});
    await fs.mkdir(".shots",{recursive:true});
    await fs.writeFile(path.join(".shots",name+".png"),Buffer.from(img.data,"base64"));
  }
  await resize(1680); await visit("/");
  for(const route of ["/download","/create","/host","/servers","/devblog","/workshop","/docs","/download","/"]) {
    await session.evaluate("window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});");
    await session.evaluate("document.querySelector('a[href="+JSON.stringify(route)+"]').click();");
    await ready(route); await delay(600);
    const result=await session.evaluate("return {path:location.pathname,y:scrollY,main:document.querySelector('main').getBoundingClientRect().top,height:document.documentElement.scrollHeight,focused:document.activeElement?.outerHTML.slice(0,120)};");
    check("navigation to "+route+" starts at top", result.y<=1);
    if(result.y>1)console.log("NAV",result);
  }
  // Hash navigation and Back/Forward must remain browser/router managed.
  await visit('/download');
  await session.evaluate("document.querySelector('a[href=\"#requirements\"]').click();");
  await delay(900);
  check('requirements anchor clears the sticky navigation',await session.evaluate("const r=document.getElementById('requirements').getBoundingClientRect();const bar=document.querySelector('.liquid-bar').getBoundingClientRect();return location.hash==='#requirements' && r.top>=bar.bottom && r.top<innerHeight;"));
  const restoredY=await session.evaluate("return scrollY;");
  await session.evaluate("document.querySelector('.liquid-nav a[href=\"/create\"]').click();");
  await ready('/create');
  check('cross-page link from an anchor resets scroll',await session.evaluate("return scrollY===0 && !location.hash;"));
  await session.evaluate("history.back();");await ready('/download');await delay(700);
  const back=await session.evaluate("return {path:location.pathname,hash:location.hash,y:scrollY,target:document.getElementById('requirements')?.getBoundingClientRect().top,expected:"+restoredY+"};");
  check('Back restores the previous location',back.hash==='#requirements' && Math.abs(back.y-restoredY)<5);
  if(Math.abs(back.y-restoredY)>=5)console.log('BACK',back);
  await session.evaluate("history.forward();");await ready('/create');await delay(500);
  check('Forward returns to the next page',await session.evaluate("return scrollY===0;"));

  await visit('/download');
  await session.evaluate("document.querySelector('#get summary').click();");
  check('file details expand with full SHA-256',await session.evaluate("return document.querySelector('#get details').open && /^[a-f0-9]{64}$/i.test(document.querySelector('#get .copy-line-value').textContent);"));
  await session.send('Browser.grantPermissions',{origin,permissions:['clipboardReadWrite','clipboardSanitizedWrite']},false);
  await session.evaluate("document.querySelector('#get button[aria-label=\"Copy launcher SHA-256\"]').click();");
  await delay(100);
  check('checksum copies the full digest',await session.evaluate("return await navigator.clipboard.readText()===document.querySelector('#get .copy-line-value').textContent;"));
  await session.evaluate("document.querySelector('#get summary').click();");
  check('file details collapse',await session.evaluate("return !document.querySelector('#get details').open;"));
  // Cancel the browser default after React's click handler: never download an EXE in a UI test.
  await session.evaluate("window.addEventListener('click',e=>e.preventDefault(),{once:true});document.querySelector('#get a[href]').click();");
  await delay(100);
  check('download acknowledges a request, not a fake completed transfer',await session.evaluate("return document.querySelector('#get [role=status]').textContent.startsWith('Download requested.') && document.querySelector('#get a[href]').href.includes('/launcher/');"));
  await session.evaluate("document.querySelector('#requirements details summary').click();");
  check('FAQ opens',await session.evaluate("return document.querySelector('#requirements details').open;"));
  await session.evaluate("document.querySelector('[data-release-refresh] button').click();");
  await delay(1200);
  check('refresh keeps the current release channel visible',await session.evaluate("return !!document.querySelector('[data-release-channel=launcher][data-release-version]');"));
  for(const route of ["/download","/create","/host"]) {
    for(const width of [1680,1100,768,420,320]){
      await resize(width);await visit(route);
      const result=await session.evaluate("return {fit:document.documentElement.scrollWidth<=innerWidth,title:document.querySelectorAll('h1').length===1,images:[...document.images].filter(i=>i.getBoundingClientRect().top<innerHeight&&i.getBoundingClientRect().bottom>0).every(i=>i.complete&&i.naturalWidth>0),brokenAria:[...document.querySelectorAll('[aria-labelledby]')].filter(e=>e.getAttribute('aria-labelledby').split(' ').some(id=>!document.getElementById(id))).length};");
      check(route+" "+width+"px layout",result.fit&&result.title&&result.images&&!result.brokenAria);
      if(!result.fit)console.log(await session.evaluate("return [...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,15).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width}));"));
      if([1680,420].includes(width))await screenshot(route.slice(1)+"-redesign-"+width,width===420);
    }
  }
  // An isolated Alpha fixture; the fake token never reaches the master.
  const fixture=await session.send('Page.addScriptToEvaluateOnNewDocument',{source:`
    localStorage.setItem('open77.session',JSON.stringify({token:'download-design-fixture',accountId:'fixture',expiresAtUtc:'2099-01-01',displayName:'Alpha fixture',role:'user',emailVerified:true}));
    const original=window.fetch.bind(window);
    window.fetch=async(input,init)=>{
      const url=typeof input==='string'?input:input.url;
      if(new URL(url,location.href).pathname==='/api/v1/accounts/me') {
        await new Promise(r=>setTimeout(r,900));
        return new Response(JSON.stringify({accountId:'fixture',displayName:'Alpha fixture',role:'user',alphaAccess:true,alphaGateActive:true,email:'fixture@example.test',emailVerified:true,identities:[]}),{status:200,headers:{'Content-Type':'application/json'}});
      }
      return original(input,init);
    };`});
  for(const width of [1680,420,320]){
    await resize(width);await visit('/host');await delay(1000);
    check('Alpha downloads '+width+'px fit',await session.evaluate("return document.documentElement.scrollWidth<=innerWidth && document.querySelectorAll('a[href*=\"/server/\"][href^=\"https://cdn.\"]').length===2 && !document.querySelector('.host-locked');"));
    await session.evaluate("document.querySelectorAll('main details').forEach(e=>e.open=true);");
    check('expanded archive details '+width+'px fit',await session.evaluate("return document.documentElement.scrollWidth<=innerWidth;"));
    await session.evaluate("document.querySelectorAll('main details').forEach(e=>e.open=false);document.getElementById('download').scrollIntoView({behavior:'instant'});");
    if(width!==320)await screenshot('host-approved-'+width);
  }
  await session.send('Page.removeScriptToEvaluateOnNewDocument',{identifier:fixture.identifier});
  await session.evaluate("localStorage.removeItem('open77.session');");
  await session.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await visit('/download');
  check('reduced motion includes scroll and entrance effects',await session.evaluate("return getComputedStyle(document.documentElement).scrollBehavior==='auto' && getComputedStyle(document.querySelector('h1').parentElement).animationName==='none';"));
  check("no browser exceptions",errors.length===0);if(errors.length)console.log(errors);
  session.socket.close();
} finally {
  child.kill();
  const resolved=path.resolve(profile),base=path.resolve(os.tmpdir())+path.sep;
  if(resolved.startsWith(base)&&path.basename(resolved).startsWith("open77-download-check-")) await fs.rm(resolved,{recursive:true,force:true}).catch(()=>{});
}
process.exitCode=failures?1:0;
