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

CI wiring validation passed, including exact Windows/Linux gate probes. Bind the
final app/base/launcher artifacts and test evidence to their build revisions. Keep
the paired backup and rollback instructions alongside that inventory. Remote CI
execution and production deployment have not been performed by this goal.

Base `b9f6bc4f` supplies a standalone versioned package JSON Schema and newly
authored MIT-licensed resource/config-template and two-resource bundle examples.
The no-deploy server build passed with no warnings/errors; seven actual ZIP/parser
and metadata tests passed. Schema checks accepted both examples and rejected ten
invalid boundary fixtures. These diagnostic Lua examples do not prove game asset
loading.

The final acceptance audit also requires a distributable world-placement sample,
a supported authored preload-asset sample, and a deterministic served Hub browser
scenario. Those are being prepared independently of the blocked live journeys;
the existing diagnostic examples and generic website scripts do not satisfy them.

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
3. **Actual game acceptance:** two unrelated in-world sessions occupied
   11,391/12,227 MiB VRAM at the latest recorded check. They were preserved. A free
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
