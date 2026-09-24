# Manage Workshop resources with Warden

Use Warden to install, update, remove or roll back resources from the OPEN//77 Workshop. Warden displays a plan before applying changes, including dependencies, permissions and affected files.

For resource manifests and the client/server split, see
[Server resources](server-resources.md). For assets prepared before the game
starts, see [Mods](mods.md). The website side of the Workshop, for creators and
readers, is in [the Workshop guide](https://open2077.net/docs/community-hub).

## Before you start

Open Warden and select the **Workshop** tab (subtitle "Community resources").

Two settings in `server.jsonc` decide what the tab can do:

- **Browsing** uses the master your server is registered with (`masterServer`).
  Every listed OPEN//77 server already has one, so search works out of the box.
  **Workshop not connected** means `masterServer` is missing or invalid.
- **Installing** needs the Workshop file gateway. Add it once and restart:

  ```jsonc
  "warden": {
    "enabled": true,
    "hubFileGatewayOrigin": "https://files.open2077.net"
  }
  ```

  Without it you can browse but every **Create installation plan** answers
  that installation is unavailable. Installation and maintenance also wait
  until startup recovery has finished after each restart.

A Warden login controls this server only; it is separate from your website
creator account. Being a creator on the website grants no rights here.

| Permission | Allows |
| --- | --- |
| `hub.view` | Browse the Workshop and read release information. |
| `hub.manage` | Create and apply install, update, uninstall, rollback and storage cleanup plans; see installed packages, history and restart staging. |
| `hub.publish` | Connect a creator account and export resources from this server into a private creator draft. |
| `restart.schedule` | Schedule the server restart that staged preload changes need. |

Do not share Warden credentials, and never put creator tokens inside a
resource archive.

## Install a creation

1. On the website, open the creation's page and press **Copy link** in the
   **Install with Warden** box. The link looks like
   `https://open2077.net/workshop/auto-taxi`; the short form
   `workshop:auto-taxi` also works.
2. In Warden's **Workshop** tab, paste the link into the search field and
   press **Search**. Warden looks the creation up on the OPEN//77 master,
   shows it as a single tile and opens its releases. If the address now points
   at a different creation, Warden says so; open the page on the website to
   get the current link.
3. Pick the release you want. Each release shows its version, state, the
   resources it contains, **Tested on** (the builds the creator declared) and
   its declared dependencies.
4. Press **Create installation plan**. If the release does not list your
   server build, Warden stops and offers **Acknowledge untested build and
   retry**; see "Plan options" below.
5. Read the plan (see "What the plan shows"). Fix any blocker. If you change
   local files or configuration while the plan is open, create a fresh one.
6. Tick the consent box and press **Install reviewed plan**. The
   **Installation job** panel follows the job; **Cancel installation** stays
   available until it finishes.
7. The install is done when the job reports **committed**. A finished download
   or private staging is not an install.

Ordinary Lua changes activate in the running server. The package is downloaded,
inspected and prepared before the runtime switches over. The job keeps running
on the server if you leave the page; the panel reappears when you return to
the Workshop tab in the same browser session.

You can also search by term instead of pasting a link: type a word, pick a
category chip (**All**, **Scripts**, **Gamemodes**, **Maps**, **UI**,
**Tools**) and a **Sort** (**Trending**, **Newest**, **Recently updated**,
**Most upvoted**, **Most downloaded**, **Featured**). Results are tiles with
the cover image (or the hover clip's poster), category and maturity chips,
creator, upvotes, downloads and update date. Press **Releases & install** on a
tile to open its releases. A showcase tile says **Showcase · nothing to
install**. The small `workshop:<slug>` label on every tile is the short link
you can paste later.

In the **Resources** tab, a package installed this way carries a **Workshop ·
v1.0.1** chip (with its own version), and the summary counts how many
resources come from the Workshop. Manage them under **Installed from the
Workshop**, not by editing their files.

## Update

1. Search the same creation and pick the newer release.
2. Press **Create installation plan**. Warden compares the release with what
   is installed, including files you changed locally, and lists every
   difference.
3. Review and install as for a first install.

Automatic updates do not exist: nothing changes without your review.

## Roll back

1. In **Installed from the Workshop**, unfold **History, restart staging and
   storage**.
2. Under **Installation history**, press **Review rollback** next to the job
   you want to return to. The button only appears while that job's backup is
   still retained.
3. Warden builds a fresh reverse plan against the server as it is now. Review
   it, tick the consent box and press **Apply reviewed rollback** (or **Stage
   reviewed rollback for restart** when preload assets are involved).

Rollback keeps current configuration and user files as its review describes;
it is not a blind restore of every historical byte. It must still satisfy
current release availability, compatibility and dependencies. It refuses to
run if the old release is unavailable or revoked, the original code can no
longer be recovered, or a current dependent needs a different version. The
original history and backup stay unchanged.

## Uninstall

1. In **Installed from the Workshop**, tick the packages under **Pick**.
2. Press **Review uninstall**. Warden checks both package dependencies and
   runtime resource dependencies, including dependents you did not select.
3. Review the removed resources, preserved paths, load rules and any restart
   requirement, tick the consent box and press **Apply reviewed uninstall**.

Your configuration and user files survive removal, which can leave an inert
resource directory behind. A modified manifest is kept under an uninstalled
filename so it can no longer load. Warden never takes over another creation's
resource name and never silently removes a dependency that came from outside.
An uninstall is recorded as its own job.

## Installed from the Workshop

This table lists every package Warden installed: **Pick**, **Resources**,
**Version**, **Workshop status** and **Installed** date. **Refresh** rereads
it and rechecks each release with the Workshop. The status chip means:

- **published**: the Workshop still lists this exact release;
- **revoked**: the Workshop withdrew it. Installs and updates of this release
  are blocked; your installed copy stays and an alert asks you to decide
  whether to uninstall;
- **not listed**: the release is no longer public, which does not confirm a
  revocation;
- **status unavailable**: the Workshop could not be reached; press
  **Refresh** to retry.

The folded section **History, restart staging and storage** holds
**Installation history** (with **Review rollback**), **Restart staging** and
**Private storage retention**.

## Export your resources to the Workshop

With `hub.publish`, the Workshop tab also shows three creator sections.

1. **Creator account.** Enter a label and press **Connect creator account**.
   Warden shows a code and an **Open creator approval** button. Approve the
   requested scope on the website; only the Warden session that started the
   connection can finish it. **Check authorization** confirms a saved
   connection; **Disconnect creator** ends it.
2. **Export your resources.** Tick the resources to share, enter a **Release
   version** and press **Preview export**. Read the included and excluded
   files, findings and warnings, tick the consent box and press **Create
   reviewed ZIP**. When it is ready, **Download reviewed ZIP** lets you inspect
   it, and **Send ZIP to creator draft** sends it to your account as a private
   draft after you fill in the license, changelog and release details and tick
   the rights box. **Private draft accepted for editing** means the draft
   exists on the website and is not published; **Open creator draft** takes
   you there.
3. **Saved creator transfers.** Transfers survive a disconnect or a Warden
   restart. Press **Check or resume reviewed transfer** to continue the same
   upload instead of creating a second draft; **Discard local transfer**
   removes it.

Warden never exports your server identity, signing keys, live configuration,
logs or player data. The secret scan is a heuristic; read the file list. The
full host-side description is in
[the Warden export guide](https://github.com/Open2077/open77-base/blob/feat/community-hub/docs/community-hub-warden-export.md).

## Details: plan options

Every release has a **Plan options** fold above **Create installation plan**:

- **Allow prerelease versions**: needed to install a release with a prerelease
  suffix such as `1.1.0-beta.1`.
- **Optional dependency project IDs**: optional dependencies you want
  installed as well.
- **Manually satisfied external resource names**: resources the package
  requires that you already provide yourself.
- **Release IDs acknowledged as untested on this build**: releases you accept
  although the creator did not list your server build. **Acknowledge untested
  build and retry** fills this in for you. It is your decision, not a
  compatibility guarantee; manifest and dependency rules still apply.

The fold also lists the selected release ID and its required and optional
dependencies with their version constraints.

## Details: what the plan shows

A plan is an immutable review that expires after a short time. It shows:

- the **plan hash**. When you accept, you accept that exact hash; Warden
  cannot swap in another release or other options behind it;
- **blockers**, which must be resolved before the install button appears;
- whether a **server restart** or a **game restart** is required;
- **Stop order** and **Start order** of resources;
- **Proposed load rules**, the `resources.load` rules the plan adds;
- **Preload assets** and **Operational notes**;
- for each package, **Requested permissions** and, per resource, the file
  entries: the action for every path, with its reason, size and SHA-256.
  Owned code, untracked files and files you modified each get their own
  action. Read them rather than assuming every local edit is safe to
  replace.

**Discard plan** throws the review away. Maintenance plans (uninstall,
rollback) show the same fields plus removed runtime resources, restored
packages and preserved directories.

## Details: job states

The job panel polls the server and ends in one of four states:

- `committed`: the change is live and the installed inventory revision
  advanced;
- `cancelled`: you cancelled it and recovery has finished;
- `failed`: the message names the cause; check the server's recovery state
  before retrying;
- `awaiting_restart`: files are staged privately for a restart (see below).

While `cancel_requested` shows, Warden is waiting for the running step or its
recovery to finish. A job that was interrupted is recovered from the private
local journal at the next startup. Do not delete private Workshop state or
signing identities to force recovery past an error; keep the artifacts and
resolve the reported conflict.

## Details: configuration and local files

Package authors can declare configuration templates in `open77-hub.json`.
Warden writes them to their destinations and preserves your existing local
values as the plan describes. Keep your own backups of important server data.

## Details: preload changes and restarts

A resource can declare `preload_mod` assets that must be prepared before
Cyberpunk starts. Any install, update, rollback or uninstall that touches such
assets is staged instead of applied: the button reads **Stage reviewed plan
for restart** and the job ends in `awaiting_restart`. Live files,
configuration and inventory stay unchanged while the reviewed files are staged
privately.

Under **History, restart staging and storage › Restart staging**, the pending
job is listed with its remaining preload assets. **Cancel staged restart**
drops it. **Schedule server restart** (needs `restart.schedule`) stops the
server after 30 seconds; your service manager must relaunch it. Players must
relaunch through the launcher when the required asset set changes. Staging
survives logout and page reload, and while a job is pending no other Workshop
change can start.

At startup, before preload resolution, Warden re-checks master authority,
release metadata, dependencies, the reviewed options, server and game versions,
inventory, configuration, manifests and the captured resource files. If the
authority is offline, the content was revoked or something was edited in
between, the pending job is cancelled and the previous installation boots. Fix
the cause and review a new plan; changed conditions never widen the original
consent.

After the staged paths are applied, preload resolution and the required Lua
startup must both succeed before the inventory commits. A startup failure
restores the saved state. Server-side tests cover this flow, but they do not
prove that a given archive loads in the game. Validate your own assets through
the launcher and the game before making them a requirement for players.

## Details: private storage retention

Retention acts on the private records of completed Workshop jobs, never on live
resource directories. Under **History, restart staging and storage › Private
storage retention**, press **Review storage cleanup** to see what stays
protected, which duplicate payloads can be removed and which jobs can be
compacted. Tick the consent box and press **Apply reviewed cleanup**.
Compacting a job permanently expires its rollback files; its history receipt
remains, with rollback no longer available.

The default policy keeps at least 30 days of completed jobs, the newest three
committed installs per creation, the providers of currently installed
releases, and the source jobs that retained maintenance history needs. It also
protects active and recovery jobs, malformed or linked data, changed or
unknown files, unique configuration, user or modified-file backups, and
differing root configuration snapshots. These safeguards can prevent
reclaiming all the space you asked for.

Inspection is bounded at 1,000 live job records, 10,000 files and 500 MiB per
job snapshot, and 10,000 compact history receipts. Oversized snapshots are
protected. Review retention before reaching the job limit; the limit never
permits deleting unresolved recovery data. Interrupted compaction resumes from
its receipt. Retention is not a substitute for your backup policy.
