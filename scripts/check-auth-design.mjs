/** Isolated authentication UI regression. All account/OAuth API requests are mocked. */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const origin = process.argv[2] ?? "http://127.0.0.1:3113";
const navigationOnly = process.argv.includes('--navigation-only');
const port = 9350;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let failures = 0;
const check = (label, ok, detail) => { console.log(`${ok ? "PASS" : "FAIL"} ${label}`); if (!ok) { failures++; if (detail) console.log(detail); } };
let binary;
for (const candidate of ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"]) { try { await fs.access(candidate); binary = candidate; break; } catch { /* Next binary. */ } }
if (!binary) throw new Error("Chrome not found");
const profile = await fs.mkdtemp(path.join(os.tmpdir(), "open77-auth-design-"));
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
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    window.__authCalls=[]; window.__authScenario='ok';
    window.__testAccount={accountId:'test-account',email:'tester@example.invalid',displayName:'Auth QA',role:'user',emailVerified:true,identities:[],alphaAccess:false};
    const originalFetch=window.fetch;
    window.fetch=async(input,init={})=>{
      const url=new URL(typeof input==='string'?input:input.url,location.href);
      if(!url.pathname.startsWith('/api/v1/')) return originalFetch(input,init);
      const p=url.pathname, body=init.body?JSON.parse(init.body):null;
      window.__authCalls.push({path:p,body});
      await new Promise(r=>setTimeout(r,200));
      const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
      if(window.__authScenario==='network') throw new TypeError('Simulated offline');
      if(window.__authScenario==='rate') return json({code:'rate_limited'},429);
      if(p.endsWith('/login')) return window.__authScenario==='bad-login'?json({code:'invalid_credentials',message:'E-mail or password is incorrect.'},401):json({...window.__testAccount,token:'auth-test-token',expiresAtUtc:'2099-01-01T00:00:00Z'});
      if(p.endsWith('/register')) return json({accountId:'test-account',email:body.email,verificationToken:null});
      if(p.endsWith('/password/forgot')) return window.__authScenario==='unknown-email'?json({code:'unknown'},404):new Response(null,{status:202});
      if(p.endsWith('/password/reset')) return window.__authScenario==='expired'?json({code:'invalid_reset',message:'Expired'},400):new Response(null,{status:204});
      if(p.endsWith('/verify-email')) return window.__authScenario==='expired'?json({code:'invalid_token',message:'Verification link expired.'},400):new Response(null,{status:204});
      if(p.endsWith('/resend')||p.endsWith('/logout')) return new Response(null,{status:202});
      if(p.endsWith('/accounts/me')) return window.__authScenario==='unauthorized'?json({code:'unauthorized'},401):window.__authScenario==='account-error'?json({code:'unavailable',message:'Your account is temporarily unavailable.'},503):json(window.__testAccount);
      if(p.endsWith('/github/callback')) return json({connection:{login:'auth-qa'},repositoryId:null,repositoryControlVerified:false,returnPath:'/account/github'});
      if(p.endsWith('/github/connection')) return json({connection:{revision:1,userId:null,login:null,linkedAtUtc:null},oauthAvailable:true,controlVerifiedAtUtc:null});
      if(p.endsWith('/github/connect')) return json({authorizationUrl:'https://unsafe.example.invalid/redirect',state:'a'.repeat(43),expiresAtUtc:new Date(Date.now()+300000).toISOString()});
      if(p.endsWith('/device/preview')) return json({label:'QA Warden',scopes:['drafts.write'],expiresAtUtc:new Date(Date.now()+300000).toISOString()});
      if(p.endsWith('/me/projects')) return json({items:[],nextCursor:null});
      if(p.endsWith('/device/approve')) return json({connectionId:'test-connection'});
      return json({code:'blocked_test_request',message:'Unmocked request blocked'},400);
    };
  ` });
  const ready = async route => {
    for (let attempt = 0; attempt < 200; attempt++) {
      if (await evaluate(`return location.pathname===${JSON.stringify(route.split("?")[0])} && document.readyState==='complete' && !!document.querySelector('main');`)) { await evaluate("await document.fonts.ready;"); await delay(600); return; }
      await delay(100);
    }
    throw new Error(`Timeout on ${route}`);
  };
  const visit = async route => { await send("Page.navigate", { url: origin + route }); await ready(route); };
  const resize = width => send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
  const shot = async name => { await fs.mkdir(".shots", { recursive: true }); const { data } = await send("Page.captureScreenshot", { format: "png" }); await fs.writeFile(path.join(".shots", name + ".png"), Buffer.from(data, "base64")); };
  const fill = async (selector, value) => { await evaluate(`const i=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(value)});i.dispatchEvent(new Event('input',{bubbles:true}));`); };
  const click = async selector => { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click();`); await delay(100); };
  const submit = async () => { await evaluate("document.querySelector('form').requestSubmit();"); await delay(350); };
  const signedIn = async () => { await evaluate("localStorage.setItem('open77.session',JSON.stringify({...window.__testAccount,token:'auth-test-token',expiresAtUtc:'2099-01-01T00:00:00Z'}));window.dispatchEvent(new StorageEvent('storage',{key:'open77.session'}));"); await delay(400); };
  const signedOut = async () => { await evaluate("localStorage.removeItem('open77.session');window.dispatchEvent(new StorageEvent('storage',{key:'open77.session'}));"); await delay(150); };
  if (!navigationOnly) {
  await resize(1680); await visit('/account'); await shot('auth-login-desktop');
  check('background loads, one navbar and one main',await evaluate("const i=document.querySelector('.auth-scenery img');return i.complete&&i.naturalWidth>0&&document.querySelectorAll('main').length===1&&document.querySelectorAll('.site-header').length===1;"));
  for(const width of [1680,1440,1024,820,760,420,375,320]){
    await resize(width);await delay(100);
    check('login '+width+'px fits',await evaluate("return document.documentElement.scrollWidth<=innerWidth;"));
    if(width===375)await shot('auth-login-mobile');
  }
  await resize(1440);
  await fill('[name=email]','tester@example.invalid');await fill('[name=password]','test-passphrase');
  await click('.auth-reveal');
  check('password reveal preserves value and never submits',await evaluate("return document.querySelector('[name=password]').type==='text'&&document.querySelector('[name=password]').value==='test-passphrase'&&window.__authCalls.length===0;"));
  await evaluate("window.__authScenario='bad-login';");await submit();
  check('login failure is visible and form is retryable',await evaluate("return document.querySelector('[role=alert]').textContent.includes('incorrect')&&!document.querySelector('button[type=submit]').disabled;"));
  await shot('auth-login-error');
  await evaluate("const t=document.querySelector('[role=tab]');t.focus();t.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));");await delay(100);
  check('tabs support keyboard and preserve email',await evaluate("return document.activeElement.getAttribute('aria-selected')==='true'&&!!document.querySelector('[name=display-name]')&&document.querySelector('[name=email]').value==='tester@example.invalid';"));
  check('register switches password manager mode and hides password',await evaluate("return document.querySelector('[name=password]').autocomplete==='new-password'&&document.querySelector('[name=password]').type==='password';"));
  await shot('auth-register-desktop');await resize(375);await shot('auth-register-mobile');await resize(1440);
  await fill('[name=display-name]','Auth QA');await evaluate("window.__authScenario='ok';");await submit();
  check('registration opens verification without creating a session',await evaluate("return !!document.querySelector('[name=verification-code]')&&!localStorage.getItem('open77.session');"));
  await shot('auth-register-verify');
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Resend verification')).click();");await delay(350);
  check('registration can request a new verification code',await evaluate("return window.__authCalls.some(c=>c.path.endsWith('/resend'))&&!!document.querySelector('[role=status]');"));
  await fill('[name=verification-code]','v'.repeat(43));await submit();await delay(500);
  check('verify then sign in restores account dashboard',await evaluate("return !!localStorage.getItem('open77.session')&&!document.querySelector('.auth-scene')&&!!document.querySelector('.ac-profile-grid');"));
  check('account shortcuts use supported routes and a real identities anchor',await evaluate(`return ['/account/keys','#identities','/download#get','/host','/docs','/account/profile','/account/github','/account/connections','/forgot-password'].every(href=>[...document.querySelectorAll('.account-dashboard a')].some(a=>a.getAttribute('href')===href))&&!!document.querySelector('#identities');`));
  check('unapproved account is not presented as Alpha and has an honest empty state',await evaluate("return !document.querySelector('[data-server-download]')&&!!document.querySelector('.account-empty')&&document.querySelector('.account-status').textContent==='Platform account';"));
  await shot('account-dashboard-empty');
  await signedOut();
  await evaluate("window.__testAccount={...window.__testAccount,displayName:'Night City Builder',alphaAccess:true,identities:[{userId:'qa-client-8a619d8c',displayName:'My game client',linkedAtUtc:'2026-09-15T15:00:00Z'},{userId:'qa-client-d9d78981',displayName:'Second client',linkedAtUtc:'2026-09-17T16:00:00Z'}]};");
  await signedIn();await delay(400);await resize(1680);await shot('account-dashboard-desktop');
  check('live profile, identity count and Alpha entitlement are shown',await evaluate("return !!document.querySelector('[data-server-download]')&&document.querySelector('.account-count').textContent==='2'&&document.querySelectorAll('.account-identity-list li').length===2&&document.querySelector('.account-welcome h2').textContent.includes('Night City Builder');"));
  for(const width of [1680,1440,1100,1024,820,760,420,375,320]){
    await resize(width);await delay(100);
    check('account '+width+'px fits',await evaluate("return document.documentElement.scrollWidth<=innerWidth&&document.querySelectorAll('main').length===1;"));
    if(width===375)await shot('account-dashboard-mobile');
  }
  await resize(1440);await click('.account-identities-shortcut');await delay(800);
  check('identities shortcut scrolls below sticky navbar',await evaluate("const r=document.querySelector('#identities').getBoundingClientRect();return location.hash==='#identities'&&r.top>=document.querySelector('.site-header').getBoundingClientRect().bottom-2&&r.top<innerHeight/2;"));await shot('account-dashboard-details');
  await evaluate("document.querySelector('.account-licenses').focus();");
  check('shortcut has a visible keyboard focus ring',await evaluate("return getComputedStyle(document.activeElement).outlineStyle==='solid';"));
  await signedOut();await evaluate("window.__testAccount.emailVerified=false;");await signedIn();await delay(250);
  check('unverified profile shows a verification action',await evaluate("return !!document.querySelector('.account-verification')&&!document.querySelector('.account-verification-form');"));
  await click('.account-verification .account-button');await delay(250);
  check('profile resend has feedback and no automatic verification',await evaluate("return window.__authCalls.some(c=>c.path.endsWith('/resend'))&&document.querySelector('[role=status]').textContent.includes('Check your inbox')&&!!document.querySelector('.account-verification');"));
  await click('.account-verification .account-text-link');await fill('#account-verification-code','profile-code');await evaluate("window.__authScenario='expired';");await submit();
  check('bad profile code remains retryable',await evaluate("return !!document.querySelector('[role=alert]')&&!!document.querySelector('.account-verification-form')&&!document.querySelector('.account-verification-form button').disabled;"));
  await shot('account-verification');await evaluate("window.__authScenario='ok';");await submit();
  check('profile verification updates cached session and live badge',await evaluate("return !document.querySelector('.account-verification')&&document.querySelector('.account-email-state').textContent.includes('Verified')&&JSON.parse(localStorage.getItem('open77.session')).emailVerified;"));
  await evaluate("window.__authScenario='network';");await click('.account-signout');await delay(300);
  check('sign out clears local session even when master is offline',await evaluate("return !localStorage.getItem('open77.session')&&!!document.querySelector('.auth-panel');"));
  await evaluate("window.__authScenario='account-error';");await signedIn();await delay(300);
  check('account fetch failure offers retry without exposing cached access',await evaluate("return document.querySelector('[role=alert]').textContent.includes('temporarily')&&!document.querySelector('.account-bento')&&!!document.querySelector('.account-load button');"));
  await evaluate("window.__authScenario='ok';window.__testAccount.emailVerified=true;");await click('.account-load button');await delay(400);
  check('retry restores the live account',await evaluate("return !!document.querySelector('.account-bento')&&!document.querySelector('.account-load');"));
  await signedOut();await evaluate("window.__authScenario='unauthorized';");await signedIn();await delay(400);
  check('revoked session returns to sign in',await evaluate("return !localStorage.getItem('open77.session')&&!!document.querySelector('.auth-panel');"));
  await evaluate("window.__authScenario='ok';window.__testAccount.displayName='N'.repeat(100);window.__testAccount.email='long.account.name.for.layout.testing@long-domain.example.invalid';window.__testAccount.identities[0].userId='x'.repeat(120);");await signedIn();await delay(300);
  for(const width of [1440,375,320]){await resize(width);await delay(100);check('long profile values '+width+'px wrap',await evaluate("return document.documentElement.scrollWidth<=innerWidth;"));}
  await resize(1440);await evaluate("window.__testAccount.displayName='Auth QA';window.__testAccount.email='tester@example.invalid';window.__testAccount.identities=[];");
  await signedOut();
  await visit('/forgot-password');await fill('[name=email]','tester@example.invalid');await shot('auth-forgot-desktop');await submit();
  const forgotMessage=await evaluate("return document.querySelector('[role=status]').textContent;");
  check('recovery does not disclose account existence',forgotMessage.includes('If an account exists'));
  await visit('/forgot-password');await evaluate("window.__authScenario='unknown-email';");await fill('[name=email]','tester@example.invalid');await submit();
  check('unknown address has the same confirmation',forgotMessage===await evaluate("return document.querySelector('[role=status]').textContent;"));await shot('auth-forgot-sent');
  for(const scenario of ['network','rate']){await visit('/forgot-password');await evaluate(`window.__authScenario='${scenario}';`);await fill('[name=email]','tester@example.invalid');await submit();check('recovery '+scenario+' is actionable',await evaluate("return !!document.querySelector('[role=alert]')&&!document.querySelector('button[type=submit]').disabled;"));}
  await visit('/reset-password');check('incomplete reset never submits',await evaluate("return !document.querySelector('form')&&window.__authCalls.length===0&&!!document.querySelector('[role=alert]');"));
  const reset='/reset-password?email=tester%40example.invalid&token=test-reset-token';
  await visit(reset);await fill('[name=new-password]','new-passphrase');await fill('[name=confirm-password]','different-passphrase');await submit();
  check('password mismatch is blocked locally',await evaluate("return window.__authCalls.length===0&&document.querySelector('[role=alert]').textContent.includes(\"don't match\");"));
  await fill('[name=confirm-password]','new-passphrase');await shot('auth-reset-desktop');await submit();
  check('reset succeeds without signing in automatically',await evaluate("return document.querySelector('[role=status]').textContent.includes('Password changed')&&!localStorage.getItem('open77.session');"));
  await visit(reset);await evaluate("window.__authScenario='expired';");await fill('[name=new-password]','new-passphrase');await fill('[name=confirm-password]','new-passphrase');await submit();
  check('expired reset offers a fresh link',await evaluate("return !document.querySelector('form')&&!!document.querySelector('a[href=\"/forgot-password\"]');"));await shot('auth-reset-expired');
  await visit('/verify-email');check('incomplete verification stays local',await evaluate("return !!document.querySelector('[role=alert]')&&window.__authCalls.length===0;"));
  await visit('/verify-email?email=tester%40example.invalid&token=test-token');
  check('verification is sent once and shows confirmation',await evaluate("return window.__authCalls.filter(c=>c.path.endsWith('/verify-email')).length===1&&document.querySelector('[role=status]').textContent.includes('E-mail verified');"));await shot('auth-email-verified');
  await visit('/launcher?redirect_uri=https%3A%2F%2Funsafe.example.invalid%2Fcallback&state=state&code_challenge='+ 'a'.repeat(43)+'&code_challenge_method=S256');
  check('hostile launcher callback rejected before login or network',await evaluate("return !!document.querySelector('[role=alert]')&&!document.querySelector('form')&&window.__authCalls.length===0;"));
  const launcher='/launcher?redirect_uri=http%3A%2F%2F127.0.0.1%3A49199%2Fcallback%2F&state=test-state&code_challenge='+ 'a'.repeat(43)+'&code_challenge_method=S256';
  await visit(launcher);check('valid launcher request presents sign-in',await evaluate("return !!document.querySelector('form');"));await signedIn();
  check('launcher requires explicit authorization, not automatic approval',await evaluate("return [...document.querySelectorAll('button')].some(b=>b.textContent==='Authorize launcher')&&!window.__authCalls.some(c=>c.path.includes('authorize'));"));await shot('auth-launcher-consent');
  await visit('/account/github');await shot('auth-github-connection');
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Connect with GitHub').click();");await delay(400);
  check('GitHub rejects an unsupported provider destination',await evaluate("return location.pathname==='/account/github'&&document.querySelector('[role=alert]').textContent.includes('Unsupported');"));
  await visit('/account/github/callback?state='+ 'a'.repeat(43)+'&code=test-code');
  check('GitHub missing pending PKCE state fails closed',await evaluate("return !!document.querySelector('[role=alert]')&&!window.__authCalls.some(c=>c.path.endsWith('/github/callback'));"));await shot('auth-oauth-error');
  await evaluate("sessionStorage.setItem('open77.github.connection.'+'a'.repeat(43),JSON.stringify({state:'a'.repeat(43),accountId:'test-account',verifier:'v'.repeat(43),expiresAtUtc:new Date(Date.now()+300000).toISOString()}));");
  await visit('/account/github/callback?state='+ 'a'.repeat(43)+'&code=test-code');
  check('GitHub valid callback is consumed once and query cleared',await evaluate("return document.querySelector('main').textContent.includes('Connected as @auth-qa')&&window.__authCalls.filter(c=>c.path.endsWith('/github/callback')).length===1&&!location.search&&!sessionStorage.getItem('open77.github.connection.'+'a'.repeat(43));"));await shot('auth-oauth-success');
  await visit('/account/connections/approve');await fill('form input','WARDEN-TEST');await submit();
  check('Warden cannot be approved without explicit consent',await evaluate("return [...document.querySelectorAll('button')].find(b=>b.textContent==='Approve Warden').disabled;"));await shot('auth-warden-consent');
  await click('input[type=checkbox]');await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Approve Warden').click();");await delay(400);
  check('Warden approval confirms completion',await evaluate("return document.querySelector('[role=status]').textContent.includes('Warden approved');"));
  await signedOut();
  for(const route of ['/forgot-password',reset,'/verify-email','/launcher','/account/github','/account/github/callback','/account/connections/approve']) {
    await visit(route);
    for(const width of [1440,375,320]) {await resize(width);await delay(100);check(route.split('?')[0]+' '+width+'px fits',await evaluate("return document.documentElement.scrollWidth<=innerWidth&&document.querySelectorAll('main').length===1;"));}
  }
  await resize(1440);await visit('/host');
  check('embedded host sign-in keeps new fields',await evaluate("return !!document.querySelector('.auth-panel [name=email]')&&!!document.querySelector('.auth-reveal');"));
  }
  await resize(1440);
  await visit('/account');await signedIn();await delay(200);
  check('dashboard footer stays in the dark visual system',await evaluate("return getComputedStyle(document.querySelector('.site-footer')).backgroundColor==='rgb(5, 14, 22)'&&document.querySelector('.site-footer .logotype').src.includes('logo-dark');"));
  await evaluate("scrollTo({top:document.body.scrollHeight,behavior:'instant'});");await click('.account-docs-shortcut');await ready('/docs');
  const docsNav=await evaluate("return {y:scrollY,account:!!document.querySelector('.account-dashboard'),mains:document.querySelectorAll('main').length,path:location.pathname};");
  check('dashboard to docs resets scroll and removes account styles',docsNav.y===0&&!docsNav.account&&docsNav.mains===1,docsNav);await shot('account-navigation-docs');
  await evaluate("history.back();");await ready('/account');await click('.account-launcher-shortcut');await ready('/download');
  check('launcher shortcut targets the actual download section',await evaluate("return location.hash==='#get'&&!!document.querySelector('#get');"));
  await evaluate("scrollTo({top:document.body.scrollHeight,behavior:'instant'});");await click('.liquid-account');await ready('/account');
  const accountNav=await evaluate("return {y:scrollY,bento:!!document.querySelector('.account-bento'),headers:document.querySelectorAll('.site-header').length,path:location.pathname};");
  check('returning to account starts at top with one navbar',accountNav.y===0&&accountNav.bento&&accountNav.headers===1,accountNav);await shot('account-navigation-return');
  await signedOut();
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await visit('/account');
  check('reduced motion disables entrance effects',await evaluate("return getComputedStyle(document.querySelector('.auth-stage')).animationName==='none';"));
  check('no browser exceptions',errors.length===0,errors);
} finally {
  socket?.close(); child.kill();
  const resolved=path.resolve(profile),base=path.resolve(os.tmpdir())+path.sep;
  if(resolved.startsWith(base)&&path.basename(resolved).startsWith('open77-auth-design-')) await fs.rm(resolved,{recursive:true,force:true}).catch(()=>{});
}
process.exitCode=failures?1:0;
