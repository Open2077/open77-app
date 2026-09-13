# The Workshop: install and share resources

The [Workshop](/workshop) is where OPEN//77 creators publish what they built and
where server owners pick it up. It holds Lua resources, gamemodes, maps, interface
packs and tools. Everything in it is free. Nothing is for sale.

Featured and trending creations are on the [Workshop front page](/workshop).
Browse the full library at [/workshop/browse](/workshop/browse). Every creation has its own page, and every
creator has a public profile. The old `/community`, `/resources` and `/creators`
addresses redirect to the new ones, so existing links keep working.

Two things to know before you start:

- Each creation ships as **versioned releases**. A release is a ZIP that never
  changes after it is published. A fix always means a new version.
- Moderators review every creation and every release before it becomes public.
  An upload that passed technical checks is not public yet.

The Workshop can be switched off on a given host. If a control such as GitHub
import, hover clips or Warden installation is greyed out, that capability is not
enabled where you are, not broken.

## I run a server and want to add a resource

You install Workshop creations through **Warden**, your server's admin console.
Warden downloads the package, checks it, shows you exactly what it will change,
and applies the change only after you accept it. You never copy files by hand.

### Find it

Search the [library](/workshop) and narrow the results by category, content type
and sort order. On a phone, open the filter drawer. Open the creation's page and
read its description, gallery, installation notes and requirements. Check the
**tested builds** on the release you plan to use: that is what the creator
declares they tested, not a promise that it works on every server.

A creation labelled as a showcase has no download. It exists to show work in
progress.

### Get the direct link

Every creation page has an **Install with Warden** box. It shows the creation's
public address, for example `https://open2077.net/workshop/auto-taxi`. Press
**Copy link**. That address is all Warden needs.

You can also download the ZIP yourself from the release list, without signing
in. Do that to inspect it or to install by hand on a test server, following
[Server resources](/docs/server-resources). Never extract an unknown package onto
a live server: a wildcard load rule can start it immediately.

### Paste it into Warden

1. Open your server's Warden and go to the **Workshop** tab.
2. Paste the link into the search field and press **Search**. Warden looks the
   creation up on the OPEN//77 master and opens its releases. The short form
   `workshop:auto-taxi` works too.
3. Choose the release you want. Prereleases need an explicit choice.

Your Warden login needs the `hub.view` permission to browse and `hub.manage` to
install anything. These are Warden permissions on your server. They have nothing
to do with your website account.

### Review the plan

Warden builds an **install plan** before it touches anything. Read it. It lists:

- the files it will add, replace or leave alone, including files you edited;
- the permissions the resource asks for;
- the load rules it proposes, so the resource starts with the server;
- required and optional dependencies, and their exact versions;
- compatibility with your server build, and whether a restart is needed.

Resolve any blocker it reports. If you change local files while the plan is
open, make a fresh plan. When you accept, you accept that exact plan: Warden
cannot swap in a different release or option behind it.

### Install

Accept the plan and follow the job. It is done when Warden reports the job as
**committed**. A finished download or staging step alone is not an install.

Two phrases from the install box, explained:

- **It starts with the server.** The plan adds a load rule for the resource,
  the same `resources.load` rule in `server.jsonc` that selects your own
  resources, so it is started every time the server boots. Ordinary Lua
  resources also activate in the running server without a restart.
- **Players get the client part.** A resource has a server half and a client
  half. The server hands the client half to every player who connects, signed,
  exactly as it does for your own resources. Server scripts never leave the
  server.

In the **Resources** tab, installed packages carry a chip such as
**Workshop · v1.0.1** so you can tell them from resources you wrote yourself.
The tab summary also counts how many come from the Workshop.

### Assets that load before the game starts

Some packages declare **preload** assets: game files that must be in place
before Cyberpunk starts. These cannot be swapped live. Warden stages them
privately and marks the job **awaiting restart**. Nothing changes on the live
server until it restarts. A Warden operator with `restart.schedule` can
schedule that restart. Players must relaunch through the launcher when the
required asset set changes.

