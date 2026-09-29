---
title: "Launcher gets a real safety net"
date: "2026-09-29"
description: "OPEN//77 adds safer backups, vanilla restore, and a smoother launcher flow for the Cyberpunk 2077 multiplayer mod."
tags: ["cyberpunk-2077-multiplayer", "cyberpunk-2077-multiplayer-mod", "cp2077-multiplayer", "launcher", "dedicated-server"]
---
OPEN//77 shipped a launcher-focused update today, with the biggest win being safety for your base game. The new backup and restore tools make it much easier to try the Cyberpunk 2077 multiplayer mod without feeling like your single-player install is at risk.

## Safer backups for your Cyberpunk 2077 install

The launcher can now create backups of your own game files and manage them directly from Settings. That includes viewing saved backups, restoring one when needed, deleting old ones, creating a new backup on demand, and opening the backup folder from the launcher.

This matters because players moving between modded multiplayer, solo play, and their own local tweaks need confidence that their install can be put back the way they had it. OPEN//77 now treats that as a first-class feature instead of something players have to manage manually.

## A real “Return to vanilla” option

Alongside backups, the launcher now includes a red-zone “Return to vanilla” action. The goal is straightforward: if you want to step out of OPEN//77 and go back to a normal Cyberpunk 2077 install, the launcher can guide that process cleanly.

That is especially useful for players who alternate between Night City online sessions and regular single-player. It is also useful for cautious first-time users who want a clear exit path before they even install anything.

## Fixing restore edge cases from older OPEN//77 setups

One of the more important fixes today addresses a subtle problem from older launcher behavior. In some situations, previous OPEN//77 files could be treated like they were part of the player’s original game. If that happened, switching back to solo or uninstalling could restore the wrong files.

That is now corrected. The launcher is much more careful about distinguishing your own game from OPEN//77-managed files, so restoration is more trustworthy. This is not a flashy feature, but it is the kind of polish that makes a Cyberpunk 2077 co-op and multiplayer setup feel mature instead of risky.

## Better mod scanning on real installs

The launcher also got smarter about how it looks for third-party mods. OPEN//77’s own runtime cache is now ignored during foreign-mod scanning.

Why does that matter? On large installs, the old scan could get buried in OPEN//77-generated files and run out of room before it even reached the player’s actual mods. Skipping the cache means the launcher can spend its effort on the files that players and server owners actually care about.

That should lead to more accurate warnings and less confusion when checking whether a setup is clean enough for OPEN//77 or a specific Cyberpunk 2077 RP server.

## New default Play home page

Today also brought a visual and flow update to the launcher. The default page after startup is now Play, rebuilt as a bento-style home screen.

The new layout is designed around the actions players use most:

- resuming the last server they joined
- checking live player counts
- seeing update status
- reading current news

The setup tile was removed, and the first screen now feels more like a useful dashboard than a temporary stop on the way to playing. Startup should also look cleaner, with less flashing between pages.

## Reliability fixes that reduce friction

Several smaller launcher fixes should make the whole experience feel more solid:

- actions triggered by the page now always get a response, instead of occasionally hanging forever on a failed request
- browser-opening behavior from launch options now works correctly
- log files now rotate instead of growing without limit

These are the kinds of quality improvements players may only notice by their absence: fewer stuck states, fewer weird edge cases, and cleaner diagnostics when something does go wrong.

## Unstable builds and docs updates

On the release side, new unstable client and Cyberpunk 2077 dedicated server builds were recorded and deployed, including the latest German unstable rollout.

For creators, new documentation was also published for passenger drive-by scripting, including car and motorcycle support in the current unstable line. That is more relevant to resource authors than regular players, but it points to the feature set continuing to grow for the wider OPEN//77 ecosystem.

## Why this update matters

A lot of multiplayer projects chase new features first. Today’s work focused on trust, recovery, and flow. For a Cyberpunk 2077 multiplayer mod, that is a big deal. Players need to know they can install, test, roll back, and return to solo play without turning their game folder into a gamble.

OPEN//77 is getting closer to that standard. Safer backups, cleaner restores, better mod detection, and a more usable launcher home page all make the project easier to live with day to day.

That is not as flashy as a new combat mechanic or headline system, but it is the kind of foundation that makes long-term Cyberpunk 2077 online play possible.

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
