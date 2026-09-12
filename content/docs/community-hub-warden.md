# Manage Hub resources with Warden

The free OPEN//77 Hub distributes community resources for server owners. Warden
connects the catalog to your server's selected Lua resources, installed versions
and local files. Review every change before applying it, especially permissions,
dependencies and files you have customized.

This guide describes the Hub release candidate. Availability depends on the
installed server build and configured services; it is not a deployment announcement.
For resource manifests and the client/server split, see
[Server resources](server-resources.md). For assets prepared before the game starts,
see [Mods](mods.md).

## Access and readiness

Open Warden and select **Hub**. The server needs its configured Hub catalog and
private file gateway, and startup recovery must complete before installation is
available. A Warden login controls this server; it is separate from your website
creator account.

| Permission | Allows |
| --- | --- |
| `hub.view` | Browse the catalog and inspect release information. |
| `hub.manage` | Review and apply installations, updates, maintenance and retention; inspect installed inventory and pending restarts. |
| `hub.publish` | Use the host publishing workflow with a separately authorized creator connection. |
| `restart.schedule` | Schedule the server process restart needed for staged preload changes. |

Creator publication does not grant installation rights. Do not share Warden
credentials or add creator tokens to resource archives.

The installed list checks current Hub release status when refreshed. A **revoked**
warning blocks no local reading and does not remove or stop the installed copy;
review the project and decide whether to uninstall it. New installs and updates
to that release remain blocked. **Unknown** means the release is no longer listed;
**unavailable** means its status could not be checked. Neither confirms revocation
or continued publication. Retry after connectivity or catalog capacity returns.

## Install or update

1. Find a project and open its releases. Select the release you intend to use.
2. Create an installation plan. For an update, select a newer release of the same
   installed project; Warden compares it with the current ownership and local files.
3. Review required and optional projects, external resources, compatibility,
   permissions, proposed load rules, stop/start order and restart requirements.
4. Inspect the complete file actions, preserved files and conflicts. Resolve
   blockers and create a fresh review after changing local files or configuration.
5. Explicitly accept the displayed plan hash, then follow the job's progress.

An acknowledgement that a release was not tested on your exact server build is
an operator decision, not a compatibility guarantee. Dependency and manifest
requirements still apply. A reviewed plan cannot silently expand to a different
release or new options when you press Apply.

Ordinary Lua changes can activate in the running server. Package transfer,
inspection and preparation happen before the runtime switch. Conflicting resource
controls are fenced during activation. A job is successful when it reports
`committed`; a download or completed private staging alone is not installation.
Cancellation can remain pending while recovery completes. Keep the job evidence
until its terminal state is clear.

## Configuration and local files

Package authors can declare configuration templates in `open77-hub.json`. Warden
materializes their destinations and preserves existing local configuration values
as described by the plan. Ordinary owned code, untracked files and modified files
have distinct actions: read those actions rather than assuming every local edit
is safe to replace.

User files and configuration that must remain after removal can leave an inert
resource directory. A modified manifest may be preserved under an uninstalled
filename so it cannot continue loading. Warden does not take ownership of another
project's resource name or silently remove an outside dependency. Keep independent
backups of important server data.

## Uninstall

Use **Installed resources** to select the project or projects, then create an
uninstall review. Warden checks both installed project dependencies and runtime
resource dependencies, including affected dependents outside your selection.
Review removed resources, preserved paths, load rules and any restart requirement.
Accept the new hash to run the operation. An uninstall is its own recorded job.

## Roll back a committed change

Open retained history and choose an available rollback source. Warden builds a
fresh inverse plan against the server as it exists now. Review it and accept its
new hash. The original history and backup stay unchanged.

Rollback preserves current configuration and user files according to its review;
it is not a blind restoration of every historical byte. A requested rollback must
still satisfy current release availability, compatibility and dependencies. It
fails closed if the old release is unavailable or revoked, original code is no
longer recoverable, or a current dependent requires a different version.

Automatic recovery from an interrupted operation is different: it uses private
local journal data to restore the previous installation. Do not delete private
Hub state or signing identities to force recovery past an error. Preserve the
artifacts and resolve the reported conflict.

## Preload changes and restarts

A selected resource can declare `preload_mod` assets that must be prepared before
Cyberpunk starts. Install, update, rollback or uninstall involving this set uses
the restart review. Accepting it creates `awaiting_restart`: live files,
configuration and inventory remain unchanged while the reviewed files are staged
privately.

**Pending restart installations** survives Warden logout and page reload. A current
manager can cancel unapplied staging. A pending job blocks another Hub mutation
until applied or cancelled. An operator with `restart.schedule` can schedule the
existing server restart; the service manager must relaunch the stopped process.
Players must restart through the launcher when the required asset set changes.

Before preload resolution at startup, Warden checks current master authority,
release metadata, dependencies, reviewed options, server/game versions, inventory,
configuration, manifests and captured resource files. Offline authority, revoked
content or intervening edits cancels unapplied intent and boots the previous
installation. Fix the cause and review a new plan. Expired or changed conditions
do not broaden the original consent.

After applying the staged paths, preload resolution and required Lua startup must
succeed before inventory commits. Startup failure restores saved state after
disposing the failed runtime. An interrupted application is handled by local
journal recovery. Ambiguous recovery preserves evidence instead of overwriting
operator changes.

Server-side tests cover this flow, including real Lua startup and inert archive
classification. Those tests do not establish that a particular archive loads in
the game. Validate your own authored assets through the launcher and game before
making them a requirement for players.

## Review retained storage

Retention acts on private completed Hub jobs, never live resource directories.
Create a retention review to see what remains protected, which duplicate payloads
can be removed and which eligible jobs can be compacted. Accepting compaction
permanently expires that job's rollback files; its history receipt remains, with
rollback unavailable.

The default policy protects at least 30 days of completed jobs, the newest three
committed installs per affected project, providers of currently installed exact
releases and source jobs needed by retained maintenance history. It also protects
active/recovery jobs, malformed or linked data, changed or unknown files, unique
configuration/user/modified backup content and differing root configuration
snapshots. These safeguards can prevent reclaiming all requested space.

Inspection is bounded at 1,000 live job records, 10,000 files and 500 MiB per job
snapshot, and 10,000 compact history receipts. Oversized snapshots are protected.
Review retention before reaching the job limit; the limit does not permit deletion
of unresolved recovery data. Interrupted compaction resumes from its receipt and
preserves unexpected edits. Retention is not a substitute for your backup policy.
