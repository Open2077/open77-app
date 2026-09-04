# Mods: the complete guide

Everything about mods in Open//77, from the server that declares them to the file that lands in
the player's game folder. [Server-required mods](server-mods.md) is the operator's reference for
trust, review and Warden; [Server resources](server-resources.md) covers Lua resources. This page
ties the whole pipeline together, walks through adding a Nexus mod to a world, and lists what to
check when a mod does not show up.

## Three layers of mods

A player's game folder is managed by the launcher as three layers. Knowing which layer a file
belongs to answers most questions before they are asked.

| Layer | What it holds | Who decides | Installed when |
|---|---|---|---|
| **Stack** | Open//77 itself: RED4ext, redscript, the Open77 plugin, the WebUI host, the optional packages of the signed index (CET, compat shims, …) | The platform's signed mod-stack index, per channel and generation | Every launcher start-up on the official directory source |
| **World** | What one server requires: loaders (ArchiveXL, TweakXL), a world's archives and tweaks, a vehicle, a script fix | The server, through `requiredMods` and resource `preload_mod` declarations | On Connect, laid over the stack |
| **Own** (Solo profile) | The player's personal mods, untouched by Open//77 | The player | When the player switches to *Solo* in the mod menu |

The launcher keeps a journal of every file it placed, tagged with its layer
(`%LOCALAPPDATA%\Open77\modstore\state\projection.json`, one entry per file with `layer: stack`
or `layer: world`). Two rules follow from it:

- A **world** projection keeps every stack file exactly as it is and only removes the previous
  world's files. Joining another world swaps world files; it never touches Open//77.
- The **stack** projection at launcher start-up owns the whole folder and removes world files, so
  a world's archives never leak into another world or into the player's own game.

World mods are therefore re-laid on every Connect. They are not re-downloaded: blobs are
content-addressed and stay in the player's store (`modstore\blobs\<sha>`), so a returning player
only pays the projection.

## Life of a world mod

The path from your disk to the player's, with the file or log line to look at for each step.

1. **The server declares it.** Either a resource carries `preload_mod "dist/package.zip"` or an
   operator committed a hosted package from Warden. At start-up the server inspects each archive,
   stages it under `server/.open77/mods/` by hash and announces the set:

   ```text
   [INF] Required mods: 5 declared, digest=eccac11f…, enabled=True, unsecured=True.
   [INF] [resource:aventador_svj] started generation=1
   ```

   Every resource-owned package becomes a required mod named `<resource>-assets`; the digest covers
   the whole set and changes whenever a package does.

2. **The server hosts the bytes** beside its resource endpoint, immutable and content-addressed:

   ```text
   GET http://<host>:<resource-port>/mods/v1/blobs/<sha256>
   ```

   The port is the one the server announces in its heartbeat (`11779` on the development server,
   next to game port `11778`). A server whose HTTP listener is down shows up in the launcher as
   *This world's mods could not be downloaded*.

3. **The master relays the list.** The catalogue row carries `requiredMods` (id, version, sha256,
   sizeBytes, url), the digest and the `unsecured` flag. The launcher and the in-game browser read
   the same row.

4. **The launcher decides.** On Connect it asks the master for a verdict on every hash, applies the
   capability cap (executable content needs a verified verdict, or the player's consent on an
   unsecured world), shows the consent gate, then fetches whatever the store lacks, hashing every
   byte against the announced value. Each archive is inspected — stored or freshly downloaded — and
   the package is laid over the stack:

   ```text
   unsecured world: accepting unreviewed executable content in 'tweakxl assets' ('red4ext/plugins/TweakXL/TweakXL.dll')
   modstack: world layer keeps 291 stack file(s) in place
   world 'Open77 Development': projected 54 file(s), removed 0, kept 291 in place.
   ```

5. **The game starts with a contract.** The launcher passes the target and the digest it installed
   for this boot:

   | Variable | Meaning |
   |---|---|
   | `OP77_CONNECT` | `host:port` to auto-connect to |
   | `OP77_CONNECT_MASTER` | The directory source the ticket came from (`alpha`, `development`); the in-game shell enrols the identity with that master |
   | `OP77_WORLD_SERVER` | The world's server id |
   | `OP77_WORLD_MODS_DIGEST` | The required-mod digest this boot was prepared for |

   REDengine mounts `archive/pc/mod` at boot, RED4ext loads the plugins, redscript compiles
   `r6/scripts`, TweakXL applies `r6/tweaks`. Nothing in this layer can be added mid-session.

