/** Reproduce images decoding before hydration, using a real public server profile. */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const origin = process.argv[2] ?? "http://127.0.0.1:3000";
const DEBUG_PORT = 9372;
const serverId = process.argv[3] ?? "f0632669-2af0-469d-a475-9ffea58dc942";

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

const profile=await fs.mkdtemp(path.join(os.tmpdir(),'open77-image-check-'));
const child=spawn(await findChrome(),['--headless=new','--remote-debugging-port='+DEBUG_PORT,'--user-data-dir='+profile,'--no-first-run','about:blank'],{stdio:'ignore',windowsHide:true});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let failures=0;
const check=(name,pass)=>{console.log((pass?'PASS ':'FAIL ')+name);if(!pass)failures++;};
try {
  const session=await connect(await waitForDevTools());
  const {targetId}=await session.send('Target.createTarget',{url:'about:blank'},false);
  session.sessionId=(await session.send('Target.attachToTarget',{targetId,flatten:true},false)).sessionId;
  await session.send('Runtime.enable');await session.send('Page.enable');
  if (['localhost','127.0.0.1'].includes(new URL(origin).hostname)) {
    // The public API disallows browser CORS from localhost. Replay its public
    // response locally; image downloads and static HTML remain real.
    const response=await fetch('https://master.open2077.net/api/v1/servers/'+encodeURIComponent(serverId));
    if(!response.ok)throw new Error('Public test server unavailable');
    const server=await response.json();
    await session.send('Page.addScriptToEvaluateOnNewDocument',{source:`
      const fixture=${JSON.stringify(server)};
      const original=window.fetch;
      window.fetch=(input,init)=>{
        const url=new URL(typeof input==='string'?input:input.url,location.href);
        if(url.pathname.startsWith('/api/v1/servers'))return Promise.resolve(new Response(JSON.stringify(url.pathname==='/api/v1/servers'?{items:[fixture],total:1,page:1,pageSize:100}:fixture),{status:200,headers:{'Content-Type':'application/json'}}));
        return original(input,init);
      };
    `});
  }

  await session.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  const errors=[];session.on('Runtime.exceptionThrown',p=>errors.push(p.exceptionDetails.exception?.description));
  let hold=true;const pending=[];
  session.on('Fetch.requestPaused',p=>{if(hold)pending.push(p.requestId);else void session.send('Fetch.continueRequest',{requestId:p.requestId});});
  await session.send('Fetch.enable',{patterns:[{urlPattern:'*/_next/*',resourceType:'Script',requestStage:'Request'}]});
  await session.send('Page.navigate',{url:origin+'/servers/'+encodeURIComponent(serverId)});
  for(let i=0;i<100;i++){await delay(100);if(await session.evaluate(`return document.querySelectorAll('.sv-cover img').length===2&&[...document.querySelectorAll('.sv-cover img')].every(i=>i.complete&&i.naturalWidth>0);`))break;}
  check('server images decode before hydration',await session.evaluate(`return document.querySelectorAll('.sv-cover img').length===2&&[...document.querySelectorAll('.sv-cover img')].every(i=>i.complete&&i.naturalWidth>0);`));
  hold=false;await Promise.all(pending.map(requestId=>session.send('Fetch.continueRequest',{requestId})));
  await delay(2500);
  const images=await session.evaluate(`return [...document.querySelectorAll('.sv-cover img')].map(i=>({src:i.src,complete:i.complete,width:i.naturalWidth,height:i.naturalHeight,opacity:getComputedStyle(i).opacity,loaded:i.closest('.svimg').classList.contains('is-loaded')}));`);
  console.log(images);
  check('decoded icon and banner become visible after hydration',images.length===2&&images.every(i=>i.loaded&&i.opacity==='1'));
  await session.send('Page.reload');await delay(2500);
  check('warm reload also shows both images',await session.evaluate(`return document.querySelectorAll('.sv-cover img').length===2&&[...document.querySelectorAll('.sv-cover img')].every(i=>i.complete&&i.naturalWidth>0&&getComputedStyle(i).opacity==='1');`));
  check('no hydration exceptions',errors.length===0);if(errors.length)console.log(errors);
  const {data}=await session.send('Page.captureScreenshot',{format:'png'});await fs.mkdir('.shots',{recursive:true});await fs.writeFile('.shots/server-images-hydrated.png',Buffer.from(data,'base64'));
  session.socket.close();
}finally{child.kill();}
process.exitCode=failures?1:0;
