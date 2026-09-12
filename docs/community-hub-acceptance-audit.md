# OPEN//77 Hub contract audit — 12 September 2026

The implementation contract remains authoritative. This audit separates source and
local test evidence from the real service/browser/game journeys still required.
It does not authorize production deployment or mark H00–H15 complete.

| Gate | Current evidence | Remaining acceptance |
| --- | --- | --- |
| H00 | Four dedicated branches/worktrees; recorded clean revisions and artifact identities; local real API stack | Served website and deployment-preview SSR/edge path |
| H01 | Public discovery, directory, gallery, creator and moderation components; responsive/focus/reduced-motion source | Actual website screenshots, keyboard/dialog behavior and states at 390/768/1440 |
| H02 | Schema-38 fresh/upgrade and migration interruption tests; current account/ownership/revision checks; suspension now creates project-review reports transactionally | Final integrated audit with the refreshed services |
| H03 | Public/private project/profile/release tests; actor/body-bound creation replay; bounded field errors; latest eligible stable release endpoint | Current deployed local API journey and frontend consumption |
| H04 | Real streamed private upload/inspection/review/download; outage, physical ENOSPC, restricted principals and paired restore evidence | Continuity checks after the latest local service refresh |
| H05 | Shared pinned parser; single/bundle/world/preload samples; malicious archive/media corpus; real scanner and immutable-byte checks | Genuine preload mounting belongs to H12 and is not inferred from package acceptance |
| H06 | Exact-revision review, reports, revocation and takedown APIs; existing admin screens; automatic suspended-owner project reports | Actual admin browser decisions and revoked-content UI behavior on the website |
| H07 | Five-step editor, direct uploads, immutable releases, profiles/directory; creation recovery and latest-release panel now implemented | Creator A publishes and user B downloads exact bytes through the actual website |
| H08 | Cross-user database/API interaction tests, tombstones, one-level replies, independent votes/saves/follows and idempotent notifications | Actual authenticated website journeys and error-state review |
| H09 | Controlled 10,000-project load run, delivery/ranking tests, dynamic metadata/sitemaps and bounded public reads | Served HTML/SEO, accessibility, layout stability and upload responsiveness |
| H10 | Deterministic OAuth/state/PKCE, restricted fetch, replacement/missing-asset and provenance tests | Real configured GitHub OAuth connection and permitted release-asset import; current fixture has neither configured |
| H11 | Resolver handles dependencies, cycles, collisions/build mismatch/stale plans; installed-status code now flags revoked releases separately from unknown/unavailable | New status display against the actual updated host; existing normal Warden browser discovery already passed |
| H12 | Actual normal Warden API/browser lifecycle; Lua props installed/removed/restored/updated in game; 30 abrupt child-process crash checkpoints now exercised | Genuine preload staging, supported launcher preparation, host/game restart and mounting |
| H13 | Real scoped Warden publishing, private export inspection, revocation and interrupted/ambiguous response recovery | Actual website device-consent and resulting draft continuation |
| H14 | Launcher entry and tests; versioned schema, licensed samples and synced runtime guide | Actual native OS browser handoff; final guide verification through remaining flows |
| H15 | Full/focused regressions, five validated images, restore/rollback/outage/ENOSPC evidence and frozen artifacts | Remaining cross-component journeys, remote CI, owner/terms review and release-host operational checks |

## Gaps corrected by this audit

- Master `46cf754` adds project/release creation request IDs with actor, operation
  and body binding. Replays return the original response after current access
  checks; changed bodies conflict. Existing callers may omit the optional key.
  Account suspension creates an automatic report for each owned project without
  erasing approved content or conversations. Validation responses carry bounded
  field errors. The latest-release endpoint returns the most recently published
  eligible stable release, JSON `null` when none exists, or 404 for an invisible
  project; newer prereleases and revoked versions do not displace an eligible one.
- App `6e417a0` separates denied/removed content from transient outages. App
  `7a82d56` uses creation replay, retains frozen requests across uncertain/auth
  failures, validates successful response identities, preserves newer edits, and
  shows structured validation guidance. Release recovery remains available even
  when the mutable editor has a conflict. Background polling no longer erases
  creation errors. The latest-release panel renders requirements and a download
  control directly from the new API.
- Base `01d8a2c0` adds bounded current release-status reads to installed inventory
  and explicit revocation warnings without changing persisted installs. Base
  `e7a80789` restores/builds the complete pinned GNS SDK before the native CI job;
  that job remains best-effort and remote execution has not been observed.
