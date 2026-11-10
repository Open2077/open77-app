---
title: "Smoother joins, smarter UI, and a much stronger Light RP day"
date: "2026-11-02"
description: "Today's Cyberpunk 2077 multiplayer mod update improves joining, UI input, launcher server history, and delivers a major Light RP content pass."
tags: ["cyberpunk-2077-multiplayer", "cyberpunk-2077-multiplayer-mod", "cyberpunk-2077-rp-server", "cp2077-multiplayer", "night-city-online"]
---
Today’s update focused on two things: making the core experience more reliable, and making Light RP feel much closer to a real playable slice of Night City. The result is a better day for both players waiting for **Cyberpunk 2077 multiplayer** and future hosts watching how the platform is maturing.

## Core multiplayer stability got a meaningful cleanup

Several fixes landed in the base game layer that directly affect how stable and smooth the client feels.

One crash tied to specific idle and relaxed movement animations is now fixed. This was the kind of issue that could appear only when certain clips were sampled, which makes it especially annoying during testing because it feels random from the player side. Removing that crash is a simple win: fewer sudden client deaths during normal movement and ambient gameplay.

Input handling also got a very important correction. Until now, when a WebUI page or another Open77 layer captured input, it could swallow not only the key press but also the key release. That could leave the game thinking a key or mouse button was still held down. This kind of bug creates all sorts of strange behavior, from movement problems to controls feeling “stuck.” The new behavior hands the game every release it is expecting, which should make menus and in-game overlays feel much safer to use.

Another practical fix targets joining problems on Windows. Some players could fail to join because resource files ended up with paths that were too long for certain installs. That has now been addressed in the resource cache flow, which should remove a frustrating edge case where the game worked fine for one person and mysteriously failed for another.

There was also work on NPC spawn churn in dense crowds. During heavy movement through busy areas, bodies that were still loading could be removed too early, leading to crashes. The updated logic is more careful about spawn timing and cleanup, which should improve stability in crowded scenes — a big deal for any future **Cyberpunk 2077 online** server that wants busy public spaces.

## Better UI foundations for Cyberpunk 2077 co-op features

The WebUI system now has a proper cursor API. In plain terms, pages can hide the default Open77 cursor and draw their own software cursor with styles that follow CSS rules.

That may sound small, but it matters a lot for polish. Menus, radial interfaces, custom inventories, character screens, and server-specific apps all benefit from having a cursor that matches the design instead of fighting a hard-coded pointer. For players, this means cleaner and more immersive interfaces. For server creators building a **Cyberpunk 2077 RP server**, it opens the door to much more bespoke UI design.

The client Lua runtime also got a useful safety adjustment. The kill threshold was increased significantly without changing the frame budget itself. The practical effect is that heavier client-side systems have more room before being forcefully stopped, while still keeping per-frame work under control. This became especially relevant for larger interaction systems in Light RP.

## Launcher and server discovery became more informative

The launcher received a visible usability pass.

Players can now open a server profile drawer, see player history, and get better loading feedback while browsing. Server names and featured rows also gained more styling support, making the browser easier to read and better suited to presentation.

On top of that, verified launcher updates can now apply silently at startup, with an opt-out setting for people who prefer manual control. That should help more players stay current without extra friction.

Behind those launcher changes, the platform backend now retains public server player history and exposes it through a cached API. The user-facing result is straightforward: server browsing is gaining memory, context, and a better sense of activity instead of feeling like a flat list.

## Light RP added more places, more gear, and more reasons to explore

Light RP had the biggest visible content push of the day.

Five gun stores were added across Night City, each focused on specific weapon families, with 22 weapons available and ammunition handled as inventory items. The stores also received proper weapon icons on the 3D map, which helps them stand out instead of blending into generic markers.

The weapon flow also improved a lot. There is now a weapon wheel, native-style UI sounds from the game’s own audio mix, better holstering behavior, and improved handling when returning to the world after connecting or respawning. The wheel ended the day in a much stronger state, including fixes for opening behavior and holstering edge cases.

Walk mode was moved to F4 by default, which is a practical keyboard fix for international layouts. On AZERTY keyboards, using A for walk mode was a bad fit because A is part of normal movement.

Wardrobe spots were added at the game’s clothing stores, and bars and clubs were added to the maps as discoverable places. These are not giant headline systems on their own, but together they make Night City feel more like a social world and less like a test map.

## Mission and interaction reliability improved under real testing

A lot of the Light RP work today came from rapid iteration after live testing. That is exactly the kind of progress that matters in an in-development **Cyberpunk 2077 multiplayer mod**.

Interaction lists were causing several different problems: shops not appearing, updates failing under event limits, client work overrunning script budgets, and full rebuilds happening too often while driving. Those systems were reworked so lists can be requested more reliably, processed in slices, and updated with less churn. For players, the benefit is simple: shops, markers, rings, blips, and 3D map points should appear more consistently and behave more smoothly.

Mission gameplay also got stronger. Authored missions now support loadout selection similar to the Chimera raid flow, mission weapon kits were fixed so they actually work after respawn, and NPC damage handling was corrected to use the proper authoritative health model. Reinforcements in the Chimera raid received the same health-handling improvement.

This is the kind of update that does not just add features — it turns fragile features into systems that can survive real player behavior.

## Why this day matters

For players waiting on **Cyberpunk 2077 co-op** or full **CP2077 multiplayer**, today’s changes move the project forward in the right way. Stability improved, UI flexibility improved, joining got safer, and Light RP gained both content and reliability.

For future server owners, the picture is also getting clearer: better launcher discovery, richer server profiles, custom cursor-ready WebUI, and a more battle-tested RP layer all point toward a stronger dedicated-server ecosystem for Night City online.

---

## About OPEN//77

[OPEN//77](https://open2077.net) is a free, in-development **multiplayer mod for
Cyberpunk 2077**: play online with other players in Night City on
community-hosted **dedicated servers**, with synced combat, vehicles and world
state, an account-backed launcher, and Lua-scriptable servers for co-op,
freeroam and RP. Browse [servers](https://open2077.net/servers), read the
[docs](https://open2077.net/docs) to host your own, or join the
[Discord](https://discord.gg/open77) to follow development. This devblog is
published daily, straight from the work the team shipped that day.
