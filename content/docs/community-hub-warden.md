# Manage Workshop resources with Warden

The OPEN//77 Workshop is the free library of community resources. Warden, your
server's admin console, connects it to your server: it fetches a creation, shows
you a plan, and installs, updates, uninstalls or rolls back only after you accept
that plan. Read every plan before accepting it, especially the permissions, the
dependencies and the files you have customized.

Availability depends on the installed server build and the services configured
on your host. For resource manifests and the client/server split, see
[Server resources](server-resources.md). For assets prepared before the game
starts, see [Mods](mods.md). The website side of the Workshop, for creators and
readers, is in [the Workshop guide](https://open2077.net/docs/community-hub).

## Access and readiness

Open Warden and select the **Workshop** tab. The server needs its configured
Workshop catalog and private file gateway, and startup recovery must have
finished, before installation is available. A Warden login controls this server
only; it is separate from your website creator account.

| Permission | Allows |
| --- | --- |
| `hub.view` | Browse the Workshop and read release information. |
| `hub.manage` | Review and apply installs, updates, uninstalls, rollbacks and retention; see installed packages and pending restarts. |
| `hub.publish` | Publish a resource from this server into a creator draft, after a separately approved creator connection. |
| `restart.schedule` | Schedule the server restart that staged preload changes need. |

Being a creator on the website grants no installation rights here. Do not share
Warden credentials, and never put creator tokens inside a resource archive.

## Find a creation

The search field accepts two things:

- a search term, matched against the public Workshop directory;
- a pasted **Workshop link**, such as `https://open2077.net/workshop/auto-taxi`.
  Every creation page on the website has an **Install with Warden** box with a
  **Copy link** button for exactly this. The short form `workshop:auto-taxi`
  also works.

Press **Search**. Warden looks the creation up on the OPEN//77 master and shows
it as a single tile; press **Releases & install** on the tile to list its
releases. Search results appear as tiles with the creation's cover image (or
its hover clip poster), category, maturity, creator, upvotes and downloads.
The category chips and the sort menu narrow a search; a tile's
`workshop:<name>` label is the short link you can paste later. If the address no longer points at the same creation,
Warden says so; open the page on the website to get the current link.

## Install or update

1. Select the release you intend to use. Prereleases need an explicit choice.
2. Create an installation plan. For an update, select a newer release of the
   same installed creation; Warden compares it with what is installed, including
   the files you changed locally.
3. Review the plan: required and optional creations, external resources,
   compatibility, permissions, the proposed load rules, stop/start order and any
   restart requirement.
4. Read the complete list of file actions, preserved files and conflicts. Fix
   any blocker. If you change local files or configuration while the plan is
   open, create a fresh one.
5. Accept the displayed plan hash and follow the job.

If the release does not list your server build among its tested builds, plan
creation stops and offers **Acknowledge untested build and retry**: it records
the release ID under **Plan options › Release IDs acknowledged as untested on
this build** and retries. Acknowledging that a release was not tested on your
exact server build is your decision; it is not a compatibility guarantee, and
manifest and dependency requirements still apply. A reviewed plan cannot quietly expand to another
release or other options when you press Apply.

Ordinary Lua changes activate in the running server. The package is downloaded,
inspected and prepared before the runtime switches over, and conflicting
resource controls are fenced while it happens. The job is successful only when
it reports `committed`; a finished download or private staging is not an
install. A cancellation can stay pending while recovery completes. Keep the job
evidence until its final state is clear.

In the **Resources** tab, a package installed this way carries a **Workshop ·
v1.0.1** chip (with its own version), and the tab summary counts how many
resources come from the Workshop. Manage them under **Workshop › Installed
from the Workshop**, not by editing their files.

## Installed from the Workshop

The table under the search results lists every package Warden installed, with
its resources, version, install date and a **Workshop status** chip:

- **published**: the Workshop still lists this exact release;
- **revoked**: the Workshop withdrew it; installs and updates are blocked, your
  installed copy stays, and the table shows an alert so you can decide whether
  to uninstall;
- **not listed**: the release is no longer public, which does not confirm a
  revocation;
- **status unavailable**: the Workshop could not be reached to confirm; press
  **Refresh** to retry.

Tick packages and press **Review uninstall** to create a maintenance plan.
Installation history (with rollback reviews), restart staging and private
storage retention sit under **History, restart staging and storage**, folded
away until you need them.

