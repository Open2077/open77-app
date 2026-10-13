---
title: "Your Cyberpunk 2077 mods are safe with the OPEN//77 launcher"
date: "2026-10-13"
description: "How the OPEN//77 multiplayer launcher keeps your Nexus Mods setup separate: nothing deleted, Vortex and MO2 friendly, a one-click switch back to your own modded game."
tags: ["cyberpunk-2077-mods", "nexus-mods", "cyberpunk-2077-multiplayer-mod", "launcher", "mod-support"]
---
If you mod Cyberpunk 2077, you have probably spent hours on your load order: a Nexus Mods collection, a Vortex or Mod Organizer 2 profile, ArchiveXL and TweakXL archives, redscript fixes, Cyber Engine Tweaks scripts. Installing a multiplayer mod on top of that is a fair thing to worry about. A recent thread on r/LowSodiumCyberpunk summed up the answer in its title: [OPEN//77's launcher keeps your Nexus mods separate](https://www.reddit.com/r/LowSodiumCyberpunk/comments/1x536c4/open77s_launcher_keeps_your_nexus_mods_separate/).

This post explains exactly how, so you can try Cyberpunk 2077 multiplayer without putting your single-player setup at risk.

## The short version

- **Nothing of yours is ever deleted.** When the launcher sets one of your mods aside, it moves the files into its own store, re-reads and re-hashes them there, and only then takes them out of the game folder.
- **Two profiles, one click apart.** *OPEN//77* has the multiplayer files in place; *Your own game* puts your mods back and takes OPEN//77 out of the folder.
- **It works next to Vortex and Mod Organizer 2.** It never overwrites a file another mod manager owns, and it re-scans on every start.
- **There is always a way back.** Automatic backups of your own game, and a full *Return to vanilla* that hands every file back.

## Two profiles: OPEN//77 and Your own game

The launcher's mod menu has two profiles at the top.

| Profile | What is in your game folder |
|---|---|
| **OPEN//77** | The multiplayer runtime and the mods a server asks for, ready to join a world |
| **Your own game** | Your own mods, as you installed them. OPEN//77's files are taken out of the folder |

Switching to *Your own game* puts your personal mod set back and removes OPEN//77's files; browsing servers again puts OPEN//77 back. Files a server required for its world never appear in your own game. So you can play an evening of online Night City, switch, and be back in your heavily modded single-player save, with the same mods you had before.

## Where OPEN//77's files live

The launcher keeps everything it installs in a **content store** under `%LOCALAPPDATA%\Open77\modstore`, addressed by the SHA-256 of each file. Files are placed into the game folder as hardlinks when your drive allows it, copies otherwise, and every placement is written to a journal.

That journal is what makes removal safe: the launcher only removes files **it placed** and that **still hash as it recorded them**. A file another tool changed is not "ours" any more, so it is reported and left alone rather than deleted.

The multiplayer floor is small and built on the community's own tools: [RED4ext](https://github.com/wopss/RED4ext) to load the plugin, [redscript](https://github.com/jac3km4/redscript) for the game scripts, and OPEN//77's own client and interface. Optional packages such as [Cyber Engine Tweaks](https://github.com/maximegmd/CyberEngineTweaks) are listed with their author and licence, and none of them is switched on behind your back.

## What happens to the mods you installed yourself

The launcher scans the eight folders Cyberpunk 2077 mods live in: `archive/pc/mod`, `r6/scripts`, `r6/tweaks`, `r6/input`, `red4ext/plugins`, `bin/x64/plugins`, `engine/tools` and CET's mods folder. It sorts every file it finds into three kinds:

- **ours**: a package the launcher installed;
- **contested**: a path a package claims, with somebody else's bytes in it. It is never overwritten blindly;
- **foreign**: yours.

Your mods get their own section in the mod menu, with their location, size and any compatibility warning. Two kinds of rule can apply to one of them:

- **Switched off by default**, when it is known to clash with multiplayer. The launcher records that decision; if you switch the mod back on, your answer sticks.
- **Blocked**, when it breaks multiplayer or gives an unfair advantage. That one stays held while OPEN//77 is active, and the menu says why.

Switching a mod off is a **move, never a delete**. Restoring it copies it back, hash-verified, with its original timestamps. A *restore my mods* action hands every held file back at once, and uninstalling OPEN//77 does the same.

## Vortex, Mod Organizer 2 and Nexus Mods collections

You do not have to give up your mod manager. If Vortex (the [Nexus Mods](https://www.nexusmods.com/cyberpunk2077) manager) or [Mod Organizer 2](https://github.com/ModOrganizer2/modorganizer) redeploys a file the launcher had set aside, that is fine: the scan is driven by paths and hashes and runs on every start, so the file is simply seen again. A default you already overruled is left alone.

When a mod manager steps on the multiplayer files themselves, the launcher tells you instead of failing silently:

- just before the game starts, it checks the loader chain and repairs it in one click (*Repair and connect*), naming the Vortex or MO2 folder involved;
- if Vortex rewrote `red4ext/config.ini`, the launcher merges its own settings back into your version of the file;
- **Diagnostics ▸ Other mod managers** lists Vortex deployments that install the same files as OPEN//77, and the Vortex mods to disable.

## A broken script never slips through

Every `.reds` file in the game shares one compilation unit. One outdated script anywhere makes the whole compile fail, and the game quietly falls back to its vanilla scripts. Anyone who has updated Cyberpunk 2077 with a full mod list has met this.

Before it changes a single file, the launcher compiles the script set that would result, against a scratch copy, never your game folder. If it does not compile, nothing is applied: the offending mod is named, the compiler's errors are shown, and you get one click to switch that mod off and try again.

## Mods that servers require

Community servers can require mods for their world: [ArchiveXL](https://github.com/psiberx/cp2077-archive-xl) and [TweakXL](https://github.com/psiberx/cp2077-tweak-xl), a map, a car from Nexus Mods. On Connect the launcher downloads them from the server, checks every byte against the announced SHA-256, and lays them over the multiplayer files for that world only. Join another world and the previous world's files are swapped out; switch to *Your own game* and none of them are there.

Packages that contain code (a `.dll`, a `.reds`, CET Lua) need a review by the OPEN//77 team, or your explicit consent on a server marked as running unreviewed mods. The launcher never rehosts a mod its author did not license for it. Server owners can read how to declare mods in the [server mods guide](/docs/server-mods).

## Backups and Return to vanilla

The launcher makes a zip backup of **your own game**, your mods included and never OPEN//77's files, automatically:

- once, before OPEN//77 is first installed;
- before every return to vanilla;
- before a backup is restored.

Backups live in `%LOCALAPPDATA%\Open77\game-backups`, with a manifest holding every file's SHA-256. **Settings ▸ Backups of your game** lists them, restores one, or makes a new one on demand.

**Settings ▸ Danger zone ▸ Return to vanilla** takes OPEN//77 off the install entirely: it backs up your game, removes every file OPEN//77 placed, gives back the mods it held and any of your own files it had displaced (your RED4ext, redscript or ArchiveXL, for example), resets the script cache and checks the result. It needs no network and no sign-in.

## Questions modders ask

**Will OPEN//77 delete my Nexus mods?**
No. Mods it sets aside are moved into its store after their bytes are verified, and every one can be restored, individually or all at once.

**Can I keep using Vortex or Mod Organizer 2?**
Yes. The launcher never overwrites a file another manager owns, re-scans on every start, and names any conflict it finds.

**Can I go back to my single-player modded game?**
Yes: switch to *Your own game* in the mod menu, or use *Return to vanilla* to remove OPEN//77 completely.

**Which version of the game do I need?**
OPEN//77 targets one exact game build, currently Cyberpunk 2077 2.31, with the Phantom Liberty DLC. The launcher checks your build before it installs anything.

**Where can I learn more about modding Cyberpunk 2077?**
The community's [Cyberpunk 2077 modding wiki](https://wiki.redmodding.org/cyberpunk-2077-modding) and [Nexus Mods](https://www.nexusmods.com/cyberpunk2077) are the places to start.

## Try it

[Download the launcher](/download), sign in, and pick a world from the [server browser](/servers). The [launcher guide](/docs/launcher#mods-you-installed-yourself) covers the mod menu in full, and the [mods guide](/docs/mods) explains every layer for server owners and curious modders. Questions are welcome on [Discord](https://discord.open2077.net).

---

## About OPEN//77

[OPEN//77](https://open2077.net) is a free, in-development **multiplayer mod for
Cyberpunk 2077**: play online with other players in Night City on
community-hosted **dedicated servers**, with synced combat, vehicles and world
state, an account-backed launcher, and Lua-scriptable servers for co-op,
freeroam and RP. Browse [servers](https://open2077.net/servers), read the
[docs](https://open2077.net/docs) to host your own, or join the
[Discord](https://discord.open2077.net) to follow development. This devblog is
published daily, straight from the work the team shipped that day.
