# OPEN//77 Hub — implementation contract and execution plan

Status: ready to drive a future implementation goal. Written 11 September 2026.
No implementation goal, application implementation, publication or deployment has been started by this document.

Read alongside [the product plan](community-hub-plan.md). This document governs execution, scope and acceptance; its concrete defaults supersede tentative implementation choices in that proposal. Record later changes here with their reason and impact.

## 1. Completion boundary

Deliver a working free community resource platform inside the current Open77 app, backed by the master account/API infrastructure. Include discovery, creator profiles, uploads, screenshots and external video, versioned downloads, GitHub release import, votes, saves, subscriptions, comments, notifications, moderation, and Warden browse/install/update/publish integration. Include a simple launcher entry opening the web hub. Each stage below is required for the complete goal; the web-only milestone is an intermediate delivery.

Completion means working integrations with real local/staging services, meaningful tests, browser and in-game evidence where applicable, documentation, reproducible build artifacts, and a reviewed deployment/rollback runbook. Production deployment is a separate final action when authorized in the goal or subsequent instructions. Do not equate a deployed page with completion if its backend is mocked. Do not equate release readiness with production deployment.

Exclude payments, selling, donations, escrow/DRM, native video hosting, general forums, private messaging, arbitrary executable plugins, automatic live updates, GitHub branch/build automation and proprietary editor conversion. The hub accommodates maps packaged through supported Open77 resource/preload formats. Other work can be showcased without an install button.

## 2. Decisions fixed for execution

| Decision | Default |
| --- | --- |
| Placement | Community becomes OPEN//77 Hub; projects live at `/resources/[slug]`. |
| Accounts | Reuse existing Open77 accounts; verified email for contributions; guest public browsing/downloads. |
| Packages | ZIP outer container, single resource and explicit multi-resource bundles; preserve runtime `open77.lua`. |
| Versions | Immutable release artifacts; semantic release versions; explicit tested Open77 build IDs during preview. |
| Media | JPEG/PNG/WebP uploads; cover plus eight screenshots; up to two supported external video links. |
| Social | One upvote; private saves; project release subscriptions; one-level comment replies; in-app notifications. |
| Moderation | Existing platform admins initially; project and release review required before first public availability. |
| Backend | Community module in master/Core; separate file gateway and constrained processing worker. |
| Persistence | Existing MariaDB conventions plus private blob storage; no new account DB or search cluster. |
| Storage default | Dedicated filesystem volume behind a blob-store interface and authenticated gateway, compatible with existing Docker/Caddy operations. S3 can replace the adapter later. |
| Public rendering | Request-time public API reads for project HTML/metadata initially; no rebuild on publish. |
| GitHub | Optional source URL, followed by selected public release-asset import; no automatic source build. |
| Warden | Outbound hub requests; local operator authorizes staged install; creator authorization for publishing. |
| Updates | Pin installed releases; show update plan and conflicts; no automatic activation. |
| Launcher | Open the hub in the default browser; no server-script installation into player directories. |

The storage default avoids making a new paid provider a prerequisite. Before production, verify available disk and backup capacity; if inadequate, prepare the same interface with a suitable object-storage adapter and document that infrastructure dependency. Do not silently place uploads in the publicly served existing CDN tree.

## 3. Verified repository map and preflight

Read local instructions again when entering each repository. At inspection: app and master were on `main`; base was on `av-fix-merge`, not main. Preserve that branch and all unrelated work. App already has the product-plan document as an untracked file. Recheck all status/HEAD/remotes/worktrees at goal start; these observations are not a license to overwrite later changes.

| Repository | Existing integration points | Planned additions |
| --- | --- | --- |
| `app` / `Open2077/open77-app` | `src/app/community`, account/admin components, `src/lib/account/api.ts`, `session.ts`, SEO, design tokens | Hub routes/components/styles, public and authenticated clients, publishing, notifications, moderation and browser scenarios. |
| `master` / `Open2077/op77-master` | `src/Open77.Master/Api`, `Program.cs`, Core `MasterSchema.cs`, `MasterDatabase.*`, `MasterOptions`, MariaDB tests, Docker/Caddy | Community domain/API/persistence, file gateway, processing worker, quotas/jobs, tests, operations. |
| `base` / `Open2077/open77-base` | `server/src/Open77.Resources/Manifests/ResourceManifestParser.cs`, Warden host/gateway/contracts/page, Warden tests | Shared package validation as appropriate, Hub client, install/export services, Warden screens, server docs. |
| `launcher` | Inspect repository instructions and existing external-link commands before changes | Community/Hub link using existing browser-opening abstraction. |

Confirmed details: resource parser is a text parser, not a Lua executor; it enforces directory/name matching, a 256 KiB manifest limit, 4,096 client files and eight preload entries. It reads `open77_version`, dependencies, permissions and reload policy. Master schema DDL uses an advisory migration lock because MariaDB DDL auto-commits. Warden routes use their own session and role permission checks, marshal live state through `WardenAdminGateway`, and currently impose a 4 MiB request-body limit. Current app server details deliberately use browser fetching due to edge/CORS concerns; hub SEO needs a validated server-to-master path.

