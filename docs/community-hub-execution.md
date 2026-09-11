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
- [ ] H01: interface prototype — discovery/directory/detail and creator draft surfaces implemented; responsive CSS present, rendered browser review pending.
- [ ] H02: schema/domain/permissions/revisions — migration 12 and project revision lifecycle implemented/tested. Profiles, release lifecycle, membership workflows and remaining schema still need implementation.
- [ ] H03: project/profile/release APIs — initial project create/edit/submit/review/public/private listing routes tested over HTTP; broader contracts still pending.
- [ ] H04: private file gateway/storage/jobs — immutable storage, leased durable queue and scoped upload gateway implemented/tested; inspection integration, delivery and operations remain pending.
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

## Interface/storage checkpoint — 11 September 2026

- hub-app: dynamic Community landing, searchable/category-filtered resource directory, approved resource details/metadata, creator dashboard, new/edit forms with real API save/submit, account gate, conflict feedback and unsaved-text warning. Uses existing design tokens. No fixture projects or activity counts are presented as real.
- Markdown rendering removes raw HTML, external tracking images, unsafe link schemes and credential-bearing URLs; formats code/lists and safe links. Dedicated attack-fixture check passes.
- Frontend is incomplete: media/gallery, releases/download panel, autosaved five-step wizard, profiles/social/moderation, advanced filters and responsive browser review remain required. Current cards show category fallback artwork until processed-media delivery is implemented.
- `npm run check` passed. Production build passed with `/community`, `/resources` and resource details confirmed dynamic. `node --experimental-strip-types scripts/check-community-markdown.mjs` passed (Node reports benign module-type autodetection warning).
- hub-master: immutable SHA-256 blob storage, bounded streamed writes, cleanup after cancellation/failure, collision verification and path/reparse-point checks. Durable queue has exclusive claims, lease recovery, stale completion rejection, backoff and maximum three attempts.
- Master build passed after stopping this task's local master, which had locked its build DLLs. Community test run: 21 passed, zero skipped; report `tests/Open77.Master.Tests/bin/Release/net10.0/TestResults/community-storage.trx`. Full regression was not rerun after these isolated storage additions; prior 116-test baseline remains recorded above.
- Created isolated Docker container `open77-hub-mariadb`, bound only to `127.0.0.1:13316`, with random local credentials in ignored `hub-master/src/Open77.Master/master.json`. Existing shared MariaDB and dev game server left untouched. Local hub master was started on 18090 and then stopped for rebuilding; DB container remains running.
- Automatic approval review rejected the local Next server startup on 3008 with only `blocked by policy`. No alternate launch was attempted to bypass that rejection. Browser/served validation remains pending; it is not implied by build success. Other backend implementation remains unblocked.

Next: upload grants/quota reservations, file gateway and inspection pipeline; finish browser validation when the server-start rejection is resolved. Goal remains active with all H00–H15 requirements intact.

## Upload/archive checkpoint — 11 September 2026

- Added independent `Open77.Community.Files` gateway. It verifies an existing schema without applying migrations or loading platform signing keys. Transfer authorization uses expiring upload-specific bearer grants; account session tokens are not accepted by this gateway.
- Master creates immutable SemVer release identities, reserves per-account upload slots/bytes transactionally, issues grants, exposes private status, and finalizes uploads into quarantine plus one durable inspection job. Completed transfers cannot overwrite bytes. Gateway bounds stream size, concurrent transfers and transfer duration; interrupted transfers reset for retry.
- Additive migration 13 allows separate artifact ownership records to reference the same immutable physical digest. Public visibility remains governed by individual artifact/release state.
- `dotnet build Open77.Master.slnx -c Release --nologo`: zero warnings/errors. Community tests: 26 passed, zero skipped (`community-uploads.trx`). Full master regression: 129 passed, zero skipped in 50 seconds (`hub-upload-regression.trx`). Reports are under the test project's ignored `bin/Release/net10.0/TestResults/`.
- Real HTTP integration tests use MariaDB and private temporary filesystem storage: grant isolation, retry after oversized data, single-use transfers, cross-account ownership, concurrent quota reservation, exact bytes, private visibility and idempotent job enqueue. Random test bytes deliberately remain quarantined; this does not claim successful package inspection.
- Added disposable ZIP staging with shared expanded-byte/entry budgets, portable paths, case/Unicode collision checks, link/device rejection, bounded streamed extraction and cleanup. Six attack/cleanup/budget tests pass (`community-zip-boundary.trx`). This container boundary is not complete package or malware validation; manifest/media/preload inspection and worker integration remain required.
- hub-base parser now has a package-root entry point using the same resource validation implementation, while installed resources still require matching directory names. Parser/preload/resource-subsystem selection: 46 passed, zero skipped (`hub-resource-parser.trx`).
- First base server build found the new worktree's native transport absent. Native source/pins match the existing base checkout (`git diff f8ae5471 -- server/native` empty); copied only its cached Release transport DLL into this worktree. Source/destination SHA-256: `06ef37f835e35b3704ebf5696c8cb9d56a561ea06bfff3b78cea3cb41abc11cf`. No identity/config/cache deletion. The subsequent server build passed; server regression is running.

- Base full server suite finished: 909 passed, five environment-dependent skips (native platform module and four database scenarios), one pre-existing `ShippedWebUiUsesCefSafeCustomDropdowns` failure. Failing test/Freeroam HTML unchanged from baseline `f8ae5471`; prior runbook documents this same failure. The full suite is not green; targeted Hub parser validation is green. No test was suppressed or changed to hide this failure.

