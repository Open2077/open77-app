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
- [ ] H08: social/notifications — moderation/report inbox, votes, private saves, release subscriptions, threaded comments and durable notifications implemented/tested; broader abuse/load and browser validation remain pending.
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

## Package worker/signature checkpoint — 11 September 2026

- Package worker now claims package jobs when configured with a private scratch root and internal ClamD endpoint. It verifies the stored digest, inspects resource/preload/content rules, requires an explicit clean signature result, then atomically records the immutable inspection snapshot and resource manifests while moving the release to `pending_review`. No release is published by technical validation.
- Additive restartable migration 14 adds `community_releases.inspection_json`. Acceptance remains fenced by active job owner/attempt/expiry and current upload/artifact/release states. Scanner outages retain quarantine and durable retry state.
- Added ClamD INSTREAM client with bounded bytes/replies/deadline, no uploaded-path commands, deterministic signature rejection and recorded scanner version. Added `ops/community/clamd.conf`: limits cover Hub archives and `AlertExceedsMax yes`/`AlertEncrypted yes` prevent incomplete scans being silently accepted. Signature freshness monitoring and exhaustive scanner-limit tests remain release work.
- Started dedicated local `open77-hub-clamav` on loopback 13310 with its own signature volume, 4 GiB memory and two CPUs. Pinned image digest `sha256:1fdfd24c6f0a0fb60788481487459a6d4eda8a9b448641594e04db8410d34422`; observed ClamAV 1.5.4, 3,642,760 signatures. Applied the checked-in scanner configuration and verified daemon readiness/effective limits. Existing MariaDB/dev server unchanged.
- Community selection against real local ClamAV: 58 passed, zero skipped (`community-package-worker.trx`). Includes clean ZIP acceptance into review, standard EICAR marker rejection and injected scanner outage retaining quarantine. Master build passes, zero warnings/errors.
- Full master run: 160 passed, one test-harness failure copying ClamD config to the disposable container (`hub-package-regression.trx`). Fixed the destination directory and cleanup on startup failure. The previously failing test then passed using its own real disposable scanner with the checked-in config (`community-disposable-scanner.trx`, 17 seconds). No test was skipped or suppressed; full suite has not been repeated after the harness-only correction.
- Remaining H05 work includes dependency/config-template metadata validation, stronger malicious/limit fixtures and real map/preload runtime scenarios. Release review/download APIs, remaining UI/social/profiles, GitHub/Warden/launcher and operations acceptance remain required. Goal active; production untouched.

## Release review API checkpoint — 11 September 2026

- Added public/private release lists with bounded cursor pagination, immutable artifact digest/size, runtime manifests and version metadata. Inspection snapshots are private to members/admins; public history includes published/revoked releases only. Resource rows load in one batched query per page.
- Added admin release approval/rejection/revocation routes with current-role checks, optimistic revision checks, inspection/artifact prerequisites, audit records and transactional outbox events. Technical acceptance still does not publish a release. Downloadable project approval now requires at least one reviewed, published release; approving a release alone does not expose a private project.
- Rejected replacement releases leave earlier published bytes and metadata intact. Revocation preserves release history and digest; download enforcement will use current state when that integration is added.
- Master build passes, zero warnings/errors. Community selection: 62 passed, zero skipped (`community-release-api.trx`, 30 seconds). Real MariaDB/ClamAV lifecycle tests cover publication prerequisites, stale/unauthorized decisions, private snapshot visibility, rejected replacements and revocation history. HTTP tests cover draft visibility, pagination and rejection of uninspected/admin-ineligible decisions. Cursor tests cover complete pagination and project/audience binding.
- Downloads/media delivery, review queues/UI, moderation/report workflows and the remaining H00–H15 integrations are still required. No production publication/deployment.

## Private download gateway checkpoint — 11 September 2026

