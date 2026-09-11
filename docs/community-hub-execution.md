# OPEN//77 Hub execution ledger

Goal active. Complete H00–H15 from [implementation contract](community-hub-implementation.md); no production publication/deployment. Paid/deferred features excluded. No requirement is complete merely because a UI or API stub exists.

## Isolated workspaces

All four use branch `feat/community-hub`, created from the existing checkout HEAD without switching its branch.

| Checkout | Baseline | Original state preserved |
| --- | --- | --- |
| `../hub-app` | `8e8f5f7` | app/main; two planning documents copied into this checkout |
| `../hub-master` | `7735a2f` | master/main |
| `../hub-base` | `f8ae5471` | base/av-fix-merge; unrelated research changes left untouched |
| `../hub-launcher` | `013e11a` | launcher/fix/mod-menu-footer-and-solo-panel; untracked .claude left untouched |

## Acceptance status

- [ ] H00: baseline/environment/contract — worktrees ready; Docker 29.7.2 responds; pinned submodule ready; app dependencies installed; SSR preview path pending.
- [ ] H01: interface prototype
- [ ] H02: schema/domain/permissions/revisions — migration 12 and project revision lifecycle implemented/tested. Profiles, release lifecycle, membership workflows and remaining schema still need implementation.
- [ ] H03: project/profile/release APIs — initial project create/edit/submit/review/public/private listing routes tested over HTTP; broader contracts still pending.
- [ ] H04: private file gateway/storage/jobs
- [ ] H05: package/media inspection
- [ ] H06: review/report/revocation/admin
- [ ] H07: live publishing/download/directory
- [ ] H08: social/notifications
- [ ] H09: metrics/search/SEO/accessibility
- [ ] H10: GitHub import
- [ ] H11: Warden browse/planner
- [ ] H12: Warden install/update/rollback
- [ ] H13: Warden creator connection/export
- [ ] H14: launcher/docs
- [ ] H15: CI/regression/restore/release artifacts

H16 production rollout is outside authorization.

## Evidence and findings

- 2026-09-11: `open77_status`: no master on 8090, existing dev server on 11778, no game instance. Preserve that server; use distinct local ports for hub tests.
- Read Open77 testing skill. Game/runtime validation will use hub-base artifacts explicitly; configured MCP defaults point at base.
- Master pins base submodule `b26baffbd6ec0cb7320ea52b01c81e73b3bdfa52`. Local Git configuration resolves its URL to the base checkout; permit file transport only for the explicit initialization command. No global Git configuration changes.
- Found master schema version 11 and advisory-lock migration runner. Community migrations must be additive, restartable and tested against real MariaDB.

## Next work

Build interface components against the initial real project contract, then expand profiles/releases and private uploads. Keep all H00–H15 gates pending until direct evidence satisfies them.

## Foundation checkpoint — 11 September 2026

Implemented in hub-master:

- Additive restartable migration 12: projects, revisions, slug reservations, members, profiles, releases/artifacts, dependency/media/upload/job storage, comments/interactions, outbox/notifications/reports/audit/import/idempotency tables. Metrics/delegation and final lifecycle constraints are not yet complete.
- Immutable project content snapshots; published reads retain the approved revision during edits/rejection. Draft edits invalidate old submitted review snapshots.
- Current verified active-account checks, member-only editing, admin review, per-account draft quota, atomic slug reservations and submission media/release prerequisites.
- Feature flags default off. Project public/private HTTP routes and structured errors; private contribution requests have per-account rate limiting. Added needed PATCH/PUT CORS verbs without changing allowed origins.
- Basic listing uses stable ID pagination; date/trending/tag/compatibility sorts remain H09 work, not implemented behavior.

Validation:

- `dotnet build Open77.Master.slnx -c Release --nologo`: passed, zero warnings/errors.
- Executable runner `dotnet tests/Open77.Master.Tests/bin/Release/net10.0/Open77.Master.Tests.dll --filter 'FullyQualifiedName~Community' --minimum-expected-tests 13 --report-trx --report-trx-filename community-api.trx`: 13/13 passed against real MariaDB.
- Full executable runner with `--report-trx --report-trx-filename hub-master-regression.trx`: 116/116 passed, zero skipped, 48 seconds. Reports live under the test project's ignored `bin/Release/net10.0/TestResults/`.
- Tests prove private/public separation, concurrent edit conflict, review invalidation, role/current-status enforcement, quota prerequisites, migration interruption retry, comment project FK/duplicate vote constraints, HTTP publication and cursor ownership binding.
- Earlier `dotnet test ... -- --filter-class` invocation ran zero tests and was discarded. SDK CLI `-- --help` failed; invoking the built test executable directly exposes the supported `--filter` syntax. No test failures were suppressed.
- `npm ci --no-audit --no-fund` completed in hub-app. npm reported one pending third-party postinstall (`unrs-resolver`); no blanket install-script approvals granted.
- No app interface files were changed in this checkpoint: an attempted combined replacement patch was rejected atomically. UI work is the next step.

Scope remains H00–H15 in full. No production changes, no game startup, no changes to the existing dev server.
