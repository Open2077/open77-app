# Share and use community resources

The OPEN//77 Workshop brings together Lua resources, gamemodes, mapping projects and
showcases made for OPEN//77 servers. Start in [the Workshop](/workshop) to find
installable packages, or [Discover](/workshop/discover) for featured and trending creations.
Packages in this release are free. Selling packages is outside this release.

This guide describes the Workshop release candidate. It does not announce production
availability: the operator must enable the corresponding services. A disabled
import or installation control means that capability is unavailable on that host.

## Choose your first step

- **Trying a resource:** open its page, read installation and compatibility notes,
  then choose a release. Test it on a development server before your live world.
- **Sharing something you built:** sign in, verify your email, create your
  [creator profile](/account/profile), then open [My creations](/account/creations).
- **Running a server:** begin with [Host a server](/docs/host-a-server), then use
  the Workshop section in [Warden](/docs/warden) to review an installation.
- **Learning to build:** start with [Writing a gamemode](/docs/writing-a-gamemode)
  and [the resource runtime](/docs/resource-runtime). A Workshop project does not
  replace a resource's `open77.lua` manifest.

## Find and download a release

Search the directory and combine category, content type and sorting filters.
On a small screen, open the filter drawer and apply your selection. A creator's
profile links their public projects. A showcase can explain work in progress
without offering an installable download.

On a resource page, inspect its description, gallery, installation instructions
and releases. Screenshots open in a viewer with Previous, Next and Close controls;
Escape closes it. Videos load only after you choose to play them and also have a
link to the original provider.

Published release downloads are available without signing in. Choose the exact
version you need; prereleases require an explicit choice. Review tested builds,
runtime requirements, included files, license and SHA-256. A tested-build label
reports the creator's declared testing; it is not a promise that every server
configuration is compatible. A withdrawn or revoked download cannot be retrieved
by requesting a fresh link. If a temporary download link expires, request a new
one from the release page.

Downloading a package does not install it. With Warden, review its plan before
accepting changes. For manual work, use the [server resource guide](/docs/server-resources)
and the package's instructions; do not overwrite a live resource directory or
your private configuration without a backup and a deliberate migration.

## Publish from a ZIP