- Added additive migration 15 for expiring delivery grants and merged completed byte ranges. Guest download requests require a currently approved downloadable project, published inspected release and accepted artifact. Every gateway use rechecks current state; revoked, suspended and expired grants cannot deliver bytes.
- Files now streams original ZIP attachments with HEAD, single/suffix byte ranges, If-Range, digest ETag, no-store/nosniff/referrer controls and independent bounded transfer concurrency. Framework URL logging is suppressed because delivery URLs carry short-lived query grants; proxy redaction remains part of production configuration work.
- Completion is recorded after successful body write/flush. Range unions count a delivery only once, including overlaps and retries. HEAD, unsatisfiable ranges and denied requests do not count. Visitor/day ranking deduplication, aggregates and failure reconciliation remain required.
- Separate master/gateway download flags default off. Master build passes, zero warnings/errors. Community selection: 64 passed, zero skipped (`community-downloads.trx`). After tightening grant lock ordering and adding suspension/expiry assertions, both download integration tests passed again (`community-download-authorization.trx`).
- Integration evidence traverses real HTTP upload, private storage, MariaDB, ClamAV inspection, release/project approval, guest grant creation and exact-byte/range delivery. Tests also prove grant invalidation after revocation, suspension/expiry, paused gateway behavior and once-only full-range accounting. Browser UI integration and interrupted-network/socket behavior still need their own validation.
- Goal remains active in full. Public media, publishing/download UI, profiles/social/moderation, GitHub/Warden/launcher and remaining H00–H15 gates are unfinished. Production untouched.

## Public release interface checkpoint — 11 September 2026

- Resource pages now load reviewed release metadata, with a cursor-paginated version-history route. Cards show changelog, author-declared tested builds, runtime resource requirements/permissions, installation, license and immutable SHA-256. Prereleases are explicitly expanded; revoked releases retain history without a download action.
- Download controls request real short-lived gateway grants and provide an explicit ZIP link, with expiry/error states. Grants remain in component memory; no file buffering or account-token forwarding to the file gateway. Current API/gateway authorization still decides availability at use time.
- `npm run check` passed (TypeScript and ESLint). Production `npm run build` passed against explicitly configured loopback API origins; resource/version routes remain dynamic. Browser delivery, responsive/accessibility review and end-to-end creator flow remain unvalidated; the earlier automatic approval rejection of local Next server startup remains recorded above.
- H07 and the overall H00–H15 goal remain open. No production publication/deployment.

## Creator ZIP upload recovery checkpoint — 11 September 2026

- Master now exposes private, paginated upload history with filename, state and bounded inspection results. Cursors bind project/account; responses omit grants and storage paths. Pending-upload restart rotates the scoped grant without extending expiry or quota. Current uploader/project authorization is checked; receiving, uploaded, processing and expired reservations cannot be restarted or overwritten.
- Creator resource editors now create immutable release versions, transfer ZIP files directly to Files with progress/cancellation, finalize stored uploads, and recover pending/processing/rejected state from the API. Processing polls back off and stop after a bounded number of checks; refresh remains explicit. Interrupted pending transfers can reselect the file and restart from byte zero. No account session is sent to Files and no ZIP is unpacked in the browser.
- Added recovery/rotation database tests and extended the real HTTP gateway test: old grants fail after replacement, new grants stream successfully, guest history is denied and processing state can be recovered. Community selection: 66 passed, zero skipped (`community-upload-recovery.trx`). Full master regression: 169 passed, zero skipped (`hub-upload-recovery-regression.trx`, 69 seconds). Master solution build passed with zero warnings/errors.
- App `npm run check` and production `npm run build` passed with loopback API origins. Initial lint caught render-time clock reads; expiry display now uses the last status-check timestamp. Status refresh preserves an active transfer component instead of aborting it as receiving state changes. Browser/CORS/socket interruption behavior is not yet validated; the previously rejected local Next startup remains an outstanding validation constraint.
- These controls are an incremental creator integration, not the completed five-step autosave/media/review wizard. Media delivery/attachment, actionable review screens, profiles/social, GitHub/Warden/launcher and remaining acceptance gates remain required. Goal active; production untouched.

