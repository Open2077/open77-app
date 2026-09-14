# The Workshop: install and share resources

The [Workshop](/workshop) is where OPEN//77 creators publish what they built and
where server owners pick it up. It holds Lua resources, gamemodes, maps, interface
packs and tools. Everything in it is free. Nothing is for sale.

The [front page](/workshop) shows featured, trending, new and recently updated
creations. The [full library](/workshop/browse) has the filters. Every creation
has its own page, and every creator has a public profile. The old `/community`,
`/resources` and `/creators` addresses redirect to the new ones, so existing
links keep working.

Three things to know before you start:

- A creation ships as **versioned releases**. A release is a ZIP that never
  changes after it is published. A fix always means a new version.
- Moderators review every creation and every release before it becomes public.
  An upload that passed the automatic checks is not public yet.
- You install through **Warden**, your server's admin console. It downloads the
  package, checks it, shows you exactly what it will change, and changes
  nothing until you accept. You never copy files by hand.

If a control is greyed out, for example the hover clip section or the Workshop
tab in Warden, that feature is not enabled where you are. It is not broken.

## Install a creation on your server

1. Find the creation in the [library](/workshop/browse). Narrow the list by
   category, by **Downloadable** or **Showcases**, by source code link and by
   tags, and change the sort order. On a phone, press **Filters**.
2. Open its page. Read **About**, **Installation** and **License**, then look at
   **Recent releases**. Each release has a **Compatibility** section listing
   the OPEN//77 server builds the creator says they tested. That is a
   declaration, not a promise.
3. In the **Install with Warden** box, press **Copy link**. The link looks like
   `https://open2077.net/workshop/auto-taxi`. That is all Warden needs.
4. Open your server's Warden and go to the **Workshop** tab. The first time,
   allow installs by adding the Workshop file gateway to `server.jsonc` and
   restarting the server:

   ```jsonc
   "warden": { "enabled": true, "hubFileGatewayOrigin": "https://files.open2077.net" }
   ```

   Browsing works without it; installing does not.
5. Paste the link into the search field and press **Search**. Warden looks the
   creation up on the OPEN//77 master, shows it as a tile and opens its
   releases. The short form `workshop:auto-taxi` works too. You can also type a
   search term instead and use the category chips and the **Sort** menu.
6. Under the release you want, press **Create installation plan**.
7. Read the plan: the files it adds or replaces, the permissions the resource
   asks for, the load rules it proposes, and whether a restart is needed.
   Resolve any blocker it reports.
8. Tick the consent box and press **Install reviewed plan**. Follow the
   **Installation job** panel. The install is done when the job reports
   **committed**.

Ordinary Lua resources start in the running server without a restart. The plan
adds a load rule for the resource, so it also starts every time the server
boots. The server hands the client half of the resource to every player who
connects, signed, exactly as it does for your own resources. Server scripts
never leave the server.

In the **Resources** tab, an installed package carries a chip such as
**Workshop · v1.0.1**, and the summary counts how many resources come from the
Workshop.

A creation labelled **Showcase** has nothing to install. It exists to show work.

You can also download the ZIP yourself from the release list, without signing
in, to inspect it or to install by hand on a test server following
[Server resources](/docs/server-resources). Downloading does not install
anything. Never extract an unknown package onto a live server: a wildcard load
rule can start it immediately.

## Update, roll back or uninstall

All three happen in Warden's **Workshop** tab. Every one of them shows you a
plan first and applies it only after you tick the consent box.

**Update.** Search the same creation, pick the newer release and press
**Create installation plan**. Warden compares the new release with what is
installed, including files you changed locally, and shows the differences.
Review and install as for a first install. Automatic updates do not exist.

**Roll back.** Open **Installed from the Workshop**, unfold **History, restart
staging and storage** and press **Review rollback** next to an earlier job.
Warden builds a fresh reverse plan against the server as it is now. Your
current configuration and user files are kept as the plan describes. Rollback
is only offered while the backup from that job is still retained, and it
refuses to run if the old release was revoked or a current dependency needs a
different version.

**Uninstall.** In **Installed from the Workshop**, tick the package under
**Pick** and press **Review uninstall**. Warden checks what else depends on
it, including resources you did not select, and shows what it removes and
what it keeps. Your configuration and user files stay behind. If they do, an
inert directory may remain with the manifest renamed so it cannot load.

The full Warden reference, including plan fields, job states, restart
staging and backup retention, is in
[Manage Workshop resources with Warden](/docs/community-hub-warden).

## Publish a creation

### What you need

- An OPEN//77 account with a **verified email**. The editor refuses to open
  otherwise.
