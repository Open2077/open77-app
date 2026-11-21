---
title: "Movement feels better, launcher fights less"
date: "2026-11-21"
description: "OPEN//77 improved movement feel, fixed launcher stability, and added native Rust server egg support for Cyberpunk 2077 multiplayer servers."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-dedicated-server", "launcher", "night-city-online"]
---
OPEN//77 made a strong polish pass today across both the game build and the launcher. The biggest wins are smoother third-person movement, cleaner first-person presentation, and a much more resilient launcher experience for players jumping into Cyberpunk 2077 multiplayer.

## Smoother motion in Cyberpunk 2077 multiplayer

Third-person movement got another meaningful upgrade. The local body, camera, and animation timing now follow the game engine’s own simulation step instead of a rougher timing source.

That change matters because movement smoothness is not just about raw frame rate. In a **Cyberpunk 2077 multiplayer mod**, the character body, camera motion, and animation playback all need to stay in sync while the game is constantly updating position and state. When those pieces run on slightly different timing, players notice small jitters, uneven follow motion, or movement that feels a little "off" even when the server is working correctly.

Using the engine simulation clock brings those pieces closer together. The practical result for players is simpler: third-person movement should look cleaner and feel more natural while running around Night City.

## Better traversal and animation behavior

Several annoying movement issues were fixed in the same batch.

The jog-to-sprint transition no longer drops into a strange slow-motion feeling before full sprint speed kicks in. This was one of those bugs that made movement look less responsive than it really was. Sprinting should now read faster and more correctly from the moment the transition starts.

Vaulting is also replicating again. That means traversal actions are being shown properly instead of silently failing to appear where they should. In a **Cyberpunk 2077 co-op** or RP setting, traversal readability matters a lot because other players need to see what happened, not just guess from position changes.

Stair animations were cleaned up too. Previously, some slopes, hills, and road ramps could accidentally trigger stair-specific movement clips. That made travel in places like the Badlands or on city inclines look odd. Now those clips should only appear on actual stairs.

## First-person outfits and vehicle audio fixes

The first-person body got an important presentation fix: layered outfits now stay visible correctly.

This is the kind of bug that can break immersion fast. If clothing layers do not appear reliably in first person, the player experience feels unfinished even if the underlying systems are working. This fix should make outfitting and character presentation more consistent during regular play.

Vehicle audio also got a cleanup pass. Two issues were addressed: stacked radio playback and a bike start sound that could replay when it should not. Those are small details on paper, but they have a big impact in practice. Audio bugs tend to make a world feel messy very quickly, especially in a **Cyberpunk 2077 online** session where players spend a lot of time entering vehicles, driving, and swapping stations.

## Launcher 0.2.27: faster, tougher, less frustrating

A new launcher version, 0.2.27, is now live on the website.

This update focused heavily on real-world failure cases. The launcher is now better at recovering from weak or unstable network connections during downloads and while loading the server list. It also handles unreadable preferences more gracefully by letting players start from default settings instead of getting stuck.

Install reliability improved too, especially for players with game libraries on exFAT or FAT32 drives. That kind of storage-specific issue can create endless update loops, so this fix should remove a particularly frustrating class of install failures.

Session handling also got smarter. If an authenticated session has been closed elsewhere, the launcher now treats that situation more clearly instead of surfacing a confusing sign-in error. Offline starts and store relaunch behavior were improved as well, which should help players return to the game with less friction.

On top of that, the launcher now does a better job surviving GPU, window, runtime, cache, and update failures without simply collapsing. Hashing, downloads, and some UI asset work were optimized too, so routine startup and patching should feel quicker.

## Native Rust server support in the official server egg

For future hosts, the official server egg now supports the native Rust server build.

That is not a flashy player-facing feature, but it matters for the long-term health of **Cyberpunk 2077 dedicated server** hosting. Easier deployment and clearer readiness handling reduce friction for server owners getting infrastructure online.

## Why this day matters

This update is a good example of the work that makes OPEN//77 feel more playable day by day. None of these changes are marketing tricks. They are the practical improvements that make **CP2077 multiplayer** feel smoother, more stable, and more believable once players are actually in the world.

Cleaner movement, correct traversal, better first-person presentation, less broken audio, and a launcher that fails more gracefully all move the project in the right direction. Night City online gets a little more solid every time these rough edges disappear.

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