## Approved screenshot delivery checkpoint — 11 September 2026

- Added public derivative metadata and GET/HEAD image delivery. Both require accepted processed media referenced by the current approved project revision. Originals and unapproved/unattached media cannot be delivered. Draft edits preserve the approved image; approved removal and suspension deny new requests, while archival preserves delivery.
- Files media has its own default-off flag, 16 transfer slots and a 60-second deadline. It serves only worker-created WebP with no-store/nosniff/no-referrer and sandboxed CSP. No public original-image route or unrestricted storage path exists.
- App resource cards and detail galleries now load real derivative URLs/dimensions. Images bypass Next optimization to preserve gateway authorization/takedown checks; frames reserve layout space and support captions/alt text. Browser rendering, client failure states, CSP rollout and load/accessibility verification remain pending.
- Master build passes with zero warnings/errors. Community suite: 67 passed, zero skipped (`community-media-api.trx`). Extended gateway takedown test passed again (`community-media-takedown.trx`): actual image upload, native processing, approval, all three WebP variants, HEAD, metadata privacy, original rejection, paused service, archival, suspension and approved removal. App TypeScript/lint and production build pass with loopback API origins.
- Next required publishing work includes private creator/reviewer image previews and image attachment/reordering, then the complete autosave wizard and review screens. All remaining H00–H15 scope stays active; no production publication/deployment.

## Private previews and creator screenshots checkpoint — 11 September 2026

- Migration 16 adds expiring image-preview grants. Current verified members/admins can request a five-minute grant for a processed image. Gateway use rechecks grant/expiry, accepted artifact, current account status and membership/admin role. Preview URLs carry only a scoped grant; account sessions and original images are not delivered through this route.
- Creator editor now uploads and recovers images, polls processing with bounded backoff, attaches up to nine screenshots, previews processed derivatives privately, edits alt text/captions and reorders/removes draft attachments. The first image is the cover. Changes still use the existing project revision/save/review boundary.
- Fixed an editor save race: newer content edits made while a request is in flight remain dirty, and initial creation does not navigate away while newer edits remain unsaved. Full autosave/wizard/concurrency recovery and browser validation are still required.
- Initial community run: 67 passed, one failed because the migration recovery test still expected schema 15. Updated it for migration 16 and checked the preview table exists. Full master regression then passed: 171 tests, zero skipped (`hub-private-media-regression.trx`, 75 seconds). Coverage includes private HTTP image delivery, guest denial, wrong grant/original denial, expiry, account suspension, membership removal and admin role removal. Master build passed with zero warnings/errors.
- App TypeScript/lint and production build passed with loopback API origins. Initial typecheck caught an unchecked reorder index; the reorder now guards both entries. No browser behavior is claimed from these checks. Expired preview cleanup, CSP/deployment configuration and actual reviewer screens remain open, along with the remaining H00–H15 integrations. Production untouched; goal active.

## Moderation queue and decision screen checkpoint — 11 September 2026

- Added current-admin project/release review queues with bounded oldest-first pagination and account/queue-bound cursors. Project queues use only submitted current revisions; release queues require accepted artifacts and immutable inspection snapshots. Suspended/archived projects are excluded.
- Added exact release review lookup, including digest, metadata, resource manifests and inspection evidence. Existing expected-revision decision endpoints remain authoritative; stale decisions fail and reviewed entries leave the queue.
- Added `/admin/community` to the existing operations workspace. Reviewers inspect project text/links, private processed screenshots, release metadata/hash/inspection, then record approval/rejection with a reason and an explicit reviewed-revision confirmation. Submitted content is displayed as escaped text; no untrusted raw HTML is rendered. Queue refresh participates in existing admin activity UI.
- Master solution build passed with zero warnings/errors. Community selection: 70 passed, zero skipped (`community-review-screen-api.trx`, 43 seconds). Tests cover guest/non-admin denial, current-role removal, pagination/cursor binding, draft edits invalidating old review, uninspected release exclusion, release snapshot access and removal after decisions. App TypeScript/lint and production build pass with loopback API origins.
- H06 remains open: private package inspection downloads, report/takedown workflows, review history/appeals and browser validation still need implementation/evidence. H07 full autosave wizard and all remaining profiles/social/GitHub/Warden/launcher/operations gates remain required. Goal active; production untouched.

