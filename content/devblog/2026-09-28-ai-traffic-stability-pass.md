---
title: "AI traffic got a big realism + stability pass"
date: "2026-09-28"
description: "OPEN//77 improved AI traffic, car stealing, and large mod support for its Cyberpunk 2077 multiplayer mod and dedicated server platform."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-dedicated-server", "night-city-online", "cyberpunk-2077-rp-server"]
---
OPEN//77 shipped a big traffic-focused update today, with better AI car behavior, more reliable vehicle syncing, and new server controls. For anyone following our **Cyberpunk 2077 multiplayer mod** progress, this is one of those updates that makes Night City feel less like a test scene and more like a living world.

## AI traffic now behaves more naturally after combat and car theft

One of the most noticeable changes is what happens when an AI driver dies inside a vehicle. Instead of instantly breaking the illusion, the driver now stays seated and slumped in the car until a player actually steals it. That presentation is also kept consistent for other players and even for people who join later.

We also fixed the follow-up moment during vehicle theft. After a player drags the driver out, the body now properly separates from the car once the exit is over. Before this fix, bodies could remain attached in the wrong state and slide away with the vehicle, which was funny once and immersion-breaking every time after.

These changes matter because street interactions are a huge part of **Cyberpunk 2077 online**. If stealing a car looks wrong, the whole scene feels fake. This pass makes those moments read much more like the base game, but in multiplayer.

## Big stability work for vehicle handoffs, crashes, and nearby traffic

The larger part of the update is stability. AI traffic in a multiplayer game has to be handed between different simulators as players move around the city. That is a hard problem, especially when cars are in motion, colliding, recovering, or only partially visible to different players.

This update improves those handoffs in several ways. Vehicles now keep better placement data when control changes, which reduces the chance of a car snapping backward after a stall or ownership change. Failed placements also recover more safely, and traffic close to players is retained more reliably instead of being removed too early.

Crash handling also got a big pass. Some impact victims could get stuck, disappear, fail to rejoin traffic, or even fall through the world in edge cases. Those situations are now handled more carefully, especially when a vehicle is stalled, recovering, or waiting to re-enter traffic flow. The result is simple: fewer "where did that car go?" moments and fewer immersion-killing failures during chaos.

## Smarter spawning and cleaner traffic density in Night City online

We also tuned how traffic appears and how long it stays around.

Spawn behavior is now smarter about where cars are created. The system avoids bad candidate roads more aggressively, frees blocked spawn spots correctly, and excludes moving player paths so traffic is less likely to appear in awkward places near active players. We also added protection against repeating failed spawn corridors over and over.

On top of that, default traffic tuning was adjusted. Cars now spawn from a shorter default distance, the number of vehicles allowed in a local spawn area is capped more cleanly, and cars that are far outside every player's streaming window are retired sooner. Together, those changes help keep the streets feeling active around players without flooding the wider map with unnecessary traffic.

For a future **Cyberpunk 2077 RP server**, this kind of tuning is important. Roleplay servers need the city to feel alive, but they also need performance and predictability for players who spend a long time in one district.

## New live server controls for AI drivers and stealable cars

Server owners also got new traffic controls.

Two live settings are now available for traffic behavior. One can make AI drivers unkillable, and the other can disable stealing traffic cars entirely. Both are on by default in their normal gameplay-friendly state, but server operators can now change the rules depending on the style of server they want.

That opens up more options for curated experiences, event servers, or heavily moderated RP rulesets on a **Cyberpunk 2077 dedicated server**.

## Larger mods now fit through the preload system

Outside of traffic, we raised the resource preload ceiling to 256 MiB.

That change matters because some world and environment mods are simply large. Previously, certain bigger archives could hit the old limit even when they were valid content players would reasonably want to use. With the higher ceiling, OPEN//77 can support much larger modded assets and world packages through the normal flow.

For players, that means better compatibility with ambitious visual or environmental server setups. For server owners, it means fewer compromises when building a custom Night City experience.

## Passenger drive-bys moved forward in research

Today also included progress on passenger drive-bys. This was not a full gameplay release yet, but the team captured more of the required state, animation behavior, and implementation constraints needed to make it work properly in multiplayer.

That is groundwork, not a promise of immediate release, but it is a meaningful step toward richer vehicle combat scenes in OPEN//77.

## Why this update matters

This was a very practical day for OPEN//77. The flashy headline is better AI traffic, but the real value is trust: cars behave more consistently, wrecks look more believable, nearby traffic survives edge cases better, and server owners have more control over how the city works.

For a **Cyberpunk 2077 co-op** and multiplayer project, believable traffic is not background decoration. It is part of the core fantasy of being in Night City with other players. Every fix that keeps the city stable, readable, and reactive gets us closer to that goal.

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
