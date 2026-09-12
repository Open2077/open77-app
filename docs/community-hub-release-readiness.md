# OPEN//77 Hub release-readiness report

Status: **not release-ready; Warden browser and actual Lua game lifecycle passed, with preload and external gates pending**. This is a working assessment dated 12 September
2026, not authorization to publish or deploy. H00–H15 remain the completion scope;
paid packages and the explicitly deferred features remain excluded. The
[execution ledger](community-hub-execution.md) records exact checkpoints, failures,
corrections and evidence locations. Schema-38 regression is complete; source and
artifact inventory qualification remains separate from unresolved acceptance gates.

The subsequent [contract audit](community-hub-acceptance-audit.md) found and fixed
additional implementation gaps: creation replay and field errors, suspended-owner
review reports, the latest stable release panel, installed revocation notices and
actual subprocess crash coverage. Its component builds supersede the earlier
source checkpoint, while the earlier runtime screenshots retain their original
host/build provenance. The local API candidate, protected paired backup and
Windows-compatible schema-38 rollback are prepared. Automatic review blocked
authoring the refresh execution phase; no service transition occurred. The new
contracts have HTTP TestServer/MariaDB evidence, but the running API fixture and
Warden host have not yet been updated or used to verify these changes.

## Integration evidence already observed

| Area | Strongest observed evidence | Limit of that evidence |
| --- | --- | --- |
| Master/platform | Schema-38 full checkpoint: 315/315; final scoped edits at `46cf754` passed 10/10 focused tests and a clean build | Full run preceded the final small edits; final focused run covers new contracts and AdminApi. Running fixture is still older; browser/provider/game acceptance remains separate |
| Retention | Final Windows focused 20/20 and isolated Linux 7/7; cross-process publication locks, crash recovery and wrapper ownership checks passed | Default off; all writers must participate before enabling; current schema-37 live storage was not swept |
| Migration recovery | Four focused tests: three interrupted schema-38 DDL prefixes with connection/lock release and restart, plus incompatible-schema refusal; queued work and private bytes retained | Connection-death simulation, not database power loss |
| Compatible image switch | Real isolated a6f7fc9 → reconstructed c5e6919 master switch; retained identity, published bytes and queued work; schema-37 image refused and compatible image recovered | Candidate images share production implementation; earlier images reconstructed from recorded source, not a historical production rollback |
| Private artifact flow | Real local registration, ZIP upload, worker inspection, reviewer publication and SHA-verified download on refreshed services | Locally authored fixtures; no production publication |
| Service isolation | Restricted auxiliary accounts, raw-SQL attack tests, guard-definition/DEFINER verification and paired restore | Production principal provisioning still requires operator verification |
| Storage pressure | Actual 8 MiB tmpfs ENOSPC after upload admission; lease reset, temporary-file cleanup, same-grant retry and matching hash | Isolated temporary filesystem; no release-host disk was filled |
| Readiness | Real scanner pause: worker 503 while master/files stayed 200; recovery to all 200. DB pause: files/worker 503 and master health timeout; recovery to all 200 | Local dependencies; not a production uptime guarantee |
| Telemetry | Actual master/files/worker counters, durations, storage gauges and an image-format rejection captured with assembly/tool identities | No installed production collector or alert-delivery verification |
| Release host | Read-only SSH metadata: about 351 GiB free disk, 28.6 GiB available RAM, active Docker/cron, running master/Caddy and healthy MariaDB; nightly backup schedule and 14 local dump files. Public master/CDN TLS checks returned 200 | Snapshot is not load capacity, backup integrity/encryption/off-site recovery or alert delivery proof; Hub storage directory absent and website `/resources` returns 404 |
| Warden maintenance | Real install/uninstall/reinstall/update/rollback, configuration and user-file preservation, publishing and lost-response restart recovery | Final browser/game journeys remain distinct |
| Warden browser | Actual login/discovery/details at 390/1440 pixels, plus reviewed install → update → rollback → uninstall with visible terminal UI results and preserved other resources; no browser errors | Harmless local diagnostic package; game/preload and main website acceptance remain separate |
| Installed release status | 177 focused Warden/host tests and an Edge fixture showing revoked → unavailable while retaining installed content | The actual running Warden host has not been upgraded; this fixture is separate from its earlier browser lifecycle |
| Installer crash recovery | Final 55 focused tests, including 30 real child-process terminations at persisted install/update/rollback boundaries | Uses real installer/files/recovery with in-memory catalog/runtime fixtures; no live host restart or preload mounting |
| Matching native candidate | Standard no-deploy Hub client build and all 24 CTest cases passed; full platform archive completed, 296 files privately staged, matching client reached the actual world alive with loading handoff complete | Initial archive build required a documented RP prerequisite resume; tested runtime paths do not establish every native API |
| Actual authored Lua resource | Published and installed two-chair sample rendered in-game; reviewed uninstall removed both props, reinstall restored them, and a real 1.0.1 update corrected their ground placement; chair blocked movement while the gap allowed passage | Local Hub/Warden and isolated test client; global keyboard input isolation from concurrent CyberwareA testing is unproven |
| Restart-required activation | Real isolated install→restart→update→restart→rollback→restart; expected Lua version running and durable jobs committed | Inert archive classifies preload requirements; does not prove real game assets mounted |
| Website | Production builds and checks; permission/route tests, draft-preservation tests and static guide links | Actual served browser journeys remain blocked |
| Launcher | Launcher Hub entry and regression tests; embedded browser evidence recorded in ledger | Actual native ShellExecute invocation was rejected by automatic review before execution; OS handoff and destination remain unverified |
| Performance | 10,000-project controlled local benchmark; eight public routes below 500 ms p95 and account/directory regression within the stated bound | Windows host/CPU-affinity and payload qualifications in the benchmark report; not universal throughput or production capacity |