## Private package review download checkpoint — 11 September 2026

- Migration 17 adds separate review-delivery grants. Current verified admins request an inspected artifact at an exact release revision. Grants expire after five minutes, recheck current administrator status and artifact/revision on every use, and become invalid after a review/revocation changes that revision. Issuance is audited without recording the grant token.
- Master/gateway review-download flags default off independently of public downloads. The private route streams original ZIP attachments and ranges through the shared delivery implementation, but never contributes to public delivery rows/ranges/counts. Public and private grants are not interchangeable.
- Admin release review now exposes the private ZIP inspection link, with expiry/error handling and a visible artifact digest. Private project state does not prevent authorized inspection, and no uninspected/quarantined package gains a download path.
- Master build passes with zero warnings/errors. Community selection: 72 passed, zero skipped (`community-review-download.trx`, 40 seconds). Real HTTP evidence covers exact original bytes before publication, ranges, guest/creator denial, public-route denial, independent pause, no public counts and invalidation after decision. Database tests cover role removal, suspension, expiry, stale revision and audit issuance. Migration recovery expects schema 17 and verifies the new table.
- App TypeScript/lint and production build pass with loopback API origins. Browser validation and expired-grant cleanup remain required. Report/takedown/review-history workflows, full creator wizard and all remaining H00–H15 integrations stay open. Goal active; production untouched.

## Community reports checkpoint — 11 September 2026

- Added verified-member reports for public projects, inspected public releases and visible comments, with bounded reasons, concurrent open-report deduplication and a rolling ten-per-day quota. Duplicate reports retain the original ID/text. Private targets, hidden comments and uninspected releases are rejected.
- Added current-admin report queues with account/filter-bound pagination and open/action-taken/dismissed states. Resolving an open report records the admin, private audit notes and a generic reporter outcome in one transaction. Concurrent/stale resolution fails; private investigation notes are excluded from the outbox payload. Notification delivery itself is still pending.
- App project/release pages now expose report forms. The admin report queue supports content inspection, private images/release ZIPs and resolution notes. Canonical moderation routes now match the implementation plan: `/admin/resources` and `/admin/resources/reports`; the earlier `/admin/community` route redirects.
- Master build passed with zero warnings/errors. Community selection: 75 passed, zero skipped (`community-reports.trx`, 47 seconds). Evidence includes concurrent dedup/resolution, private target and role denial, quota, comment visibility, pagination, HTTP submission/resolution, audit/outbox atomicity and private-note exclusion. App TypeScript/lint and production build passed with loopback API origins; an initial unused import was removed after typecheck caught it.
- H06 remains open for suspension/restoration/revocation controls, pending-report assignment, review history/appeals and browser validation. Notification delivery, the full creator wizard and remaining H00–H15 integrations remain required. Goal active; production untouched.

## Project takedown and restoration checkpoint — 11 September 2026

