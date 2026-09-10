/* eslint-disable @typescript-eslint/no-require-imports, no-console -- Standalone Node smoke runner. */
/* Synthetic browser smoke tests. No production credentials / mutations / webhooks. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require(process.env.OP77_PLAYWRIGHT || 'playwright');
const base = process.env.OP77_TEST_APP || 'http://localhost:3027';
const id = '11111111-2222-4333-8444-555555555555';
const secondId = '99999999-2222-4333-8444-555555555555';
const time = '2026-09-10T12:00:00Z';
const zip = Buffer.from('synthetic download fixture');
const row = { incidentId: id, occurredAtUtc: time, receivedAtUtc: time, kind: 'engine-crash', fingerprint: 'a'.repeat(64), serverId: id, bytes: zip.length, sha256: crypto.createHash('sha256').update(zip).digest('hex') };
const account = { accountId: id, email: 'operator@example.test', displayName: 'Test operator', role: 'admin', emailVerified: true };
const session = { ...account, token: 'synthetic-session-not-a-real-token', expiresAtUtc: '2036-09-10T12:00:00Z' };
const settings = { configured: true, enabled: true, destination: 'discord.com / webhook …5678', updatedAtUtc: time, delivery: { state: 'idle', lastAttemptUtc: null, lastSuccessUtc: null } };

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  const failures = []; const calls = []; let corrupt = false; let delay = 0; let denied = false; let role = 'admin'; let sends = 0;
  page.on('pageerror', e => failures.push(e.message));
  await context.route('**/api/v1/**', async route => {
    const req = route.request(), url = new URL(req.url()), p = url.pathname;
    calls.push({ p, query: url.search, method: req.method() });
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    const json = body => route.fulfill({ json: body, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' } });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST' } });
    if (p === '/api/v1/accounts/me') return json({ ...account, role });
    if (p === '/api/v1/admin/incidents/discord') {
      if (req.method() === 'POST') { sends++; const body = req.postDataJSON(); return json({ ...settings, enabled: body.enabled, configured: !body.remove }); }
      return json(settings);
    }
    if (p === '/api/v1/incidents') {
      if (denied) return route.fulfill({ status: 503, json: { code: 'unavailable', message: 'Receiver temporarily unavailable' } });
      return json({ items: [{ ...row, incidentId: url.searchParams.has('before') ? secondId : id }], next: url.searchParams.has('before') ? null : { before: time, beforeId: id } });
    }
    if (p.endsWith('/preview')) return json({ incidentId: id, sha256: row.sha256, manifest: { versions: { clientPackage: '0.1.0+49', launcher: '0.1.0+46' }, description: '<img src=x onerror=alert(1)> @everyone', fault: { exceptionCode: '0xc0000005', moduleOffset: 'open77.dll+0xabc' }, server: { version: '0.1.0+48', protocol: '1.23', gameBuild: '23100' } }, files: [{ path: 'incident.json', bytes: 500 }, { path: 'launcher.log', bytes: 40 }], entry: url.searchParams.get('entry') || 'incident.json', text: '<script>window.evidenceExecuted=true</script>\nSynthetic evidence only', truncated: false });
    if (p === `/api/v1/incidents/${id}`) return route.fulfill({ body: corrupt ? Buffer.from('tampered') : zip, contentType: 'application/zip' });
    if (p.endsWith('/overview')) return json({ usersTotal: 1248, serversActive: 4, playersOnline: 28, licensesActive: 46, bansActive: 3 });
    if (p === '/api/v1/admin/servers') return json(Array.from({ length: 6 }, (_, i) => ({ serverId: `${id}-${i}`, name: `Night City ${['Freeroam','Pursuit','Sandbox','Racing','Test','Community'][i]}`, connectEndpoint: `192.0.2.${i + 1}:11778`, connectedPlayers: 8 - i, maximumPlayers: 32, lastHeartbeatUtc: time })));
    if (p.endsWith('/audit')) return json(Array.from({ length: 10 }, (_, i) => ({ id: i, atUtc: time, action: ['incident.received','license.created','incident.viewed'][i % 3], subject: id, actorAccountId: id })));
    if (p.endsWith('/alpha-access')) return json({ items: [], total: 0, offset: 0, limit: 25, enforced: true });
    if (p.endsWith('/enforcement')) return json({ cdnBaseUrl: 'https://cdn.example.test', modCdnBaseUrl: 'https://cdn.example.test/mod' });
    if (p === '/api/v1/mod/manifest') return json({ version: 'test-build', files: [], issuedAtMs: Date.parse(time) });
    return json([]);
  });
  await context.addInitScript(value => localStorage.setItem('open77.session', JSON.stringify(value)), session);
  await page.goto(base + '/admin');
  await page.getByText('1248', { exact: true }).waitFor();
  const out = path.join(process.cwd(), 'artifacts', 'admin-ui'); fs.mkdirSync(out, { recursive: true });
  await page.screenshot({ path: path.join(out, 'overview-desktop.png'), fullPage: true });
  await page.goto(base + '/admin/incidents?incidentId=' + id);
  await page.getByRole('button', { name: /^Inspect incident/ }).click();
  await page.getByText('Player description', { exact: true }).waitFor();
  assert.equal(await page.locator('.adm-report-description img').count(), 0);
  assert.equal(await page.evaluate(() => window.evidenceExecuted), undefined);
  await page.getByLabel('Evidence file', { exact: true }).selectOption('launcher.log');
  await page.getByRole('region', { name: 'launcher.log contents' }).count();
  await page.waitForFunction(() => document.querySelector('.adm-evidence-text')?.getAttribute('aria-label') === 'launcher.log contents');
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download ZIP', exact: true }).click();
  assert.equal((await download).suggestedFilename(), `open77-incident-${id}.zip`);
  corrupt = true; await page.getByRole('button', { name: 'Download ZIP', exact: true }).click();
  await page.getByText(/Report integrity mismatch/).waitFor();
  await page.screenshot({ path: path.join(out, 'incidents-desktop.png'), fullPage: true });
  await page.getByText('Discord notifications', { exact: false }).first().click();
  await page.getByLabel(/Replace webhook URL/).fill('https://evil.example.test/token');
  await page.getByRole('button', { name: 'Save & enable' }).click();
  await page.getByText(/Use an HTTPS discord.com/).waitFor(); assert.equal(sends, 0);
  await page.getByLabel(/Replace webhook URL/).fill('https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz0123456789_ABCDEFG');
  await page.getByRole('button', { name: 'Save & enable' }).click();
  await page.getByText(/Discord settings saved/).waitFor(); assert.equal(await page.getByLabel(/Replace webhook URL/).inputValue(), '');
  await page.getByRole('button', { name: 'Older', exact: true }).click();
  await page.getByText('99999999…', { exact: true }).count();
  await page.waitForFunction(() => document.querySelector('.adm-incident-list')?.textContent.includes('99999999'));
  await page.getByRole('button', { name: 'Newer', exact: true }).click();
  await page.getByRole('button', { name: 'Refresh', exact: true }).waitFor({ state: 'visible' });
  delay = 500; await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  assert.ok(await page.locator('.adm-progress').isVisible());
  await page.waitForFunction(() => !document.querySelector('.adm-progress')); delay = 0;
  for (const viewport of [{ width: 1024, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `viewport overflow at ${viewport.width}`);
    if (viewport.width === 390) {
      await page.getByRole('button', { name: 'Toggle navigation' }).click();
      await page.getByRole('link', { name: 'Accounts', exact: true }).click();
      await page.getByRole('heading', { name: 'Accounts.', exact: true }).waitFor();
      await page.screenshot({ path: path.join(out, 'accounts-mobile.png'), fullPage: true });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const route of ['servers','users','licenses','bans','audit','alpha-access','mods','mods/requests','releases']) {
    await page.goto(`${base}/admin/${route}`);
    await page.waitForFunction(() => !document.querySelector('.adm-progress') && !!document.querySelector('.adm-page-content'));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route + ' viewport overflow');
  }
  await page.goto(base + '/admin/incidents'); denied = true;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Receiver temporarily unavailable' }).waitFor(); denied = false;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.adm-page-content').evaluate(el => getComputedStyle(el).animationName), 'none');
  // Front-end gate never requests private reports for a regular account or signed-out browser.
  role = 'user'; await context.addInitScript(value => localStorage.setItem('open77.session', JSON.stringify({ ...value, role: 'user' })), session);
  calls.length = 0; await page.goto(base + '/admin/incidents'); await page.getByText('Administrator account required', { exact: true }).waitFor();
  assert.equal(calls.filter(x => x.p.includes('incidents')).length, 0);
  await context.addInitScript(() => localStorage.removeItem('open77.session'));
  calls.length = 0; await page.goto(base + '/admin/incidents'); await page.getByText('The operations console requires a staff sign-in.').waitFor();
  assert.equal(calls.filter(x => x.p.includes('incidents')).length, 0);
  assert.deepEqual(failures, []);
  console.log('PASS admin: 11 routes, 3 viewports, responsive navigation, loading/error states, reduced motion, safe evidence, verified download, webhook validation/masking, pagination and role gates.');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
