---
title: "Launcher goes public, mod support gets real"
date: "2026-08-29"
description: "OPEN//77 added a public launcher download, safer mod handling, better loading screens, and pursuit upgrades for Cyberpunk 2077 multiplayer."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-online", "cyberpunk-2077-dedicated-server", "cyberpunk-2077-co-op"]
---
OPEN//77 had a big quality-of-life day. The team pushed a public launcher download page, improved server joining with better loading screens, upgraded pursuit mode, and made the launcher much safer for players who already use mods in their own Cyberpunk 2077 install.

For anyone tracking Cyberpunk 2077 multiplayer, this is one of those updates that is less about flashy trailers and more about removing friction. Getting in, understanding what is happening, and keeping your single-player setup intact all matter if a Cyberpunk 2077 multiplayer mod is going to feel usable day to day.

## The launcher is now publicly downloadable

The OPEN//77 website now has a proper download page for the launcher, and that page is listed like a normal part of the site instead of being hidden behind awkward wording. That sounds small, but it matters: the launcher is the front door for the project, and a front door should be easy to find.

The site also now includes dedicated launcher documentation for two groups: players and future server owners. Those audiences need different answers. Players want to know how to sign in, install, update, and launch. Server owners want to understand how the launcher connects to worlds, content, and the broader platform. Splitting that information into separate guides is a much better experience than making both groups dig through one giant catch-all page.

There is one important catch: downloading the launcher is public, but entering a world is now gated behind per-account alpha access. In plain terms, people can pre-download and get ready, but only accounts with access can actually join live worlds right now. That is a cleaner and more honest way to handle an in-progress alpha than pretending the launcher itself is still unavailable.

## Better loading flow for Cyberpunk 2077 online

Joining an OPEN//77 server should now feel much more intentional. Instead of dropping players through the base game's awkward loading flow, the mod can now mask the vanilla screen, skip the "press space to continue" interruption, and show world-loading progress while connecting.

That matters for immersion, but it also matters for clarity. When a player joins Night City online, the worst feeling is staring at a frozen or misleading screen and wondering whether anything is happening. Progress feedback fixes a lot of that uncertainty.

There is also a new server-provided loading screen feature. A server can declare its own loading screen page, and the launcher will render it while the player joins that world. For future Cyberpunk 2077 RP server communities and custom worlds, that creates space for branding, rules, tips, lore, or simply a better first impression.

## Pursuit mode feels more complete

Pursuit mode got several important gameplay improvements. First, the missing pursuit HUD from the recent release is back. That alone is a big fix because mode-specific UI is not optional in a competitive activity; players need the information.

The mode logic also changed in ways that should make rounds easier to read. The old "bust" outcome has been reframed as an arrest, crashes now stall the engine, and the starting setup is more structured. Those changes sound mechanical, but they affect how fair and understandable each round feels.

Tied matches also now support a proper sudden-death decider, and that extra round is announced clearly. Instead of a confusing or anticlimactic end, players get a cleaner competitive finish.

## Props are now solid and better placed

Spawned props received a practical fix: they are now solid, and their placement is more reliable. Previously, some props could be walked through, while others could appear in the air or get stuck in bad positions.

All currently supported prop hosts were rebuilt around the corrected behavior, so this is not just a one-off patch for a few objects. For players and event hosts, that means world interactions should feel more believable. For server owners planning activities, it means props are more dependable as actual physical objects in the world.

## Safer mod handling in the launcher

This is one of the most important long-term changes in the update. The launcher now has a real mod menu, better control over what loads, support for player-installed mods, a blacklist for known-problem mods, and a quarantine flow for mods that should not be active with OPEN//77.

The biggest usability win is profile separation. Players now have two profiles: one for OPEN//77 and one for their own game. That means playing CP2077 multiplayer should no longer feel like manually tearing apart and rebuilding a personal single-player mod setup every time you switch modes.

The launcher also now respects RED4ext's ignore behavior, which helps preserve the player's own local setup more accurately, and it persists "off by default" decisions correctly when a mod is first detected.

On top of that, the launcher now checks for Phantom Liberty before starting the download and install process. OPEN//77 is built around Cyberpunk 2077 2.31 with Phantom Liberty, so catching that requirement early saves players from a wasted setup attempt.

## Better server list information

Server rows in the launcher now do a better job of reflecting what the platform actually knows and what a server operator has published. The update fixes cases where the interface could imply that every world was online even when that was not true.

This is especially important as OPEN//77 moves toward a larger audience. If Cyberpunk 2077 dedicated server hosting is going to be part of the ecosystem, players need to trust the browser, and operators need their published details to actually show up correctly.

## Why this update matters

This update did not introduce one giant headline feature. Instead, it connected a lot of important pieces: the launcher is easier to get, joining a world looks and feels better, pursuit mode is more polished, props behave more like real objects, and modded single-player installs are treated with much more respect.

That is exactly the kind of work a serious Cyberpunk 2077 co-op and online project needs before wider testing. It reduces confusion, protects player setups, and gives future server owners more room to shape the experience from the first loading screen onward.

OPEN//77 is still in development, but this was a strong step toward making CP2077 multiplayer feel like a usable platform instead of just a promising prototype.

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