- A [creator profile](/account/profile) with a public handle.
- A resource that already runs on a server, with its `open77.lua` manifest. The
  Workshop does not replace the manifest; it packages it. See
  [the resource runtime](/docs/resource-runtime) if you are starting from zero.

### The five steps

Open [My creations](/account/creations) and start a creation. The editor
autosaves your text in the tab until you save the draft. Its five steps are:

1. **Basics.** Slug, title, summary, type (**Resource** or **Showcase**),
   category, maturity and tags. Pick the slug carefully: it becomes the public
   address that server owners paste into Warden.
2. **Showcase.** Description, installation notes, cover, screenshots, videos
   and the optional hover clip. See "Screenshots, videos and the hover clip".
3. **Release.** Version number, changelog, license, installation notes, tested
   builds and required resources, then the ZIP itself or a GitHub import. A
   showcase skips this step.
4. **Validation.** The result of the automatic package inspection. Fix anything
   it blocks on. See "Why was my upload rejected?" below.
5. **Preview and submit.** The page as visitors will see it. Tick the rights
   box, save, then press **Submit for review**.

### Screenshots, videos and the hover clip

**Images.** JPEG, PNG or WebP, up to 10 MiB and 40 megapixels each. Animated
images are rejected. Upload an image, wait for processing, press **Attach to
draft**, then save. The first image is the cover; you can add up to eight more
screenshots. Each needs an **Image description** (read by screen readers and
search engines) and can have a caption. Images are re-encoded and stripped of
metadata before they are served.

**Videos.** Up to two YouTube or Vimeo links. Visitors see a preview and load
the player only when they press play.

**Hover clip.** One short muted clip that plays when someone rests the pointer
on your tile in the library. WebM, MP4 or GIF, up to **8 seconds** and
**8 MiB**. The server re-encodes it muted at up to 640 pixels wide and drops
sound, subtitles and metadata. Upload it, wait for processing, press
**Use as hover clip**, then save the draft. Keep a cover image as well: the
clip is not used anywhere else.

Only use media you have the right to share. Screenshots are showcase material;
they are never installed.

### Versions, changelogs and licenses

A published release is **immutable**: its bytes, its file list and its SHA-256
never change. To ship a fix, create a new version with a higher number. Older
versions stay downloadable so a server owner can roll back.

Each release carries a **changelog** in Markdown. Say what changed and what a
server owner must do to upgrade, especially when a config template changed.

Each release needs a **license and attribution** text. Name the license and
list any third-party notices. A free download does not by itself allow
modification or redistribution; the license does. Do not upload repacked game
files or someone else's work.

A version with a prerelease suffix, such as `1.1.0-beta.1`, is listed as a
prerelease. The page hides prereleases behind **Show prerelease versions**,
and Warden only installs one when the operator ticks **Allow prerelease
versions** on purpose.

### Import a release from GitHub

In a release draft, open **Import a ZIP from a GitHub release**. Connect your
GitHub account when asked, then pick the repository, the release and the ZIP
asset. Check the tag, asset name, size and SHA-256 before you confirm. Only
uploaded ZIP assets up to 100 MiB with a GitHub SHA-256 digest can be
imported; source archives generated by GitHub cannot.

The import copies that one asset into the same private inspection pipeline as
an upload. It does not follow the branch afterwards; if the upstream asset
changes, publish a new version. A repository URL in the source field is a
link, not an import. Manage the connection at
[GitHub connections](/account/github).

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
   each release are reviewed separately. A downloadable creation needs a
   validated release before it can be submitted.

Until both stages pass, nothing is visible to anyone but you and your
maintainers. The decision arrives in your [inbox](/account/notifications) and
in the creation's activity history. If the answer is no, you can fix the draft
and resubmit, or open one appeal per decision with your reasons and evidence.

### Working with others, archiving and deleting

From My creations, invite another verified creator by handle as a maintainer.
They get access when they accept in [Invitations](/account/invitations). To
hand a creation over, offer ownership to a maintainer; you remain owner until
they accept.

Archive a published creation when you stop maintaining it. The page and its
downloads stay up, comments close and edits freeze. You can reopen it later.

Delete an unpublished draft with **Delete unpublished draft**. A creation with
any published history cannot be deleted this way; archive it instead. Deletion
frees your draft allowance. There is no undo.

## Export from your server with Warden

Warden can package a resource that already runs on your server and send it to
the Workshop as a **private draft** on your creator account. You then finish
it on the website. Your Warden login needs the `hub.publish` permission.

1. In the **Workshop** tab, open **Creator account**. Give the connection a
   label and press **Connect creator account**. Warden shows a code and an
   **Open creator approval** button.
2. Open the approval page, sign in to your creator account, check that the
   code matches, and approve the requested scope. Never type your account
   password or a token into Warden.
