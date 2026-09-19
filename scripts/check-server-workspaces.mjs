/** Browser regression for directory navigation and account presentation. All API calls are local fixtures. */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const origin = process.argv[2] ?? "http://127.0.0.1:3000";
const DEBUG_PORT = 9370;

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

const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'open77-workspace-check-'));
const child = spawn(await findChrome(), ['--headless=new', '--remote-debugging-port='+DEBUG_PORT, '--user-data-dir='+profile, '--no-first-run', 'about:blank'], {stdio:'ignore',windowsHide:true});
let failures=0; const errors=[];
const check=(name,pass)=>{console.log((pass?'PASS ':'FAIL ')+name);if(!pass)failures++;};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
try {
  const session=await connect(await waitForDevTools());
  const {targetId}=await session.send('Target.createTarget',{url:'about:blank'},false);
  session.sessionId=(await session.send('Target.attachToTarget',{targetId,flatten:true},false)).sessionId;
  await session.send('Runtime.enable');await session.send('Page.enable');
  session.on('Runtime.exceptionThrown',p=>errors.push(p.exceptionDetails.exception?.description));
  session.on('Runtime.consoleAPICalled',p=>{if(p.type==='error')errors.push(p.args.map(a=>a.value??a.description).join(' '));});
  await session.send('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.__calls=[];
    const fixtureAccount={accountId:'workspace-test',displayName:'Workspace QA',email:'qa@example.invalid',emailVerified:true,role:'user',alphaAccess:true,identities:[]};
    if(sessionStorage.getItem('guest')!=='true')localStorage.setItem('open77.session',JSON.stringify({...fixtureAccount,token:'local-browser-fixture',expiresAtUtc:'2099-01-01T00:00:00Z'}));
    else localStorage.removeItem('open77.session');
    const items=Array.from({length:32},(_,i)=>({id:'fixture-'+i,name:i===0?'Night City Roleplay':'Community World '+String(i).padStart(2,'0'),description:'Community events, custom worlds and a city to explore together.',locale:'fr-FR',tags:['Roleplay','Economy','Events'],connectedPlayers:32-i,maximumPlayers:64,iconUrl:location.origin+'/brand/logo/open77-mark-1024.png',bannerUrl:null,website:'https://example.invalid',discord:null,serverVersion:'2.31.13+op77.82',protocol:{major:1,minor:0},expectedGameBuild:231,connectEndpoint:'127.0.0.1:11778',startedAtUtc:'2026-09-19T12:00:00Z',lastHeartbeatAtUtc:new Date().toISOString()}));
    const projects=['Night City Essentials','A new life in Watson'].map((title,i)=>({projectId:'project-'+i,ownerAccountId:'workspace-test',slug:'fixture-'+i,state:i?'published':'draft',revision:1,revisionStatus:'draft',publishedAtUtc:i?'2026-09-19T12:00:00Z':null,content:{title,summary:'A collection of community scripts and gameplay for your own Night City.',category:'scripts',kind:'resource',maturity:'experimental',description:'Fixture project',installation:'',tags:[]}}));
    const originalFetch=window.fetch;
    window.fetch=async(input,init={})=>{
      const url=new URL(typeof input==='string'?input:input.url,location.href),p=url.pathname;
      if(!p.startsWith('/api/v1/'))return originalFetch(input,init);
      window.__calls.push({path:p,method:init.method??'GET'});
      const json=(body,status=200)=>Promise.resolve(new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}}));
      const scenario=sessionStorage.getItem('scenario');
      if(p==='/api/v1/servers')return json({page:1,total:items.length,items});
      if(p.startsWith('/api/v1/servers/')){
        await new Promise(r=>setTimeout(r,350));
        if(scenario==='missing')return json({code:'not_found'},404);
        if(scenario==='error')return json({code:'unavailable',message:'The directory is temporarily unavailable.'},503);
        const item=items.find(item=>item.id===p.split('/').pop())??items[0];
        return json({...item,players:{sampledAtUtc:new Date().toISOString(),entries:Array.from({length:16},(_,i)=>({name:'Player '+(i+1),joinedAtUtc:'2026-09-19T20:00:00Z'}))}});
      }
      if(p.endsWith('/accounts/me'))return json(fixtureAccount);
      if(p.endsWith('/accounts/licenses'))return json(scenario==='empty'?[]:[{licenseId:'license-1',label:'Night City Roleplay',keyHint:'TEST',createdAtUtc:'2026-09-19T12:00:00Z',revokedAtUtc:null},{licenseId:'license-2',label:'Development server',keyHint:'DEMO',createdAtUtc:'2026-09-18T12:00:00Z',revokedAtUtc:'2026-09-19T12:00:00Z'}]);
      if(p.endsWith('/me/projects'))return json({items:scenario==='empty'?[]:projects,nextCursor:null});
      if(p.endsWith('/me/quotas'))return json({effective:{draftProjectsPerAccount:10,activeUploadsPerAccount:3,pendingBytesPerAccount:104857600,gitHubImportsPerDay:10}});
      if(p.endsWith('/limits'))return json({limits:{packageBytes:104857600,imageBytes:1048576,imagePixels:4000000,expandedBytes:104857600,archiveEntries:1000}});
      return json({code:'blocked_fixture',message:'Unmocked API request blocked in browser test.'},400);
    };
  `});
  const resize=(width,height=1000)=>session.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  async function visit(route){await session.send('Page.navigate',{url:origin+route});for(let i=0;i<150;i++){await delay(100);if(await session.evaluate(`return location.pathname===${JSON.stringify(route.split('?')[0])}&&document.readyState==='complete'&&!!document.querySelector('main');`))break;}await session.evaluate('await document.fonts.ready;');await delay(500);}
  const click=async selector=>{await session.evaluate(`document.querySelector(${JSON.stringify(selector)}).click();`);await delay(100);};
  async function shot(name){await fs.mkdir('.shots',{recursive:true});const {data}=await session.send('Page.captureScreenshot',{format:'png'});await fs.writeFile('.shots/'+name+'.png',Buffer.from(data,'base64'));}
  await resize(1440,900);await visit('/servers?mode=Roleplay');
  await session.evaluate(`window.__listNode=document.querySelector('.sb-list');document.querySelector('.sb-col-main').scrollTop=200;window.__listScroll=document.querySelector('.sb-col-main').scrollTop;document.querySelector('.sb-row-link').click();`);
  await delay(80);
  check('detail opens in place immediately without loading flash',await session.evaluate(`return !!document.querySelector('.sv-name')&&!document.querySelector('.directory-profile-view .sb-offline')&&window.__listNode===document.querySelector('.sb-list')&&location.pathname==='/servers/fixture-0';`));
  await delay(450);
  check('full details complete the directory snapshot',await session.evaluate(`return document.querySelectorAll('.sv-playerlist li').length===16;`));
  check('long roster is keyboard scrollable',await session.evaluate(`const r=document.querySelector('.sv-playerlist-box');return r.tabIndex===0&&r.scrollHeight>r.clientHeight;`));
  await shot('server-profile-desktop');
  await click('.directory-profile-toolbar button');
  check('Back restores list, filters and scroll',await session.evaluate(`return location.pathname==='/servers'&&location.search==='?mode=Roleplay'&&window.__listNode===document.querySelector('.sb-list')&&document.querySelector('.sb-col-main').scrollTop===window.__listScroll&&!document.querySelector('.directory-list-view').hidden;`));
  await session.evaluate('history.forward();');await delay(450);
  check('browser Forward restores profile',await session.evaluate(`return location.pathname==='/servers/fixture-0'&&!!document.querySelector('.sv-name');`));
  await session.evaluate('history.back();');await delay(150);
  await click('.sb-row');
  check('whole row opens profile',await session.evaluate(`return !!document.querySelector('.sv-name');`));
  await delay(350);
  for(const width of [1920,1440,1024,800,640,420,375,320]){
    await resize(width,900);await delay(100);
    const layout=await session.evaluate(`const p=document.querySelector('.directory-profile-scroll');return {fits:document.documentElement.scrollWidth<=innerWidth&&p.scrollWidth<=p.clientWidth+1,pageScroll:document.documentElement.scrollHeight<=innerHeight+1};`);
    check('profile '+width+'px fits inside directory',layout.fits&&layout.pageScroll);if(!layout.fits)console.log(layout);
    if(width===375)await shot('server-profile-mobile');
  }
  await resize(1440);await visit('/servers/fixture-0');
  check('direct detail URL renders same workspace',await session.evaluate(`return !!document.querySelector('.directory-profile-view .sv-name');`));
  await click('.directory-profile-toolbar button');
  check('direct detail URL can return to populated list',await session.evaluate(`return location.pathname==='/servers'&&document.querySelectorAll('.sb-row').length===32;`));
  for(const scenario of ['missing','error']){
    await session.evaluate(`sessionStorage.setItem('scenario',${JSON.stringify(scenario)});`);await visit('/servers/fixture-0');
    check('detail '+scenario+' state',await session.evaluate(`return !!document.querySelector('.directory-profile-view .sb-offline h1');`));
  }
  await session.evaluate(`sessionStorage.removeItem('scenario');`);await click('.sb-offline-ctas button');await delay(450);
  check('detail retry recovers',await session.evaluate(`return !!document.querySelector('.sv-name');`));
  for(const route of ['/account/keys','/account/creations','/account/creations/new']){
    await resize(1440);await visit(route);
    for(const width of [1440,1024,768,420,375,320]){
      await resize(width);await delay(100);
      check(route+' '+width+'px fits',await session.evaluate(`return document.documentElement.scrollWidth<=innerWidth&&document.querySelectorAll('main').length===1&&document.querySelectorAll('h1').length===1;`));
      if(width===1440||width===375)await shot(route.replaceAll('/','-').slice(1)+'-'+width);
    }
    check(route+' keeps noindex',await session.evaluate(`return document.querySelector('meta[name="robots"]').content.includes('noindex');`));
    if(route==='/account/keys'){
      await session.evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='New key').click();`);await delay(150);
      check('key form opens with working disabled empty submit',await session.evaluate(`return !!document.querySelector('.ac-input')&&document.querySelector('.ac-form button[type=submit]').disabled;`));
      await shot('keymaster-create-mobile');
      await session.evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Cancel').click();`);
    }
  }
  await session.evaluate(`sessionStorage.setItem('scenario','empty');`);
  await visit('/account/creations');check('empty creations state',await session.evaluate(`return !!document.querySelector('.hub-empty');`));await shot('creations-empty');
  await visit('/account/keys');check('empty keys state',await session.evaluate(`return !!document.querySelector('.ac-key-empty');`));
  await session.evaluate(`sessionStorage.setItem('guest','true');`);
  for(const route of ['/account/keys','/account/creations']){
    await visit(route);check(route+' signed-out gate',await session.evaluate(`return !!document.querySelector('.auth-panel')&&document.documentElement.scrollWidth<=innerWidth;`));
  }
  check('no browser exceptions or console errors',errors.length===0);if(errors.length)console.log(errors);
  session.socket.close();
} finally { child.kill(); }
process.exitCode=failures?1:0;