Preflight work:

- Create dedicated hub branches/worktrees from the intended current baselines without changing the existing base checkout. Record exact commits in the execution ledger.
- Load README/instructions and relevant operations docs in each checkout; resolve active Warden frontend sources/build tooling rather than assuming `WardenPage.cs` owns every asset.
- Verify local DB/Docker, app browser harness, server build tooling and compatible test builds. Do not start game/debug hosts during planning or frontend work.
- Inspect master pinned `external/open77-base` revision. Shared package work must use a reviewed pinned dependency; never compile against an unrecorded sibling checkout in CI.
- Verify public server-side master reads from a deployment preview. Configure only the necessary API path/edge access; preserve existing identity/rate-limit protections.
- Keep an execution ledger containing phase status, HEADs, tests, evidence paths, known issues and next task. No credentials or account session tokens in it.

## 4. UX deliverables and state coverage

Use existing navy/cyan tokens and typography. Build reusable media cards and compact filter controls; screenshots carry visual identity. **Change, 12 September 2026:** the Hub follows the density and vocabulary of the reworked server directory on `main` (one strip under the site header instead of a second navigation, compact heads, toolbar + chips + rail library, cover-band resource header with tabs); the first served review found the marketing-page voice inconsistent with the current site and harder to use. Reason and evidence are in the execution ledger. No invented author endorsements or production statistics. Prototype content is explicitly labelled and removed from production seed paths.

| Screen | Required behavior |
| --- | --- |
| `/community` | Search, category shortcuts, one featured project, trending/new/updated shelves, showcase shelf, Publish and My creations. Small-catalog empty states. |
| `/resources` | Text search, category/tags, downloadability, compatibility, source availability; sort; cursor navigation; URL state and Back restoration. |
| `/resources/[slug]` | Gallery/lightbox, author, overview, installation, dependency list, latest eligible release panel, vote/save/follow/report/share actions. |
| `/resources/[slug]/versions` | Stable/prerelease distinction, changelog, digest, size, compatibility, immutable download links and revoked history. |
| `/resources/[slug]/discussion` | Paginated comments, one-level replies, edit/delete own, author pin/resolved status, report; external issue tracker link. |
| `/creators/[handle]` | Public bio/avatar/links, published creations; private account fields excluded. |
| `/account/creations` and `new` | Drafts, review status/reasons, new release, archive, edit project and members. |
| `/account/creations/[id]/edit` | Five-step autosave wizard, progress, preview, upload processing feedback and concurrency recovery. |
| `/account/saved`, `/account/notifications` | Private lists, pagination, read state, unsubscribe controls. |
| `/admin/resources` | Projects/releases/reports/jobs queues; inspect manifest/files/media; decisions with reasons; feature/unfeature and revoke. |
| Warden Hub | Search, release details, install preview/progress/history, conflicts, update/rollback, export draft, account connection. |

For each: loading, empty, offline, denied, expired session, processing, failure/retry and success states. A master failure renders a retryable outage, never a false 404 or empty project. Preserve unsaved text through recoverable auth/network failures without writing credentials into drafts. Autosave only to authenticated drafts; warn before discarding locally unsent changes.

Browser acceptance at 390, 768 and 1440 CSS pixels: no horizontal page overflow, usable filters, keyboard navigation, visible focus, correct dialog focus return, reduced-motion support, labelled inputs, readable contrast and meaningful image alt text. External video does not autoplay; provider failure preserves a direct link. Validate long titles, missing media, large changelogs, deleted commenters and zero counts.

## 5. Domain rules and database design

Use current GUID/timestamp/hash conventions. Prefix new tables `community_`; assign migration numbers from the current schema when implementing. Avoid destructive edits to existing migrations. All private writes check current account status, not cached browser roles.

