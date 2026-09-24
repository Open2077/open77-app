# OPEN//77 Hub — community resources and creator showcase

Proposal, 11 September 2026. Planning only; no application behavior or deployment changed.

The complete executable scope, repository work, contracts, acceptance tests and goal template are in [community-hub-implementation.md](community-hub-implementation.md). That document supersedes tentative implementation choices below and includes GitHub and Warden integration in the complete goal, after the web milestone.

## Product decision

Build OPEN//77 Hub inside the existing web app. Keep Community in the main navigation and make `/community` the hub entrance. Give downloadable projects canonical pages under `/resources`. Creators get a permanent home for screenshots, demonstrations, releases and conversations; server owners get a dependable way to discover and reuse their work.

Start with free sharing. Support Lua resources, gamemodes, interfaces, tools and mapping packages that fit Open77's supported resource format. Permit showcase projects without downloadable files, visibly labelled Showcase or Work in progress. Keep payments, seller onboarding and package protection outside this release.

The first useful journey is: discover the community auto-taxi project, watch it working, check requirements, download a specific release, install it on a test server, then ask its creator a question on the project page.

## Existing integration points and evidence

Inspected local app on `main`, remote `Open2077/open77-app`, initially clean. Read workstation instructions and app AGENTS.md. No game or debug tools were started for this planning task.

| Existing surface | Integration |
| --- | --- |
| `src/app/community/page.tsx` | Replace the Discord landing page with discovery. Its pre-alpha/no-public-server text is stale against the user's launch announcement. |
| `src/components/site-header.tsx`, `src/lib/site.ts` | Retain Community navigation; add contextual Resources, Following and Publish links in the hub. Audit shared preview-stage copy. |
| `src/lib/account/api.ts`, `session.ts` | Reuse master account identity and API error conventions. Existing browser sessions use bearer tokens; enforce permissions on the API. |
| `src/components/account/`, `src/components/admin/` | Add My creations, Saved resources and Notifications; add a resource moderation area. |
| `src/styles/legacy/01-tokens.css` | Reuse navy surfaces, cyan actions, Rajdhani headings and Saira body typography. |
| `src/lib/seo.ts`, sitemap and metadata helpers | Extend public project discoverability and social previews. |
| Master README and mod-attestation client | Master owns platform accounts and MariaDB. Existing mod attestation models exact file hashes and redistribution separately; hub publication must not implicitly grant either verdict. |
| `content/docs/server-resources.md` | Resources use `open77.lua`, server/client/shared scripts and optional web/assets. Player delivery excludes server scripts. Preload assets follow a separate boot-time path. |
| `src/lib/warden-content.ts` | Warden has its own server administration identity and resource controls. Hub access needs an explicit account connection, not reuse of a server license as a creator identity. |

The app README's claim of no runtime platform dependency is outdated relative to the account API and live browser components. Treat source as the stronger integration evidence. Existing Warden and master behavior must be checked in their active repositories before implementation; this plan does not claim an existing hub API or installer.

## Information architecture

| Route | Purpose |
| --- | --- |
| `/community` | Featured creation, trending resources, recent releases, showcases and creator entry points. |
| `/resources` | Searchable, filterable directory; query and sort state survives reload and Back. |
| `/resources/[slug]` | Canonical project overview with media, requirements and latest suitable release. |
| `/resources/[slug]/versions` | Release history, changelogs, compatibility and downloadable files. |
| `/resources/[slug]/discussion` | Project conversation, questions and author answers. |
| `/creators/[handle]` | Public profile, creations and links; never expose account email. |
| `/account/creations` | Drafts, published projects, release processing and moderation feedback. |
| `/account/creations/new` | Publishing wizard. |
| `/account/saved`, `/account/notifications` | Saved projects and followed activity. |
| `/admin/resources` | Review queue, reports, featured selection, suspensions and audit history. |

Keep stable internal project IDs independent of editable slugs and creator handles. Redirect old slugs. Reserve official names and represent Official as a platform-issued status.

## Discovery and visual direction

Use the existing brand with a denser, media-focused layout. Reduce marketing-page whitespace inside the hub. Let actual game screenshots provide the color; cyan identifies actions and selection. Avoid autoplay media and excessive animated decoration.

Desktop entrance:

