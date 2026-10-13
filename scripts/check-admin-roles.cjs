/* eslint-disable @typescript-eslint/no-require-imports, no-console -- Standalone browser check. */
// Synthetic accounts and intercepted API calls only. Never changes a real role.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.OP77_PLAYWRIGHT || 'playwright');
const base = process.env.OP77_TEST_APP || 'http://127.0.0.1:3029';
const operator = { accountId: '10000000-0000-4000-8000-000000000001', email: 'operator@example.test', displayName: 'Operator', role: 'admin', emailVerified: true };
const token = 'synthetic-session-not-a-real-token';
const session = { ...operator, token, expiresAtUtc: '2036-09-14T00:00:00Z' };
const memberId = '20000000-0000-4000-8000-000000000002';
const rows = [
  { ...operator, status: 'active', createdAtUtc: '2026-09-14T12:00:00Z' },
  { accountId: memberId, email: 'member@example.test', displayName: 'Member', role: 'user', status: 'active', emailVerified: true, createdAtUtc: '2026-09-14T12:00:00Z' },
  { accountId: '30000000-0000-4000-8000-000000000003', email: 'fresh@example.test', displayName: 'Unverified', role: 'user', status: 'active', emailVerified: false, createdAtUtc: '2026-09-14T12:00:00Z' },
  { accountId: '40000000-0000-4000-8000-000000000004', email: 'suspended@example.test', displayName: 'Suspended', role: 'user', status: 'suspended', emailVerified: true, createdAtUtc: '2026-09-14T12:00:00Z' },
];

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const errors = [], mutations = [];
    let reply;
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/api/v1/**', async route => {
      const request = route.request(), url = new URL(request.url());
      const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST' };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      const json = body => route.fulfill({ json: body, headers });
      if (url.pathname === '/api/v1/accounts/me') return json(operator);
      if (url.pathname === '/api/v1/admin/users') return json(rows);
      if (url.pathname.endsWith('/role')) {
        mutations.push({ path: url.pathname, body: request.postDataJSON(), token: request.headers().authorization });
        const decision = await new Promise(resolve => { reply = resolve; });
        if (decision === 'ok') {
          const row = rows.find(row => url.pathname.includes(row.accountId));
          row.role = request.postDataJSON().role;
          return json(row);
        }
        return route.fulfill({ status: 403, headers, json: { code: 'reauth_failed', message: 'Your password was not accepted. Role changes need your current password.' } });
      }
      return json([]);
    });
    await context.addInitScript(value => localStorage.setItem('open77.session', JSON.stringify(value)), session);
    await page.goto(base + '/admin/users');

    const row = email => page.getByRole('row').filter({ hasText: email });
    await row('member@example.test').getByRole('button', { name: 'Make admin', exact: true }).waitFor();
    // Not offered on oneself, nor to unverified or suspended accounts.
    assert.equal(await row('operator@example.test').getByRole('button', { name: /admin/i }).count(), 0, 'no role change on oneself');
    assert.equal(await row('fresh@example.test').getByRole('button', { name: 'Make admin', exact: true }).count(), 0, 'unverified accounts cannot be promoted');
    assert.equal(await row('suspended@example.test').getByRole('button', { name: 'Make admin', exact: true }).count(), 0, 'suspended accounts cannot be promoted');

    const dialog = page.getByRole('dialog', { name: 'Make this account an administrator?' });
    await row('member@example.test').getByRole('button', { name: 'Make admin', exact: true }).click();
    await dialog.waitFor();
    assert.match(await dialog.textContent(), /member@example\.test/);
    const confirm = dialog.locator('[data-role-confirm]');
    assert.equal(await confirm.isDisabled(), true, 'confirm needs the password');
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(mutations.length, 0, 'Escape sends nothing');

    // Wrong password: the error shows, the role stays.
    await row('member@example.test').getByRole('button', { name: 'Make admin', exact: true }).click();
    await dialog.locator('[data-role-password]').fill('wrong password');
    await confirm.click();
    await dialog.getByRole('status').filter({ hasText: 'Saving' }).waitFor();
    reply('denied');
    await dialog.getByRole('alert').filter({ hasText: 'not accepted' }).waitFor();
    assert.equal(await row('member@example.test').getByText('user', { exact: true }).count(), 1);

    // Right password: promoted, notice, the button flips to Remove admin.
    await dialog.locator('[data-role-password]').fill('correct horse battery');
    await confirm.click();
    reply('ok');
    await dialog.waitFor({ state: 'hidden' });
    await page.getByRole('status').filter({ hasText: 'is now an administrator' }).waitFor();
    await row('member@example.test').getByRole('button', { name: 'Remove admin', exact: true }).waitFor();
    assert.equal(mutations.length, 2);
    assert.deepEqual(mutations[1], {
      path: `/api/v1/admin/users/${memberId}/role`,
      body: { role: 'admin', email: 'member@example.test', password: 'correct horse battery' },
      token: `Bearer ${token}`,
    });

    // Demotion goes through the same confirmation.
    await row('member@example.test').getByRole('button', { name: 'Remove admin', exact: true }).click();
    const demote = page.getByRole('dialog', { name: 'Remove administrator access?' });
    await demote.waitFor();
    await demote.locator('[data-role-password]').fill('correct horse battery');
    await demote.locator('[data-role-confirm]').click();
    reply('ok');
    await demote.waitFor({ state: 'hidden' });
    await row('member@example.test').getByRole('button', { name: 'Make admin', exact: true }).waitFor();
    assert.equal(mutations[2].body.role, 'user');

    const out = path.join(process.cwd(), 'artifacts', 'admin-roles');
    fs.mkdirSync(out, { recursive: true });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await row('member@example.test').getByRole('button', { name: 'Make admin', exact: true }).click();
      await dialog.waitFor();
      const rect = await dialog.boundingBox();
      assert.ok(rect.x >= 0 && rect.x + rect.width <= width + 1, 'dialog fits the viewport');
      await page.screenshot({ path: path.join(out, `promote-${width}.png`) });
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
    }
    assert.deepEqual(errors, []);
    console.log('PASS: admin role change: hidden on self/unverified/suspended, password required, Escape sends nothing, wrong password kept the role, promote and demote with audit notice, responsive dialog. Synthetic accounts only.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
