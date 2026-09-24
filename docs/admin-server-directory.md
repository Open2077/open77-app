# Server directory visibility and labels

`/admin/servers` edits master-owned directory labels. Server owners cannot self-assign them through registration metadata.

- Official and Featured are independent checkboxes.
- Hide from list removes a server from public listings (including Featured), not from the admin panel. Uncheck it and Save changes to restore listing eligibility. This is not a ban or a privacy boundary: existing history, direct connections and lookup by known server ID remain available.
- Hiding overrides Official/Featured without clearing either designation. Hidden identities stay editable even while offline; settings survive heartbeat updates and re-registration under the same server ID.
- Featured order is 0–999, lower first in the launcher.
- Each row saves explicitly with loading feedback; conflicting revisions surface a readable error and require Refresh.
- Search matches server name, address, ID and owner. Filters show all, not hidden, hidden, featured or official identities.
- Offline curated identities remain editable but are not shown in the public catalog.
- Actions use the current administrator bearer session and the master's audited `PUT /api/v1/admin/servers/{id}/directory` endpoint. No webhook, service credential or new secret is exposed to the browser.

Deploy master schema/API 40 and matching Community binaries before using visibility controls. The checkbox is disabled when the connected master does not expose visibility. All existing servers remain unhidden by default; no identities are automatically promoted or hidden. Catalog totals and pagination exclude hidden servers. Clients see the change on their next directory refresh (subject to their normal cache).

The PUT body includes `hidden: boolean`; responses and admin rows expose `hidden`. An omitted/null `hidden` from an older admin client preserves the stored setting, instead of accidentally unhiding the server during a label edit. Revision checks and audited writes cover visibility and labels together.

Check: `scripts/check-admin-server-directory.cjs` uses real Edge and entirely synthetic/intercepted master traffic; default local app URL `http://127.0.0.1:3037` (override `OP77_TEST_APP`). `OP77_PLAYWRIGHT` may point to an installed Playwright module.
