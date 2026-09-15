/* eslint-disable @typescript-eslint/no-require-imports, no-console -- Standalone browser regression. */
// Synthetic evidence and intercepted master requests only. No production mutations.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.OP77_PLAYWRIGHT || 'playwright');
const base = process.env.OP77_TEST_APP || 'http://127.0.0.1:3108';
const id = '11111111-2222-4333-8444-555555555555';
const time = '2026-09-15T12:00:00Z';
const account = { accountId: id, email: 'operator@example.test', displayName: 'Operator', role: 'admin', emailVerified: true };
const session = { ...account, token: 'synthetic-session', expiresAtUtc: '2036-09-15T12:00:00Z' };
const row = { incidentId: id, occurredAtUtc: time, receivedAtUtc: time, kind: 'engine-crash', fingerprint: 'a'.repeat(64), serverId: id, bytes: 40, sha256: 'b'.repeat(64) };
const open = { status: 'open', revision: 0, updatedAtUtc: null, updatedByAccountId: null, reason: null, problem: null, fix: null };

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = [], mutations = [], filters = [];
    let saved = { ...open }, reply, unavailable = false, role = 'admin';
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/api/v1/**', async route => {
      const req = route.request(), url = new URL(req.url()), p = url.pathname;
      const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST' };
      const json = body => route.fulfill({ headers, json: body });
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (p === '/api/v1/accounts/me') return json({ ...account, role });
      if (p === '/api/v1/admin/incidents/discord') return json({ configured: false, enabled: false, destination: null, delivery: { state: 'idle' } });
      if (p === '/api/v1/incidents') {
        const status = url.searchParams.get('status'); filters.push(status);
        return json({ items: !status || saved.status === status ? [{ ...row, resolution: unavailable ? undefined : saved }] : [], next: null });
      }
      if (p.endsWith('/resolution')) {
        if (unavailable) return route.fulfill({ headers, status: 404, json: {} });
        if (req.method() === 'GET') return json(saved);
        const body = req.postDataJSON(); mutations.push(body);
        assert.equal(req.headers().authorization, 'Bearer synthetic-session');
        const decision = await new Promise(resolve => { reply = resolve; });
        if (decision !== 'ok') return route.fulfill({ headers, status: decision === 'conflict' ? 409 : 503,
          json: { code: decision === 'conflict' ? 'incident_resolution_conflict' : 'incident_storage_unavailable' } });
        assert.equal(body.expectedRevision, saved.revision);
        saved = { status: body.status, revision: saved.revision + 1, updatedAtUtc: time, updatedByAccountId: id,
          reason: body.reason?.trim() || null, problem: body.problem?.trim() || null, fix: body.fix?.trim() || null };
        return json(saved);
      }
      if (p.endsWith('/preview')) return json({ incidentId: id, sha256: row.sha256, manifest: {}, files: [{ path: 'incident.json', bytes: 40 }], entry: 'incident.json', text: 'Synthetic evidence only', truncated: false });
      return json([]);
    });
    await context.addInitScript(value => localStorage.setItem('open77.session', JSON.stringify(value)), session);
    await page.goto(base + '/admin/incidents');
    const inspect = () => page.getByRole('button', { name: /^Inspect incident/ }).click();
    const panel = page.getByRole('region', { name: 'Report resolution', exact: true });
    const button = name => panel.getByRole('button', { name, exact: true });
    async function submit(name, decision) {
      const count = mutations.length;
      await button(name).click();
      await panel.getByRole('status').filter({ hasText: 'Saving resolution' }).waitFor();
      assert.equal(mutations.length, count + 1);
      assert.equal(await panel.locator('textarea').first().isDisabled(), true);
      reply(decision);
    }
    await inspect(); await button('Resolve report').click();
    assert.equal(await panel.getByLabel('Reason (optional)', { exact: false }).getAttribute('maxlength'), '500');
    await button('Cancel').click(); assert.equal(mutations.length, 0);
    await button('Resolve report').click();
    await panel.getByLabel(/Reason \(optional\)/).fill('Fixed in client build');
    const unsafe = '<img src=x onerror="window.notesExecuted=true">';
    await panel.getByLabel(/Problem identified/).fill(unsafe);
    await panel.getByLabel(/Fix \/ how/).fill('Validate the animation handle.\nAdd a regression test.');
    await submit('Confirm resolve', 'fail');
    await panel.getByRole('alert').filter({ hasText: 'storage is unavailable' }).waitFor();
    assert.equal(await panel.getByLabel(/Problem identified/).inputValue(), unsafe);
    assert.equal(saved.status, 'open', 'Failed saves must not resolve locally');
    await submit('Confirm resolve', 'ok');
    await panel.getByText('Report resolved. Resolution saved on the master.', { exact: true }).waitFor();
    assert.equal(await panel.locator('img').count(), 0);
    assert.equal(await page.evaluate(() => window.notesExecuted), undefined);
    await page.reload(); await inspect(); await button('Edit resolution').waitFor();
    await panel.getByText(unsafe, { exact: true }).waitFor();
    await button('Edit resolution').click(); await panel.getByLabel(/Reason \(optional\)/).fill('Unsaved draft');
    await submit('Save resolution', 'conflict');
    await panel.getByRole('alert').filter({ hasText: 'changed since' }).waitFor();
    assert.equal(await panel.getByLabel(/Reason \(optional\)/).inputValue(), 'Unsaved draft');
    await button('Reload saved version (discard draft)').click();
    await button('Edit resolution').waitFor(); await panel.getByText('Fixed in client build', { exact: true }).waitFor();
    await button('Reopen report').click(); await submit('Confirm reopen', 'ok');
    await button('Resolve report').waitFor(); assert.equal(saved.status, 'open'); assert.equal(saved.problem, unsafe);
    await button('Resolve report').click();
    for (const label of [/Reason \(optional\)/, /Problem identified/, /Fix \/ how/]) await panel.getByLabel(label).fill('');
    await submit('Confirm resolve', 'ok');
    await panel.getByText('Resolved without additional notes.', { exact: true }).waitFor();
    const out = path.join(process.cwd(), 'artifacts', 'admin-resolution'); fs.mkdirSync(out, { recursive: true });
    await page.screenshot({ path: path.join(out, 'resolved-desktop.png'), fullPage: true });
    await page.getByLabel(/^Status/).selectOption('open');
    await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
    await page.getByRole('heading', { name: 'No reports found', exact: true }).waitFor(); assert.equal(filters.at(-1), 'open');
    await page.getByLabel(/^Status/).selectOption('resolved');
    await page.getByRole('button', { name: 'Apply filters', exact: true }).click(); await inspect();
    await button('Edit resolution').click();
    for (const width of [1024, 390]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${width}`);
    }
    await page.screenshot({ path: path.join(out, 'resolution-mobile.png'), fullPage: true });
    await button('Cancel').click();
    unavailable = true; await page.reload(); await inspect();
    await panel.getByRole('alert').filter({ hasText: 'master may need updating' }).waitFor();
    assert.equal(await button('Resolve report').count(), 0, 'Older masters must not simulate local-only resolution');
    assert.equal(await button('Edit resolution').count(), 0);
    role = 'user'; await context.addInitScript(value => localStorage.setItem('open77.session', JSON.stringify({ ...value, role: 'user' })), session);
    const count = mutations.length;
    await page.goto(base + '/admin/incidents');
    await page.getByText('Administrator account required', { exact: true }).waitFor();
    assert.equal(mutations.length, count);
    assert.deepEqual(errors, []);
    console.log('PASS: resolution, optional notes, persistence across page reload, reopen, failures, conflict, filters, private auth, safe text, mobile and old-master fallback.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