| Table/group | Essential fields and constraints |
| --- | --- |
| creator_profiles | Account FK unique, normalized handle unique, public bio/avatar/links, timestamps. Reserve official/admin-like handles. |
| projects | ID, owner FK, current slug, category, state, maturity, latest approved revision ID, timestamps, concurrency version. |
| project_revisions | Project FK, title/summary/Markdown/install guide/source/license defaults/tags, draft/submitted/approved status, revision version. Published content reads the approved snapshot. |
| slug_history | Globally unique normalized slug, project FK; old slugs redirect, cannot be reassigned. |
| project_members | Unique project/account, owner/maintainer role; exactly one owner maintained transactionally. |
| releases | Project FK, unique normalized SemVer, channel, state, changelog, license snapshot, artifact FK, parser version, publication/revocation metadata. |
| release_resources | Release FK, resource name, relative root, manifest version, declared Open77 range/permissions/reload policy; unique runtime name within release. |
| release_compatibility | Release FK, author-declared supported builds/range and separate test evidence records with provenance. |
| dependencies | Release FK, required project ID or explicit external/runtime dependency, constraint, optional flag. Hub dependencies cannot silently resolve by display name. |
| artifacts/media | Blob key, original name, actual size, SHA-256, MIME, processing status; media dimensions/derivative keys/order/alt text. Reference count derived or transactionally maintained. |
| source_imports | Project/release FK, provider, repository numeric identity, selected asset/release IDs, commit when known, source URL, time and digest. |
| comments | Project/account FK, optional root parent FK in same project, body/revision/state, author pin and resolved marker. No deeper reply chain. |
| votes/saves/subscriptions | Unique project/account; independent vote, saved state and release subscription. |
| notifications/outbox | Recipient, event key unique per recipient, safe payload IDs, read time; transactional event creation. |
| reports/moderation_actions | Target type/ID, reporter, reason, assigned admin, outcome; append-only audit actor/time. |
| upload_sessions/jobs | Owner/target, max sizes, token hash/expiry, actual object, state, attempt count, lease owner/expiry and idempotency key. |
| download_events/daily_metrics | Delivery ID, release ID, dedup key, outcome/byte ranges/time; aggregate views/downloads/votes without permanent raw-IP identity. |
| delegated_connections | Creator ID, scope/project restrictions, hashed device/poll/refresh secrets and expiry/revocation; Warden identity label. |

Indexes: published state/category/date/ID for listing; owner/state for dashboard; project/release publication for versions; comment project/date/ID; recipient/read/date for notifications; job state/lease; report state/date. Use parameterized bounded search across title, summary and tags initially, with title exact/prefix matches prioritized. Add a full-text index only if measured corpus queries need it. Sorting always has an ID tie-breaker. Cursors bind filter/sort state and are validated, not SQL fragments.

Publish transactions atomically set approved revision/release visibility, audit entry and notification outbox records. Never expose draft edits on an existing public project. A changed submission invalidates the earlier review snapshot. Unique constraints and optimistic concurrency prevent double votes, slug races and lost edits. Expected revision mismatch returns 409 with a recoverable UI.

Project states: draft, submitted, changes_requested, published, suspended, archived. Releases: uploading, processing, pending_review, published, rejected, revoked. Content-review status and technical-validation status remain separate. Archived projects remain readable/downloadable unless suspended/revoked; they leave trending. Account suspension freezes writes and triggers review without automatically erasing everyone else's conversations. Deletion removes drafts; published deletion uses archival/takedown rules and keeps dependency/history records.

Maintainers edit drafts and upload releases; owners manage membership/archive. Owner transfer requires recipient acceptance and an audit record. Admins moderate and feature; they cannot change artifact bytes. A separate hub moderator permission can follow if needed without granting full platform administration.

## 6. API contract

Base: `/api/v1/community`. Reuse `{code,message}` errors; add bounded `fieldErrors` for forms and a correlation ID. Public DTOs never serialize internal account email, reviewer private notes, storage paths or credentials. Page response: `{items,nextCursor}`; default 24/max 100. Dates use UTC ISO strings at the API boundary. Mutating retryable operations accept an idempotency key bound to actor and request-body digest.

| Method and path | Contract |
| --- | --- |
| GET `/catalog` | Categories/tags/build choices and client-visible configured limits. |
| GET `/discovery` | Featured and ranked public shelves, no personal state. |
| GET `/projects` | Search/filter/sort/cursor query; approved snapshots only. |
| GET `/projects/{slugOrId}` | Public project, media, aggregate metrics, latest eligible release and links. |
| GET `/projects/{id}/releases`, `/releases/{id}` | Published history/detail; no draft artifact authorization. |
| GET `/creators/{handle}` | Public profile and paginated creations. |
| POST `/projects` | Verified user creates draft and becomes owner. |
| GET `/me/projects`, `/me/projects/{id}` | Creator dashboard and private draft detail. |
| PATCH `/projects/{id}` | Owner/maintainer edits draft revision with expected version. |
| POST `/projects/{id}/submit`, `/archive` | Explicit transitions; reject incomplete/stale submissions. |
| POST `/projects/{id}/releases` | Create immutable-identity release draft; reserve version. |
| POST `/uploads`, PUT `/uploads/{id}/content`, POST `/uploads/{id}/complete` | Bounded session, byte stream to gateway, idempotent finalize. API returns gateway URL rather than sending ZIP through Next. |
| GET `/uploads/{id}` | Owner processing progress and actionable validation errors. |
| POST `/releases/{id}/submit` | Freeze inspected artifact/review snapshot. |
| POST `/releases/{id}/download` | Guest-capable: check current visibility, return short-lived delivery URL/event ID. |
| GET/POST `/projects/{id}/comments` | Public approved comments; verified-user creation. |
| PATCH/DELETE `/comments/{id}` | Author-only edit/delete; preserve reply placeholders. |
| PUT/DELETE `/projects/{id}/vote`, `/save`, `/subscription` | Idempotent per-account state changes. |
| GET `/me/project-state` | Bounded batch of current user's votes/saves/subscriptions. |
| GET `/me/saved`, `/me/notifications`; PATCH notification read | Private pagination and read state. |
| POST `/reports` | Verified user reports project/release/comment with bounded text. |
| GET/PATCH `/me/profile`; project member/invitation routes | Public profile and accepted maintainer/ownership workflows. |
| POST `/github/imports`; GET `/github/imports/{id}` | Authorized creator imports an explicit public release asset into processing. |
| GET `/admin/queue`; POST target `/decision`, `/revoke`, `/feature` | Current platform admin authorization, expected reviewed revision and mandatory reason. |
| POST `/connections/device`; POST `/connections/token` | Warden device connection and bounded polling; approval happens on authenticated web page. |
| POST `/connections/{id}/revoke` | Creator invalidates delegated access. |