## Installed status and revoked releases

Refreshing the installed list checks each package against its current Workshop
status:

- **Revoked by the Workshop**: the release was withdrawn. New installs and
  updates to it are blocked. The installed copy keeps running and nothing is
  removed; review the creation and decide whether to uninstall.
- **Unknown**: the release is no longer listed publicly. This does not confirm
  a revocation.
- **Unavailable**: the status could not be checked. Retry when the catalog is
  reachable again.

## Configuration and local files

Package authors can declare configuration templates in `open77-hub.json`.
Warden writes them to their destinations and preserves your existing local
values as the plan describes. Owned code, untracked files and files you
modified each get their own action in the plan: read those actions rather than
assuming every local edit is safe to replace.

Your configuration and user files survive removal, which can leave an inert
resource directory behind. A modified manifest may be kept under an uninstalled
filename so it can no longer load. Warden never takes over another creation's
resource name and never silently removes a dependency that came from outside.
Keep your own backups of important server data.

## Uninstall

In **Installed resources**, select one or more packages and create an
uninstall review. Warden checks both package dependencies and runtime resource
dependencies, including dependents you did not select. Review the removed
resources, preserved paths, load rules and any restart requirement, then accept
the new hash. An uninstall is recorded as its own job.

## Roll back a committed change

Open the retained history and choose a rollback source. Warden builds a fresh
reverse plan against the server as it is now. Review it and accept its hash.
The original history and backup stay unchanged.

Rollback keeps current configuration and user files as its review describes;
it is not a blind restore of every historical byte. It must still satisfy
current release availability, compatibility and dependencies. It refuses to
run if the old release is unavailable or revoked, the original code can no
longer be recovered, or a current dependent needs a different version.

Automatic recovery after an interrupted operation is different: it uses the
private local journal to restore the previous installation. Do not delete
private Workshop state or signing identities to force recovery past an error.
Keep the artifacts and resolve the reported conflict.

## Preload changes and restarts

A resource can declare `preload_mod` assets that must be prepared before
Cyberpunk starts. Any install, update, rollback or uninstall that touches such
assets goes through the restart review. Accepting it puts the job in
`awaiting_restart`: live files, configuration and inventory stay unchanged
while the reviewed files are staged privately.

**Pending restart installations** survives logout and page reload. A current
manager can cancel unapplied staging. While a job is pending, no other Workshop
change can start. An operator with `restart.schedule` can schedule the restart;
the service manager must relaunch the stopped process. Players must relaunch
through the launcher when the required asset set changes.

At startup, before preload resolution, Warden re-checks master authority,
release metadata, dependencies, the reviewed options, server and game versions,
inventory, configuration, manifests and the captured resource files. If the
authority is offline, the content was revoked or something was edited in
between, the pending intent is cancelled and the previous installation boots.
Fix the cause and review a new plan; changed conditions never widen the
original consent.

After the staged paths are applied, preload resolution and the required Lua
startup must both succeed before the inventory commits. A startup failure
restores the saved state after disposing the failed runtime. An interrupted
application is handled by journal recovery, which keeps evidence rather than
overwriting operator changes when the situation is ambiguous.

Server-side tests cover this flow, including real Lua startup and inert archive
classification. They do not prove that a given archive loads in the game.
Validate your own assets through the launcher and the game before making them
a requirement for players.

## Review retained storage

Retention acts on the private records of completed Workshop jobs, never on live
resource directories. Create a retention review to see what stays protected,
which duplicate payloads can be removed and which eligible jobs can be
compacted. Accepting compaction permanently expires that job's rollback files;
its history receipt remains, with rollback no longer available.

The default policy protects at least 30 days of completed jobs, the newest
three committed installs per affected creation, the providers of currently
installed releases, and the source jobs that retained maintenance history needs.
It also protects active and recovery jobs, malformed or linked data, changed or
unknown files, unique configuration, user or modified-file backups, and
differing root configuration snapshots. These safeguards can prevent reclaiming
all the space you asked for.

Inspection is bounded at 1,000 live job records, 10,000 files and 500 MiB per
job snapshot, and 10,000 compact history receipts. Oversized snapshots are
protected. Review retention before reaching the job limit; the limit never
permits deleting unresolved recovery data. Interrupted compaction resumes from
its receipt and preserves unexpected edits. Retention is not a substitute for
your backup policy.
