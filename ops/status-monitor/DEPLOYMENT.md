# Activation — 2026-09-23

Collector enabled with operator approval on the existing Master VPS. No Master or
game-server process was restarted. The website is delivered through the normal
`main`-branch deployment, independently of this already-running collector.

- Code and Compose project: `/opt/open77-status`, project `open77-status`.
- Container: `open77-status-status-monitor-1`, UID 1000, 256 MiB / 0.5 CPU limits.
- Persistent database: `/opt/open77-status/data/history.sqlite` (WAL enabled).
- Public snapshot: `/opt/op77-cdn/status/v1.json`.
- Public URL: `https://cdn.open2077.net/status/v1.json`.
- Region label: `Australia-single-probe`.
- First measurements: **2026-09-23 10:42 UTC**. No earlier data was fabricated.
- Existing CDN file routing serves the snapshot; **no Caddy change or reload** was needed.
- Public snapshot verified HTTP 200, `application/json`, Cloudflare `DYNAMIC`.
- Five consecutive collection cycles verified; all seven services operational.
- Production feed also verified through the local website `/api/status` route.
- Master start time remained `2026-09-21T17:36:16.482220956Z`.

Use the same mount environment on all future Compose operations:

```sh
cd /opt/open77-status
sudo env OP77_STATUS_PUBLIC_DIR=/opt/op77-cdn/status \
  OP77_STATUS_REGION=Australia-single-probe \
  docker compose -p open77-status -f compose.yml up -d
sudo docker logs --tail=30 open77-status-status-monitor-1
```

To roll back, stop only `open77-status-status-monitor-1`. Keep the database and
published snapshot: after three minutes the page labels them stale/unknown.
Do not remove or recreate the Master/CDN/game-server containers. Removing this
collector does not revert the earlier, unrelated CDN download-cache fixes.

The collector deliberately shares the Master VPS for this initial deployment.
This catches individual service failures, not a whole-host failure independently.
The separately hosted website can report missing/stale observations, but an independent
monitoring location and feed host would be required to confirm host-wide outages.