```text
Existing OPEN//77 navigation                              Account
COMMUNITY / HUB                          My creations   Publish
Build your server. Share what you create.
[ Search resources, gamemodes, maps...                       ]
[ All ] [ Scripts ] [ Gamemodes ] [ Maps ] [ UI ] [ Tools ]

[ Featured community creation: large screenshot + short pitch ]

Trending this week                         Sort / View all
[ image + title ] [ image + title ] [ image + title ]
[ author + tags ] [ author + tags ] [ author + tags ]

Recently released                  From the community / Showcases
```

Directory cards: 16:9 image, title, creator, one-line purpose, category, upvotes and downloads. Show update date and compatibility when useful; keep detailed view counts on project pages. Use three columns on wide screens, two on tablets and one on phones. Mobile filters open a drawer; retain keyboard focus and selected-filter chips.

Initial categories: Scripts, Gamemodes, Maps & interiors, UI & HUD, Tools & libraries. Use RP, racing, PvP, freeroam, vehicles and economy as tags. One primary category and up to five tags avoids duplicate listings. Keep source availability and Downloadable/Showcase as separate filters.

Start discovery with Featured, Trending this week, New and Recently updated. With a small catalog, prefer a compact useful page over many nearly empty shelves. Label editorial picks explicitly. Never fabricate activity counts.

## Project page

Lead with title, creator, short pitch and a screenshot/video gallery. A right-hand download panel shows latest release, size, supported Open77 builds, prerequisites, update date and primary action. On mobile place this after the first media item and keep it easy to reach.

Overview contains purpose, features, installation, configuration, dependencies and known limitations. Versions contains immutable releases and changelogs. Discussion contains a paginated conversation with one level of replies. Links contain source, external issue tracker and optional creator Discord.

Support a cover plus up to eight screenshots at launch, captions and alt text, and one or two supported external video links. Images are uploaded, decoded, resized and served by the hub. Videos use supported providers and click-to-load playback; do not accept arbitrary iframe HTML. Native video uploads and transcoding can follow demonstrated demand.

Show these statuses independently: Downloadable/Showcase, Stable/Experimental/Archived, author-declared compatibility, and platform moderation state. Do not use an ambiguous Verified badge as a security promise. Mark compatibility as Tested only when there is an actual record of the relevant release being tested against the specified build.

Example content for design work: Auto Taxi RP, with a driving screenshot, short demonstration, transport/RP tags, installation steps and dependencies. Use it as an illustrative prototype until its creator supplies and authorizes actual content.

## Accounts and participation

Anyone can browse. Recommend guest downloads for free public packages; require an existing Open77 account with verified email for publishing, upvoting, saving and commenting. Preview game-admission rules remain a separate concern from reading and downloading community work.

One reversible upvote per account per project, enforced by a database constraint. Start without downvotes or star ratings. Saves are private. Following a project subscribes to releases; commenting subscribes to replies with an opt-out. Launch with in-app notifications, batching noisy events. Add creator following and email digests later if activity warrants them.

Authors may edit descriptions, publish releases, answer and pin useful replies, and archive their work. They can report criticism but cannot silently erase other members' comments. Moderators can hide content with a reason and an audit entry. Users can edit/delete their own comments; preserve thread placeholders where replies exist.

Keep project discussion attached to the resource. Add Question/Bug/Feedback labels and an author-resolved marker if needed. Platform bugs and missing native/API requests continue to point to the existing Discord workflow; avoid launching a general forum and duplicating issue trackers at the same time.

## Publishing and file formats

Use ZIP as the initial interchange format. Keep `open77.lua` as the runtime manifest. Hub metadata belongs in the catalog; a later optional JSON sidecar can make packaging repeatable without changing the runtime DSL.

| Input | Recommendation |
| --- | --- |
| ZIP upload | First release. Best universal path, including creators without GitHub. |
| GitHub repository URL | First release as optional source link; can also accompany a clearly marked showcase with no download. |
| GitHub release import | Next increment: import a selected release asset, inspect it, and preserve a hub copy with attribution and uploader permission. |
| Warden Publish | Later convenience path into the same draft/release pipeline. |
| Arbitrary remote URL or branch auto-sync | Defer; unstable content and broad fetch behavior complicate repeatability. |

A GitHub repository URL is not an installable release. GitHub releases can attach packaged assets; automatic source archives may not include built web assets or the right resource layout. Record repository, selected release/asset identifiers, commit when available, fetched time and resulting digest. Import exact bytes once; if upstream files change, require a new hub release. Repository ownership/link verification is distinct from asserting rights over included third-party assets.