While a restart is pending, no other Workshop change can start. You can cancel
the pending staging. At boot, Warden checks that the release is still published
and that nothing was edited in between; if the check fails, it boots the
previous installation and you review a new plan.

### Update

Search the same creation, pick a newer release and create a plan. Warden
compares the new release with what is installed, including any files you
changed, and shows the differences. Review and accept as for an install.
Automatic updates do not exist: nothing changes without your review.

### Roll back

Open the job history and pick a rollback source. Warden builds a fresh reverse
plan against the server as it is now and asks you to accept it. Your current
configuration and user files are preserved as the plan describes. Rollback is
only offered while the backup from that job is still retained, and it refuses
to run if the old release has been withdrawn or a current dependency needs a
different version.

### Uninstall

In **Installed resources**, select the package and create an uninstall review.
Warden checks what else depends on it, including resources you did not select.
It shows what it removes, what it keeps, and any restart requirement. Your
configuration and user files stay behind as the review describes. Accept to run
it. If the package leaves configuration behind, you may see an inert directory
with the manifest renamed so it cannot load.

The full Warden reference, including retention of old backups, is in
[Workshop resources in Warden](/docs/community-hub-warden).

## I built something and want to share it

### What you need

- An OPEN//77 account with a **verified email**. The editor refuses to open
  otherwise.
- A [creator profile](/account/profile) with a public handle.
- A resource that already runs on a server, with its `open77.lua` manifest. The
  Workshop does not replace the manifest; it packages it. See
  [the resource runtime](/docs/resource-runtime) if you are starting from zero.

### The five-step editor

Open [My creations](/account/creations) and start a creation. The editor
autosaves. Its five steps are:

1. **Basics.** Slug, title, summary, type, category, maturity and tags. Pick the
   slug carefully: it becomes the public address that server owners paste into
   Warden. Say what the resource does and who it is for.
2. **Showcase.** Installation and usage notes, cover, screenshots, videos and the
   optional hover clip. Details below.
3. **Release.** Version number, changelog, license, installation notes, tested
   builds and required resources, then the ZIP itself or a GitHub import. Skip
   this step for a showcase without a download.
4. **Validation.** The result of the automatic package inspection. Fix anything
   it blocks on.
5. **Preview and submit.** The page exactly as visitors will see it. Tick the
   rights box, save, then submit for review. The submission is that exact draft.

### What the ZIP looks like

Put `open77.lua` at the root of the ZIP or inside one resource folder:

```text
auto-taxi-1.0.0.zip
  auto_taxi/
    open77.lua
    server/main.lua
    client/main.lua
    shared/config.example.lua
    README.md
    LICENSE
```

To ship several resources in one package, add an `open77-hub.json` file listing
each resource root. Each release installs as one unit. Every resource in a bundle
needs a distinct name that matches its folder.

Include only the resource, its license and an explicitly prepared example
configuration. Leave out server identities, accounts, database dumps, live
configuration, tokens, logs and player data. Inspection scans for these and
rejects the upload when it finds them.

Limits: 100 MiB compressed, 500 MiB when expanded, 10,000 entries in total
across the ZIP and any nested archives.

