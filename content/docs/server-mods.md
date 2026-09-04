# Mods your server requires

> The end-to-end picture — layers, the launcher's store and journal, a worked Nexus example and
> the troubleshooting table — lives in [Mods: the complete guide](mods.md). This page is the
> operator's reference for trust, hosting, Warden and review.

A server declares the mods its world needs, hosts the bytes itself, and the launcher installs them
when the player presses Connect — before the game process exists. The master vouches for hashes,
never for files: no third-party mod transits Open77 infrastructure. Because the install happens
before boot, a normal join needs no restart. The game was not running yet.

Use this guide to decide whether your world needs a mod at all, import one from Warden, choose who
hosts the bytes, read the trust badge your players will see before they join, request a review, and
remove a mod later without stranding anyone.

## Quick start: add a mod in five steps

If you already have the archive and just want it required, this is the whole flow. Each step is
explained in full under [Add a mod from the Warden panel](#add-a-mod-from-the-warden-panel).

1. **Open Warden → Mods.** Under *Platform* in the sidebar. Needs the `mods.manage` permission.
2. **Drop the archive in.** Zip, 7z or RAR. Nothing is written yet — you get a plan back.
3. **Read the plan.** Every file, where it lands, whether it *runs*, and whether it **adds** or
   **replaces**. Refuse anything you did not expect; this is the only moment you see it before your
   players do.
4. **Commit.** Now it is written: the bytes are stored under their own hash and `requiredMods` is
   updated in `server.jsonc` for you.
5. **Restart the server.** The set digest changed, and that is what every launcher compares.

That is it. You never hand-edit `server.jsonc`, and you never upload anything to Open77 — the bytes
stay on your server.

> **Before you reach for a mod at all:** if the content can be built from assets the game already
> has — props, markers, zones, a course — it is a [server resource](/docs/server-resources), not a
> mod. No download, no restart, hot-reloadable. See [Is it a mod at all?](#is-it-a-mod-at-all)

## What happens when a player presses Connect

1. The launcher reads your catalogue row, which carries the required list and a set digest announced
   by your server's heartbeat.
2. It asks the master for a verdict on every SHA-256 in that list. Hashes go up, verdicts come back;
   no file moves.
3. It applies the capability cap to each package: an unverified package containing an executable
   type is refused here, before anything is downloaded.
4. It shows the player what the world requires — each package named, sized and badged — and waits
   for consent.
5. It fetches the missing blobs from *your* server, hashes every byte against the announced hash,
   resolves dependencies, projects the files into the game folder and commits.
6. It launches the game into your world.

The player's own game is not touched permanently. World mods live in a per-world profile alongside
the OPEN//77 profile; the Solo profile still gives them their own install back.

There is one restart case, and it is not a normal join: the client is already running in a different
world whose profile does not match. The launcher says so, closes the game, projects the new set and
relaunches straight back into your world.

## Is it a mod at all?

This is the second question every owner asks, usually as "can I have a custom map?", and the answer
splits in two. Which half you are in decides whether you need this pipeline or none of it.

| | Runtime placement | Baked geometry |
|---|---|---|
| Examples | Props, barriers, markers, zones, furnished interiors, spawned objects | New buildings, new interiors, terrain |
| Ships as | A Lua resource | `.archive` meshes and sectors plus an ArchiveXL `.xl` |
| Player download | None | The full archive |
| Applies | Hot-reloadable, live | On the next boot |
| Needs this guide | No | Yes |

If the content can be assembled from assets the game already has, build it as a resource.
`open77_props`, `open77_markers` and `open77_interactions` ship today and are backed by the
production spawn chain — see [props.md](props.md), [worldui.md](worldui.md) and
[interactions.md](interactions.md). A racetrack of barriers, a marked-out arena, a decorated
apartment: all of that is placement, not geometry. It costs your players nothing to download and you
can change it while they are connected.

Only reach for a required mod when you genuinely need geometry the game does not ship.

**One honest gap.** The runtime half is proven and in production. The baked half is not. Nothing in
the Open77 repository measures how ArchiveXL world streaming, a custom `.streamingsector` or added
geometry behaves with Open77's world suppression and routing buckets. The pipeline will happily
deliver an `.archive` and an `.xl` to every player, because they are inert data — but whether the
sector streams correctly for two connected players in the same bucket has not been tested. Treat a
custom map as an experiment on your own server before you announce it.

## What you can require

Every package carries a trust verdict, and the verdict decides what the package is allowed to
contain.

| Verdict | Meaning | Effect |
|---|---|---|
| `verified` | We read those exact bytes. The hash is in the whitelist with a name, author, source page and a redistribution finding. | Anything, including executable content. The mod menu carries the Open77 mark. |
| `unverified` | Supplied by your world, not reviewed by us. | **Inert data only.** Size-capped, confined to known roots. The player is told before anything is written and can decline. |
| `blocked` | Refused outright. | The join is refused with the reason named. |

Unverified is warned, not blocked, because blocking would make Open77 a bottleneck on every server's
creative choices. That is only safe because of a hard capability cap.

**The cap.** An unverified package may contain inert data and nothing else: `.archive`, `.tweak`,
`.xl`, and INI files under `engine/config`. Executable content — `.dll`, `.reds`, CET Lua, `.asi` —
is refused unless that exact SHA-256 is verified, whatever your server claims about it. The launcher
enforces this against the file's own type and destination, not against your declaration.

**There is no player toggle to bypass it.** Not a global switch, not a per-package grant. A single
"allow unverified mods" checkbox is functionally "let any world run code on my PC", and its failure
mode is normalisation: servers post *just turn on the toggle*, players tick it once and forget, and
within a month the setting protects nobody while still reading as protection. Do not build your
world around a bypass arriving.

A package is also blocked when it writes outside the allowed roots, when the archive contains a path
traversal entry, or when a downloaded file does not hash to what your server announced. That last
one is indistinguishable from tampering and is treated as such.

### Redistribution is a separate axis

A mod can be perfectly inert and still be one its author never licensed anyone to hand out. The
whitelist records **safety** and **redistribution** separately, and they often disagree.

When redistribution is refused, you cannot host the bytes. The launcher routes to the player-fetch
flow instead: the player downloads the archive once from the author's own page, the launcher
recognises it by the pinned hash, and every world requiring it afterwards is satisfied from the
local store. Nobody rehosts anything.

Check the author's terms before you import. "It is only a small file" is not a licence.

## Add a mod from the Warden panel

You do not hand-edit `server.jsonc` for this. The panel has a **Mods** tab under Platform, gated by
the `mods.manage` permission, and every action there is written to the audit log like any other.

1. **Open Mods.** The tab lists what your world currently requires, with each package's id, version,
   size, hash and trust verdict.
2. **Upload the archive.** Zip, 7z and RAR are read. Nothing is written yet — the upload goes to
   `POST /api/mods/inspect`, which returns a plan.
3. **Read the plan.** This is the whole point of the step. It names, for every entry in the archive:

   | Column | What it tells you |
   |---|---|
   | File | The path inside the archive |
   | Root | The destination it maps to, or a refusal if it maps to none |
   | Class | `inert` or `executable` |
   | Disposition | `adds` a new file, or `replaces` one the game ships |
   | SHA-256 / size | Per file, plus the archive's own hash |

   The package as a whole is classified by the most privileged type it contains: one `.dll` among a
   hundred `.archive` files makes the package executable, and therefore unusable until that exact
   hash is verified.
4. **Read the disposition column especially.** `adds` and `replaces` are very different promises
   about what "switch it off later" means. A package that only adds files is clean to remove. A
   package that replaces a shipped file has displaced something, and you should prove the removal
   path on a test client before you require it of everyone.
5. **Commit.** `POST /api/mods` writes the entry. Inspect and commit are separate calls on purpose:
   you should see exactly what a download contains before it becomes something every one of your
   players is asked to install.
6. **Restart the server.** Changing the required set changes the set digest, which is announced to
   the master and compared by every launcher. Warden reports the restart as required for that
   reason.

Warden overlays only the `requiredMods` section and leaves master, resources, warden and licence
settings verbatim. What it writes looks like this:

```jsonc
"requiredMods": {
  "enabled": true,
  "note": "Shared vehicle handling — keeps physics identical across clients.",
  "packages": [
    // Indexed: a package the platform already distributes. "source" defaults to
    // "indexed", so it can be left out.
    { "id": "archivexl", "minVersion": "1.27.1" },

    // Hosted: your bytes, served from your own endpoint. sizeBytes is the size of
    // the ARCHIVE, not of the files inside it.
    {
      "id": "vehiclehandling",
      "source": "hosted",
      "displayName": "Vehicle Handling v1.3",
      "version": "1.3",
      "sha256": "34bb0c3d55a2b4b1c2137f7fa45030ad7f6685bd191952a55644c28b7d37a931",
      "sizeBytes": 598
    }
  ]
}
```

The two shapes do not mix. An indexed entry may carry `minVersion` and must not carry `sha256` or a
pinned `version`; a hosted entry must carry `sha256`, `version` and `sizeBytes`, and must not carry
`minVersion` — it pins one exact build. A half-filled entry is refused at startup rather than being
read as one custody model or the other, because guessing would mean fetching bytes from a place you
did not mean.

An absent `requiredMods` block means "this world requires nothing", which is what every server means
today. The configuration is validated at startup, not at connect time: bad ids, unparseable
versions, malformed hashes, a root that is not on the allowlist, or more than 64 packages all refuse
the boot with the offending entry named. A server that starts is a server whose required set is
well-formed.

Your server then serves the bytes beside the Lua resource endpoint it already runs:

```text
GET /mods/v1/manifest
GET /mods/v1/blobs/{sha256}
```

Both are immutable and content-addressed, with the same ETag, Range and resume behaviour the
resource endpoint has.

## Where the bytes come from

Three custody options. They are not interchangeable and the choice is usually made for you.

| Option | When to use it | Who pays the bandwidth |
|---|---|---|
| **Indexed** — a package the platform already distributes, pinned by `id` and `minVersion` | Loader layers Open77 is licensed to redistribute: ArchiveXL, TweakXL, Codeware, CET | Open77's CDN |
| **Hosted** — you upload the archive to Warden and your server serves it | Anything you made, and anything whose author permits redistribution | You |
| **Player-fetch** — the launcher asks the player to download it from the author's page | Redistribution refused, or a mod the author wants installed from their own page | The author's host |

Prefer indexed when it exists: it is free for you and already verified. Choose hosted when the
content is yours or the licence is clear. Player-fetch is not a fallback you select — it is what the
whitelist record forces when redistribution is refused, and the launcher still recognises the
downloaded file by its pinned hash, so the player only ever does it once across every world that
requires it.

### Packages owned by a Lua resource

A selected resource can declare `preload_mod "dist/package.zip"` for inert assets that must exist
before REDengine and Lua start. The server inspects and stages the package automatically, then
merges it into the same required-mod set described above. This avoids duplicating a resource-owned
world/texture package in `server.jsonc`, while preserving the same launcher consent, hashing,
hosting and world-profile isolation.

The declaration is intentionally stricter than Warden: executable content is refused rather than
automatically requesting trust, and disabling `requiredMods` while a selected resource declares a
preload is a startup error. Changes take effect after a server restart and a fresh launcher boot,
not after a Lua resource reload. See [Server resources](server-resources.md#pre-boot-redengine-assets)
and the [sky hologram walkthrough](sky-advertising.md).

The Warden **Mods** page lists these entries alongside the ones written in `server.jsonc`, with a
`resource <name>` badge and no remove button: the manifest owns them, so the only way to drop one
is to delete the `preload_mod` line and restart. The digest shown at the top covers both halves and
therefore matches the "Required mods: N declared" line in the server log and what the master
announces.

## Unsecured mode

Everything above assumes the platform stands between the operator and the player: executable
content needs a verified attestation, indexed packages come from Open77's signed index, and a
resource preload refuses anything that would run. `requiredMods.unsecured` switches that review
off for one server, deliberately and visibly:

```jsonc
"requiredMods": {
  "enabled": true,
  "unsecured": true,
  "packages": []
}
```

With the flag on:

- A resource may `preload_mod` a package that contains executable content (a RED4ext plugin such
  as ArchiveXL, a script bundle). The boot log prints an `UNSECURED` warning for each one instead
  of refusing the manifest.
- The launcher installs the server's executable packages without a verified verdict once the
  player has accepted the warning. A **blocked** verdict, a hash mismatch, an indexed id that is
  not in the index and content outside the known mod roots are still refused: unsecured lifts the
  "nobody reviewed this code" cap, nothing else.
- The master lists the server with `unsecured: true`. The launcher and the in-game server browser
  show an **UNSECURED** badge on the row, a red note in the detail pane, and a confirmation dialog
  the first time a player joins in a session. A double-click cannot skip it, and the shell refuses
  a join that did not carry the confirmation.
- Warden's Mods page shows a red `unsecured` chip next to the set digest.

The loaders themselves are resources, so several worlds can share them. `resources/assets/loaders/archivexl` and
`resources/assets/loaders/tweakxl` each wrap the official release zip in a `preload_mod` and carry the upstream
version in their manifest; a world declares what it needs and the server starts the loaders first:

```lua
resource "kujira_world"
version "1.0.0"
dependency "archivexl >=1.27.1"
dependency "tweakxl >=1.11.4"
preload_mod "dist/kujira.zip"
```

Selecting the world then declares three required mods (`archivexl-assets`, `tweakxl-assets`,
`kujira_world-assets`); the launcher installs them into the world profile before the game boots, and
RED4ext initialises the plugins before the depot mounts any archive, so there is no load order to
manage. A dependency must itself be in `resources.load` (or matched by its wildcard). Because the
loader packages are executable, a wildcard selection such as `load: ["*"]` only boots on an unsecured
server: exclude them with `"!archivexl", "!tweakxl"` on a secured one.

Use it for a private or trusted community that needs mods the index does not carry yet. A public
server that turns it on is asking strangers to run its code on their machines; the badge exists so
they know that before they click.

## Joining from the in-game server browser

A player who is already in the game and picks a world that requires mods cannot receive them
mid-session: REDengine mounts archives at boot and the loaders register at depot initialisation.
The in-game browser handles this without sending anyone to the desktop:

1. The shell compares the world's `requiredModsDigest` (relayed by the master) with the digest the
   launcher installed for this boot (`Open77.session.launcherContext().modsDigest`). Equal means
   this boot was prepared for exactly that world and the connection proceeds as usual.
2. Otherwise a **Restart required** prompt names the world and its packages and counts down ten
   seconds. On accept (or when the countdown ends) the shell calls
   `Open77.session.relaunchViaLauncher(serverId, endpoint)`, which opens
   `open77://connect?server=…&endpoint=…&relaunch=<pid>` through the launcher's registered
   protocol handler, then quits the game.
3. The launcher, already running or started by Windows for the link, waits for the game process
   to exit, runs the normal consent flow (unsecured warning, packages to fetch), installs the
   world's mods into its profile and starts the game with an auto-connect. The next boot lands in
   the world.

Without the launcher installed the prompt says so and the player stays in the browser; a world
that requires nothing never shows the prompt. An unsecured world shows its warning first.

## What your players see before they join

The consent gate names each package individually — what it is, how big it is, where it comes from
and its verdict. Unverified entries are never rolled up into a count; every one is named.

- **Verified** reads as reviewed by Open77 and carries the platform mark. It is the only badge under
  which executable content can exist at all.
- **Unverified** reads plainly as *supplied by this world, not reviewed by Open77*, with the
  reassurance that it can only be inert data. Some players will decline. That is the design working,
  not a bug to route around.
- **Blocked** ends the join with the rule named. No server can talk a launcher past this.

Afterwards, the mod menu's **Worlds** section groups every file by the world that asked for it, with
its badge, its total size and a "remove this world's mods" action. If a player cannot see where
something on their disk came from, this feature has failed, so assume they will look.

Two consequences worth planning for. First, an unverified badge is a real conversion cost on a
public server: expect some players to bounce at the consent gate, and say in your server description
what you require and why. Second, the more you require, the longer the first join takes — see
bandwidth below.

## Asking for a review

If you need executable content — a loader, a `.reds` script, a CET mod — the only path is
verification. Warden posts the request for you:

```text
POST /api/mods/{id}/request-review
```

It forwards the hash and the source information the importer already collected to the master's
review queue. A reviewer reads those exact bytes and records two findings, separately: whether the
package is what it claims to be, and whether the author permits a server to hand it to players. An
approval writes an attestation against the SHA-256; a decline records a reason you can read back in
Warden.

Three things to know before you plan around it:

- **The verdict is on the bytes, not the mod.** A new release of the same mod is a new hash and
  needs its own review. Pin the version you tested.
- **A verdict can be revoked.** Revocation flips the hash to blocked and takes effect on the next
  attestation call — no launcher release, no client update. Design for the possibility.
- **Throughput is the real constraint, and it is unproven.** In the seven-mod sample we classified,
  six were executable. If that ratio holds across the wider ecosystem, the review queue is the main
  path rather than an edge case, and we do not yet know what it can absorb. Seven mods is far too
  small a sample to conclude anything; it is enough not to assume the opposite. Do not schedule a
  launch around a review landing by a given date.

## Bandwidth: you are the host

Hosted packages leave your machine, once per player who does not already have them. Do the
arithmetic before you require something large: a 1.2 GB archive pack and 500 new players in a month
is 600 GB of egress you are paying for, and none of it is Open77's.

What works in your favour:

- Blobs are content-addressed and immutable, so a returning player downloads nothing.
- A blob two of your worlds share is stored once on the player's disk and fetched once.
- The endpoint supports Range and resume, so an interrupted download does not start over.

What does not:

- Every *new* player pays the full set on their first Connect, and so do you.
- The launcher fetches on the Connect click, which is exactly when you are most likely to have a
  crowd arriving at once — a stream raid lands as simultaneous full-set downloads.

Open77 has not measured mod-blob egress against a live server, so there is no published figure to
plan against. Measure your own, and keep the required set as small as the world actually needs.

## Removing a mod without stranding players

1. Delete the entry in Warden (`DELETE /api/mods/{id}`).
2. Restart the server. The set digest changes, which is what every launcher compares.
3. Players are not stranded: on their next Connect the world profile is re-derived without the
   package and it is simply no longer projected. Nobody is asked to uninstall anything, and their
   Solo profile was never affected.
4. The bytes stay in the player's local store until it is reclaimed, which is deliberate — rejoining
   a world you played last week should not re-download everything. The mod menu shows how much disk
   that is and lets the player free it. Reclaiming disk is their choice, not a silent delete.

The one case that needs care is a package whose plan said `replaces`. Removing it has to put the
original file back, so prove that round trip on a test client before you require such a package of
everyone. A package that only `adds` has no such problem: the file disappears and the engine falls
back to its built-in defaults.

Never remove a required mod and leave the server running on the old config in the hope that it
resolves itself. The digest is the contract; a stale one only produces confusing refusals.

## Worked example: a shared handling file

The mod that motivated this whole feature is the smallest one imaginable, and it is worth walking
end to end because every step is visible.

**What it is.** `vehiclehandling` v1.3, a `.7z` containing exactly one file:
`engine/config/platform/pc/vehiclehandling.ini`, 655 bytes, 21 keys under `[Vehicle]` — among them
`vehicleVsVehicleCollisions`, `trafficVsTrafficCollisions`, `WeightTransferMode`, `UseDifferential`,
`physicsCCD` and `PhysXTimeCompensationFactor`. Archive SHA-256
`34bb0c3d55a2b4b1c2137f7fa45030ad7f6685bd191952a55644c28b7d37a931`.

**Why a server would enforce it.** Those keys change *client-side* physics integration. Open77
vehicles are client-authoritative with server arbitration, so two players running different handling
values simulate the same car differently, and the divergence surfaces as desync rather than as a
visual difference. Requiring the file server-wide is how you make every client integrate the same
physics.

That reasoning is an inference, not a measurement. Two clients on different handling INIs driving
the same car have not yet been compared in-game. It is the strongest argument for the feature and it
is cheap to test — but until it is run, treat "mismatched handling causes desync" as expected, not
established.

**Why it is the easy case.** It is inert data: an INI under `engine/config`, nothing executable. So
it needs no review at all — it rides the unverified tier, the player is warned, and the join works.
Of seven real mods we classified, it was the only one that qualified.

**What the importer reports.**

| | |
|---|---|
| Format | 7z, 1 entry |
| Root | `engine/config` |
| Class | inert |
| Disposition | adds — the vanilla install ships only `platformgameplay.ini` and `rendering.ini` there |
| Removal | clean: delete the file, the engine falls back to built-in defaults |

**End to end.** Import it in Warden, read the plan, commit, restart. Your server announces one
package with that hash. A player presses Connect; the launcher asks the master, gets *unknown*, sees
inert-only content, names the mod at the consent gate with an unverified badge, fetches 655 bytes
from your server, hashes them, projects the INI and boots into your world. If you later get the hash
verified, the same players see the badge flip on their next join, with no launcher release and no
change on your side.

**One thing to note about the file type.** An engine INI is read once at startup. It cannot be hot
reloaded the way a Lua resource can, which is precisely why it belongs to the launcher path and the
boot, and not to [server-resources.md](server-resources.md).

## What is not proven yet

Stated plainly, so you can plan around the gaps rather than discover them:

- **ArchiveXL world streaming on Open77.** No measurement exists of custom `.streamingsector`
  content against world suppression and routing buckets. Delivery is not the question; behaviour in
  a live session is.
- **The desync argument for handling files.** Reasoned from client-authoritative vehicles, not yet
  observed with two clients on different INIs.
- **Review throughput.** Six of seven mods in our sample were executable, so the queue is likely the
  main path rather than an edge case, but the sample is far too small to size it.
- **Egress in practice.** No published figure for what hosting mod blobs costs a real server.

Everything else in this guide — the custody split, the capability cap, the trust verdicts, the
import flow and the removal path — is how the pipeline is built, not how it is hoped to work.