- Migration 18 adds a separate moderation revision and recorded pre-suspension state. Current-admin suspension/restoration is atomic, rejects stale moderation cycles, records audit/reason and enqueues owner notification. Restoration preserves draft/submitted/changes-requested/published/archived state rather than assuming publication.
- Added admin controls for project suspension/restoration and exact-revision release revocation. `/admin/resources/[id]` provides private project inspection and paginated release history so suspended projects remain manageable outside review queues. Review/report screens link to it; report inspection also exposes the actions directly.
- Community selection: 77 passed, zero skipped (`community-project-moderation.trx`, 61 seconds). Tests cover all prior states, creator edit blocking, stale repeated cycles, audit/outbox records, role denial and real HTTP delivery interruption/restoration with unchanged ZIP bytes/content revision. Master build passes with zero warnings/errors; migration recovery expects schema 18.
- App TypeScript/lint and production build pass with loopback API origins. Initial typecheck caught rendering an unknown inspection value as a React node; the display now checks for null explicitly. Browser interaction/confirmation/accessibility is still unverified under the previously recorded local Next startup rejection.
- Remaining moderation work includes pending-report assignment, review history/appeals and browser validation. Notification delivery, complete creator wizard, profiles/social, GitHub/Warden/launcher and remaining H00–H15 gates stay active. Production untouched.

## Assignment and decision-history checkpoint — 11 September 2026

- Migration 19 adds report revisions. Admins can claim, release or explicitly take over an open report with an audited private note. Revision checks reject stale assignments; resolution requires the displayed revision and refuses reports owned by another moderator. Assignment and resolution increment the report revision.
- Added paginated project/report activity APIs. Current project members see creator-facing moderation decisions and reasons; internal report notes and staff display names are excluded. Admins see full project audit and private report history. Cursors bind target/account/current audience, and access is rechecked on each request.
- Creator editor now opens decision history for rejected/suspended projects. Admin project/report views expose lazy-loaded audit history and report assignment controls. History is available before notification delivery; report resolution requests now include their expected revision.
- Community selection: 78 passed, zero skipped (`community-history-assignment.trx`, 40 seconds). Full master regression: 181 passed, zero skipped (`hub-history-assignment-regression.trx`, 82 seconds). Evidence covers takeover/release/stale resolution, role denial, creator/private history separation, audience-bound cursors and HTTP history/assignment flows. Master solution build passes with zero warnings/errors; migration recovery expects schema 19.
- App TypeScript/lint and production build pass with loopback API origins. Browser validation remains unproven under the recorded startup rejection. An appeal route, notification delivery, complete publishing wizard and remaining H00–H15 integrations are still required. Goal active; production untouched.

## Notification delivery and inbox checkpoint — 11 September 2026

- Migration 20 adds bounded invalid-event state to the outbox. A worker consumer now delivers review decisions, revocations, suspension/restoration and generic report outcomes into account notifications. Transactional row claims and recipient/event uniqueness prevent duplicate delivery on concurrent workers or replay. Invalid supported events are isolated; unknown kinds stay pending. Transient database failure rolls back for retry.
- The dispatcher projects only approved message fields. Report investigation notes never reach recipients; internal project links still require current access. Added account-bound all/unread pagination and idempotent read timestamps, with session, active-account and ownership enforcement.
- Added `/account/notifications` and Hub navigation. The inbox provides read controls, unread filtering, bounded requests, refresh, pagination and creation links. Notification state resets across accounts and filters. Subscription controls/events and browser interaction evidence are still pending.
- Master build passed with zero warnings/errors. Initial targeted tests: 3 passed (`community-notifications-targeted.trx`), including a separate worker executable delivering a queued decision against real MariaDB. Full master regression: 184 passed, zero failed/skipped (`hub-notifications-regression.trx`, 120 seconds). Coverage includes concurrent/replayed events, poison isolation, private-note exclusion, account/filter cursors, cross-account read denial and real HTTP persisted read state.
- App `npm run check` and production `npm run build` passed with loopback API origins; the new inbox route is generated. Browser validation remains pending under the recorded automatic approval rejection of local Next startup. Administrative dead-letter tooling, appeals, the complete publishing wizard and all remaining H00–H15 integrations remain required. Goal active; no production publication/deployment.

## Decision appeals checkpoint — 11 September 2026