Remaining: all unchecked acceptance gates, including worker inspection, download authorization, full creator/social/moderation UI, GitHub/Warden/launcher integrations and release validation. No production publication/deployment.

## Shared package parser checkpoint — 11 September 2026

- Base commit `d8b863ca` adds `ParsePackageRoot` without duplicating the parser or relaxing runtime directory validation. Master now pins that local commit. The dependency has not been pushed or published; release preparation must account for publishing compatible commits only when authorized.
- Started the `Open77.Community.Worker` project with manifest inspection, currently a library rather than a running queue consumer. It accepts root/wrapped resources and explicit bundles, records archive/install roots plus authoritative manifests, preserves distinct runtime versions, and rejects overlapping/missing roots, duplicate install names and unmapped non-documentation files.
- `open77-hub.json` schemaVersion/version/resourceRoots are checked against the submitted release. Dependency/config-template metadata still needs validation and persistence. Preload contents, forbidden-file/secret checks, image processing, worker lifecycle and atomic inspection-result persistence remain required before any artifact can leave quarantine.
- Master solution build passes with the new pinned resource dependency. Community selection: 38 passed, zero skipped (`community-package-manifests.trx`), including six new root/wrapper/bundle/parser cases. No public acceptance or runtime installation is inferred from these manifest-only tests.

## Media processing checkpoint — 11 September 2026

- Worker image processor accepts decoded JPEG/PNG/WebP, enforces 10 MiB/40 MP/20,000-pixel-side limits, rejects animation, applies all eight EXIF orientations and creates fresh WebP derivatives at maximum edges 480/1280/2048 without upscaling. Original encoded bytes/metadata are not reused for delivery.
- Pinned SkiaSharp and its minimal Linux native assets at 4.152.0. Sources: [maintainer package and MIT license](https://www.nuget.org/packages/SkiaSharp/4.152.0), [Linux assets](https://www.nuget.org/packages/SkiaSharp.NativeAssets.Linux.NoDependencies/4.152.0), [codec API](https://learn.microsoft.com/en-us/dotnet/api/skiasharp.skcodec). NuGet mapping explicitly includes this package family. Initial restore required reevaluating the existing test dependency lock; `dotnet restore ... --force-evaluate` succeeded without relaxing source or vulnerability policies.
- Master build passes, zero warnings/errors. Four native-codec tests pass (`community-images.trx`): all supported input formats, derivative sizing/decodability, removal of appended private data, all EXIF orientation quadrants, unchanged small-image size, cancellation, SVG/HTML/empty/oversized input and huge declared dimensions rejected before full decode. Native Linux codec execution and memory-limit/container tests remain pending.
- Image processing is not yet connected to persisted jobs/media rows or public delivery. H05 stays open, along with the remaining full-platform gates.

## Durable image worker checkpoint — 11 September 2026

- `Open77.Community.Worker` is now an executable generic host consuming image jobs. Package jobs remain queued for the package pipeline; manifest-only validation does not publish or accept packages.
- Worker verifies stored input digests, creates immutable derivatives and commits artifact/upload/media/job state in one lease-fenced transaction. Invalid media records a bounded rejection code. Expired/reclaimed workers cannot commit or reject another attempt's result. Operational failures use durable retry/backoff.
- Upload completion is idempotent after processing, acceptance or rejection. Private status returns the processed media ID/rejection code for the creator UI.
- Community selection: 46 passed, zero skipped (`community-image-worker.trx`). Full master regression after status integration: 149 passed, zero skipped (`hub-worker-regression.trx`, 62 seconds). An additional separate-process test then passed (`community-worker-process.trx`): launches the actual worker executable against MariaDB/private storage, observes processed media, stops only that process.
- A build started while the regression executable still held its DLL and emitted retry warnings; it completed after the regression released the file. Subsequent process test used the newly built test assembly. No running test was killed or silently bypassed.
- Added master `docs/community-services.md` with current configuration, process boundaries, recovery semantics and explicit remaining operations work. H04/H05 remain open: package inspection, public delivery, media UI, Linux/process-limit validation, dead-letter replay and orphan cleanup are not complete.

## Package content/preload checkpoint — 11 September 2026

- Package inspection now scans files for private runtime/identity/configuration material, database/log/install/native files, renamed native binaries, undeclared archive magic, LFS pointers and recognizable embedded credentials. Dynamic credential references yield bounded path/code review findings without matched values. This is not a claim that Lua is harmless or a substitute for malware signatures and moderation.
- Added declared ZIP/7z preload inspection. Both reuse the same path/link/collision/extraction boundary and cumulative outer/nested byte/entry budgets. Extracted preload files must satisfy the pinned server's inert `ModRootPolicy`, compiled directly from its source. Nested containers inside preloads are rejected. SharpCompress 1.0.0 matches the pinned base dependency.
- Added an authored real 7z fixture using Windows bsdtar 3.8.8. Its text file is deliberately not a game asset; no map/runtime acceptance is inferred. Initial test expected 56 expanded bytes; the actual fixture contains 58. Corrected the test expectation. Initial run: 55 passed/one assertion failure; corrected community run: 56 passed, zero skipped (`community-preloads-corrected.trx`, 26 seconds). Master build passes, zero warnings/errors.
- Tests cover native/private-file/LFS/secret rejection, secrets across streaming boundaries, template/dynamic credential review findings, root-level resource with ZIP preload, real 7z extraction, invalid mod roots/executable preload content, recursive containers and shared nested budgets.
- Package queue consumption, signature scanning, dependency/config-template metadata validation, immutable inspection persistence and release moderation/delivery are next. Full H00–H15 objective stays active; no production publication/deployment.