Exact route grouping may follow existing code conventions, but cover these operations in the contract and tests before UI binding. Maintain one checked JSON/OpenAPI contract fixture or generated DTO source to prevent TypeScript/C# drift. Do not add private hub contracts to the public game-directory protocol unless clients actually require them.

Initial configurable limits: 30 draft projects/account, 10 concurrent uploads/account, 1 GiB pending data/account, 100 MiB ZIP, 500 MiB expanded total, 10,000 outer/nested entries, 10 MiB/40 MP images. Text limits: title 80, summary 200, description/install guide 50,000 each, comment 5,000, tags five, video links two. Tune quotas for approved creators through admin settings; return explicit limit errors. All endpoints enforce per-IP and, after authentication, per-account rate limits with Retry-After. Do not trust forwarded IP headers outside configured proxies.

## 7. Artifact gateway, worker and publication

Add proposed `Open77.Community.Files` and `Open77.Community.Worker` projects to master, with shared domain/storage contracts in Core or a small dedicated library. Keep the game master free of archive decompression and large transfer work.

Filesystem layout uses opaque keys under dedicated private quarantine/artifacts/media roots. Never resolve a user filename as an absolute path. Blob API supports streamed write/read, bounded metadata, finalize, delete and existence checks. Provide temporary-directory adapters for tests and production volume configuration. Publish creates a reference to the inspected digest; it does not overwrite or repack those bytes.

Flow:

1. Master verifies account/ownership and reserves quota transactionally; returns upload identity and short-lived scoped gateway grant.
2. Gateway streams to a temporary object, enforces bytes/time/concurrency, computes digest and finalizes atomically. Aborted writes cannot become complete objects.
3. Completion checks the stored object rather than trusting client size/hash and queues a durable inspection job exactly once.
4. Worker leases the job, extracts within bounded scratch space, validates package/media and writes a structured report. Retry transient failures up to three times with backoff; deterministic rejection is terminal. Expired leases are reclaimable.
5. Admin reviews the immutable inspection snapshot. Publish transaction exposes the approved revision/release and emits outbox events.
6. Download authorization checks project/release state. File gateway rechecks authorization/revocation on every new request, then streams exact bytes with Content-Disposition attachment, correct Content-Type, ETag and Range support. No public artifact directory bypass.
7. Unreferenced upload objects expire after 24 hours; rejected blobs after seven days unless held for investigation; logs have bounded retention. Reconcile DB/object mismatches and quarantine unknown objects rather than deleting referenced content.

Workers receive only their necessary queue/storage access, not identity signing keys, server licenses or unrestricted account DB credentials. Extraction/inspection has no network; GitHub fetching is a separate network-enabled component with provider restrictions. Containers run non-root with memory/CPU/process/scratch quotas and read-only root filesystems where practical. Disk exhaustion pauses new uploads while reads/auth remain healthy.

Public images are processed derivatives on a separate asset origin. Remove original metadata; reject SVG/HTML masquerading as images; never serve uploaded web UI files inline on the account origin. Markdown accepts a limited safe subset and link schemes; user content never reaches raw HTML insertion unsanitized. Add and test CSP/media/frame origin rules with existing app features.

## 8. Package contract and mapping

Outer archive remains ZIP. Keep original download bytes; normalize only an extracted staging view for validation. Accepted layouts: manifest at archive root mapped to its declared resource directory, one wrapper directory, or an explicit bundle of resource directories. Preserve the original layout in installation instructions and record install roots in release metadata. Do not silently rename inner files or change runtime manifests.

For reproducible bundles define optional `open77-hub.json`, schemaVersion 1: project identifier when known, release version, resourceRoots, dependencies and config-template mappings. The publishing form can generate the same metadata server-side if the file is absent. This is hub/package metadata, never a replacement for `open77.lua`.