- Added creator appeal submission/status for exact immutable rejection, revocation and suspension audit entries. Current active verified membership is required even for suspended projects. Approvals/internal audit entries and unrelated accounts are denied. Concurrent/repeated submissions return the existing receipt, including after closure, and share the report quota.
- Appeals enter the existing assigned moderation queue with their original decision text and project link. Migration 21 adds a creator-facing response separate from private investigation notes. Resolution requires that response and atomically stores/audits it and enqueues an appeal notification. Closing an appeal never implicitly restores or publishes content.
- Creator decision history now offers an appeal form and persistent status/response. Admin queue supports inspection, assignment, resolution and the separately labelled creator response, including on closed entries. This copy remains draft pending project-owner review before public acceptance.
- Master build passed with zero warnings/errors. Targeted database test passed (`community-appeals-targeted.trx`). Community regression: 84 passed, zero failed/skipped (`community-appeals.trx`, 58 seconds), covering all supported decision kinds, ownership, concurrent deduplication, private audit denial, response validation, HTTP submission/resolution/status, notification privacy and unchanged content availability. Migration restart coverage now expects schema 21.
- App production build passed with loopback origins. Browser journeys remain pending under the previously recorded automatic approval rejection of local Next startup. H06 still requires broader comment moderation/editorial controls and browser validation; the full publishing wizard, profiles/social, GitHub/Warden/launcher and remaining H00–H15 gates stay active. Production untouched.

## Creator profile and author-page checkpoint — 11 September 2026

- Migration 22 adds profile revisions/timestamps and permanent handle reservations. Current active verified accounts can create/edit public handles, biographies and up to five labelled HTTPS links. Handles normalize to lowercase; official/staff prefixes are reserved. Concurrent claims have one winner, stale edits fail, and old handles stay bound to their account across renames.
- Public creator reads include only public profile fields and approved published/archived creations. Pagination binds the creator and works across canonical/old handles. Draft edits and unpublished projects stay private; suspended accounts have no public profile. Project DTOs now carry the current public author handle without extra client requests.
- Added `/account/profile` and `/creators/[handle]`, public bio/links, canonical redirects, paginated creation cards, and author links on cards/resource pages. Profile writes respect contribution pause. Avatar upload/processing/delivery and profile moderation remain required; this is not completion of the profile gate.
- Master build passed with zero warnings/errors. Targeted profile tests: 2 passed (`community-profiles-targeted.trx`). Community regression: 87 passed, zero failed/skipped (`community-profiles.trx`, 69 seconds). Evidence includes concurrent claims, stale edits, reserved/unsafe values, old-handle protection, approved-only listing, cross-creator cursor denial, account suspension and HTTP session/privacy behavior. Migration restart coverage expects schema 22.
- App TypeScript/lint and production build passed with loopback API origins. Hub links now wrap as account navigation grows; rendered responsiveness remains unverified under the prior automatic approval rejection of local Next startup. Avatar integration, full publishing wizard, social/GitHub/Warden/launcher and remaining H00–H15 gates stay active. Production untouched.

## Profile avatar integration checkpoint — 11 September 2026

- Migration 23 allows profile-owned images without creating a project. Avatar reservation/history use dedicated profile routes but share scoped grants, quotas, streaming, expiry/restart, durable inspection, native image limits and metadata-free WebP derivatives. Upload/media contracts now express nullable project IDs; package uploads still require a project.
- Profile revisions include avatar selection/removal. Only the account's accepted profile image may be selected; unrelated account images and project media are ineligible. Inspection alone leaves it private. Public media requires current profile selection and an active verified owner; removal and account suspension deny subsequent delivery. Private previews remain owner-bound and originals stay inaccessible.
- Shared image controls now support avatar upload/recovery, single selection, preview and removal. Profile save applies that selection explicitly; the public creator page renders its processed image. No fake project, remote avatar URL or direct public original is used.
- Master build passed with zero warnings/errors after updating project-only test fixtures for nullable upload IDs. Targeted avatar test passed (`community-avatar-targeted.trx`). Full master regression: 192 passed, zero failed/skipped (`hub-avatar-regression.trx`, 96 seconds). Evidence includes real gateway upload and native image processing, private-before-selection behavior, owned history/preview, grant rotation, profile selection, decoded WebP delivery, original denial, removal and suspension.
- App TypeScript/lint and production build passed with loopback API origins. Browser validation and dedicated profile moderation remain open alongside the complete publishing wizard, social/GitHub/Warden/launcher and remaining H00–H15 gates. Documented schema-23 rollback compatibility: retain binaries that understand nullable project associations once avatar rows exist. Production untouched; goal active.