## H15 artifacts and remaining checks

The master repository owns these reviewable artifacts:

- `ops/community/Dockerfile`, `compose.yml`, and `compose.maintenance.yml`: private
  files, worker, importer and maintenance services alongside master.
- `ops/community/test-images.ps1`: five-image non-root/private-image validation and
  both Compose overlays. All five images were rebuilt and passed at clean master
  `46cf754`, with UID1654, private contents and both overlays checked; exact local
  image identities are in master `artifacts/hub-images/validation.json`.
- `ops/community/Caddyfile`, `test-edge.ps1`, and `edge-fixture/`: restricted public
  gateway routing and actual streamed 100 MiB boundary checks.
- `ops/community/POLICY.md`, `READINESS.md`, and `OPERATIONS.md`: quota settings,
  cached readiness, operational metrics and daily checks.
- `ops/community/RETENTION.md`, `run-retention.sh`, and the systemd service/timer:
  default-off scheduled retention with explicit all-writers-upgraded prerequisite.
  Never enable the sweeper against old writers that lack publication fencing.
- `ops/community/backup-restore-drill.ps1` and
  `test-linux-storage-restore.ps1`: paired DB/blob restore and Linux ownership/mode
  checks, with the limitations recorded in `README.md`.
- `ops/community/test-physical-storage.ps1`: isolated real filesystem exhaustion.
- `ops/community/record-release-candidate.ps1` and `RELEASE-INVENTORY.md`: source,
  validated image and evidence identities. The manifest intentionally leaves
  `releaseReadinessProven:false`; hashes alone do not prove acceptance.
- `ops/community/prepare-image-rollback.ps1` and `test-image-rollback.ps1`:
  reconstruction provenance and actual isolated candidate switch/refusal rehearsal.
  Run `193f77f00bdd488494081c154f001b58` passed and removed all owned resources.
  Content-based local image tags retain validated artifacts across working-tag
  replacements; the original earlier untagged images were unavailable.

CI wiring validation passed, including exact Windows/Linux gate probes. The
component artifact inventory records actual app/base/launcher build identities
and their provenance qualifications. Keep
the paired backup and rollback instructions alongside that inventory. Remote CI
execution and production deployment have not been performed by this goal.
App `e98f611` adds CI for locked install, typecheck/lint, deterministic Hub tests
and build. The latest app `7a82d56` passed production build, typecheck/lint and
24 Hub tests plus Markdown/browser-runner guards. The complete `.next` output
excluding cache is frozen separately from runtime dependencies/configuration;
build ID is `82zRnhUF_a_gzgtl4hv3a`. Base `e7a80789` checks/restores or builds the
pinned native GNS prerequisite before native CI. Local workflow syntax and
prerequisite checks passed; remote CI remains unobserved. These checks do not
claim served-browser or provider acceptance.

Base `b9f6bc4f` supplies a standalone versioned package JSON Schema and newly
authored MIT-licensed resource/config-template and two-resource bundle examples.
The no-deploy server build passed with no warnings/errors; seven actual ZIP/parser
and metadata tests passed. Schema checks accepted both examples and rejected ten
invalid boundary fixtures. These diagnostic Lua examples do not prove game asset
loading.

Base `1cad4344` adds MIT-licensed world-placement and preload samples. The actual
Lua runtime test verifies two owned props and cleanup; WolvenKit converted, packed
and extracted a newly authored 375-byte CR2W entity without copying game assets.
The 597-byte nested ZIP passes shared package/preload inspection. Clean no-deploy
build and focused 16/16 tests passed; schema checks accepted four samples and rejected
ten invalid fixtures. Subsequent actual game validation exposed floating chairs in
the initial placement sample. Base `5b6957c8` fixes the coordinates and versions it
as 1.0.1; the no-deploy server build, five focused example tests and four accepted /
ten rejected schema fixtures passed. Real local publication and reviewed Warden
update advanced inventory 19 to 20 while preserving the other 19 resources. Both
chairs rendered on the measured ground in the actual game. The original 1.0.0
release bytes remain unchanged. The empty preload entity has no visible mesh;
its genuine game mounting remains unverified.

