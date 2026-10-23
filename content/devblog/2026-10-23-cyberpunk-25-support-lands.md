---
title: "Cyberpunk 2.5 support lands \u26a1"
date: "2026-10-23"
description: "OPEN//77 now supports Cyberpunk 2077 multiplayer on patch 2.5, with launcher updates, server browser fixes, wardrobe additions, and vehicle polish."
tags: ["cyberpunk 2077 multiplayer", "cyberpunk 2077 multiplayer mod", "cyberpunk 2077 dedicated server", "cp2077 multiplayer", "night city online"]
---
OPEN//77 made a major compatibility jump this week: the project has been ported forward to **Cyberpunk 2077 patch 2.5**. That includes the game runtime, launcher flow, server browsing, and key support libraries that a **Cyberpunk 2077 multiplayer mod** depends on to run on the latest version of the game.

This is the kind of update that is not flashy in one screenshot, but it matters a lot for the road to playable builds. Getting **Cyberpunk 2077 multiplayer** working on a new game patch means reconnecting many moving parts: the client, the dedicated server, the launcher, the UI, appearance systems, and compatibility layers used by content tools.

## Cyberpunk 2077 2.5 compatibility across the stack

The biggest news is simple: OPEN//77 is no longer waiting on patch 2.5 from the sidelines. The base runtime and server defaults were updated for the latest Cyberpunk 2077 build, and the in-game shell was fixed so players can browse servers correctly on 2.5.

That same compatibility push also reached the launcher. The launcher now supports Cyberpunk 2077 2.5 installs directly, includes updated preflight handling for the current environment, and is better at recovering from real-world player setups. If a player had older local directory preferences, the launcher can now recover them instead of forcing a messy manual fix.

Another practical improvement: a game reinstall no longer causes the launcher to stumble over missing retained world files. That sounds small, but it is exactly the kind of friction that can derail a returning player before they even press Play.

## Character visuals and wardrobe got a real upgrade

The 2.5 move also came with useful work on appearance systems. The team fixed regressions affecting the map, reload observation, and appearance rendering, which helps stabilize how the world and characters present themselves after the version jump.

New **local character previews** and **appearance NPCs** were added as well. For players, this means better presentation and easier visual feedback around character looks. For a project aimed at social play, freeroam, and future **Cyberpunk 2077 RP server** experiences, better preview and appearance handling is more important than it might seem at first glance.

Wardrobe support also moved forward with fresh Cyberpunk 2.5 content, including new wardrobe entries and filming equipment support. On top of that, hexadecimal wardrobe favorites are now preserved correctly, which is good news for anyone who cares about keeping exact style choices intact instead of rebuilding them after updates.

There was also follow-up work to keep character presentation cleaner in motion, including fixes for duplicate proxy underwear and adjustments related to cyberware state syncing.

## Vehicle interactions are getting more reliable

Vehicle behavior picked up a few solid improvements in this batch. Empty-car ignition now persists correctly, so a vehicle remembers the expected state instead of feeling inconsistent after interactions. Unlock prompts were also refreshed, helping vehicle access feedback stay accurate.

Headlight projection was fixed too, which improves how vehicles look in the world and helps nighttime driving feel less broken. Sirens were packaged in a rebindable way, and the bundled siren resource can now be discovered properly by Freeroam.

These are the kinds of fixes that make a **Cyberpunk 2077 online** session feel less prototype-like. Players may not see the engineering work behind them, but they absolutely feel the difference when interactions behave consistently.

## Input, performance, and movement quality-of-life

A few quality-of-life fixes in this drop are worth calling out because they solve frustrating edge cases.

AltGr text input now works correctly in both WebUI and the default chat. That matters a lot for players using non-English keyboard layouts, and it removes a surprisingly painful barrier to normal social play.

The team also fixed social gaze frame stalls, which targets a source of performance hitching, and expanded support for large locomotion collections without requiring existing packages to be reworked. In plain terms: more animation and movement content can scale up more cleanly.

NCWE also picked up Cyberpunk 2.5 support, which matters for creators building world content for future servers. Night City editing changed significantly in the 2.5 patch, so getting the editor moving again is an important step for anyone planning custom spaces and server experiences.

## What this means for players and server owners

For players waiting for **CP2077 multiplayer**, this update is a strong sign of momentum. Patch 2.5 compatibility is one of those milestones that has to happen before the fun stuff can keep stacking on top. Without it, every other system stays blocked by the base game version.

For future server owners, the same story applies. A working compatibility path across the dedicated server, launcher, directory, and content tooling is the foundation for stable deployment later on.

The website and platform were updated with fresh guidance around the 2.5 transition, launcher requirements, and current Stable rollout information, so the public-facing side now matches the technical progress.

This was a heavy systems week, but it was valuable work. OPEN//77 is now much better positioned to keep building a real **Cyberpunk 2077 dedicated server** ecosystem on the latest version of the game, with better visuals, cleaner vehicle behavior, and fewer setup headaches along the way.

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
