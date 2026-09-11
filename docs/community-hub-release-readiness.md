# OPEN//77 Hub release-readiness report

Status: **not release-ready**. This is a working assessment dated 11 September
2026, not authorization to publish or deploy. H00–H15 remain the completion scope;
paid packages and the explicitly deferred features remain excluded. The
[execution ledger](community-hub-execution.md) records exact checkpoints, failures,
corrections and evidence locations. Schema-38 regression is complete; source and
artifact inventory qualification remains separate from unresolved acceptance gates.

## Integration evidence already observed

| Area | Strongest observed evidence | Limit of that evidence |
| --- | --- | --- |
| Master/platform | Clean Release build and unfiltered schema-38 suite at master `c5e6919`: 306 passed, zero failed/skipped in 5m27s | This establishes local platform regression, not browser/provider/game acceptance |
| Retention | Final Windows focused 20/20 and isolated Linux 7/7; cross-process publication locks, crash recovery and wrapper ownership checks passed | Default off; all writers must participate before enabling; current schema-37 live storage was not swept |
| Migration recovery | Four focused tests: three interrupted schema-38 DDL prefixes with connection/lock release and restart, plus incompatible-schema refusal; queued work and private bytes retained | Connection-death simulation, not database power loss |
| Compatible image switch | Real isolated a6f7fc9 → reconstructed c5e6919 master switch; retained identity, published bytes and queued work; schema-37 image refused and compatible image recovered | Candidate images share production implementation; earlier images reconstructed from recorded source, not a historical production rollback |
| Private artifact flow | Real local registration, ZIP upload, worker inspection, reviewer publication and SHA-verified download on refreshed services | Locally authored fixtures; no production publication |
| Service isolation | Restricted auxiliary accounts, raw-SQL attack tests, guard-definition/DEFINER verification and paired restore | Production principal provisioning still requires operator verification |
| Storage pressure | Actual 8 MiB tmpfs ENOSPC after upload admission; lease reset, temporary-file cleanup, same-grant retry and matching hash | Isolated temporary filesystem; no release-host disk was filled |
| Readiness | Real scanner pause: worker 503 while master/files stayed 200; recovery to all 200. DB pause: files/worker 503 and master health timeout; recovery to all 200 | Local dependencies; not a production uptime guarantee |
| Telemetry | Actual master/files/worker counters, durations, storage gauges and an image-format rejection captured with assembly/tool identities | No installed production collector or alert-delivery verification |
| Warden maintenance | Real install/uninstall/reinstall/update/rollback, configuration and user-file preservation, publishing and lost-response restart recovery | Final browser/game journeys remain distinct |
| Restart-required activation | Real isolated install→restart→update→restart→rollback→restart; expected Lua version running and durable jobs committed | Inert archive classifies preload requirements; does not prove real game assets mounted |
| Website | Production builds and checks; permission/route tests, draft-preservation tests and static guide links | Actual served browser journeys remain blocked |
| Launcher | Launcher Hub entry and regression tests; embedded browser evidence recorded in ledger | Final actual game/launcher workflow remains distinct |
| Performance | 10,000-project controlled local benchmark; eight public routes below 500 ms p95 and account/directory regression within the stated bound | Windows host/CPU-affinity and payload qualifications in the benchmark report; not universal throughput or production capacity |

## H15 artifacts and remaining checks

The master repository owns these reviewable artifacts:

- `ops/community/Dockerfile`, `compose.yml`, and `compose.maintenance.yml`: private
  files, worker, importer and maintenance services alongside master.
- `ops/community/test-images.ps1`: five-image non-root/private-image validation and
  both Compose overlays. All five images were rebuilt and passed at clean master
  `f4dc02b7`, with UID1654, private contents and both overlays checked; exact local
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

CI wiring validation passed, including exact Windows/Linux gate probes. Bind the
final app/base/launcher artifacts and test evidence to their build revisions. Keep
the paired backup and rollback instructions alongside that inventory. Remote CI
execution and production deployment have not been performed by this goal.
App `e98f611` adds CI for locked install, typecheck/lint, deterministic Hub tests
and build. The local `test:hub` command passed 18 tests plus Markdown/browser-runner
guards; the app CI does not claim served-browser or provider acceptance.

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
ten invalid fixtures. The empty preload entity has no visible mesh; actual game
mounting and the world-placement sample's client rendering remain unverified.

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
2. **Real GitHub provider acceptance:** deterministic OAuth/import/redirect and
   replacement-asset tests exist, but a real configured OAuth connection and a
   permitted release-asset import are still needed. Do not describe fixture
   responses as a completed provider integration journey.
3. **Actual game acceptance:** two unrelated clients occupied
   11,316/12,227 MiB VRAM at the latest recorded check; one was in-world and one
   was offline. They were preserved. A free
   authorized game-test slot and a valid authored preload asset fixture are needed;
   the successful inert-archive server restart is not that proof.
4. **Release-host and owner checks:** name the moderation owner; review contributor
   terms/license/report/appeal copy; verify operational credentials/capacity,
   signing-identity continuity, encrypted off-site paired backups, host permissions,
   edge TLS/DNS and alert delivery. Local fixture results do not establish those
   host- or owner-specific facts.

Production publication/deployment remains outside authorization. Rollback preserves
database, immutable blobs and signing identities, disables new writes/imports/install
offers, and uses only a recorded schema-compatible binary. Disabling and stopping
retention precedes rolling back any writer to a version without publication fencing.