Use the existing parser as the authoritative resource validator through a pinned shared dependency, extracting a neutral validation library only if needed. Do not copy its rules into an independently drifting implementation. Package version and contained resource versions are distinct; show both for bundles. Require SemVer for hub releases without demanding that legacy runtime versions be rewritten. Pre-release selection is opt-in; never compare version strings lexicographically.

Reject path escape, symlinks/reparse/hardlink forms, absolute/UNC paths, Windows device names and alternate streams, case/Unicode-normalization collisions, encrypted containers, nested zip bombs and duplicate output paths. Apply total budgets across declared preload archives, not fresh budgets per nesting layer. Only allow nested archives declared by supported preload rules. Preserve runtime's stricter per-manifest/file/preload limits.

Resource files may include Lua, safe text/config templates, web assets and supported inert game assets. Reject bundled executables, install scripts and native extensions from routine free-resource publication. Detect forbidden `.open77` identities, live configuration, logs, credentials and databases; surface secret findings without echoing the secret value. High-confidence secret findings block; ambiguous findings require creator correction or documented moderator handling. Malware/signature checks are a signal, not a guarantee that Lua code is harmless.

Map support acceptance requires both a Lua/world-placement sample and a supported preload-asset sample. Runtime parser currently requires scripts; do not promise that an asset-only folder is loadable. A supported wrapper resource must meet actual runtime rules. Third-party formats without adapters are showcase-only. A resource accepted by hub moderation still must satisfy existing required-mod attestation and redistribution controls when used by a server.

## 9. GitHub implementation

Stage one stores a validated HTTPS GitHub source URL and never treats it as download bytes or ownership proof. Stage two accepts selected public repository release assets with creator-provided distribution authorization. Parse provider identifiers; do not offer arbitrary URL fetch.

Provide optional GitHub account connection with minimal permissions for repository control verification. Verify current GitHub OAuth/App and release API contracts against official docs at implementation time; no invented scope names. Bind callback state to the signed-in account, use supported PKCE/state defenses, encrypt any required provider tokens at rest and avoid storing a provider token when public API access suffices. A creator may publish a permitted fork/reupload with attribution; mark ownership verification separately.

Import flow: choose repository -> list releases/assets -> choose ZIP -> preview provenance -> create draft job -> fetch once -> normal inspection/review. Import fetcher checks every redirect/host/IP, rejects private/link-local destinations and DNS-rebinding opportunities, bounds time/size and handles rate limits/deleted assets. ZIPs containing only LFS pointers or missing built web files fail resource validation with clear guidance. No executing repository scripts, package managers or Git hooks.

Store exact fetched hash and provider IDs. Asset replacement cannot update a published version; duplicate import with identical idempotency key returns the existing job. User edits README/description through the normal sanitized draft workflow. Mock provider errors in tests and validate one real permitted public release import when available; retain a local fixture for deterministic CI.

## 10. Warden implementation

Add services under `server/src/Open77.Server/Warden/Hub/` for API transport, dependency planning, staged install, rollback journal and export. Add DTOs/endpoints alongside Warden contracts and bind actions through current authorization/gateway patterns. Resolve actual frontend source before implementing the screens. Keep game-loop work minimal: only coordinated state transitions belong there; hashing/downloads never run on the tick thread.

Local routes should cover catalog/detail, install-plan, install-job/status/cancel, installed inventory/update-plan, rollback, creator connection and export preview/job. Separate view, install/manage and publish permissions. Enforce current Warden session/origin protections; a link opened from the public website cannot cause an install by GET.

Install algorithm:

1. Query published release and revocation state; read current server build, loaded resources, local hashes and pinned inventory.
2. Resolve required hub dependencies to exact published versions compatible with the server and each other. Fail cycles, missing dependencies and runtime-name collisions. External dependencies require explicit acknowledgement/manual satisfaction; never auto-fetch arbitrary URLs.
3. Produce a plan with complete file destinations, permissions, preload assets, local changes, expected restarts and proposed config/load-rule edits. Hash and expire the plan.
4. Authorized operator accepts that specific plan. Revalidate state and local hashes to prevent stale-plan overwrite. Lock per-server package mutation jobs.
5. Download outside watched/loaded resource roots; verify bytes and revalidate paths/manifests locally. Persist a write-ahead journal and exact dependency lockfile before activation.
6. Preserve local config by explicit template mappings. Do not guess that every JSON/Lua file is disposable configuration; conflicts stop with a diff/choice. Protect system/bootstrap names and refuse replacing official platform resources through community installation.
7. Stop affected resources when safe, switch staged directories on the same filesystem with recoverable renames, apply selected load-rule changes, then start in dependency order. Preloads require planned server/game restart and established launcher preparation. Do not claim generic atomic multi-directory filesystem updates: journal intermediate states and recover after process interruption.
8. On failure restore saved code/config/load selection where possible. If database migration or other side effects are involved, require documented operator steps and report rollback limits. Hub does not execute arbitrary migration hooks.
9. Record exact project/release/hash/runtime names and locally changed file baseline. Old version backups have explicit retention; uninstall checks dependents and preserves user data/config.

