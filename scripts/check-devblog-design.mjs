/** Read-only browser regression: real published posts, isolated Chrome profile.
 * Hooks are data-devblog attributes: the markup uses CSS modules, so class names are hashed. */
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const origin=process.argv[2]??'http://127.0.0.1:3113',port=9352;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let failures=0;
const check=(name,ok,detail)=>{console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok){failures++;if(detail)console.log(detail);}};
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'open77-devblog-'));
const child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','about:blank'],{windowsHide:true,stdio:'ignore'});
let socket;
try{
  let endpoint;
  for(let i=0;i<80;i++){try{endpoint=(await(await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl;break;}catch{await delay(150);}}
  socket=new WebSocket(endpoint);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve);socket.addEventListener('error',reject);});
  let id=0,sessionId;const pending=new Map(),errors=[];
  socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p?.reject(m.error);else p?.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value??a.description));});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const next=++id;pending.set(next,{resolve,reject});socket.send(JSON.stringify({id:next,method,params,...(sessionId?{sessionId}:{})}));});
  const target=await send('Target.createTarget',{url:'about:blank'});sessionId=(await send('Target.attachToTarget',{targetId:target.targetId,flatten:true})).sessionId;
  await send('Page.enable');await send('Runtime.enable');
  const evaluate=async source=>{const r=await send('Runtime.evaluate',{expression:`(async()=>{${source}})()`,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??'Evaluation failed');return r.result.value;};
  const ready=async route=>{for(let n=0;n<150;n++){if(await evaluate(`return location.pathname===${JSON.stringify(route.split('?')[0])}&&document.readyState==='complete'&&!!document.querySelector('[data-devblog]');`)){await evaluate('await document.fonts.ready;');await delay(500);return;}await delay(100);}throw new Error('Timeout '+route);};
  const visit=async route=>{await send('Page.navigate',{url:origin+route});await ready(route);};
  const resize=(width,height=1000)=>send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  const shot=async name=>{await fs.mkdir('.shots',{recursive:true});const {data}=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join('.shots',name+'.png'),Buffer.from(data,'base64'));};
  const click=async selector=>{await evaluate(`document.querySelector(${JSON.stringify(selector)}).click();`);await delay(200);};
  const fill=async value=>{await evaluate(`const i=document.querySelector('main input[type=search]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(value)});i.dispatchEvent(new Event('input',{bubbles:true}));`);await delay(150);};
  const count=()=>evaluate("return document.querySelectorAll('[data-devblog~=card]').length;");
  await resize(1680);await visit('/devblog');await shot('devblog-desktop');
  const total=await count();
  const committed=(await fs.readdir('content/devblog')).filter(name=>/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$/.test(name)).length;
  const html=await(await fetch(origin+'/devblog')).text();
  check('every committed post is discoverable without JavaScript',total===committed&&(html.match(/data-devblog="card-link"/g)||[]).length===committed);
  check('real posts render with single main and navbar',total>0&&await evaluate("return document.querySelectorAll('main').length===1&&document.querySelectorAll('nav[aria-label=Main]').length===1&&document.querySelectorAll('[data-devblog=latest]').length===1;"));
  check('hero artwork is loaded',await evaluate("const i=document.querySelector('main img');return i.complete&&i.naturalWidth>0;"));
  check('only the index hero is illustrated',await evaluate("return !document.querySelector('[data-devblog~=card] img')&&document.querySelector('main img').src.includes('devblog-nightdrive-v1');"));
  check('archives count every post exactly once',total===await evaluate("return [...document.querySelectorAll('[data-devblog=archive] [data-count]')].reduce((n,e)=>n+Number(e.textContent),0);"));
  for(const width of [1920,1440,1200,1024,960,768,600,420,375,320]){await resize(width);await delay(100);check('index '+width+'px fits',await evaluate('return document.documentElement.scrollWidth<=innerWidth;'));if(width===375)await shot('devblog-mobile');}
  await resize(1440,720);check('short laptop viewport does not trap sidebar links',await evaluate("return getComputedStyle(document.querySelector('[data-devblog=sidebar]')).position==='static';"));
  await resize(1440);await click('[data-topic=networking] button');
  check('topic filters reduce results and update URL',await count()<total&&await evaluate("return new URLSearchParams(location.search).get('topic')==='networking'&&document.querySelector('[data-topic=networking] button').getAttribute('aria-pressed')==='true';"));
  const topicCount=await count();await click('[data-month="2026-08"]');
  check('topic and archive filters combine',await evaluate("return [...document.querySelectorAll('[data-devblog~=card]')].every(p=>p.dataset.postDate.startsWith('2026-08'));"));
  await evaluate('history.back();');await delay(350);check('Back restores previous filters',await count()===topicCount&&await evaluate("return !new URLSearchParams(location.search).has('month');"));
  await click('[data-devblog=archive-reset]');await fill('POLYZONE launcher');
  check('search matches real titles and summaries',await count()>0&&await count()<total);await shot('devblog-search');
  await fill('<script>missing_update</script>');check('empty results are actionable and safely escaped',await count()===0&&await evaluate("return !!document.querySelector('[data-devblog=empty] button')&&!document.querySelector('[data-devblog=results] script');"));
  await click('[data-devblog=empty] button');check('clear filters restores all publications',await count()===total&&await evaluate('return !location.search;'));
  await visit('/devblog?month=2026-09&topic=platform&q=launcher');
  check('shared filter URL restores search and selection',await evaluate("return document.querySelector('main input[type=search]').value==='launcher'&&document.querySelector('[data-topic=platform] button').getAttribute('aria-pressed')==='true'&&[...document.querySelectorAll('[data-devblog~=card]')].every(p=>p.dataset.postDate.startsWith('2026-09'));"));
  await visit('/devblog?topic=invalid&month=2026-99');check('invalid URL filters fall back to all posts',await count()===total);
  await visit('/devblog');const articlePath=await evaluate("return document.querySelector('[data-devblog~=featured] a').getAttribute('href');");await click('[data-devblog~=featured] a');await ready(articlePath);await shot('devblog-article-desktop');
  check('article opens at the top',await evaluate("return scrollY===0&&!!document.querySelector('[data-devblog=prose]')&&document.querySelectorAll('h1').length===1;"));
  check('article header has no decorative image',await evaluate("return !document.querySelector('[data-devblog=article] header img');"));
  check('all desktop TOC links match real headings',await evaluate("const a=[...document.querySelectorAll('[data-devblog=toc] a')];return a.length>0&&a.every(a=>document.getElementById(decodeURIComponent(a.hash.slice(1))));"));
  await click('[data-devblog=toc] a');await delay(900);
  check('TOC target clears sticky header',await evaluate("const r=document.getElementById(decodeURIComponent(location.hash.slice(1))).getBoundingClientRect();return r.top>=document.querySelector('nav[aria-label=Main]').closest('header').getBoundingClientRect().bottom&&r.top<innerHeight/2;"));
  check('reading progress responds to scroll',await evaluate("return getComputedStyle(document.querySelector('[data-devblog=progress] span')).transform!=='matrix(0, 0, 0, 1, 0, 0)';"));
  await evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__copied=value;}}});");await click('[data-devblog=copy] button');check('copy uses the clean article URL',await evaluate("return window.__copied===location.origin+location.pathname&&document.querySelector('[data-devblog=copy] button').textContent.includes('copied');"));
  await evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Denied');}}});");await click('[data-devblog=copy] button');check('clipboard denial provides a selectable link',await evaluate("return document.querySelector('[data-devblog=copy-fallback] input').value===location.origin+location.pathname;"));
  for(const width of [1440,1024,960,768,600,375,320]){await resize(width);await evaluate("scrollTo({top:0,behavior:'instant'});");await delay(150);check('article '+width+'px fits',await evaluate('return document.documentElement.scrollWidth<=innerWidth;'));if(width===375)await shot('devblog-article-mobile');}
  await click('[data-devblog=mobile-toc] summary');check('mobile TOC opens and is usable',await evaluate("return document.querySelector('[data-devblog=mobile-toc]').open&&[...document.querySelectorAll('[data-devblog=mobile-toc] a')].every(a=>document.getElementById(a.hash.slice(1)));"));
  await resize(1440);const older=await evaluate("return document.querySelector('main a[rel=prev]').getAttribute('href');");await click('main a[rel=prev]');await ready(older);
  check('older post resets copy state and has newer navigation',await evaluate("return document.querySelector('[data-devblog=copy] button').textContent==='Copy article link'&&!!document.querySelector('main a[rel=next]');"));
  await click('[data-devblog=back]');await ready('/devblog');check('back to devblog returns to hero',await evaluate('return scrollY===0;'));
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});check('reduced motion disables card transitions',await evaluate("return getComputedStyle(document.querySelector('[data-devblog~=card]')).transitionDuration==='0s';"));
  const rss=await fetch(origin+'/devblog/rss.xml'),xml=await rss.text();check('RSS is still available with all entries',rss.status===200&&(xml.match(/<item>/g)||[]).length===total);
  const markdown=await fetch(origin+articlePath+'.md');check('Markdown endpoint is preserved',markdown.status===200&&(await markdown.text()).includes('## '));
  check('no browser errors or hydration mismatches',errors.length===0,errors);
}finally{socket?.close();child.kill();const resolved=path.resolve(profile);if(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('open77-devblog-'))await fs.rm(resolved,{recursive:true,force:true}).catch(()=>{});}
process.exitCode=failures?1:0;
