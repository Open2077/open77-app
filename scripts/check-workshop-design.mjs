/** Isolated Workshop UI regression. Fixtures never reach the real master.
 * Requires npm run build; owns a temporary preview on loopback :3114.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const origin = 'http://127.0.0.1:3114';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let failures = 0, offline = false, empty = false, failSort = '', slowSort = '';
const check = (name, ok, details) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) { failures++; if (details) console.log(details); } };
const titles = ['Night City Essentials', 'Street Racing', 'Afterlife Interior', 'Minimal HUD', 'Creator Toolkit', 'Transit Network', 'Survival Nights', 'Metro Apartment', 'Neon Phone', 'Admin Utilities', 'Photo Showcase', 'Vehicle Keys'];
const categoryIds = ['scripts', 'gamemodes', 'maps', 'ui', 'tools'];
const projects = titles.map((title, i) => ({ projectId: `fixture-${i}`, ownerAccountId: 'fixture-owner', slug: `fixture-${i}`, state: 'published', revision: 1, revisionStatus: 'approved',
  content: { title, summary: 'A community creation for your own Night City. Customise the experience and make it yours.', category: categoryIds[i % 5], description: '## Made for your world\n\nA **test fixture**, not a published resource.\n\n- Configurable options\n- Lua integration\n\n```lua\nprint("Hello, Night City")\n```', installation: 'Install with Warden, then restart the resource.', license: 'MIT', kind: i === 10 ? 'showcase' : 'resource', maturity: i % 3 ? 'stable' : 'experimental', tags: i % 2 ? ['roleplay', 'lua'] : ['utility'], sourceUrl: i % 2 ? 'https://github.com/example/fixture' : null, media: i % 4 === 0 ? [] : [{ mediaId: `media-${i}`, altText: `${title} fixture illustration` }] },
  createdAtUtc: '2026-09-01T12:00:00Z', updatedAtUtc: '2026-09-18T12:00:00Z', publishedAtUtc: '2026-09-02T12:00:00Z', creatorHandle: 'fixture-creator', upvotes: i * 15, views: 1234, downloads: i * 257 }));
const release = { releaseId: 'fixture-release', projectId: 'fixture-0', version: '1.2.0', state: 'published', channel: 'stable', revision: 1, metadata: { changelog: '## Changes\n\nA fixture release.', installation: 'Install using Warden.', license: 'MIT', testedBuilds: ['fixture-build'], requiredResources: [] }, sha256: '0'.repeat(64), sizeBytes: 1048576, createdAtUtc: '2026-09-01T12:00:00Z', publishedAtUtc: '2026-09-02T12:00:00Z', revokedAtUtc: null, resources: [{ name: 'fixture_resource', relativeRoot: '/', manifest: { version: '1.2.0', open77Version: '*', dependencies: [], permissions: [], preloadMods: [] } }], inspection: null };
const calls = [];
function responseFor(raw, method = 'GET') {
  const url = new URL(raw), p = url.pathname;
  if (p.endsWith('/projects')) {
    if (offline || url.searchParams.get('sort') === failSort) return [503, { code: 'unavailable', message: 'Fixture catalog unavailable. Try again.' }];
    let items = empty ? [] : [...projects];
    if (url.searchParams.get('sort') === 'featured') items = items.slice(0, 1);
    if (url.searchParams.get('sort') === 'trending') items = items.slice(1, 5);
    if (url.searchParams.get('sort') === 'downloads') items.reverse();
    if (url.searchParams.get('kind')) items = items.filter(x => x.content.kind === url.searchParams.get('kind'));
    const paged = url.searchParams.get('limit') === '100';
    if (paged) items = url.searchParams.has('cursor') ? items.slice(8) : items.slice(0, 8);
    else items = items.slice(0, Number(url.searchParams.get('limit') || 24));
    return [200, { items, nextCursor: paged && !empty && !url.searchParams.has('cursor') ? 'fixture-page-2' : null, rankingAsOfUtc: '2026-09-18T00:00:00Z' }];
  }
  if (p.includes('/media/')) { const i = Number(p.split('-').at(-1)); const art = ['play-v2', 'worlds-v2', 'build-v2', 'servers-v2'][i % 4]; return [200, { mediaId: `media-${i}`, derivatives: ['card', 'gallery', 'full'].map(name => ({ name, width: 960, height: 540, sizeBytes: 1000, url: `${origin}/assets/home/${art}.webp` })) }]; }
  if (p.endsWith('/releases/latest')) return [200, release];
  if (p.endsWith('/releases')) return [200, { items: [release], nextCursor: null }];
  if (p.endsWith('/comments')) return [200, { items: [], nextCursor: null }];
  if (p.includes('/creators/')) return [200, { profile: { handle: 'fixture-creator', bio: 'Building new experiences for Night City.', links: [], revision: 1, createdAtUtc: '2026-09-01T12:00:00Z', updatedAtUtc: '2026-09-18T12:00:00Z', avatarMediaId: null }, projects: { items: projects.slice(0, 3), nextCursor: null } }];
  if (/\/projects\/fixture-\d+$/.test(p)) return [200, projects[Number(p.split('-').at(-1))]];
  if (method !== 'GET') { calls.push({ method, path: p }); if (p.endsWith('/download')) return [200, { deliveryId: 'fixture-delivery', expiresAtUtc: new Date(Date.now() + 60000).toISOString(), downloadUrl: `${origin}/fixture-download.zip` }]; return [200, {}]; }
  return [200, {}];
}

const mock = createServer((req, res) => { const [status, body] = responseFor(`http://localhost${req.url}`, req.method); res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); });
await new Promise((resolve, reject) => { mock.once('error', reject); mock.listen(0, '127.0.0.1', resolve); });
let preview, chrome, socket;
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'open77-workshop-'));
try {
  // Fail if another process owns the preview port; never stop somebody else's server.
  const probe = createServer(); await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(3114, '127.0.0.1', resolve); }); await new Promise(resolve => probe.close(resolve));
  preview = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3114'], { env: { ...process.env, OP77_COMMUNITY_API_URL: `http://127.0.0.1:${mock.address().port}` }, windowsHide: true, stdio: 'ignore' });
  for (let n = 0; n < 100; n++) { try { if ((await fetch(origin + '/workshop')).ok) break; } catch {} await delay(200); }
  chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let port;
  for (let n = 0; n < 100; n++) { try { port = Number((await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; } catch {} await delay(150); }
  const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page');
  socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise(resolve => socket.addEventListener('open', resolve));
  let id = 0; const pending = new Map(), errors = [];
  const send = (method, params = {}) => new Promise((resolve, reject) => { const next = ++id; pending.set(next, { resolve, reject }); socket.send(JSON.stringify({ id: next, method, params })); });
  socket.addEventListener('message', async event => {
    const m = JSON.parse(event.data);
    if (m.id) { const p = pending.get(m.id); pending.delete(m.id); if (m.error) p?.reject(m.error); else p?.resolve(m.result); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description));
    if (m.method === 'Fetch.requestPaused') {
      const { requestId, request } = m.params;
      const [status, body] = responseFor(request.url, request.method);
      if (slowSort && new URL(request.url).searchParams.get('sort') === slowSort) await delay(700);
      await send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: Buffer.from(JSON.stringify(body)).toString('base64') }).catch(() => {});
    }
  });
  await send('Page.enable'); await send('Runtime.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/v1/*' }] });
  const evaluate = async source => { const r = await send('Runtime.evaluate', { expression: `(async()=>{${source}})()`, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'Evaluation failed'); return r.result.value; };
  const until = async (expression, label) => { for (let n = 0; n < 200; n++) { if (await evaluate(`return ${expression};`)) return; await delay(100); } throw Error(`Timeout: ${label}`); };
  const visit = async route => { await send('Page.navigate', { url: origin + route }); await until(`location.pathname === ${JSON.stringify(route.split('?')[0])} && document.readyState === 'complete' && !!document.querySelector('.workshop-surface')`, route); await evaluate('await document.fonts.ready;'); await delay(300); };
  const resize = (width, height = 1050) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  const shot = async name => { await fs.mkdir('.shots', { recursive: true }); const { data } = await send('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(path.join('.shots', name + '.png'), Buffer.from(data, 'base64')); };
  const click = async selector => { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click();`); await delay(200); };
  const fill = async (selector, value) => { await evaluate(`const i=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(i instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(value)});i.dispatchEvent(new Event(i instanceof HTMLSelectElement ? 'change' : 'input',{bubbles:true}));`); await delay(150); };
  const key = async (key, modifiers = 0) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, modifiers, ...(key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}), windowsVirtualKeyCode: { Enter: 13, Escape: 27, Tab: 9 }[key] }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, modifiers }); await delay(150); };
  const count = () => evaluate("return document.querySelectorAll('.hub-tile').length;");
  const fits = () => evaluate('return document.documentElement.scrollWidth <= innerWidth;');
  await resize(1680); await visit('/workshop'); await shot('workshop-desktop');
  check('discovery renders real SSR fixture shelves once per project', await evaluate("const links=[...document.querySelectorAll('.hub-card h3 a')].map(a=>a.href);return links.length>6 && links.length===new Set(links).size;"));
  check('single navbar, main and hero title', await evaluate("return document.querySelectorAll('main').length===1 && document.querySelectorAll('h1').length===1 && document.querySelectorAll('.site-header').length===1;"));
  for (const width of [1440, 1024, 768, 640, 390, 320]) { await resize(width); check(`discovery ${width}px fits`, await fits()); if (width === 390) await shot('workshop-mobile'); }
  await resize(1440); await fill('#workshop-search', 'racing'); await evaluate("document.querySelector('.workshop-search').requestSubmit();"); await until("location.pathname==='/workshop/browse' && document.querySelector('.hub-tile')", 'search');
  check('hero search reaches matching resource', await count() === 1 && await evaluate("return document.querySelector('.hub-tile h3').textContent==='Street Racing';"));
  await visit('/workshop/browse'); await shot('workshop-catalog-desktop'); check('SSR catalog starts with paginated fixtures', await count() === 8);
  await click('.hub-tiles-more button'); check('load more appends without duplicates', await count() === 12);
  await click('.filter-chip:nth-child(2)'); check('category filters and URL agree', await count() === 3 && await evaluate("return new URLSearchParams(location.search).get('category')==='scripts';"));
  await fill('[aria-label="Search resources"]', '<script>no resource</script>'); check('empty results safely escape input', await count() === 0 && await evaluate("return !!document.querySelector('.hub-tiles-empty button') && !document.querySelector('.directory-results-bar script');"));
  await click('.hub-tiles-empty button'); check('reset restores catalog', await count() === 12);
  await click('.directory-checkbox input'); check('source filter combines with catalog', await count() === 6); await click('.directory-checkbox input');
  await click('.hub-tile .fav-btn'); check('guest save is gated', await evaluate("return document.body.innerText.includes('Sign in with a verified account');"));
  await evaluate("document.querySelector('.hub-tile .sb-connect').focus();"); await key('Enter');
  await until("!!document.querySelector('dialog[open]')", 'quick view');
  check('quick view is modal and focus moves inside', await evaluate("return !!document.activeElement.closest('dialog[open]');"));
  await key('Tab', 8); check('reverse Tab stays in quick view', await evaluate("return !!document.activeElement.closest('dialog[open]');"));
  await shot('workshop-quickview'); await key('Escape'); check('Escape closes quick view and restores trigger', await evaluate("return !document.querySelector('dialog[open]') && document.activeElement===document.querySelector('.hub-tile .sb-connect');"));
  await click('[title="List"]'); check('list switch keeps all resources', await evaluate("return document.querySelectorAll('.sb-row').length===12;"));
  for (const width of [1200, 1024, 768, 390, 320]) { await resize(width); check(`list ${width}px fits`, await fits()); }
  await click('[title="Tiles"]');
  for (const width of [1680, 1440, 1024, 960, 768, 640, 390, 320]) { await resize(width); check(`catalog ${width}px fits`, await fits()); if (width === 390) await shot('workshop-catalog-mobile'); }
  await click('.directory-filter-toggle'); check('mobile filters expand in document, not over content', await evaluate("const e=document.querySelector('.directory-rail');return getComputedStyle(e).display!=='none' && getComputedStyle(e).position==='static';"));
  await click('.directory-filter-close'); check('closing filters restores focus', await evaluate("return document.activeElement===document.querySelector('.directory-filter-toggle');"));
  await click('.hub-tile .sb-connect'); await shot('workshop-quickview-mobile'); check('mobile quick view fits', await fits()); await key('Escape');
  await resize(1440); slowSort = 'downloads'; await fill('[aria-label="Sort resources"]', 'downloads'); await fill('[aria-label="Sort resources"]', 'updated'); await delay(1000); slowSort = '';
  check('rapid sort changes cannot display a stale response', await evaluate("return document.querySelector('.hub-tile h3').textContent==='Night City Essentials' && document.querySelector('[aria-label=\"Sort resources\"]').value==='updated';"));
  failSort = 'updated'; await click('[title="Reload the library"]'); check('failed refresh keeps results and shows error', await count() === 8 && await evaluate("return !!document.querySelector('.directory-main [role=alert]');")); failSort = ''; await click('[title="Reload the library"]');
  await visit('/workshop/fixture-1'); await shot('workshop-resource-desktop');
  check('resource tabs and verified-account gates remain', await evaluate("return document.querySelectorAll('.workshop-resource-tabs a').length===3 && document.body.innerText.includes('to upvote, save or follow releases.');"));
  await click('.ws-head .hub-download-action button'); check('ZIP preparation uses release delivery without navigating away', await evaluate("return !!document.querySelector('.ws-head .hub-download-action a[href$=\"fixture-download.zip\"]');"));
  await click('.hub-media-gallery a'); check('resource gallery opens', await evaluate("return !!document.querySelector('dialog[open]');")); await key('Escape');
  for (const width of [1200, 960, 768, 390, 320]) { await resize(width); check(`resource ${width}px fits`, await fits()); if (width === 390) await shot('workshop-resource-mobile'); }
  await click('.workshop-resource-tabs a:nth-child(2)'); await until("location.pathname.endsWith('/versions') && !!document.querySelector('.hub-release')", 'versions'); check('versions tab is active', await evaluate("return document.querySelector('.workshop-resource-tabs a[aria-current]').textContent==='Versions';")); check('versions mobile fits', await fits());
  await click('.workshop-resource-tabs a:last-child'); await until("location.pathname.endsWith('/discussion')", 'discussion'); check('discussion mobile fits', await fits());
  await resize(1440); await visit('/workshop/creators/fixture-creator'); await shot('workshop-creator'); check('creator profile and creations preserved', await evaluate("return document.querySelectorAll('.hub-card').length===3;"));
  offline = true; await visit('/workshop'); check('API failure is explicit, not an empty library', await evaluate("return document.body.innerText.includes('couldn’t load') && !document.body.innerText.includes('Nothing published yet');")); await shot('workshop-offline'); offline = false;
  empty = true; await visit('/workshop'); check('empty library offers publishing CTA', await evaluate("return document.body.innerText.includes('Nothing published yet') && !!document.querySelector('.hub-empty a[href=\"/account/creations/new\"]');")); empty = false;
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await visit('/workshop'); check('reduced motion respected', await evaluate("return getComputedStyle(document.querySelector('.hub-card')).transitionDuration==='0s';"));
  check('no uncaught JavaScript or hydration errors', errors.length === 0, errors);
  check('all writes stay in fixture, only view/download expected', calls.every(call => /\/(view|download)$/.test(call.path)), calls);
  console.log(`Workshop checks: ${failures ? `${failures} failures` : 'all passed'}`);
  await send('Browser.close').catch(() => {});
} finally {
  socket?.close(); chrome?.kill(); preview?.kill(); await new Promise(resolve => mock.close(resolve));
}
if (failures) process.exitCode = 1;
