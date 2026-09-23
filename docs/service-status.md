# Public service status

`/status` is the public service-health page. `/api/status` exposes the same validated
snapshot as JSON. Header navigation, site search, the footer and sitemap link to it.
No sign-in is required. The page uses the existing design tokens and respects reduced
motion. Daily availability bars have keyboard/touch details; the response chart also
has a readable table.

## Data, not a visitor-driven ping

The standalone collector in `ops/status-monitor/` runs once a minute whether or not
anyone opens the page. It records checks and confirmed incidents in a persistent SQLite
database and atomically publishes a small public JSON snapshot. The website reads this
file through its own route, so a browser does not need cross-origin access to the Master.
There is no database or cron to configure on Vercel, and a site deployment cannot erase
the monitoring history. Visitors never initiate additional health checks.

The default public feed is `https://cdn.open2077.net/status/v1.json`. Override it with
the server-only `OP77_STATUS_FEED_URL` environment variable. HTTPS is required, except
for loopback HTTP in local development. Request/query parameters cannot change it.
The route bounds reads to 1 MiB / 6 seconds and validates the full schema. It revalidates
the upstream snapshot every 30 seconds and uses a short public response cache. Failure
returns 503, `Retry-After: 60`, no-store, and a generic error without internal URLs.

The client refreshes every minute while visible, on returning to the tab, or manually.
It prevents overlapping requests, aborts on unmount, retains the last known history on
failure and ages checks independently of successful refreshes. A snapshot or individual
check older than three minutes is unknown, never green.

## Checks and scope

| Service | Real check |
| --- | --- |
| Master API | `/healthz` must return `status: healthy` (includes database health) |
| Server directory | Public server-list endpoint must return an items array |
| Client CDN | Public release manifest plus 4 KiB from a declared client artifact |
| Launcher downloads | Latest release pointer plus 4 KiB from its executable |
| Server downloads | Latest release pointer plus 4 KiB from **both** Windows and Linux artifacts |
| Website & documentation | Homepage must return identifiable HTML |
| Workshop API | Public catalogue must return an items array |

Every check has a 12-second total budget, a 1 MiB metadata/HTML cap, and a fixed
allowlist. Download redirects are checked at each hop: only HTTPS on the official
CDN, approved versioned directories, no credentials/query strings, at most four hops.
Actual partial bytes and `Content-Range` are validated. This tests availability, not
full artifact integrity or sustained download speed. It transfers about 16 KiB of
artifact data per minute in total, plus metadata and the homepage.

A completed check taking more than 2.5 seconds is degraded (slow) but available.
Failures immediately affect component health and daily availability. Two failures in
consecutive minute slots open an incident; two successes confirm recovery. A monitor
gap cannot confirm either transition. Incident records survive restarts. The feed
contains no user identifiers, account data, response bodies, stack traces or secrets.

The health endpoint is **not** an end-to-end authentication test. The website probe
does not visit every documentation page. Private Workshop uploads, independently
hosted community servers and UDP gameplay connectivity are outside the stated scope.

## Honest history

- Keep 90 UTC calendar days of minute checks. Older closed incidents are pruned;
  open incidents and the original collection start survive pruning.
- Availability = successful checks / completed checks. Slow successes count as available.
- Coverage = completed checks / expected minute slots in the selected 7/30/90 days.
  Missing slots, including before installation, are unknown — not success or failure.
- Daily bars show the worst observation. Stripes mean partial coverage, gray no data.
- Latency is a five-minute average of successful complete checks, not in-game ping.
  Graphs do not connect missing buckets. Maintenance never erases failed checks.
- This is a **single vantage point**, identified on the page. A probe installed on the
  Master VPS shares its failure domain; if that machine or CDN disappears, the website
  correctly reports unknown monitoring data. An independent second region / externally
  hosted feed is the next step for independent global incident detection, not a claim
  made by this implementation.

## Run the collector

Requires Node 24+ (built-in `node:sqlite`); no npm dependencies. The production Compose
service is isolated from the Master, publishes no ports, runs as UID 1000, is read-only
except for its history and public-output mounts, and has memory/CPU limits.

```sh
# From ops/status-monitor; use persistent directories owned by UID 1000.
mkdir -p data public
docker compose -p open77-status -f compose.yml up -d
docker compose -p open77-status -f compose.yml logs --tail=30
```

For the existing VPS/CDN layout, put the collector under `/opt/open77-status` and set
`OP77_STATUS_PUBLIC_DIR=/opt/op77-cdn/status` and `OP77_STATUS_REGION=Australia-single-probe`
when invoking Compose. Serve **only** the `public` directory, never `data/history.sqlite`
or the collector/config directories. The existing CDN already serves that new path.
The JSON extension is not part of the immutable artifact alias/cache rules. Configure
`Cache-Control: no-store` for `/status/v1.json` at the origin if adding edge cache rules;
do not apply a cache-everything rule to this mutable feed. No Master/game-server restart
is necessary. Use the same environment values on subsequent Compose invocations.

For a local one-shot check against the real public services:

```sh
node ops/status-monitor/monitor.mjs --once
# Writes only artifacts/status-monitor/history.sqlite and public/v1.json.
```

Do not copy test fixtures into the live feed. Persistent data belongs on a backed-up
volume. Back up SQLite with its online backup API or stop **only the collector** before
copying the database; copying a live WAL database alone is not a consistent backup.
Stopping collection leaves the last feed present, which the page ages to unknown.

## Planned maintenance

Edit `ops/status-monitor/config/maintenance.json` (on the host: the matching file under
`/opt/open77-status/config`). This file is intentionally an operator-only input, not
an unauthenticated API. It is re-read each minute without restarting anything.

```json
[
  {
    "id": "cdn-maintenance-2026-10-01",
    "title": "CDN maintenance",
    "message": "Downloads may be briefly interrupted. Existing game sessions are unaffected.",
    "startsAt": "2026-10-01T08:00:00Z",
    "endsAt": "2026-10-01T08:15:00Z",
    "services": ["client", "launcher", "server"]
  }
]
```

Default is `[]`; no maintenance is fabricated. Invalid edits are logged and keep the
last valid notices for the current process. IDs must be unique and service IDs match
the allowlist. Public text is rendered as text, never HTML. The UI distinguishes active
and upcoming notices. Incident history is automatic observations, not staff-authored
postmortems or Discord alerts.

## Verification

```sh
npm run test:status
npm run check
npm run build
npm start -- --port 3218
npm run verify:status:browser -- http://127.0.0.1:3218
```

Unit tests cover persistence/restart, duplicate slots, retention, empty history,
incident confirmation/recovery, monitoring gaps, stale/future timestamps, malformed
feeds, maintenance validation, both server downloads, redirects/SSRF, bounds and timeout.
Browser acceptance runs in an isolated headless Chrome/Edge profile with test-only
intercepted data: desktop/mobile, periods, bar details, stale/offline/recovery, incidents
and maintenance. Screenshots go to ignored `.shots/`; no fixtures are published.

Implementation references: `src/lib/status/model.ts`, `src/app/api/status/route.ts`,
`src/components/status/`, `ops/status-monitor/`. Runtime reference:
[Node SQLite documentation](https://nodejs.org/docs/latest-v24.x/api/sqlite.html).
