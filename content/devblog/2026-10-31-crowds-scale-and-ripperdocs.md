---
title: "Night City gets crowded, smarter, and more scalable"
date: "2026-10-31"
description: "OPEN//77 adds smarter crowds, scalable NPC replication, SQLite for Lua, and new RP features for a richer Cyberpunk 2077 multiplayer mod."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-rp-server", "cyberpunk-2077-dedicated-server", "night-city-online"]
---
OPEN//77 made a big step toward a more alive and more scalable **Cyberpunk 2077 multiplayer mod** today. The headline changes are denser and smarter pedestrian crowds, a major networking pass for NPCs and player visibility, new built-in SQLite support for Lua resources, and fresh roleplay features including a ripperdoc flow and the standalone 3D Night City map.

## Smarter crowds make Night City feel alive

The pedestrian system received a big gameplay-facing upgrade. Crowds now follow the base game's time-of-day density and composition rules, which means the city can better match the rhythm players expect from Cyberpunk 2077. Busy hours feel busy, quieter hours feel quieter, and the mix of pedestrians is closer to the original game.

Crowd behavior also got more reactive. If a player draws a weapon near walkers, those nearby pedestrians can flee. If gunfire breaks out and the shots hit nobody, the crowd can still panic. That sounds simple, but it matters a lot for atmosphere: player actions now create believable reactions around them instead of feeling disconnected from the world.

The team also adjusted how crowds stay around players. Pedestrians now spawn in a tighter useful ring, recycle faster, and appear in ways that better support forward motion through the city. The practical result is a world that stays populated where players actually are, instead of spending budget on less visible areas.

## Cyberpunk 2077 multiplayer scaling: more NPCs, less waste

A huge part of today's work focused on scale. OPEN//77 added a more efficient way to send NPC movement across the network by batching updates together instead of treating each motion update as its own separate little event. For players, that mostly translates to one thing: better odds that large crowds and busy scenes stay stable as server populations grow.

Client playback for lower-rate NPC updates was improved too. Distant walkers that only update a few times per second now extrapolate more naturally across the full sample spacing, which helps reduce the "freeze, then snap" look that can happen with sparse updates.

On the server side, NPC limits are now configurable and much higher by default. The project also added area-based NPC position reads and several performance improvements so the simulation cost tracks what actually changed, rather than repeatedly rebuilding everything from scratch.

This is exactly the kind of groundwork a serious **Cyberpunk 2077 dedicated server** setup needs. It is not flashy in a trailer, but it is the difference between a cool demo and a city that can hold up under stress.

## Player scope is now on by default

OPEN//77 also switched to OneSync-style player scope by default. In plain language: clients mainly receive player updates for the people who matter around them, instead of trying to care equally about everyone across the map.

That cuts unnecessary replication and should help busy servers scale much better. Spectator mode was also accounted for, so spectators reliably keep the watched player in scope even at long distance.

Several edge cases were cleaned up at the same time. Scope exit and re-entry should now behave like a normal part of multiplayer life instead of causing repeated events, ghost bodies, or lingering actors. There were also fixes for players in vehicles and seated states so nearby players do not incorrectly fall out of scope.

For a future **Cyberpunk 2077 online** world with crowded districts and active RP scenes, this is a major foundation piece.

## Better server-building tools: SQLite and resource memory budgets

Server owners got two practical upgrades today.

First, Lua resources can now open and manage SQLite databases directly. That gives developers a lightweight way to store structured local data without setting up an external database for every small feature. It is a strong option for inventories, mission state, shops, local progression systems, and other resource-specific data that does not need a full remote database stack.

Second, resources can now define their own Lua memory budget within a safe range. Instead of every server resource living under one hard-coded memory ceiling, heavy systems can be given more room when needed while lighter resources stay lean. That should make official and community resources easier to run on larger servers.

## LightRP gets a real ripperdoc flow

The LightRP framework saw one of the coolest player-facing updates of the day: persistent cyberware and a dedicated ripperdoc clinic interface.

Players can now use ripperdoc chairs to access a proper clinic flow, with a holographic paperdoll-style interface built around the game's own visual language. Cyberware support includes several iconic options such as Reinforced Tendons, Gorilla Arms, Mantis Blades, Projectile Launcher, Kerenzikov, Sandevistan, and more.

The current design keeps things intentionally accessible: payment is eurodollars-only, capacity restrictions and prerequisites were removed, and installations persist. That makes the system more immediately fun for testing and roleplay servers while the broader gameplay direction continues to evolve.

## 3D Night City map lands as a standalone resource

The new standalone 3D map resource also officially landed. It replaces the traditional map and minimap with a customizable 3D view of Night City built from the game's own map assets, complete with roads, GPS support, and influence-zone support.

Influence zones are especially interesting for RP and social play. They are designed to show where groups of players are gathering without turning the map into a personal tracker. That makes them useful for helping people find action while preserving some privacy and organic discovery.

For anyone dreaming about **Night City online** with its own identity, this kind of UI work goes a long way.

## Why this update matters

This was a systems-heavy day, but the payoff is easy to understand. OPEN//77 now has more believable city crowds, better crowd reactions, more scalable NPC and player networking, stronger server-side scripting options, and richer roleplay hooks.

That is the path toward a real **Cyberpunk 2077 co-op** and RP experience: not just connecting players to one another, but making the city around them feel populated, reactive, and ready for larger scenes.

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