The first publishing wizard has five autosaved steps:

1. Basics: title, summary, type, category, tags and creator.
2. Showcase: cover, screenshots, video and Markdown description with preview.
3. Release: ZIP, version, changelog, supported builds, required resources, install instructions and license. Skip for a Showcase.
4. Validation: explain manifest/layout problems and provide actionable corrections.
5. Preview and submit: show the exact public page and file list; creator confirms distribution rights.

Suggested initial ZIP shape:

```text
auto-taxi-1.0.0.zip
  auto_taxi/
    open77.lua
    server/main.lua
    client/main.lua
    shared/config.example.lua
    web/...
    README.md
    LICENSE
```

Accept either a root manifest or one wrapper directory for single-resource uploads. Support multi-resource bundles with an explicit list of included manifests and names; each release installs as one versioned unit. Detect duplicate runtime names, missing referenced files and incompatible dependency requirements. Do not silently package unrelated repository folders.

This is the complete resource distributed to server owners, including server scripts. It is not the signed client-only resource image generated by a running server. A hub release never replaces the server's existing player distribution/signing process.

Require a stated license and third-party notices where relevant. Free download does not necessarily permit modification or redistribution. Allow an appropriate standard license or a clear custom license; distinguish source availability from open-source licensing. Disallow stolen/repacked game files. Treat substantial asset rights questions and later commercial terms as separate policy work before those features launch.

## Compatibility, mapping and dependencies

Record release version, Open77 server build range or explicit tested build IDs, required resources and version constraints, runtime names provided by bundles, client asset requirements, restart needs and optional capabilities. During Developer Preview, prefer actual published build identifiers over assuming stable semantic API versions. Automated API scanning can give hints but cannot prove Lua compatibility.

Maps assembled through Lua and supported world APIs can use the standard resource path. Maps with preload game assets must use the existing required-mod pipeline and its current limits. Uploaded screenshots are showcase media, not installable map data. A third-party editor export without an Open77 adapter remains Showcase until supported packaging is established.

The existing local resource guide documents at most eight preload archives per resource and 64 MiB per archive. A larger hub ZIP limit does not lift runtime limits. Executable/native extensions stay outside routine Lua-resource acceptance and retain their separate review path. Validate the active runtime contract before shipping mapping support.

Manual download includes clear placement, dependency and `resources.load` guidance. Never suggest that extracting an unknown resource onto a running server is automatically safe: wildcard load rules and `auto_start` may activate it. Recommend testing/staging and explicit selection.

## Upload processing and moderation

Keep uploaded objects private until processing and moderation complete. Proposed starting limits: ZIP 100 MiB compressed, 500 MiB expanded, 10,000 entries; images 10 MiB and 40 megapixels each. Tune using real starter packages, with a separate reviewed path for larger maps.

Pipeline: authorize owner -> create bounded upload session -> direct upload -> verify actual size/type/digest -> isolated inspection -> media derivatives -> moderation -> publish catalog version and artifact availability.

Inspection rejects traversal, absolute paths, links, Windows device names/alternate streams, case collisions, encrypted archives, archive bombs and undeclared nested content. Inspect supported nested preload archives with shared extraction budgets. Reject accidental secrets, server identities, databases, logs and runtime cache folders; scan Lua and other text for likely credentials. Parse manifests with a restricted parser or isolated, resource-limited evaluator. Never run uploaded Lua, install hooks or repository builds with platform credentials or unrestricted network access.

Sanitize Markdown and links, reject arbitrary HTML/scripts, strip image metadata, and serve untrusted artifacts from a separate origin with download headers. Keep processing workers away from account signing keys and the game-master request path. GitHub imports need provider allowlists, redirect checks, bounded downloads and private-network blocking. Rate-limit uploads, votes, comments and reports; check ownership server-side on every write.

Project lifecycle: Draft -> Submitted -> Published, with Changes requested, Suspended and Archived alternatives. Release lifecycle: Uploading -> Processing -> Pending review -> Published, with Rejected and Revoked outcomes. Old published releases stay available while an update is reviewed. Published file bytes are immutable; metadata edits are audited.

Initially review every first project and release manually after automated checks. Let trusted creators use a faster path later, while retaining automated inspection. Provide reports on projects, files and comments, an appeal route, and a moderation queue with assigned ownership. A moderation outage queues submissions privately rather than bypassing checks.