Two [MIT-licensed example packages](https://github.com/Open2077/open77-base/tree/feat/community-hub/examples/community-hub/v1)
show the single-resource and bundle layouts. They contain diagnostic Lua only.
The link points at the development branch until a release is pinned.

### Screenshots, videos and the hover clip

**Images.** JPEG, PNG or WebP, up to 10 MiB and 40 megapixels each. Animated
images are rejected. Upload an image, wait for processing, then attach it. The
first image is the cover; you can add up to eight more screenshots. Each needs
an **Image description** (read by screen readers and search engines) and can
have a caption. Images are re-encoded and stripped of metadata before they are
served.

**Videos.** Up to two YouTube or Vimeo links. Visitors see a preview and load
the player only when they press play.

**Hover clip.** One short muted clip that plays when someone rests the pointer
on your card in the library. WebM, MP4 or GIF, up to **8 seconds** and
**8 MiB**. The server re-encodes it muted at up to 640 pixels wide and drops
sound, subtitles and metadata. Upload it, wait for processing, press
**Use as hover clip**, then save the draft. Keep a cover image as well: the
clip is not used anywhere else. If the section says hover clips are not
enabled on this workshop, the host has not turned them on.

Only use media you have the right to share. Screenshots are showcase material;
they are never installed.

### Import a release from GitHub

In a release draft, open **Import a ZIP from a GitHub release**. Connect your
GitHub account when asked, then pick the repository, the release and the ZIP
asset. Check the tag, asset name, size and SHA-256 before you confirm.

The import copies that one asset into the same private inspection pipeline as
an upload. It does not follow the branch afterwards; if the upstream asset
changes, publish a new version. A repository URL in the source field is a
link, not an import. Automatic source archives generated by GitHub usually lack
built web assets and are not a substitute for a packaged release. Manage the
connection at [GitHub connections](/account/github).

Owning the repository does not settle redistribution rights for everything in
it. Check the licenses of bundled dependencies and assets.

### Review: what happens after you submit

Submission runs in two stages.

1. **Inspection**, automatic and private. The worker unpacks the ZIP, checks
   its layout and manifest, scans for secrets and malware, and re-encodes
   media. The Validation step shows the result with a code and a correction.
2. **Moderation**, by a person. Moderators check that the creation is what it
   says it is, that it contains only content you may distribute, that it has
   a stated license, and that it is not abusive or misleading. The page and
   each release are reviewed separately. A downloadable creation needs an
   approved release before its page can be approved.

Until both stages pass, nothing is visible to anyone but you and your
maintainers. The decision arrives in your [inbox](/account/notifications) and
in the creation's activity history. If the answer is no, you can fix the draft
and resubmit, or open one appeal per decision with your reasons and evidence.

### Versions, changelogs and licenses

A published release is **immutable**. Its bytes, its file list and its SHA-256
never change. To ship a fix, create a new version with a higher number. Older
versions stay downloadable so a server owner can roll back.

Each release carries a **changelog** in Markdown. Say what changed and what a
server owner must do to upgrade, especially when a config template changed.

Each release needs a **license and attribution** text. Name the license and
list any third-party notices. A free download does not by itself allow
modification or redistribution; the license does. Do not upload repacked game
files or someone else's work.

A version with a prerelease suffix, such as `1.1.0-beta.1`, is listed as a
prerelease. The page hides prereleases behind an explicit control, and Warden
only installs one when the operator chooses it on purpose.

### Working with others, archiving and deleting

From My creations, invite another verified creator by handle as a maintainer.
They get access when they accept in [Invitations](/account/invitations). To
hand a creation over, offer ownership to a maintainer; you remain owner until
they accept.

Archive a published creation when you stop maintaining it. The page and its
downloads stay up, comments close and edits freeze. You can reopen it later.

Delete an unpublished draft with **Delete unpublished draft**. A creation with
any published history cannot be deleted this way; archive it instead. Deletion
frees your draft allowance but keeps the slug reserved.

## Publish straight from my server with Warden

Warden can package a resource that already runs on your server and send it to
the Workshop as a **private draft** on your creator account. You then finish
it on the website.

1. Your Warden login needs the `hub.publish` permission.
2. In the Workshop tab, open **Creator connection**. Warden shows an approval
   code and a website link. Open the link, sign into your creator account,
   check that the code and server name match, and approve the requested scope:
   an existing creation or a new draft. Never type your account password or a
   token into Warden.
3. Select the resource names to include, a version number and any example
   configuration or documentation you want shipped. Warden lists included and
   excluded files, dependencies, warnings and blockers. Its secret scan is a
   heuristic; you still read the list.
4. Build the ZIP. You can download it and inspect it locally first.
5. Send it. **Draft ready** means the Workshop accepted a private draft. It is
   not published. Open the edit link to add media, complete the release details
   and submit for review.

The transfer keeps running if you close the browser. After a server restart or
a lost response, sign back into the same Warden account and open **Saved
creator transfers** to resume the matching upload instead of creating a second
draft.

Revoke the connection from [Warden connections](/account/connections) on the
website, or disconnect from Warden, when it should end. Revocation cancels
unsent exports; drafts already accepted stay on the website.

Warden never exports your server identity, signing keys, live configuration,
logs or player data. The host-side details are in the
[Warden export guide](https://github.com/Open2077/open77-base/blob/feat/community-hub/docs/community-hub-warden-export.md).

## Discussion, upvotes, saves, follow releases, reports

Sign in to take part. Browsing and downloading need no account.

- **Upvote** a creation once; you can take it back. Creators cannot upvote
  their own work.
- **Save** puts a creation in your private [saved list](/account/saved).
- **Follow** subscribes you to its new releases. Saving and following are
  separate. Manage them under [subscriptions](/account/subscriptions); new
  releases and replies land in your [inbox](/account/notifications).
- **Discussion** lives on the creation's page. Ask questions and report
  reproducible problems with the release, your server build, what you expected
  and sanitized logs. Creators can pin answers and mark threads resolved. You
  can edit or delete your own comments; deleting keeps the replies underneath.
  Do not post credentials or other players' private data.
- **Report** a creation, a release or a comment for abuse, malicious content
  or a licensing problem. Give evidence and the exact version. A report does
  not remove anything by itself; a moderator decides.

Unsent comments and edits stay in the tab while you move between Workshop
pages. They are lost when the tab closes. The browser warns before that.

## FAQ

**Is it free?** Yes. Browsing, downloading and installing cost nothing, and
publishing costs nothing.

**Can I sell what I make?** No. The Workshop has no prices, checkout or
payouts. Every creation is free to download. Your license still decides what
people may do with it afterwards.

**What happens if a release is revoked?** Moderators can withdraw a release,
for example after a rights complaint or a malware report. Its download stops
working and it disappears from recommendations. Servers that already installed
it keep running; nothing is deleted from them. Warden shows a **Revoked by the
Workshop** notice on the installed package, blocks new installs and updates to
that version, and refuses to roll back to it. Review the creation and decide
whether to uninstall. Creators see the decision in their inbox and can appeal.

**Why was my upload rejected?** The Validation step shows a code. In plain
words:

- `package_layout` – `open77.lua` is not at the ZIP root or inside one resource
  folder, or a bundle does not list its roots in `open77-hub.json`.
- `package_metadata` – `open77-hub.json` does not match the schema or the
  release version.
- `package_unmapped_file` – files sit outside the declared resource roots.
- `resource_manifest` – `open77.lua` has a syntax error, a bad name, a bad
  entrypoint or references a missing file.
- `resource_name_collision` – two resources share a runtime name, or a name
  does not match its folder.
- `archive_path`, `archive_collision`, `archive_link`, `archive_directory`,
  `archive_length` – the ZIP contains traversal or absolute paths, names that
  differ only by case, symbolic links, unusual entries, or inconsistent sizes.
  Rebuild it from the original files with ordinary paths.
- `archive_encrypted` – the ZIP has a password. Export it without one.
- `archive_budget` – too big when expanded, too many entries or too deep a
  nesting of archives.
- `archive_empty` or `invalid_zip` – nothing inside, or not a valid ZIP.
- `preload_archive`, `preload_capability` – a declared preload archive does not
  follow the supported mod layout, or uses content the platform does not accept.
- `package_signature` – the malware or secret scanner flagged content. Inspect
  the package locally and remove it.
- `inspection_temporarily_unavailable` – processing is down. Wait and refresh;
  do not create a second version.

For images: the file is not a JPEG, PNG or WebP, is animated, cannot be
decoded, or is over 10 MiB or 40 megapixels. The history entry shows the
reason, for example `image format`.

For the hover clip: `clip_format` means the file is not a WebM, MP4 or GIF with
one video stream; `clip_duration` means it is longer than 8 seconds;
`clip_size` means it is larger than 8 MiB; `clip_dimensions` means a frame is
too large (over 4096 pixels on a side).

**My install says "awaiting restart". Is it installed?** Not yet. The files
are staged privately. Schedule the restart in Warden; the install commits on
the next boot if every check still passes.

**Does downloading a ZIP install it?** No. Either paste the link into Warden
or install by hand on a test server first, following
[Server resources](/docs/server-resources).