Updates use the same plan, detect drift, and remain opt-in. Revocation blocks new install/update requests and flags installed copies; it never silently deletes running content.

Publish from Warden:

- Device connection starts in Warden; user signs into the web app, sees Warden label/scopes and explicitly approves. Poll token is distinct from the short human code; single use, expires within minutes, rate limited. Store only scoped, revocable delegated access, never the master account password or server license as authorization.
- Export preview lists selected resource roots and included/excluded files. Default to manifest-referenced scripts/assets plus explicit README/license/config templates; scan for identities/secrets and missing dependencies.
- Stream ZIP from Warden to the file gateway; do not base64 ZIPs into current 4 MiB routes or raise all Warden body limits globally.
- Upload produces a creator-owned web draft; final description/media/license/review submission remains visible in the normal wizard. Disconnect revokes delegated tokens and cancels uncommitted publication attempts.

Validate on a dedicated test server for Windows and Linux filesystem semantics where available. Real-game scenario must prove an installed sample starts and its client behavior works; preload sample must prove restart/launcher preparation is honored. Use the open77-testing skill when entering implementation/validation and record the active worktree artifacts used.

## 11. Social features, ranking and metrics

Votes/saves/subscriptions are independent. Upvotes are reversible and self-voting is disabled; authors may privately save/follow their projects. Comment edits have an updated timestamp; author pin/resolution cannot remove another user's words. Render deleted parents as tombstones. Moderation hides abusive content and records reasons; report outcomes notify the reporter without exposing private investigation details.

Notifications initially cover release publication, direct replies, submission decisions, membership invitations and relevant revocation notices. Outbox insert occurs with the originating transaction; delivery is idempotent and never emits repeatedly on worker retries. Read-all is bounded to a cutoff timestamp. Add unsubscribe controls and avoid email/Discord delivery in this goal.

Metrics contract: count views once per project/daily dedup window; exclude known bots and social preview fetches. A download event is recorded after the gateway successfully writes the full artifact, or all unique requested byte ranges cover it; a granted URL or failed partial transfer is not a download. This measures successful server delivery, not proven client installation. Retrying a delivery ID does not increment twice. Do not fold upstream GitHub clicks/downloads into hub downloads.

Initial score, recalculated hourly: sum over the preceding seven days of `(3 * eligible_unique_votes_day + ln(1 + eligible_downloads_day)) * 2^(-age_hours/48)`. This is a tunable starting formula. Cap download ranking contribution to one project/day/pseudonymous visitor and exclude self/test/suspected abusive events. Removing votes removes their contribution; metadata edits do not reset age. Stable tie-breaker by project ID; editorial selection remains separate.

Use rotating keyed dedup hashes with bounded retention, no permanent raw-IP analytics identity. Default delivery diagnostics seven days and dedup keys eight days; aggregate counts may persist. Gate nonessential browser identifiers according to the site's actual consent policy when implementing. Rankings and counts are eventually consistent; authorization/revocation are authoritative immediately on new requests.

## 12. Frontend integration details

Add `src/lib/community/{types,public-api,client-api,validation}.ts`, `src/components/community/`, creator/publisher/moderation subcomponents, and `src/styles/community.css`. Use existing API/session/toast conventions. Public API client has no bearer token and bounded timeouts; authenticated client uses current session and clears/refreshes it through existing behavior.

Render project title/description/media/requirements and metadata from approved public data in server HTML. Validate Vercel-to-master access before selecting this path; configure narrow edge rules if needed. Use current installed Next docs for request-time fetching. Avoid global framework-cache changes just for hub routes. Public DTO response caching may start disabled; aggregate discovery can use short bounded caching later, but download authorization always bypasses caches. Error boundaries distinguish 404, 410, 403 and transient outages.

Add project/creator sitemap entries with bounded pagination and modified timestamps; private account/admin/draft pages are noindex and excluded. Social previews use processed cover images. Old slugs redirect. Shared links copy canonical project URLs, not preview domains or private draft IDs. Do not index infinite search/filter combinations. Use appropriate structured data only for real published content.

Submission progress polls bounded intervals with cancellation and backoff; no endless rapid loops. File progress streams via gateway; retry provides clear restart/resume behavior. Launch can restart incomplete uploads rather than implementing multipart resume, provided failure leaves no falsely completed upload and drafts remain intact.

Audit launch messaging in Community and shared stage labels. Correct README architecture statements for newly dynamic hub routes; preserve documentation sync ownership and do not hand-edit synced wiki files.

## 13. Ordered work packages

Every package below ends with a ledger entry and relevant evidence. PR boundaries may combine adjacent small packages; functional dependencies must remain intact.