Revoking a release blocks new downloads, removes it from recommendations and invalidates cached delivery access. Use short-lived download authorization and an origin access check so a permanent public blob URL cannot bypass revocation. Keep metadata/history explaining removal when appropriate. Revocation cannot recall bytes already downloaded; later Warden checks can notify owners and block new installs without silently deleting live server resources.

## Views, downloads and trending

Define metrics before exposing them. A view is a deduplicated project-page visit within a daily window; exclude known bots and previews. A download is a successful artifact delivery recorded at the delivery layer, not a button click or issued URL. Deduplicate retries/range requests by download event identity. It remains a download count, not a claim about unique users or successful installs. External source links have click metrics only.

Use short-lived pseudonymous deduplication identifiers and a defined retention period; avoid keeping raw IP history just to generate popularity counts. Log public aggregates separately from operational security logs.

Start Trending with recent unique upvotes as the strongest signal, recent deduplicated downloads as a smaller signal, and time decay. Cap per-user contributions; exclude quarantined/revoked projects and suspected abuse. Do not reward description edits as new releases. Keep views out of the initial score because they are easier to inflate. Validate ranking on a small fixture dataset and manually review early results. Featured is editorial; Most downloaded is explicitly all-time or a selected period.

## Technical architecture and ownership

Extend the existing stack instead of adding another account system.

```text
Next.js web app / later Warden and launcher
                 |
          Master community API
          /                 \
    MariaDB metadata      bounded upload/download sessions
          |                         |
    processing jobs ------ isolated worker ------ object storage/CDN
```

In `app`: add community/resource components and API client, project routes, publishing dashboard, moderation UI and styles based on existing tokens. Keep public project content readable in server-rendered HTML with canonical URLs and screenshot social previews. New projects must appear without a site rebuild. Use request-time public fetching or the installed Next version's supported cache/revalidation mechanism for these routes; read its local docs before implementing. Leave existing static documentation intact. Account interactions remain authenticated API calls. Never cache private drafts or personalized responses as public content.

In `master`: add a Community domain/module, database migrations, ownership policies, paginated search, release metadata, upload authorization, comments, votes, notifications and moderation. Reuse the account authority and audit conventions. Start with MariaDB indexes/search; do not add a search service before corpus size or language needs justify one. Put archive/media processing in a separately constrained worker with durable jobs, retries and idempotent completion.

Object storage holds artifacts, originals and media variants; database stores keys and hashes rather than blobs. Storage provider and budget remain implementation decisions after checking current operations. Existing mod attestations describe externally hosted bytes and are not already a community file hosting service. Protect master availability with worker and bandwidth limits, back up metadata, preserve artifact provenance and test restore. Expire orphaned uploads on a defined schedule; never garbage-collect referenced published versions accidentally.

Core entities: Project, ProjectMember (owner/maintainer), Release, ReleaseResource, Dependency, Artifact, Media, SourceLink, Comment, Vote, Save/Subscription, Notification, Report, ModerationAction, AggregateMetric and UploadJob. Bind public creators to existing account IDs; add public handles/bios. Store license snapshots per release. Use immutable project/release IDs, version uniqueness, owner checks and content hashes throughout. Start with one owner UI but allow maintainers in the model for future teams.

Proposed API families, not existing routes: `/api/v1/community/projects`, project releases/comments/vote/subscription, upload sessions and completion, `/me/creations`, `/me/notifications`, and admin review/report endpoints. Separate public reads from authenticated mutations. Use cursor pagination, structured errors, rate limits, optimistic edit concurrency and idempotency for upload completion/publication/download event processing.

## Warden and launcher integration

After web publishing and download behavior is proven, add Warden's Browse Hub entry. An operator chooses a release and sees dependencies, collisions, local modifications, required permissions and restart needs. Warden downloads into an external staging directory, verifies the digest, resolves dependencies and records pinned versions before applying changes. Staging must be outside watched resource folders to avoid auto-start during inspection.

Install only after an authorized Warden operator confirms the plan. Preserve local configuration and modifications; refuse to overwrite conflicts without a clear resolution. Back up replaced files, apply transactionally and retain a rollback record. Database migrations or external side effects may prevent automatic rollback; require author instructions for those cases. Disable automatic live updates initially. Recheck revocation and compatibility before each install/update.