## Votes, saves and release subscriptions checkpoint — 11 September 2026

- Added independent retry-safe PUT/DELETE interaction APIs, bounded account-only project-state reads, private saved/subscribed lists and public eligible upvote counts. Owners/maintainers cannot self-vote; authors may save/follow their work. Removing preferences still works after content suspension and while contributions are paused. Unavailable saved projects expose only a removable placeholder.
- Approval transactions enqueue one availability event per immutable public release. The worker fans out to current eligible subscribers in bounded batches, atomically preserving its recipient cursor and inserted notifications. Replays do not duplicate recipient/event records; unfollow and release unavailability are rechecked. Followers added after an event do not receive that queued historical release.
- Connected resource vote/save/follow controls, card counts, `/account/saved`, `/account/subscriptions` and inbox subscription management. State and counts refresh from real APIs after mutations; errors require refresh rather than assuming a write failed. Private lists reset across accounts and preserve removal controls for unavailable content.
- Master build passed with zero warnings/errors. Targeted interactions: 2 passed (`community-interactions-targeted.trx`). Community regression: 93 passed, zero failed/skipped (`community-social.trx`, 82 seconds). Extended separate-worker executable test passed (`community-subscription-worker.trx`, 8 seconds), delivering both moderation and release notifications through real MariaDB; its package was inspected using the real scanner. Coverage includes concurrent duplicate votes, self-vote denial, private state/cursors, suspended-account counts, HTTP retries, fanout resume/replay, unfollow, late subscriptions and pre-delivery revocation.
- App TypeScript/lint and production build passed with loopback origins. Browser interaction remains pending under the recorded automatic approval rejection of local Next startup. Comments/replies, broader abuse/load/ranking checks, complete publishing wizard, GitHub/Warden/launcher and remaining H00–H15 work stay required. Goal active; production untouched.

## Threaded discussion checkpoint — 11 September 2026

- Added one-level comments/replies with account-scoped retry keys, bounded pagination, optimistic edits, author deletion, tombstones and posting quotas. Project owners/maintainers can pin or resolve root threads. Current administrators can inspect hidden comments and hide/restore with audited reasons; deleted text cannot be restored. Archived projects remain readable and suspended/private projects deny public discussion reads.
- Migration 24 adds private thread subscriptions. Reply notifications use resumable transactional batches, current eligibility/opt-out checks and recipient/thread/five-minute deduplication. They contain no comment body. Moderator decisions separately notify the author with the creator-facing reason. The separate worker executable test now delivers image processing, release and reply notifications against real services.
- Added discussion routes, focused thread links, reply pagination/composers, edit/delete/report/marker controls and administrative comment inspection in report review. Text is escaped; failed requests retain composer text and retry identity. Follow state is bound to the current account. Browser navigation, authentication recovery, responsiveness and maintainer UI remain acceptance work.
- Master build passed with zero warnings/errors. First full regression ran 200 tests: 199 passed and one exposed a notification JSON type mismatch. MariaDB JSON_OBJECT emits the hidden flag as a boolean; the dispatcher now reads a boolean. The corrected community regression passed all 97 tests with zero failures/skips (`community-discussion-fixed.trx`), including the previously failing HTTP/moderation flow and separate worker. The earlier failing result remains recorded in `hub-discussion-regression.trx`.
- App TypeScript/lint passed after the final changes. The final production build generated `.next/BUILD_ID` at 10:52:07 local time; its process exit output was lost during context compaction, so this checkpoint does not claim a separately observed final exit status. A prior discussion build passed. No browser acceptance is claimed under the recorded automatic approval rejection of local Next startup.
- Full publishing wizard, remaining moderation/abuse/performance work, GitHub/Warden/launcher and H00–H15 integration gates remain open. Production untouched; goal active.

