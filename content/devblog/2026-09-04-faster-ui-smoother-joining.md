---
title: "Smoother joins, faster UI, better server visibility"
date: "2026-09-04"
description: "OPEN//77 improved Cyberpunk 2077 multiplayer with GPU-powered UI, smoother world-mod joining, full server rosters, and better match feedback."
tags: ["cyberpunk 2077 multiplayer", "cp2077 multiplayer", "cyberpunk 2077 online", "cyberpunk 2077 dedicated server", "night city online"]
---
OPEN//77 made a big usability pass today across the launcher, in-game UI, server browser, and match flow. The result is a smoother Cyberpunk 2077 multiplayer experience: easier joining, faster menus, clearer server population, and several gameplay fixes that players will notice right away.

## Smoother joining when a world needs mods

One of the most frustrating problems in any Cyberpunk 2077 multiplayer mod is hitting a server that needs content your current game boot does not have loaded. OPEN//77 now handles that much more gracefully.

If a player tries to join a world from the in-game browser and that world requires mods that are not available in the current session, the game can now hand the job off to the launcher, let the launcher install what is needed, and then bring the player back through a clean relaunch. That matters because some game content has to be present at boot. Installing it mid-session is not realistic, so the better experience is to detect the problem early and guide the player through a clean path instead of letting the join fail mysteriously.

The launcher side also got several important fixes around world-required mods. World packages are now treated as an added layer on top of the normal OPEN//77 stack instead of replacing it. In practical terms, joining one world should no longer wipe out files the session still needs from the core stack. The launcher now also applies world mods on every connect, not only on the first download, which closes a nasty reliability gap for repeat joins.

## Launcher updates itself now

The launcher also took a big step toward feeling like a modern game client. It can now stage its own updates automatically and only asks for a restart when the new build is ready. Closing and reopening is enough to complete the swap.

That may sound small, but it removes a lot of friction for players waiting to play Cyberpunk 2077 online. Before this, an update could sit unnoticed behind a banner. Now the common path is quieter and simpler, which should reduce support issues and keep more players on the current version.

The repair and diagnosis flow got better too. The launcher now does a better job telling players what is actually wrong with an install instead of dumping a long list of symptoms. A missing framework, for example, can break many player mods at once. Calling out the real cause is a lot more useful than listing two dozen failures with no explanation.

## GPU-powered WebUI for faster HUD and menus

This is one of the most exciting technical upgrades of the day. OPEN//77 moved WebUI frame transport onto the GPU, replacing a slower path that copied frame data through the CPU.

For players, the visible result is straightforward: the in-game UI can run faster, look sharper, and respond better. The freeroam HUD now runs at 60 fps, and the general page limit has been raised much higher. The shell can run at high refresh rates, and the game-side checks now allow those faster surfaces correctly.

This work also included adapter handling and frame transport improvements so the UI behaves more reliably on systems with more than one GPU. That is the kind of upgrade that helps a Cyberpunk 2077 co-op experience feel polished, even if the player never knows why the menus suddenly feel cleaner.

The pause menu got a presentation overhaul at the same time. It now follows the OPEN//77 design language more closely, with a wider settings layout and a cleaner cyberpunk-style visual treatment.

## Full player rosters in the browser and scoreboard

OPEN//77 now carries actual player rosters through the server heartbeat, which unlocks a much better browser experience.

On open2077.net, the server detail page can now show who is online instead of only showing a raw count like "2 / 32." For a public Cyberpunk 2077 RP server or a freeroam server, that makes the listing feel far more alive. Players can see whether friends are around, and server owners get a stronger first impression when someone clicks into their page.

The same roster work also improved the in-game Tab scoreboard. Instead of only listing nearby streamed players, it now shows everyone on the server. The display distinguishes the local player, nearby players, and far-away players, which makes the board useful even on a busy or spread-out map.

## Battle royale clarity and AV fixes

The battle royale mode got several player-facing improvements. The closing cordon is now more readable and more dramatic, with stronger visual feedback both for the approaching zone and for being outside it. The team also reworked the final block behavior so the closing zone does not always feel identical from match to match.

Eliminated players now see their result immediately instead of waiting for the match to end. That is a simple but important pacing fix for any competitive mode.

Loot reliability improved too: healing loot was fixed so crates no longer appear to drop nothing when they should be providing medical items.

Vehicle work continued as well, especially around AVs. Several defects were fixed, including ride-state problems and broken exit behavior. These fixes are aimed at making shared vehicle moments in Night City online feel less glitchy and more dependable.

## Better stability for everyday play

A particularly important stability fix landed today: a failure in ambient population no longer takes down the whole Open//77 plugin. That kind of protection matters because it turns one bad subsystem into a contained problem instead of a full failure that keeps a player from loading the mod at all.

For future server owners running a Cyberpunk 2077 dedicated server, that kind of resilience is just as important as flashy features. A stable baseline gives every other system a better chance to shine.

## Why this day matters

Today was not about one giant headline feature. It was about removing friction across the entire OPEN//77 experience.

Players got cleaner joining, faster UI, better feedback, and clearer server presence. Server owners got richer browser listings and a world that feels more populated at a glance. And the project took another step toward making CP2077 multiplayer feel less like a prototype and more like a real platform.

That is the kind of progress that adds up fast.

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