For a small starting point, use the
[newly authored MIT resource and bundle examples](https://github.com/Open2077/open77-base/tree/feat/community-hub/examples/community-hub/v1).
Their README explains ZIP layout, configuration templates and the versioned
metadata schema. They contain diagnostic Lua only, with no game or community
assets. These links refer to the Workshop development branch until a release is pinned.

Create a project in [My creations](/account/creations). The editor has five steps:

1. **Basics:** choose a stable slug, title, summary, type, category, maturity and
   tags. Explain what the resource does and who it is for. Source links are useful
   but do not replace a release artifact or establish redistribution rights.
2. **Showcase:** describe installation and usage. Upload a JPEG, PNG or WebP,
   wait for processing, then attach it. The first image is the cover; add up to
   eight more screenshots with meaningful alternative text and optional captions.
   Add up to two supported YouTube or Vimeo links. Only use media you can share.
3. **Release:** create a version, fill in changelog, license, installation,
   tested builds and requirements, then upload the ZIP or import a GitHub asset.
   Review the discovered resources and inspection results.
4. **Validation:** address blocking findings and check the requirements shown by
   the editor. An upload being accepted means technical inspection passed; it
   does not mean the project or release is public.
5. **Preview and submit:** read the rendered page, verify your rights to distribute
   every included file, save outstanding changes, and submit the exact draft for
   review. Project-page review and release review are separate; an installable
   project's page needs an approved release before it can be approved.

Keep the ZIP focused on the resource directories and their manifests. Include
the required scripts/assets and license, plus explicitly prepared example
configuration. Do not include server identities, accounts, database exports,
live configuration, tokens or player data. The compressed ZIP limit is 100 MiB;
the inspection budget is 500 MiB expanded and 10,000 entries across outer and
nested archives. Image uploads are limited to 10 MiB and 40 megapixels.

The editor autosaves drafts. If saving pauses, keep the tab open, correct the
error and use Save draft. If your sign-in expires, sign in again in another tab
before retrying. If another editor changed the draft, compare and resolve the
conflict instead of overwriting their work. Unsaved text is not a durable backup
against closing the browser or losing the device.

Published content keeps its approved snapshot while you edit a revision. Publish
changed package bytes as a new release version; existing approved artifacts are
immutable. Use upload history and Refresh status after a connection problem
before starting another submission.

## Import a GitHub release asset

In a release draft, open **Import a ZIP from a GitHub release**. If the provider is
enabled, connect GitHub through the offered authorization flow, choose the
repository, release and eligible ZIP asset, and inspect the repository/tag, asset
identity, size and SHA-256 before confirming redistribution rights.

The import copies a specific release asset into the Workshop's private inspection
pipeline. Pasting a repository URL into the source field alone does not import
anything. A changing branch, arbitrary external download URL or automatically
generated source archive is not a substitute for the selected release asset.
The picker requires a nonempty ZIP within the size limit and a provider digest.

Repository control and permission to redistribute are separate concerns. Check
licenses for bundled dependencies and mapping assets even when you control the
repository. Refresh import status after a temporary provider failure; a rejected,
expired or terminal failed import needs the action explained by its result.
Manage or disconnect the provider at [GitHub connections](/account/github).
Real GitHub OAuth/provider validation remains a release gate; local fixtures do
not establish that a deployed provider configuration works.

## Publish an export from Warden

A local Warden account and an OPEN//77 creator account are separate identities.
The local account needs `hub.publish`. Use Creator connection in Warden to obtain
a human approval code, open the supplied website link, and sign into the creator
account there. Verify the code and server label before approving the requested
existing project or new-draft scope. Do not paste account passwords or tokens
into the export form.

Select server-discovered resource names, a release version and any explicit
example configuration/documentation. Review included and excluded files,
dependencies, metadata, warnings and blocking findings. Build the reviewed ZIP;
you can download and inspect it locally before sending it to the Workshop. Local
credential detection is heuristic and cannot guarantee that a package contains
no secrets. Your review and redistribution confirmation are still required.

Send the ZIP to the private creator draft, then follow the edit link to finish
media, release details and website review. **Draft ready means private**, not
published. Leaving the browser does not cancel an accepted background transfer.
After a server restart or ambiguous network failure, sign back into the same
local account, inspect Saved creator transfers and explicitly resume the matching
reviewed hash. Do not create a duplicate project merely because a response was lost.

Disconnect from Warden or revoke its scope in [Warden connections](/account/connections)
when access should end. Revocation prevents further use of that connection and
cancels its uncommitted exports; accepted private drafts remain on the website.
Reconnecting is a new authorization, not recovery of a revoked connection.

The canonical host-side export, private-storage and recovery details live in the
[Warden export guide](https://github.com/Open2077/open77-base/blob/feat/community-hub/docs/community-hub-warden-export.md).
This release-candidate source link will need its release revision when published.

## Compatibility, mapping and server maintenance

Mapping is a project category, not a bypass around package inspection. A mapping
package can contain Lua resources and supported declared preloads; describe which
client assets, game build and expansions it requires. Nested ZIP/7z preloads are
inspected under the same rules as their outer package. An ordinary Cyberpunk mod
is not automatically an OPEN//77 resource, and arbitrary native plugins are not
accepted merely because they are inside an archive.

Warden separates `hub.view`, `hub.manage` and `hub.publish`. When installation is
available, choose the release and review exact dependency versions, resource names,
compatibility, local changes and configuration handling. Optional dependencies,
prereleases and untested-build acknowledgements need deliberate choices. An
acknowledgement cannot override a manifest's incompatible runtime requirement.

Install/update jobs expose their actual state. A cancellation request is not
complete until rollback has finished. If a review becomes stale, create a fresh
plan. An unresolved recovery error needs operator investigation; do not remove
the private journal to force another install.

Update uses a new reviewed plan. Uninstall checks dependents and preserves
operator data/configuration according to the reviewed transaction. History offers
rollback only while the required backup is retained. Review any changed files
before accepting rollback; it is not permission to erase newer player data.

Preloads can require a restart and launcher preparation. An **awaiting restart**
job is staged privately, not a completed live installation. Follow the pending
restart review in the current server build. Full restart/preload/player validation
is tracked separately from ordinary Lua install/update/rollback testing; this
guide does not claim that final gate has passed.

Retention has its own review. Cleaning duplicate payloads and permanently
expiring an eligible rollback record are different actions. Protected or changed
data may prevent cleanup even when disk space is low. Consult the canonical
[retention policy](https://github.com/Open2077/open77-base/blob/feat/community-hub/docs/community-hub-retention.md)
and [package metadata specification](https://github.com/Open2077/open77-base/blob/feat/community-hub/docs/community-hub-package-metadata.md)
for exact limits and configuration-template declarations. Do not manually delete
live Workshop journals or backups to bypass a quota.

## Discuss, follow and report

Sign in to upvote, save, subscribe or comment. Saving a project and subscribing to
new releases are separate actions. Manage [saved projects](/account/saved),
[subscriptions](/account/subscriptions) and your [inbox](/account/notifications)
from your account. Owners cannot upvote their own projects.

Use the discussion for questions and reproducible feedback: include the release,
server build, expected result and relevant sanitized logs. You can edit or delete
your own comment; deletion preserves its replies. Authors can pin useful answers
and mark threads resolved. Do not post credentials or player-private information.

Unsent comments, replies, comment edits and appeals stay in this tab's memory for
the account that wrote them when you navigate between Workshop pages. Return to the
same form (or choose **Edit / resume draft**) to continue. Use **Discard draft**
to remove one explicitly. These drafts are not uploaded or saved across a reload
or a closed tab; the browser warns before leaving while drafts remain. The tab
holds up to 64 drafts and asks you to finish or discard one before adding more.
An unfinished edit keeps its original revision, so a newer server edit can still
produce a conflict instead of being overwritten.

Use Report on the relevant project, release or comment for abuse, malicious
content, licensing concerns or other moderation issues. Include evidence and the
exact version. Reports do not automatically remove content. Affected creators can
read the decision in their activity/inbox and open **Appeal this decision / check
your appeal**. One appeal is allowed per decision; include the reason and source
evidence. An appeal does not change the content's current state while reviewed.

## Share maintenance and transfer ownership

Open a project's membership page from My creations. An owner can invite a
verified creator by public handle as a maintainer. Access begins when they accept
in [Invitations](/account/invitations). Maintainers can work on drafts and releases;
owners manage membership. Revoke an unused invitation or remove a maintainer when
that access is no longer appropriate.

To transfer the project, offer ownership to an existing maintainer. You remain
owner until they accept. Acceptance makes you a maintainer and revokes other
pending invitations. This explicit handover preserves published history.

Archive a published project when active development stops. Archiving keeps the
approved page and downloads available, closes new comments and freezes edits;
the owner can reopen it later. It is not a takedown or artifact deletion tool.

For an unpublished project you no longer need, choose **Delete unpublished draft**
in [My creations](/account/creations). Only its owner can confirm deletion, and
the confirmation applies to the displayed revision. If someone has edited it,
reload and review the latest version first. Projects with any published project
or release history cannot use draft deletion.

Deletion removes the draft from your workspace and frees its draft allowance.
It revokes project membership, invitations, creator connections and private
preview access, and prevents pending uploads or jobs from completing. There is
no creator restore action. The slug remains reserved, and private audit records
and artifact references are retained; this action does not immediately erase
stored files or shared objects.