- Base `26f5d51b` adds actual process-termination checks at persisted installer
  boundaries. Children use the real installer and recovery against private
  temporary files; catalog/runtime fixtures remain in memory. This is stronger
  than reconstructing journal states, but is not a live host or preload test.

## Validation and provenance

Master's full checkpoint passed 315/315; the final scoped edits passed 10/10
focused tests and a clean build. Both scopes and file hashes are recorded in
`hub-master/artifacts/hub-contract-completion/build-evidence.json`. Five images
were rebuilt/validated from clean `46cf754`, with UID 1654, private contents and
both Compose overlays checked. Older content-tagged images remain available.

App `7a82d56` passed build, typecheck/lint and 24 Hub tests plus Markdown and
browser-runner guards. Build ID is `82zRnhUF_a_gzgtl4hv3a`; a 3,082-file `.next`
archive excluding build cache is frozen with SHA-256
`630460ccc059fbe5569e6345cba6d099a5927306b09ae451f787ea5cbe3fd234`.
Runtime dependencies/configuration remain separate. Evidence:
`hub-app/artifacts/hub-contract-audit-evidence.json`. This build has not been
served in a browser. Initial JSX/memoization check failures were corrected.

Base revocation work passed 177 focused Warden/host tests and the actual Edge
fixture's revoked-to-unavailable transition. The later persistence observer/crash
work passed 55 focused installer/transaction/recovery tests, including 30 real
child-process terminations. These are separate runs, not one combined full suite.
Evidence: `hub-base/artifacts/hub-process-crash-evidence.json` and
`hub-base/server/TestResults/warden-hub-installed-status-final.trx`.

Earlier real Warden and game evidence remains attached to the older host and
matching native candidate identified in `final-game-evidence.json`. No newer
server validation is implied by those screenshots. The previous 102-file
inventory remains immutable; the next inventory must retain it while recording
the new component builds and any subsequent real-service refresh separately.

## Protected local refresh preparation

Preparation `hub-master/artifacts/hub-contract-refresh/c3fa3164c8404749971d8a0572ed21fb/`
contains sanitized preflight, backup and preparation reports. The final master
`46cf754` Windows snapshot is recorded separately from a schema-38-compatible
rollback built from verified `41b4a2c` Git archives with the exact pinned shared
revision. That rollback build passed with zero warnings/errors. The existing
schema-37 binaries are not a compatible rollback after a schema-38 migration.

The paired backup captured SQL, the complete private blob tree, configuration,
connections and signing identity under one held database read lock, then released
the lock. All 27 artifact references matched their bytes; the blob tree contained
24 files. Backup access is restricted to the current owner and SYSTEM. This new
backup has not been restore-tested. Its private manifest SHA-256 is
`ee3bf9cfaa4e664bac6dbb5ce40657ec12a2daccf1a4c25a4e8ba13a6afc80ab`.
Raw backups, credentials and signing keys stay outside the release evidence
bundle. The protected candidate snapshot also contains copied local configuration
and an identity matching the current fixture; only its hash inventory belongs in
the evidence bundle, not those private files.

Automatic review rejected the command to author the guarded refresh execution
phase and parse the script, reporting only `blocked by policy`. That command
never executed and was not retried. `prepare.ps1` retains its explicit execution
fence. The master/files/worker processes (28420/17444/57176) remained running with
the same exact assemblies and hashes; signing identity was unchanged. The latest
contracts passed real HTTP TestServer/MariaDB tests, but no refresh or acceptance
against the running fixture occurred. Warden's separate host also remains older.

The next candidate inventory is linked by
`hub-app/artifacts/hub-release/contract-inventory-latest.json`. It must preserve
all 102 prior evidence identities, freeze the latest build/test reports and
sanitized preparation receipts, and keep release readiness false.

## Execution limits still in force

Automatic command review rejected website startup, native launcher handoff and
the owned Warden restart with only `blocked by policy`. Those actions were not
retried through another mechanism. Authoring the local master refresh execution
phase was subsequently rejected with the same nonspecific reason; no service
transition occurred. A separate cleanup of five inactive crash-test
directories was also rejected; their paths are retained in the crash evidence,
and cleanup was not retried. Successful crash cases cleaned their own fixtures.

Real GitHub configuration/import authorization, project-owner terms/moderation
decisions and release-host backup/capacity/alert checks remain external inputs.
Production publication/deployment and paid/deferred features remain excluded.
