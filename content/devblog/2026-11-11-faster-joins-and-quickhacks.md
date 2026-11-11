---
title: "Faster server joins and built-in quickhacks"
date: "2026-11-11"
description: "OPEN//77 improves Cyberpunk 2077 multiplayer with much faster server joins, built-in quickhack UI, and smoother launcher flows."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-online", "cyberpunk-2077-rp-server"]
---
OPEN//77 made a few high-impact upgrades today: much faster server joins, a built-in quickhack system for servers, and a smoother launcher experience. For anyone following Cyberpunk 2077 multiplayer progress, this is the kind of work that moves the project closer to something that feels fast, coherent, and ready to play.

## Faster server joins in Cyberpunk 2077 multiplayer

The biggest player-facing improvement is the new server resource transport. OPEN//77 servers send custom resources to clients when needed, and that transfer path has now been rebuilt to behave much more like a modern patcher instead of a slow file-by-file installer.

Server resources are now grouped into larger packs, and the client can download those packs over multiple persistent connections. The installer verifies data as it arrives, writes only what it needs, and can reuse files it already has. If the transfer is interrupted, the client can resume instead of throwing away progress and starting over.

That matters because long waits before joining are one of the least exciting parts of any online experience. For a Cyberpunk 2077 multiplayer mod, especially one targeting custom game modes and RP servers, faster joins are a huge quality-of-life upgrade. The work also reduces unnecessary re-reading of installed server resources on the client, which cuts out extra delay during the join path.

In plain terms: less “please wait,” more Night City.

## A built-in quickhack resource for Cyberpunk 2077 RP server creators

The other big feature today is the new official quickhack resource that now ships with every server build. It stays off by default, but a server can enable it simply by depending on it.

This resource gives server developers a native scanner and quickhack-style interface designed to feel like it belongs in Cyberpunk 2077 online play. The scanner supports target selection, the familiar visual language, and game-like audio feedback when a quickhack lands. That means server creators can build netrunner mechanics without having to fake the whole experience from scratch.

Support has already been extended beyond just player targets. Quickhacks can now target players, vehicles, and networked NPCs. Bundled Ping examples are included for different target types, and the system can surface report-card style information on the scanned target. Vehicles also get the right kind of presentation, which helps the scanner feel closer to the single-player game’s device interactions.

The quickhack flow also now blocks weapon switching and related actions while scanning, which helps avoid janky conflicts between combat controls and scanner controls.

For a future Cyberpunk 2077 RP server, this is exciting because it opens the door to better infiltration gameplay, heist mechanics, class-style netrunner roles, and mission scripting that feels native to the setting rather than bolted on.

## Cleaner loading and HUD behavior

Another important usability fix landed in the game client’s UI flow. Server-side NativeUI documents now wait behind the server loading screen until the first placement is complete. This avoids the awkward situation where server UI can appear too early while the player is still effectively loading in.

Light RP also moved its HUD stack to NativeUI and got follow-up fixes from real play sessions. The HUD now behaves better when the game hides interface elements, and it steps aside correctly under loading screens. These are not flashy headline features, but they make the overall experience feel more polished and less prototype-like.

## Launcher improvements for Cyberpunk 2077 co-op and online play

The launcher had a very busy stretch, and the main story is simple: the Rust launcher is now the main OPEN//77 launcher.

That change comes with a long list of player-facing improvements. Update flow and server join flow have been unified into one clearer journey, which reduces the feeling of bouncing between separate systems. The launcher can now switch to a compatible client version and resume a server join more cleanly, which is especially useful when a server requires a different approved build.

There were also many fixes around mod installs, backups, Linux and Wine path handling, archive compatibility, and refresh timing for the server list. A few of those fixes address edge cases that can completely block play on certain setups, so even though they sound small individually, together they make OPEN//77 easier to trust.

The launcher also continues to improve visually, with better server details presentation, a real app icon on Windows, and updated download links on the website for current preview builds.

## Better tools for server owners

On the website side, server owners can now manage server licenses and moderated community launch announcements. That means better control over upcoming launches and cleaner presentation for communities preparing their first public steps.

Quickhack documentation and examples were also added to the docs site, including guides built around the bundled Ping behavior. That should help server creators move from “interesting feature” to “working gameplay” much faster.

## Why today matters

Today’s changes hit three important layers of the project at once: the waiting time before play, the feel of in-game systems, and the reliability of the launcher that gets players into Night City online.

For players, the headline is faster joins and a smoother launch experience.

For server owners, the headline is new built-in quickhack tools and better platform support.

For the bigger picture of CP2077 multiplayer, this is exactly the kind of update that turns core infrastructure into visible progress.

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