The aggregate runtime evidence is
`hub-base/artifacts/hub-game-validation/final-game-evidence.json`, binding 45 files
including staging, build, actual screenshots/snapshots, release/install receipts,
preload failure and cleanup. The frozen runtime inventory is linked by
`hub-app/artifacts/hub-release/runtime-inventory-latest.json`; it preserves the
earlier 15 evidence identities and original build provenance, and separately
binds the completed native/archive and runtime/browser evidence. Inventory
readiness remains false. The matching DLL is SHA-256
`02f07e31fef53b74e789e1a5eb817bf1778782841286f128e38d32e9b72379aa`;
the staged platform archive is
`bdf9d576c8eabc800ffda2e3e9e31c8a66486aca1b3250fad0282b1d5ee4aea9`.
Both still matched after test exit. The online resource-hash command was refused
by the client guard: archive identity is established by staging and post-exit
hashes, with actual rendering of the generated chair depot, not by a runtime hash
API. See `placement-corrected.png` beside the aggregate evidence for the final view.

The subsequent candidate is linked from
`hub-app/artifacts/hub-release/contract-inventory-latest.json`. It retains the
earlier 102 evidence identities and separately records current component builds,
test scopes and local refresh preparation. The original runtime inventory remains
unchanged. The protected paired schema-37 backup and schema-38 Windows rollback
are prepared under `hub-master/artifacts/hub-contract-refresh/`; this new backup
has not been restore-tested and no refresh execution phase was authored or run.
Only sanitized receipts and hash inventories enter release evidence; raw backups,
private configuration and signing keys remain in protected local storage.

The authorized CyberwareB was replaced by the matching isolated HubValidationB
client for this test. That test client was closed and its temporary teleport ACL
removed. CyberwareA stayed alive and connected; its position changed during
concurrent probes, and attribution to those probes versus global keyboard input
is unproven. All 103 save files remained identical. Shared settings retained four
language changes and a newly changed volume after test exit; difficulty and key
defaults returned automatically. Current settings and the original backup were
preserved because the remaining changes' ownership is uncertain. No claim of
complete shared-profile or input isolation is made.

App `b26847c` supplies the deterministic served Hub guest
browser scenario described in [browser acceptance](community-hub-browser-acceptance.md).
Syntax, argument guards and lint pass. It requires an already-running website,
records actual checks at all three widths, and does not claim authenticated or
full Hub acceptance. Browser execution remains unperformed.

## External and execution blockers

1. **Actual website browser acceptance:** automatic command review rejected the
   loopback Next server startup again after the user's explicit authorization,
   stating only `blocked by policy`. No alternate launch was attempted. Responsive
   journeys at 390/768/1440 pixels, keyboard/dialog behavior, newly published SSR
   pages and real navigation recovery therefore remain unverified.
   A subsequent actual native launcher `ShellExecute` test was also rejected
   before execution with the same nonspecific reason. No browser tab was opened
   and neither rejected action was retried through another mechanism.
2. **Real GitHub provider acceptance:** deterministic OAuth/import/redirect and
   replacement-asset tests exist, but a real configured OAuth connection and a
   permitted release-asset import are still needed. Do not describe fixture
   responses as a completed provider integration journey.
3. **Genuine preload game acceptance:** normal Lua placement now has actual game
   proof. Genuine preload staging was attempted against the older copied host
   on 11889: job `8678530f-1a47-41c7-8110-a69c2a619010` failed with
   `restart_install_pending`, with no durable installation job created. Inventory,
   runtime, configuration and the empty active-mod manifest stayed unchanged.
   `hub-base/artifacts/hub-preload-stage/1789172171167/` binds the old host assembly
   and the exact result. This is not evidence that the latest-source staging
   implementation failed. The prepared host upgrade/restart remains blocked:
   automatic review rejected the restart with only `blocked by policy`; no
   alternate restart was attempted. The earlier successful inert-archive restart
   is not genuine asset-mounting proof. Supported launcher preload preparation,
   restart, mount and resulting game verification still need execution.
4. **Release-host and owner checks:** name the moderation owner; review contributor
   terms/license/report/appeal copy; verify operational credentials/capacity,
   signing-identity continuity, encrypted off-site paired backups, host permissions,
   Hub edge routing and alert delivery. Read-only host metadata and general public
   TLS checks now pass; they do not establish those remaining host- or owner-specific
   facts. No Hub production deployment was attempted.
5. **Current local API acceptance:** automatic review rejected authoring the
   guarded refresh execution phase and parsing the script, stating only
   `blocked by policy`. Preflight, candidate staging, a protected paired backup
   and a Windows-compatible rollback build completed beforehand. The script
   retains its execution fence; no alternate authoring or service transition
   was attempted. Original processes and signing identity remained unchanged.
   The latest endpoint tests used real HTTP TestServer/MariaDB, not refreshed
   running services.

Automatic review also rejected removal of five inactive crash-test directories
with only `blocked by policy`. Their paths are recorded in
`hub-base/artifacts/hub-process-crash-evidence.json`; cleanup was not retried.
Successful crash cases cleaned their own fixtures. These remnants do not turn
passing recovery tests into completed cross-component acceptance.

Production publication/deployment remains outside authorization. Rollback preserves
database, immutable blobs and signing identities, disables new writes/imports/install
offers, and uses only a recorded schema-compatible binary. Disabling and stopping
retention precedes rolling back any writer to a version without publication fencing.