Warden Publish requires an explicit connection to an Open77 creator account through short-lived, scoped authorization. A Warden login or server license is not publishing authority. Export only selected resource files from a controlled allowlist; show a file preview and secret-scan findings. Upload creates a draft for the creator to finish on the website. Never export `.open77` identities, signing keys, live config, logs or player data.

The public website does not reach into localhost/private Warden servers. Warden initiates outbound API requests. Launcher integration can initially open project URLs and later show featured resources; it does not install server-side scripts into a player's game directory. Actual game asset preparation retains the established launcher/server contract.

## Delivery sequence and acceptance gates

| Milestone | Deliverable | Acceptance gate |
| --- | --- | --- |
| 0 — Interface prototype | Discovery, resource detail, publish wizard, creator dashboard and moderation layouts with labelled fixtures | Desktop/mobile and keyboard review; taxi example communicates purpose, compatibility and install path clearly. |
| 1 — Complete web MVP | ZIP publication, media/video links, source link, search, versions/downloads, profiles, votes/saves, comments/replies, notifications and moderation | A second account can discover, download, discuss and report a real approved resource; no manual database intervention. |
| 2 — GitHub and creator workflow | Selected release imports, ownership linking, improved changelogs and maintainer controls | Reimports cannot mutate published bytes; revoked/deleted upstream releases do not silently change hub artifacts. |
| 3 — Warden | Browse/install/update with staging and pinned dependencies, then Publish draft | Test-server install and rollback demonstrated; wildcard loading cannot execute partial downloads; secrets excluded from exports. |
| 4 — Growth | Curated collections, better discovery, optional creator following, launcher discovery | Improvements driven by measured publishing and download friction. |

MVP deliberately includes comments, media and creator pages: those are central to the requested community experience. Warden, native video hosting, general forums, direct messages, donations and payments are outside that first release.

Validation for implementation: app type/lint/build plus browser journeys at mobile and desktop widths; API integration tests for ownership, pagination, duplicate votes and concurrent releases; malicious archive/Markdown/remote-fetch tests; expired uploads, quota exhaustion, failed jobs and interrupted downloads; independent accounts for authorization; cache invalidation after revocation and edits. Test public metadata without JavaScript and ensure drafts do not enter search/sitemap. Run real server/game validation when Warden or runtime packaging is changed, following the Open77 testing skill then.

Seed launch with the official Freeroam example and willing community creators, preserving licenses and attribution. Invite the taxi author to publish their own project rather than claiming it for an official account. A target of roughly five to ten useful projects is enough for a meaningful first catalog, not a release requirement. Prepare an owner install guide and a creator publish guide.

Track publish completion and failure reasons, moderation turnaround, search with no results, project-to-download conversion, repeat visitors and creator retention. Successful installations can only be measured once Warden supplies consented, deduplicated installation results. Audit stale launch messaging on Community, shared stage labels and related navigation as part of the hub release.

## Future paid packages

Preserve stable creator ownership, immutable releases, artifact access checks and release-specific licensing now. These are sufficient extension points for a later entitlement service. Do not add price badges, checkout, wallets, payouts, DRM or placeholder paid tiers today. Future commercial work requires its own business/policy design, including distribution rights, taxes, refunds, disputes and what purchasers retain if a creator leaves. Already-published free releases must retain their recorded terms and history.

## Remaining decisions before implementation

Recommended defaults are web-first, guest free downloads, verified-email contributions, ZIP hosting, optional source links, externally hosted videos and manual early moderation. These can be implemented without resolving a full marketplace strategy.

Confirm supported package sizes against actual community maps; identify the moderator responsible for launch; select storage using the existing operations budget; validate current master/Warden auth and packaging contracts; decide whether to include multi-resource bundle upload in the very first pilot or immediately after single-resource validation. Estimate calendar delivery after these bounded checks and the prototype review, rather than assuming a backend-ready UI is a small page change.

## Public references checked

- [Open77 documentation](https://open2077.net/docs) and [hosting guide](https://open2077.net/docs/host-a-server): current Developer Preview context.
- [Resource guide](https://open2077.net/docs/server-resources): runtime manifests, client/server split and preload assets.
- [Freeroam example](https://github.com/Open2077/freeroam): user-supplied seed project reference.
- [GitHub releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases): versioned release assets and automatic source archives.

Public pages and local docs may reflect different deployments; proposed behavior above is explicitly new, not an assertion that those capabilities have shipped.