| ID | Work | Depends on | Exit evidence |
| --- | --- | --- | --- |
| H00 | Repo/worktree baseline, contracts, environment and SSR/edge probe | — | Recorded HEADs; clean isolated workspace; API access proven. |
| H01 | Interface prototype and reusable card/gallery/filter/form components | H00 | Screenshots and browser journey at three widths; fixtures labelled. |
| H02 | Community schema, domain states, account permissions and revisions | H00 | Fresh/upgrade DB tests; concurrent ownership/version tests. |
| H03 | Public/private project/profile/release APIs and DTO contract | H02 | Two-user API tests; draft isolation; pagination/error contract. |
| H04 | File gateway/private storage and durable jobs | H02 | Bounded streamed upload, abort/retry, quota and restore tests. |
| H05 | Package/media validation, shared parser integration and fixtures | H04 | Valid single/bundle/maps accepted; malicious corpus rejected. |
| H06 | Review/report/revocation/admin API and screens | H03,H05,H01 | Exact-revision review; new requests denied after revocation. |
| H07 | Real publishing wizard, immutable downloads, profiles and directory | H01,H03,H05,H06 | Creator A publishes; user B downloads exact bytes through UI. |
| H08 | Comments/votes/saves/subscriptions/notifications | H03,H07 | Cross-user interactions, abuse cases and idempotent outbox tests. |
| H09 | Metrics/trending/search/SEO/accessibility/performance | H07,H08 | Ranking fixtures, counted delivery tests, HTML/metadata and browser checks. |
| H10 | GitHub provider connection/release-asset import | H05,H07 | Pinned import with provenance; upstream failure/replacement tests. |
| H11 | Warden browse/client/dependency planner and installed inventory | H03,H05 | Plans handle cycles, conflicts, build mismatches and dependencies. |
| H12 | Warden installer/update/uninstall/rollback and UI | H11 | Interrupted install recovery; preserved config; real game test. |
| H13 | Delegated creator connection/Warden export and draft publishing | H04,H07,H12 | Secret-free selected export; revocation/expiry; usable web draft. |
| H14 | Launcher hub entry and all user/operator documentation | H07,H12,H13 | Link tested; guides verified against working flows. |
| H15 | CI, deployment assets, end-to-end regression and restore drill | H06–H14 | Release candidate report; failure tests; rollback rehearsal. |
| H16 | Authorized production rollout and smoke checks | H15 + release authorization | Exact deployed versions, live checks and rollback references. |

H00–H15 define release-ready completion; H16 is required only when production deployment is part of the authorized goal. H07 is the first usable web milestone, not completion. GitHub/Warden failures must not be hidden by removing controls or declaring them future work. If an external credential or host capability is unavailable, finish all independent work and report that specific remaining dependency.

## 14. Test plan and acceptance matrix

Use existing test frameworks and scripts. App: `npm run check`, `npm run build`, relevant content/served checks plus a new deterministic hub browser scenario. Master: `dotnet test Open77.Master.slnx -c Release` against isolated MariaDB, extending current Testcontainers setup. Base: documented `scripts/build-all.ps1 -AgentShell` with target/deploy switches suited to changed components; Warden tests under existing server test project. Read launcher build/test contract before changes. Native client rebuild is needed only if shared native behavior changes, not for adding a web page.

| Scenario | Required assertion |
| --- | --- |
| Guest | Reads real public project; downloads approved ZIP; cannot write or access drafts. |
| Creator A / user B | A creates/submits; admin approves; B finds, downloads, votes, comments and receives reply. |
| Maintainer / outsider | Maintainer edits allowed drafts; outsider cannot read/write guessed IDs; transfer requires acceptance. |
| New release | Old published release remains available during inspection; approved new release changes default; old bytes unchanged. |
| Review race | Editing/replacing upload after review began makes old approval fail, never approves unseen content. |
| Upload failure | Oversize/timeout/worker death/quota exhaustion preserve draft and leave no public object. |
| Content attacks | Archive path/link/bomb/case attacks and Markdown/image/video attacks fail without affecting host/account origin. |
| Counters | Duplicate vote conflict, retry/range download dedup, bot view exclusion and score decay behave deterministically. |
| Revocation | Public links cannot fetch revoked bytes on new requests; installed inventory shows notice; cached media policy checked. |
| GitHub | Selected asset is pinned; missing asset/rate limit/redirect attack/replaced asset never mutates a release. |
| Warden install | Exact dependencies and target names; build mismatch/collision/stale plan blocked; config preserved. |
| Warden crash | Stop process between each journal phase and recover consistent code/config/load selection. |
| Warden publish | Export contains selected code/templates, no identities/secrets; scope/expiry/revocation enforced. |
| Game validation | Installed Lua resource runs and client receives expected content; preload path requires and survives proper reboot. |
| Search/SEO/mobile | Newly published page exists without rebuild; real metadata in HTML; canonical/old slug; accessible mobile actions. |
| Platform regression | Login/license/server discovery/docs/launcher join behavior remains functional. |
| Operations | Restore DB plus referenced blobs in isolation; worker outage and full disk leave master healthy. |