6. **The shell checks the contract.** When a player picks a world from the in-game browser, the
   shell compares the world's digest with `Open77.session.launcherContext().modsDigest`. A match
   connects; a mismatch shows the *Restart required* prompt, which hands off to the launcher through
   `open77://connect?server=…&endpoint=…&relaunch=<pid>` and quits the game. See
   [Joining from the in-game server browser](server-mods.md#joining-from-the-in-game-server-browser).

## Declaring mods on a server

### A resource that owns its package

The recommended shape for anything a world needs: the package lives with the resource that needs
it, the manifest states the loaders it depends on, and selecting the resource declares everything.

```lua
-- resources/assets/maps/kujira_world/open77.lua
resource "kujira_world"
version "1.0.0"
auto_start true
dependency "archivexl >=1.27.1"
dependency "tweakxl >=1.11.4"
preload_mod "dist/kujira.zip"
server_script "server/main.lua"
```

- Third-party packages live under `resources/assets/` (`loaders/`, `maps/`, `vehicles/`, `mods/`);
  everything but `loaders/` is ignored by git, so a checkout never carries someone else's archive.
  See [Layout of the resources folder](server-resources.md#layout-of-the-resources-folder).
- The archive is a `.zip` or `.7z` whose entries are **game-root relative** paths
  (`archive/pc/mod/…`, `r6/tweaks/…`, `r6/scripts/…`). Nexus archives usually are already; a
  wrapping folder (`MyMod/archive/pc/mod/…`) must be stripped.
- Up to eight packages per resource, 1 byte to 64 MiB each; every declared path must exist.
- A dependency must itself be in `resources.load`. The loaders ship as resources
  (`resources/assets/loaders/archivexl`, `resources/assets/loaders/tweakxl`) that wrap the upstream release zip, so several worlds
  share one copy and the server starts them first.
- `requiredMods.enabled` must be `true`. Executable content (a `.dll`, a `.reds`, CET Lua, `.asi`)
  in a preload is refused unless the server is [unsecured](server-mods.md#unsecured-mode) or the
  hash is verified.
- Changing a package needs a **server restart** and a **fresh launcher boot** of the game. `ensure`
  reloads the Lua, not the depot.

The load list in `server.jsonc` selects it:

```jsonc
"resources": {
  "load": ["freeroam", "archivexl", "tweakxl", "kujira_world"]
}
```

### A hosted package from Warden

For an operator without access to the resource tree: *Warden → Mods → upload*, read the plan
(file, root, inert/executable, adds/replaces), commit, restart. Warden writes the `requiredMods`
entry for you. Full walkthrough in
[Add a mod from the Warden panel](server-mods.md#add-a-mod-from-the-warden-panel).

### An indexed package

A package the platform distributes from its signed index is pinned by `id` and `minVersion` and
costs the operator nothing. The index carries what Open//77 is licensed to redistribute; a package
missing from it makes the world unjoinable, so check the index before pointing at it.

### What a package may contain

The launcher confines every file to a known root and classifies the package by its most privileged
file.

| Root | Typical content | Class |
|---|---|---|
| `archive/pc/mod` | `.archive`, `.xl` | inert |
| `r6/tweaks` | TweakXL `.tweak` / `.yaml` | inert |
| `engine/config` | INI overrides | inert |
| `r6/input`, `r6/config` | input and config XML | inert |
| `r6/scripts` | redscript `.reds` | executable |
| `red4ext/plugins`, `bin/x64/plugins` | `.dll`, `.asi` | executable |
| `bin/x64/plugins/cyber_engine_tweaks/mods` | CET Lua | executable |
| `engine/tools`, `bin/x64`, `mods` | tooling, loaders | executable |

Anything outside these roots, a path-traversal entry, or bytes that do not hash to the announced
value refuses the package.

## Worked example: a Nexus vehicle on the freeroam server

Adding *Lamborghini Aventador SVJ* (Nexus 11176) to the development world, spawnable with `/car`.
The mod requires ArchiveXL, TweakXL, RED4ext, redscript and the author's *Vehicle manufacturer
fix* (Nexus 28744); CET is listed only for its spawn command and is not needed here.

1. **Download the archives** from the author's page (the launcher never rehosts what the author
   did not license; keep the licence in mind before making it a public requirement). Inspect them:

   ```text
   KRNLNIK Lamborghini Aventador SVJ-11176-1-4.zip
     archive/pc/mod/aventador_svj.xl
     archive/pc/mod/KRNLNIK_Lamborghini_Aventador_SVJ.archive
     r6/tweaks/krnlnik/lamborghini_aventador_svj.tweak
     r6/tweaks/krnlnik/lamborghini_aventador_svj_ICONS.tweak
   VMF-28744-1-0.zip
     r6/scripts/VehicleManufacturerFix.reds
   ```

   Both are game-root relative. Repack without directory entries if you want the package minimal;
   the layout is what matters.

2. **Create one resource per package.** The fix first, because the car depends on it:

   ```lua
   -- resources/assets/mods/vehicle_manufacturer_fix/open77.lua
   resource "vehicle_manufacturer_fix"
   version "1.0.0"
   auto_start true
   preload_mod "dist/vmf.zip"
   server_script "server/main.lua"
   ```

   ```lua
   -- resources/assets/vehicles/aventador_svj/open77.lua
   resource "aventador_svj"
   version "1.4.0"
   auto_start true
   dependency "archivexl >=1.27.1"
   dependency "tweakxl >=1.11.4"
   dependency "vehicle_manufacturer_fix >=1.0.0"
   preload_mod "dist/aventador_svj.zip"
   server_script "server/main.lua"
   ```

   A `server/main.lua` that prints on `onResourceStart` is enough; the package does the work.

3. **Select them and restart.** Add `"vehicle_manufacturer_fix", "aventador_svj"` to
   `resources.load`. The `.reds` file is executable content, so this only boots on an unsecured
   server. Restart and read the boot log: `Required mods: 5 declared` with a new digest, one
   `started` line per resource.

4. **Keep third-party bytes out of git.** The repository ignores `resources/assets/maps/kujira_world/`,
   `resources/assets/mods/vehicle_manufacturer_fix/` and `resources/assets/vehicles/aventador_svj/` for that reason; the
   manifests are tiny, the archives are someone else's work.

5. **Connect through the launcher.** The consent gate reads *5 packages, 3 executable*; accept, and
   the log shows `projected 54 file(s), removed 0, kept 291 in place`. The game boots with the
   archive mounted and the tweak records registered.

6. **Spawn it.** The freeroam `/car` command accepts any `Vehicle.*` record when
   `Config.vehicles.allowCustomModels` is `true` (`resources/gamemodes/freeroam/shared/config.lua`):

   ```text
   /car Vehicle.aventador_svj_01
   ```

   The record name comes from the mod's tweak file. `unknown_model` means the record did not match
   `^Vehicle%.[%w_]+$` or the flag is off; an invisible or wrong vehicle means TweakXL did not load
   the record — check its log (below).

## What the launcher does with the files

- **Store.** `%LOCALAPPDATA%\Open77\modstore\`: `blobs\<2 hex>\<sha256>` (archives and every file
  inside them), `pkg\<id>\<version>\modpkg.json` (stack package manifests), `state\projection.json`
  (the journal). Nothing here is ever served to anyone.
- **Projection.** Files are hardlinked from the store into the game folder when the volume allows
  it, copied otherwise (`--force-copy` forces copies). Overwriting a hardlinked file in place — a
  local build deployed by hand — mutates the store's blob; the launcher notices at the next
  verification (*not in the store yet*) and re-fetches it. A placed file that no longer hashes as
  recorded counts as an unmanaged copy: an exclusive file is replaced by the stack's version (the
  log says so), a contested one is reported and left alone.
- **Journal and commit.** A projection writes `projection.pending.json`, moves files, then commits.
  An interrupted run is recovered on the next plan (*a pending journal was found*).
- **Removal.** Only files the launcher placed and that still hash as recorded are removed. A
  package that `replaces` a shipped file restores it on removal; prove that round trip on a test
  client before requiring such a package.
- **The Solo profile** projects the player's own set and takes Open//77's out; *browse servers*
  puts it back. World files never appear in Solo.

### Developer builds and the local directory source

The launcher's *Directory source* menu offers the official master and *Local development*
(`http://127.0.0.1:8090`). On the local preset the launcher skips the stack update and the launcher
self-update (a release launcher only trusts the production signing key), refuses the browser sign-in
(it goes through the production website) in favour of the e-mail/password form, and still fetches
and lays world mods. A `dotnet build` launcher never self-updates either; it reports version
`1.0.0`, which every release would otherwise out-rank.

Because the stack is not managed on that preset, branch builds deployed into the game folder stay
in place. If the stack ever needs rebuilding, the headless CLI does it without the GUI:

```powershell
$env:OP77_LAUNCHER_MASTER_URL = "https://master.open2077.net/"
Open77Launcher.exe --mods-apply --commit --game-dir "<game folder>"
```

## Verifying that a mod loaded

In order of cost, stop at the first that fails.

1. **Launcher log** (`%LOCALAPPDATA%\Open77\launcher.log`) at the Connect:
   `world '<name>': projected N file(s), removed M, kept K in place.` No such line means nothing
   was laid; a `world mod fetch failed: <id> <reason>` line names why.
2. **Files on disk** in the game folder, at the paths the archive declared
   (`archive\pc\mod\<name>.archive`, `r6\tweaks\…`, `r6\scripts\…`, `red4ext\plugins\<loader>`).
3. **Loader logs** after the game booted: `red4ext\logs\red4ext-*.log` lists the plugins it
   loaded (ArchiveXL, TweakXL, Open77); `red4ext\plugins\ArchiveXL\ArchiveXL.log` lists every
   `.xl` extension and archive it registered; `red4ext\plugins\TweakXL\TweakXL.log` lists the
   tweak files it applied and any record error. A redscript compile error shows a dialog at boot
   naming the script.
4. **In game.** A world mod: go where the geometry is. A vehicle: `/car <record>`. A tweak: the
   record exists (`Game.GetVehicleSystem` via CET, or a server-side `Open77.vehicles.create` with
   the record).
5. **Server side.** `Required mods: N declared` at boot, and each `GET /mods/v1/blobs/<sha>`
   answering `200` with the archive's size.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| *This world's mods could not be downloaded* / log `world mod fetch failed: … Unreachable` | The server's resource HTTP listener is not reachable (server down, port blocked, wrong public URL in its heartbeat) | Check the server process and `GET /mods/v1/blobs/<sha>` from the player's side; fix the public URL |
| Game boots vanilla after a Connect (no Open77 menu) | The stack was removed from the game folder | Launchers after op77.27 lay worlds over the stack; on older ones run the stack apply above or reinstall from the launcher |
| Connected, but the world's content is missing and nothing complains | The mods were not projected on this Connect (launchers up to op77.27 only installed a package the first time it was downloaded) | Update the launcher; verify with the `projected` log line |
| `identity_proof_invalid` right after a launcher-started auto-connect | The identity was enrolled with a different master than the one the server verifies against (the page's remembered directory source overrode `OP77_CONNECT_MASTER`) | Fixed in the shell (the launcher's master is pinned); on older clients pick the same master in the in-game menu before connecting |
| *Restart required* prompt in the in-game browser | This boot was prepared for another world's digest | Accept; the launcher relaunches into the world with its mods |
| `mods_relaunch_required` with no launcher installed | The game was started without the launcher | Install the launcher, or start the game through it |
| `required_mods_refused` / a package named as *contains code* | Executable content without a verified verdict on a secured server | Request a review, or run the server unsecured for a trusted community |
| `required_mods_consent` loops | The player declined the consent gate | Expected; the world is not joined |
| `mod_attestation_unavailable` | The master could not be reached for verdicts | Retry; check the directory source |
| Hash mismatch in the log | The server serves different bytes than it announced | Restart the server so it re-stages; if it persists, the package on disk changed |
| `/car … → unknown_model` | Record name malformed or `allowCustomModels` off | Use `Vehicle.<id>` exactly; enable the flag |
| Vehicle spawns as the default model or invisible | TweakXL did not register the record, or the archive is not mounted | Check `TweakXL.log` and `ArchiveXL.log`; confirm the files are on disk |
| redscript error dialog at boot | A `.reds` in a world package does not compile against this game build | Remove the package or update it; the dialog names the file |
| Server refuses to start: `requiredMods` / `preload_mod` error | Disabled `requiredMods` with a preload, an executable preload on a secured server, a missing package path, an over-size archive | Read the named directive; the boot log points at the resource |

## Reference

| Where | Path |
|---|---|
| Server staging | `server/.open77/mods/` |
| Server hosting | `http://<host>:<game port + 1>/mods/v1/blobs/<sha256>` |
| Server config | `server.jsonc` → `requiredMods { enabled, unsecured, packages }`, `resources.load` |
| Resource manifest | `resources/<name>/open77.lua` → `preload_mod`, `dependency` |
| Launcher store | `%LOCALAPPDATA%\Open77\modstore\{blobs,pkg,state}` |
| Launcher log | `%LOCALAPPDATA%\Open77\launcher.log` |
| Launcher settings | `%LOCALAPPDATA%\Open77\launcher-settings.json` (`master`, `modChannel`, worlds joined) |
| Game folder roots | `archive/pc/mod`, `r6/tweaks`, `r6/scripts`, `red4ext/plugins`, `bin/x64/plugins`, `engine/config` |
| Loader logs | `red4ext/logs/`, `red4ext/plugins/ArchiveXL/ArchiveXL.log`, `red4ext/plugins/TweakXL/TweakXL.log` |
| Boot contract | `OP77_CONNECT`, `OP77_CONNECT_MASTER`, `OP77_WORLD_SERVER`, `OP77_WORLD_MODS_DIGEST`; `Open77.session.launcherContext()` |
| Deep link | `open77://connect?server=<guid>&endpoint=<host:port>&relaunch=<pid>` |