## Publishing flow and autosave checkpoint — 11 September 2026

- Reorganized the creator editor into Basics, Showcase, Release, Validation, and Preview/submit steps. Steps preserve mounted media/release controls during ordinary navigation. Added tags/video fields, creator profile link, private processed-image preview and the same safe Markdown renderer used by public pages. Showcase projects do not require a ZIP. Package validation codes now include corrective guidance and inspected manifest requirements.
- Existing drafts autosave after 1.5 seconds of inactivity, serialize writes and retain edits made during an in-flight request. Errors pause automatic retries. Initial draft creation explicitly reserves its permanent address. Token refresh no longer reloads over edited content. Signing out retains the project editor state in this tab, hides it from a different account, and requires an explicit discard to switch editor accounts.
- Concurrent revisions offer a three-way comparison against the last saved snapshot. Independent field changes combine; overlapping fields require explicit choices. Galleries/tags remain whole-field choices. The result saves against the fetched revision, so a further concurrent update still conflicts. Added unsaved-change warnings for page unload and ordinary link navigation.
- Four standalone merge behavior tests passed (`node --test scripts/test-community-draft-merge.mjs`), covering independent changes, overlapping edits, identical retries, gallery removal/reordering and optional values. App TypeScript/lint passed and the production build exited successfully with loopback API origins. A final documentation-link correction uses the existing `/docs/server-resources` route; TypeScript/lint passed afterward.
- This remains an intermediate H07 checkpoint: release form inputs need durable draft storage, package preview needs complete file inventory, consent needs an API/audit record, and final preview must share the complete public presentation. Browser history/Back, auth recovery for nested upload/release forms, conflict interactions, responsive layout and accessibility are unverified under the recorded local Next startup rejection. No H07 acceptance gate is marked complete. All remaining H00–H15 integrations remain active; production untouched.

## Durable unfinished release forms checkpoint — 11 September 2026

- Schema 25 stores bounded unfinished release form text per project/account, separate from immutable versions and public revisions. Current verified membership is rechecked; another maintainer has a separate draft, administrators cannot inspect another account's form, and membership removal denies retained rows. Suspended/archived projects allow recovery reads but block writes.
- Added private GET/PUT release-editor APIs with optimistic revisions. Identical retries return the existing revision; different stale edits conflict. Incomplete version/build text is accepted only as a form draft, while final version creation retains strict validation. Saving a form never creates/publishes a release.
- The release form restores its server draft, autosaves after inactivity, serializes saves, retains newer in-flight edits and pauses on failures. Conflicts offer explicit comparison/use-saved/replace-with-mine controls. Immutable version creation flushes outstanding draft text first and disables editing during that action.
- The first targeted test found returned sub-millisecond timestamps differed from persisted timestamps on retry; the writer now returns millisecond precision. Corrected targeted test passed (`community-release-editor-fixed.trx`). Master build passed with zero warnings/errors. Community regression: 99 passed, zero failed/skipped (`community-release-editor.trx`, 78 seconds), including restart, access removal, admin/maintainer isolation, competing edits, bounds and real HTTP/no-store behavior. App TypeScript/lint and production build passed with loopback API origins.
- Browser journeys, unsent nested form state across account changes, complete package inventories, audited distribution confirmation and exact public preview remain H07 work. This does not close H07 or the broader H00–H15 goal. Production untouched.
