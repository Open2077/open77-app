# Official / featured servers

`/admin/servers` edits master-owned directory labels. Server owners cannot self-assign them through registration metadata.

- Official and Featured are independent checkboxes.
- Featured order is 0–999, lower first in the launcher.
- Each row saves explicitly with loading feedback; conflicting revisions surface a readable error and require Refresh.
- Search matches server name, address, ID and owner. Filters show all, featured or official identities.
- Offline curated identities remain editable but are not shown in the public catalog.
- Actions use the current administrator bearer session and the master's audited `PUT /api/v1/admin/servers/{id}/directory` endpoint. No webhook, service credential or new secret is exposed to the browser.

Deploy master schema/API 39 before using these controls. No identities are automatically promoted.

Check: `scripts/check-admin-server-directory.cjs` uses real Edge and entirely synthetic/intercepted master traffic; default local app URL `http://127.0.0.1:3037` (override `OP77_TEST_APP`). `OP77_PLAYWRIGHT` may point to an installed Playwright module.
