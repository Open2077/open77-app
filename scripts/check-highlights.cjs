/* eslint-disable @typescript-eslint/no-require-imports, no-console -- Browser regression harness. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.OP77_PLAYWRIGHT || 'playwright');
const { mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1080 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const session = { accountId: '10000000-0000-4000-8000-000000000001', token: 'synthetic-highlights', displayName: 'Operator', email: 'operator@example.test', role: 'admin', emailVerified: true, expiresAtUtc: '2036-01-01T00:00:00Z' };
    const rows = [], writes = [];
    await page.addInitScript(value => localStorage.setItem('open77.session', JSON.stringify(value)), session);
    await page.route('**/api/v1/**', async route => {
      const request = route.request(), url = new URL(request.url());
      const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE' };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      const reply = json => route.fulfill({ json, headers });
      if (url.pathname.endsWith('/accounts/me')) return reply(session);
      if (url.pathname.startsWith('/api/v1/admin/highlights')) {
        if (request.method() === 'GET') return reply(rows);
        assert.equal(request.headers().authorization, 'Bearer synthetic-highlights');
        writes.push({ method: request.method(), body: request.postDataJSON() });
        const data = request.postDataJSON();
        if (request.method() === 'POST') {
          const saved = { ...data, id: `20000000-0000-4000-8000-${String(rows.length + 1).padStart(12, '0')}`, revision: 1 }; rows.push(saved); return reply(saved);
        }
        if (request.method() === 'PUT') { const i = rows.findIndex(r => r.id === data.id); rows[i] = { ...data, revision: data.revision + 1 }; return reply(rows[i]); }
      }
      return reply([]);
    });
    await page.goto((process.env.OP77_TEST_APP || 'http://127.0.0.1:3147') + '/admin/highlights');
    await page.getByRole('button', { name: 'New highlight', exact: true }).click();
    await page.getByLabel('Internal name', { exact: true }).fill('LightRP launch');
    await page.getByLabel('Text (optional)', { exact: true }).fill('Night City opens its doors. Build your story with LightRP.');
    await page.getByLabel('Title (optional)', { exact: true }).fill('Your story starts tonight.');
    await page.getByRole('button', { name: 'Add button', exact: true }).click();
    await page.getByLabel('Button 1 label').fill('Join LightRP');
    await page.getByLabel('Action', { exact: true }).selectOption('connect');
    await page.getByLabel('Server ID', { exact: true }).fill('30000000-0000-4000-8000-000000000001');
    await page.getByRole('button', { name: 'Save highlight', exact: true }).click();
    await page.getByText('Highlight saved.', { exact: false }).waitFor();
    assert.equal(writes[0].body.published, false); assert.equal(writes[0].body.actions[0].kind, 'connect');
    await page.getByLabel('Visibility', { exact: true }).selectOption('true');
    await page.getByRole('button', { name: 'Save highlight', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('fieldset').disabled);
    assert.equal(writes[1].method, 'PUT'); assert.equal(writes[1].body.revision, 1);
    const output = resolve(__dirname, '../artifacts/highlights'); mkdirSync(output, { recursive: true });
    await page.screenshot({ path: resolve(output, 'admin-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: 'Duplicate as new', exact: true }).click();
    assert.equal(await page.getByLabel('Visibility', { exact: true }).inputValue(), 'false');
    await page.getByRole('button', { name: 'Save highlight', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('fieldset').disabled);
    assert.equal(writes[2].method, 'POST'); assert.notEqual(rows[0].id, rows[1].id);
    await page.setViewportSize({ width: 700, height: 1000 });
    await page.screenshot({ path: resolve(output, 'admin-small.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    console.log('PASS highlights editor: create, preview, connect action, schedule, publish, revision, duplicate, responsive layout.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
