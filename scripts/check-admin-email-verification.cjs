/* eslint-disable @typescript-eslint/no-require-imports, no-console -- Standalone browser check. */
// Synthetic accounts and intercepted API calls only. Never verifies a real e-mail.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.OP77_PLAYWRIGHT || 'playwright');
const base = process.env.OP77_TEST_APP || 'http://127.0.0.1:3029';
const operator = { accountId: '10000000-0000-4000-8000-000000000001', email: 'operator@example.test', displayName: 'Operator', role: 'admin', emailVerified: true };
const token = 'synthetic-session-not-a-real-token';
const session = { ...operator, token, expiresAtUtc: '2036-09-14T00:00:00Z' };
const targetId = '20000000-0000-4000-8000-000000000002';
const rows = [
  { accountId: targetId, email: 'delivery-failed@example.test', displayName: 'Delivery failed', role: 'user', status: 'active', emailVerified: false, createdAtUtc: '2026-09-14T12:00:00Z' },
  { accountId: '30000000-0000-4000-8000-000000000003', email: 'verified@example.test', displayName: 'Already verified', role: 'user', status: 'active', emailVerified: true, createdAtUtc: '2026-09-14T12:00:00Z' },
  { accountId: '40000000-0000-4000-8000-000000000004', email: 'suspended@example.test', displayName: 'Suspended account', role: 'user', status: 'suspended', emailVerified: false, createdAtUtc: '2026-09-14T12:00:00Z' },
];

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const errors = [], mutations = [];
    let reply, role = 'admin';
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/api/v1/**', async route => {
      const request = route.request(), url = new URL(request.url());
      const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST' };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      const json = body => route.fulfill({ json: body, headers });
      if (url.pathname === '/api/v1/accounts/me') return json({ ...operator, role });
      if (url.pathname === '/api/v1/admin/users') return json(rows.filter(row => !url.searchParams.get('query') || row.email.includes(url.searchParams.get('query'))));
      if (url.pathname.endsWith('/verify-email')) {
        mutations.push({ path: url.pathname, method: request.method(), body: request.postDataJSON(), token: request.headers().authorization });
        const decision = await new Promise(resolve => { reply = resolve; });
        if (decision === 'ok') {
          const row = rows.find(row => url.pathname.includes(row.accountId));
          row.emailVerified = true;
          return json(row);
        }
        return route.fulfill({ status: decision === 'stale' ? 409 : 403, headers,
          json: { code: decision === 'stale' ? 'email_changed' : 'admin_required',
            message: decision === 'stale' ? 'The account\'s e-mail has changed. Reload the account before verifying it.' : 'This route requires an administrator account.' } });
      }
      return json([]);
    });
    await context.addInitScript(value => localStorage.setItem('open77.session', JSON.stringify(value)), session);
    await page.goto(base + '/admin/users');
    const target = page.getByRole('row').filter({ hasText: 'delivery-failed@example.test' });
    await target.getByRole('button', { name: 'Verify e-mail', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Verify e-mail', exact: true }).count(), 2);
    const dialog = page.getByRole('dialog', { name: 'Verify this e-mail manually?' });
    const open = () => target.getByRole('button', { name: 'Verify e-mail', exact: true }).click();
    await open();
    await dialog.waitFor();
    assert.equal(await dialog.getByRole('button', { name: 'Cancel', exact: true }).evaluate(button => button === document.activeElement), true);
    assert.match(await dialog.textContent(), /delivery-failed@example.test/);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(mutations.length, 0, 'Cancel must not send a mutation');
    await open();
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(mutations.length, 0, 'Escape must not send a mutation');

    await open();
    const confirm = dialog.getByRole('button', { name: 'Confirm verification', exact: true });
    await confirm.click();
    await dialog.getByRole('status').filter({ hasText: 'Verifying' }).waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await dialog.isVisible(), true, 'In-flight verification cannot be dismissed');
    await dialog.getByRole('button').last().evaluate(button => button.click());
    assert.equal(mutations.length, 1, 'Disabled confirm must not duplicate requests');
    assert.deepEqual(mutations[0], { path: `/api/v1/admin/users/${targetId}/verify-email`, method: 'POST', body: { email: rows[0].email }, token: `Bearer ${token}` });
    reply('stale');
    await dialog.getByRole('alert').filter({ hasText: 'has changed' }).waitFor();
    assert.equal(await target.getByText('unverified', { exact: true }).count(), 1);
    await confirm.click();
    await dialog.getByRole('status').filter({ hasText: 'Verifying' }).waitFor();
    reply('denied');
    await dialog.getByRole('alert').filter({ hasText: 'administrator account' }).waitFor();
    assert.equal(await target.getByText('unverified', { exact: true }).count(), 1);
    await confirm.click();
    await dialog.getByRole('status').filter({ hasText: 'Verifying' }).waitFor();
    reply('ok');
    await dialog.waitFor({ state: 'hidden' });
    await target.getByText('verified', { exact: true }).waitFor();
    assert.equal(await target.getByRole('button', { name: 'Verify e-mail', exact: true }).count(), 0);
    await page.getByRole('status').filter({ hasText: 'E-mail verified for' }).waitFor();
    assert.equal(rows[0].status, 'active');
    assert.equal(rows[0].role, 'user');

    const out = path.join(process.cwd(), 'artifacts', 'admin-email');
    fs.mkdirSync(out, { recursive: true });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.getByRole('row').filter({ hasText: 'suspended@example.test' }).getByRole('button', { name: 'Verify e-mail', exact: true }).click();
      await dialog.waitFor();
      const rect = await dialog.boundingBox();
      assert.ok(rect.x >= 0 && rect.x + rect.width <= width + 1, 'Dialog must fit the viewport');
      await page.screenshot({ path: path.join(out, `confirmation-${width}.png`) });
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
    }
    assert.equal(rows[2].status, 'suspended');
    assert.equal(rows[2].emailVerified, false);
    role = 'user';
    await page.reload();
    await page.getByText('Administrator account required', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Verify e-mail', exact: true }).count(), 0);
    assert.equal(mutations.length, 3);
    assert.deepEqual(errors, []);
    console.log('PASS: admin e-mail verification confirmation/cancel/Escape, loading, single-submit, stale-address/role failures, success, existing verification, responsive dialog and role gate. Synthetic accounts only.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