Keep screenshots, fixture hashes, test commands/results and build manifests in an ignored artifact directory referenced by the ledger. Do not seed tests into live user accounts or publish third-party projects without consent. Test artifacts and metrics must be identifiable and excluded from production discovery.

Provisional load acceptance on a representative staging host: 10,000 project fixture catalog, 25 concurrent public readers and two maximum-size uploads; public read p95 under 500 ms excluding internet transit; uploads do not cause master account/directory p95 to regress more than 20% against baseline. Worker memory/scratch remain within configured caps. Measure and document host specifications; adjust only with evidence, not to conceal regressions. Browser target: no layout shifts from unloaded cards/media, no main-thread archive processing, responsive forms while uploads run.

## 15. Operations, rollout and rollback

Add master options and example configuration for feature flags, storage roots, gateway origin, upload/media quotas, job limits, GitHub configuration and delegated-token secrets. Validate at startup; secrets supplied through existing untracked deployment mechanisms. New services use isolated volumes and scoped credentials. Extend `.env.example`, entrypoint rendering, Docker build/compose and Caddy routing deliberately; the repository documents that generated `master.json` overrides other config.

Separate flags for hub public reads, contributions, GitHub import, Warden integration and downloads. A processing outage disables/queues contributions while published reads can remain up. Emergency suspension/revocation is independent of UI flags. Do not expose unfinished production controls behind purely client-side guards.

Deploy preparation:

1. Record compatible app/master/base/launcher commits and artifact hashes. Confirm migration ordering against latest main and pinned base submodule.
2. Back up MariaDB and referenced artifact metadata/blobs; prove restore in isolation. Protect existing signing keys, `.env`, CDN content and DB volumes.
3. Apply additive migrations and start gateway/worker with hub hidden. Because DDL auto-commits, test restart after partial migration and use the existing migration-lock discipline.
4. Deploy backward-compatible master APIs, then app. Run staging journeys with real services before enabling public navigation.
5. Release Warden-capable server and launcher changes through their existing release workflows only when authorized. Existing older clients continue functioning.
6. Enable internal pilot, inspect upload/report queue and runtime metrics, then public discovery/contributions. Do not send Discord/email announcements without explicit authorization.

Rollback: disable writes/imports/install offers; retain DB and blobs; revert app/master binaries only to a schema-compatible build. Pause workers rather than lose queued jobs. Never use volume deletion or destructive down-migrations as routine rollback. Revoke a bad release separately from rolling back the hub application. Keep existing server installs intact unless their operator acts.

Operational telemetry: API failures/latency, storage free space, pending/reserved quota, queue age/dead letters, validation rejection types, delivery errors, moderation backlog and outbox lag. Add health/readiness probes and a documented daily check. Backup includes the association between DB references and immutable blobs; a DB-only restore is insufficient. Design initial RPO 24 hours/RTO four hours as a target to verify in restore rehearsal, not an existing service guarantee.

Launch needs a named moderation owner and operational credentials/capacity. Prepare code, configs, docs and local evidence before requesting missing deployment-only inputs. Never invent production credentials or assume existing CDN storage is large enough. Contributor upload terms, license selection and report/appeal copy need project-owner review before public acceptance; implementation can proceed with clearly identified draft copy.

## 16. Documentation and handoff artifacts

- Keep this implementation plan and product plan in app docs; add an execution ledger with H00–H16 checkboxes and evidence links.
- Add user guides for publishing ZIP/GitHub, resource installation, compatibility, Warden installation/update/export, reporting and creator ownership.
- Author runtime/Warden guides in the base wiki then sync them through the app's documented pipeline; website-only guides belong in its authored guide directory.
- Master owns community API/storage/moderation/backup runbooks and gateway/worker configuration references.
- Publish a versioned package metadata schema and sample resource/bundle fixtures with licenses. Use official or newly authored examples; the community taxi remains its creator's content.
- Final report lists shipped surfaces, tested repository revisions, actual environments, remaining blockers, artifact links and production deployment status. No vague “complete” claim while required integrations are mocked or skipped.

## 17. Goal text for the next turn

```text
Implement the complete free OPEN//77 Hub described in
app/docs/community-hub-implementation.md and app/docs/community-hub-plan.md.
Complete H00–H15: the integrated web community resource hub, real master APIs
and private artifact processing/delivery, creator and moderation workflows,
GitHub release imports, Warden browse/install/update/rollback/export-to-draft,
launcher entry, documentation and full relevant validation. Preserve unrelated
work and use dedicated branches/worktrees. Maintain an execution ledger and
continue through every acceptance gate; do not stop at a prototype or web MVP.
Paid packages and the explicitly excluded features remain out of scope.
Prepare the exact deployment/rollback artifacts and report release readiness.
Production publication/deployment is not included unless I authorize it.
```

If the user wants this goal to include production launch, replace the final two sentences with explicit authorization for H16 and the intended rollout scope. No goal is created by writing or reading this template.