3. Unfold **Export your resources**. Tick the resources to include and enter a
   **Release version**. Press **Preview export**.
4. Read the review: included and excluded files per resource, findings,
   warnings and external dependencies. The secret scan is a heuristic; you
   still read the list. Tick the consent box and press **Create reviewed
   ZIP**.
5. When the ZIP is ready, you can press **Download reviewed ZIP** to inspect
   it locally.
6. Open **Send ZIP to creator draft**. Fill in the title, slug, summary and
   category for a new creation (or leave the project ID pointing at an existing
   one), the license, changelog, installation notes, tested builds and
   required resources. Tick the rights box and press **Send private draft**.
7. **Private draft accepted for editing** means the Workshop holds a private
   draft. It is not published. Press **Open creator draft** to add media,
   complete the release and submit for review on the website.

The transfer keeps running if you close the browser. After a server restart or
a lost response, sign back into the same Warden account and open **Saved
creator transfers** to resume the matching upload instead of creating a second
draft.

End the connection with **Disconnect creator** in Warden or from
[Warden connections](/account/connections) on the website. Disconnecting
cancels unsent exports; drafts already accepted stay on the website.

Warden never exports your server identity, signing keys, live configuration,
logs or player data. The host-side details are in the
[Warden export guide](https://github.com/Open2077/open77-base/blob/feat/community-hub/docs/community-hub-warden-export.md).

## Discussion, upvotes, saves, follows and reports

Sign in with a verified account to take part. Browsing and downloading need no
account.

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
  or a licensing problem. Give evidence and the exact version. A report goes
  to moderators only and does not remove anything by itself.

Unsent comments, appeals and edits stay in the tab while you move between
Workshop pages. They are lost when the tab closes.

## Details: what the ZIP looks like

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

[Example packages](https://github.com/Open2077/open77-base/tree/feat/community-hub/examples/community-hub/v1)
show the single-resource, bundle and preload layouts. They contain diagnostic
Lua only. The link points at the development branch until a release is pinned.

## Details: Warden permissions

| Permission | Allows |
| --- | --- |
| `hub.view` | Browse the Workshop from Warden and read releases. |
| `hub.manage` | Create and apply install, update, uninstall and rollback plans. |
| `hub.publish` | Connect a creator account and export resources to a draft. |
| `restart.schedule` | Schedule the restart that staged preload assets need. |

These are Warden permissions on your server. They have nothing to do with your
website account. Being a creator on the website grants nothing in Warden.

## Details: assets that load before the game starts

Some packages declare **preload** assets: game files that must be in place
before Cyberpunk starts. These cannot be swapped live. Warden stages them
privately and marks the job **awaiting_restart**. Nothing changes on the live
server until it restarts. Under **History, restart staging and storage ›
Restart staging**, an operator with `restart.schedule` can press **Schedule
server restart**; anyone with `hub.manage` can press **Cancel staged restart**.
Players must relaunch through the launcher when the required asset set
changes.

While a restart is pending, no other Workshop change can start. At boot, Warden
checks that the release is still published and that nothing was edited in
between; if the check fails, it boots the previous installation and you review
a new plan.

## FAQ

**Is it free?** Yes. Browsing, downloading and installing cost nothing, and
publishing costs nothing.

**Can I sell what I make?** No. The Workshop has no prices, checkout or
payouts. Every creation is free to download. Your license still decides what
people may do with it afterwards.

**What happens if a release is revoked?** Moderators can withdraw a release,
for example after a rights complaint or a malware report. Its download stops
working and it disappears from recommendations. Servers that already installed
it keep running; nothing is deleted from them. Warden marks the package
**revoked** in **Installed from the Workshop**, blocks new installs and
updates to that version, and refuses to roll back to it. Review the creation
and decide whether to uninstall. Creators see the decision in their inbox and
can appeal.

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

For images: `image_format` (not a JPEG, PNG or WebP), `image_animation`
(animated), `image_decode` (cannot be decoded), `image_size` (over 10 MiB) or
`image_dimensions` (over 40 megapixels or 20,000 pixels on a side).

For the hover clip: `clip_format` means the file is not a WebM, MP4 or GIF with
one video stream; `clip_duration` means it is longer than 8 seconds;
`clip_size` means it is larger than 8 MiB; `clip_dimensions` means a frame is
over 4096 pixels on a side.

**My install says "awaiting_restart". Is it installed?** Not yet. The files
are staged privately. Schedule the restart in Warden; the install commits on
the next boot if every check still passes.

**Does downloading a ZIP install it?** No. Either paste the link into Warden
or install by hand on a test server first, following
[Server resources](/docs/server-resources).
