/* eslint-disable @typescript-eslint/no-require-imports, no-console -- Isolated browser fixture. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.OP77_PLAYWRIGHT || 'playwright');
const base = process.env.OP77_TEST_APP || 'http://127.0.0.1:3029';
const operator = { accountId: '10000000-0000-4000-8000-000000000001', email: 'operator@example.test', displayName: 'Operator', role: 'admin', emailVerified: true };
const token = 'synthetic-session-not-a-real-token';
const accountId = '20000000-0000-4000-8000-000000000002';
const row = { accountId, email: 'xbox-player@example.test', displayName: 'Xbox player', role: 'user', status: 'active', storeVerified: false,
  steamId: null, gogId: null, granted: false, revision: 0, reason: null, updatedBy: null, updatedAtUtc: null };
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage(), errors = [], mutations = [];
    let reply, role = 'admin';
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/api/v1/**', async route => {
      const request = route.request(), url = new URL(request.url());
      const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, PUT' };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      const json = body => route.fulfill({ json: body, headers });
      if (url.pathname === '/api/v1/accounts/me') return json({ ...operator, role });
      if (url.pathname === '/api/v1/admin/game-ownership') {
        const query = url.searchParams.get('query'), granted = url.searchParams.get('granted');
        const items = (!query || row.email.includes(query) || accountId === query) && (granted === null || String(row.granted) === granted) ? [{ ...row }] : [];
        return json({ page: 1, pageSize: 25, total: items.length, items });
      }
      if (url.pathname === `/api/v1/admin/game-ownership/${accountId}`) {
        const body = request.postDataJSON();
        mutations.push({ path: url.pathname, method: request.method(), body, token: request.headers().authorization });
        const result = await new Promise(resolve => { reply = resolve; });
        if (result === 'ok') { Object.assign(row, body, { revision: row.revision + 1, updatedBy: operator.accountId, updatedAtUtc: new Date().toISOString() }); return json(row); }
        return route.fulfill({ status: result === 'stale' ? 409 : 403, headers,
          json: { code: result === 'stale' ? 'ownership_override_changed' : 'admin_required', message: result === 'stale' ? 'Changed by another administrator. Refresh before trying again.' : 'Administrator access required.' } });
      }
      return json([]);
    });
    await context.addInitScript(value => localStorage.setItem('open77.session', JSON.stringify(value)), { ...operator, token, expiresAtUtc: '2036-09-14T00:00:00Z' });
    await page.goto(base + '/admin/game-ownership');
    const target = page.getByRole('row').filter({ hasText: row.email });
    const dialog = page.getByRole('dialog');
    await target.getByRole('button', { name: 'Whitelist account', exact: true }).click();
    await dialog.waitFor();
    assert.equal(await dialog.getByRole('button', { name: 'Confirm whitelist' }).isDisabled(), true);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(mutations.length, 0);
    await target.getByRole('button', { name: 'Whitelist account', exact: true }).click();
    await dialog.getByLabel('Reason for this decision').fill('Support ticket 24: Xbox PC');
    const confirm = dialog.getByRole('button', { name: 'Confirm whitelist' });
    await confirm.click();
    await dialog.getByRole('status').waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await dialog.isVisible(), true);
    assert.equal(await confirm.isDisabled(), true);
    assert.equal(mutations.length, 1);
    assert.deepEqual(mutations[0], { path: `/api/v1/admin/game-ownership/${accountId}`, method: 'PUT',
      body: { granted: true, revision: 0, reason: 'Support ticket 24: Xbox PC' }, token: `Bearer ${token}` });
    reply('denied');
    await dialog.getByRole('alert').filter({ hasText: 'Administrator access' }).waitFor();
    assert.equal(row.granted, false);
    await confirm.click(); await dialog.getByRole('status').waitFor(); reply('ok');
    await dialog.waitFor({ state: 'hidden' });
    await target.getByRole('button', { name: 'Remove approval', exact: true }).waitFor();
    assert.equal(row.steamId, null); assert.equal(row.gogId, null); assert.equal(row.role, 'user');
    const output = path.join(process.cwd(), 'artifacts/admin-game-ownership'); fs.mkdirSync(output, { recursive: true });
    await page.screenshot({ path: path.join(output, 'whitelisted.png'), fullPage: true });
    await target.getByRole('button', { name: 'Remove approval' }).click();
    await dialog.getByLabel('Reason for this decision').fill('Test access ended');
    const remove = dialog.getByRole('button', { name: 'Confirm removal' });
    await remove.click(); await dialog.getByRole('status').waitFor(); reply('stale');
    await dialog.getByRole('alert').filter({ hasText: 'another administrator' }).waitFor();
    assert.equal(row.granted, true);
    await remove.click(); await dialog.getByRole('status').waitFor(); reply('ok');
    await dialog.waitFor({ state: 'hidden' });
    await target.getByRole('button', { name: 'Whitelist account', exact: true }).waitFor();
    assert.equal(row.granted, false);
    await page.getByRole('button', { name: 'Whitelisted', exact: true }).click();
    await page.getByText('No accounts match this search.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'All accounts', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search game access accounts' }).fill('missing-player');
    await page.getByText('No accounts match this search.', { exact: true }).waitFor();
    await page.getByRole('textbox', { name: 'Search game access accounts' }).fill(accountId);
    await target.getByRole('button', { name: 'Whitelist account', exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await target.getByRole('button', { name: 'Whitelist account', exact: true }).click();
    await dialog.waitFor();
    const bounds = await dialog.boundingBox(); assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 391);
    await page.screenshot({ path: path.join(output, 'mobile-confirmation.png') });
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
    role = 'user'; await page.reload();
    await page.getByText('Administrator account required', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Whitelist account', exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: admin whitelist grant/revoke, reason required, cancellation, duplicate-submit guard, denied/stale responses, search/filter, mobile dialog, role gate, no invented store IDs.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
